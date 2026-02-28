const asyncHandler = require('express-async-handler');
const userService = require("../services/user.service");
const ApiError = require('../utils/ApiError');
const { uploadToCloudinary } = require('../utils/cloudinary');
const notifService = require('../services/notification.service');

const adminListUsers = asyncHandler(async (req, res) => {
    const result = await userService.searchUsers(req.query);
    res.status(200).json({
        success: true,
        message: "Users (admin) retrieved",
        ...result,
    });
});

const getAllUsers = asyncHandler(async (req, res) => {
    const users = await userService.getAllUsers();
    res.status(200).json({
        success: true,
        message: "Users retrieved",
        data: users
    });
});

const getUserById = asyncHandler(async (req, res) => {
    const user = await userService.getUserById(req.params.id);
    if (!user) {
        throw new ApiError(404, "User not found");
    }
    res.status(200).json({
        success: true,
        message: "User retrieved",
        data: user
    });
});

const getUserPublicById = asyncHandler(async (req, res) => {
    const user = await userService.getUserPublicById(req.params.id);
    if (!user) {
        throw new ApiError(404, "User not found");
    }
    res.status(200).json({
        success: true,
        message: "User retrieved",
        data: user
    });
});

const getMyUser = asyncHandler(async (req, res) => {
    const user = req.user.sub
    const data = await userService.getUserById(user)
    res.status(200).json({
        success: true,
        message: "User retrieved",
        data: data
    })

})

const { autoVerifyUser, autoVerifyUserWithOCR } = require("../services/autoverify.service");

const createUser = asyncHandler(async (req, res) => {
    const userData = req.body;

    if (!req.files || !req.files.nationalIdPhotoUrl || !req.files.selfiePhotoUrl) {
        throw new ApiError(400, "National ID photo and selfie photo are required.");
    }

    const [nationalIdResult, selfieResult] = await Promise.all([
        uploadToCloudinary(req.files.nationalIdPhotoUrl[0].buffer, 'painamnae/national_ids'),
        uploadToCloudinary(req.files.selfiePhotoUrl[0].buffer, 'painamnae/selfies')
    ]);

    userData.nationalIdPhotoUrl = nationalIdResult.url;
    userData.selfiePhotoUrl = selfieResult.url;

    const newUser = await userService.createUser(userData);

    //AUTO VERIFY SECTION - Now with OCR integration
    const verifyResult = await autoVerifyUserWithOCR(newUser);

    const updatedUser = await userService.getUserById(newUser.id);

    let notifPayload;

    if (verifyResult.status === 'VERIFIED') {
        notifPayload = {
            userId: newUser.id,
            type: 'VERIFICATION',
            title: 'ยืนยันตัวตนสำเร็จ',
            body: `บัตรประชาชนและใบหน้าตรงกัน ระบบตรวจสอบอัตโนมัติผ่าน (${verifyResult.faceConfidence.toFixed(2)}%)`,
            link: '/profile',
            metadata: {
                faceConfidence: verifyResult.faceConfidence,
                ocrStatus: verifyResult.ocrVerification?.verificationStatus,
                method: 'auto_with_ocr',
            },
        };
    } else if (verifyResult.status === 'PENDING') {
        const ocrInfo = verifyResult.ocrVerification?.message || 'ข้อมูลบัตรประชาชนไม่ชัดเจน';
        notifPayload = {
            userId: newUser.id,
            type: 'VERIFICATION',
            title: 'กำลังรอการตรวจสอบ',
            body: `ข้อมูลของคุณอยู่ระหว่างการตรวจสอบโดยแอดมิน (${ocrInfo})`,
            link: '/profile/verification',
            metadata: {
                faceConfidence: verifyResult.faceConfidence,
                ocrStatus: verifyResult.ocrVerification?.verificationStatus,
                method: 'auto_pending',
            },
        };
    } else if (verifyResult.status === 'AUTO_REJECTED') {
        // AUTO_REJECTED could be from OCR extraction failure OR face mismatch
        let reason;
        if (verifyResult.ocrVerification?.verificationStatus === 'AUTO_REJECTED') {
            reason = 'ไม่สามารถสแกนบัตรประชาชนได้ กรุณาส่งรูปภาพที่ชัดเจนขึ้น';
        } else {
            reason = 'ใบหน้าในบัตรประชาชนและรูปถ่ายของคุณไม่ตรงกัน';
        }
        notifPayload = {
            userId: newUser.id,
            type: 'VERIFICATION',
            title: 'การยืนยันตัวตนล้มเหลว',
            body: `${reason} กรุณาตรวจสอบข้อมูลและส่งใหม่`,
            link: '/profile/verification',
            metadata: {
                faceConfidence: verifyResult.faceConfidence,
                ocrStatus: verifyResult.ocrVerification?.verificationStatus,
                method: 'auto_rejected',
            },
        };
    } else if (verifyResult.status === 'REJECTED') {
        // REJECTED from OCR data mismatch
        const reason = 'ข้อมูลบัตรประชาชนไม่ตรงกับที่ระบบสแกนได้';
        notifPayload = {
            userId: newUser.id,
            type: 'VERIFICATION',
            title: 'การยืนยันตัวตนล้มเหลว',
            body: `${reason} กรุณาตรวจสอบข้อมูลและส่งใหม่`,
            link: '/profile/verification',
            metadata: {
                faceConfidence: verifyResult.faceConfidence,
                ocrStatus: verifyResult.ocrVerification?.verificationStatus,
                method: 'rejected',
            },
        };
    }
    await notifService.createNotificationByAdmin(notifPayload);

    let msg = "User created.";
    if (verifyResult.status === 'VERIFIED') msg += " Auto-verified (OCR + Face).";
    else if (verifyResult.status === 'PENDING') msg += " Awaiting admin review (OCR or Face borderline).";
    else if (verifyResult.status === 'AUTO_REJECTED') {
        if (verifyResult.ocrVerification?.verificationStatus === 'AUTO_REJECTED') {
            msg += " Auto-rejected (OCR verification failed - extraction or data mismatch).";
        } else {
            msg += " Auto-rejected (Face does not match ID card).";
        }
    }
    
    // include ocr details for debugging/inspection
    res.status(201).json({
        success: true,
        message: msg,
        data: updatedUser,
        verification: {
            status: verifyResult.status,
            faceConfidence: verifyResult.faceConfidence,
            ocrVerification: verifyResult.ocrVerification,
        }
    });
});

const updateCurrentUserProfile = asyncHandler(async (req, res) => {
    // เอาข้อมูล text fields ที่มากับ req.body
    const updateData = { ...req.body };


    if (req.files?.nationalIdPhotoUrl) {
        const buf = req.files.nationalIdPhotoUrl[0].buffer;
        const result = await uploadToCloudinary(buf, 'painamnae/national_ids');
        updateData.nationalIdPhotoUrl = result.url;
    }

    if (req.files?.selfiePhotoUrl) {
        const buf = req.files.selfiePhotoUrl[0].buffer;
        const result = await uploadToCloudinary(buf, 'painamnae/selfies');
        updateData.selfiePhotoUrl = result.url;
    }

    if (req.files?.profilePicture) {
        const buf = req.files.profilePicture[0].buffer;
        const result = await uploadToCloudinary(buf, 'painamnae/profiles');
        updateData.profilePicture = result.url;
    }

    const updatedUser = await userService.updateUserProfile(req.user.sub, updateData);
    res.status(200).json({
        success: true,
        message: "Profile updated",
        data: updatedUser
    });
});

const adminUpdateUser = asyncHandler(async (req, res) => {
    const updatedUser = await userService.updateUserProfile(req.params.id, req.body);
    res.status(200).json({
        success: true,
        message: "User updated by admin",
        data: updatedUser
    });
});

const adminDeleteUser = asyncHandler(async (req, res) => {
    const deletedUser = await userService.deleteUser(req.params.id);
    res.status(200).json({
        success: true,
        message: "User deleted successfully.",
        data: { deletedUserId: deletedUser.id }
    });
});

const setUserStatus = asyncHandler(async (req, res) => {
    const { isActive, isVerified } = req.body

    if (typeof isActive !== 'boolean' && typeof isVerified !== 'boolean') {
        throw new ApiError(400, 'Provide at least one of isActive or isVerified as boolean');
    }

    // compute verificationStatus change if applicable
    const updatePayload = {
        ...(typeof isActive === 'boolean' ? { isActive } : {}),
        ...(typeof isVerified === 'boolean' ? { isVerified } : {}),
    };
    if (typeof isVerified === 'boolean') {
        updatePayload.verificationStatus = isVerified ? 'VERIFIED' : 'REJECTED';
    }

    let updatedUser = await userService.updateUserProfile(req.params.id, updatePayload);

    if (typeof isVerified === 'boolean') {
        try {
            if (isVerified === true) {
                await notifService.createNotificationByAdmin({
                    userId: updatedUser.id,
                    type: 'VERIFICATION',
                    title: 'ยืนยันตัวตนสำเร็จ',
                    body: 'แอดมินได้ตรวจสอบบัญชีของคุณแล้ว ตอนนี้คุณสามารถใช้งานได้เต็มรูปแบบ',
                    link: '/profile/verification',
                    metadata: {
                        kind: 'user_verification',
                        userId: updatedUser.id,
                        initiatedBy: 'system'
                    }
                });
            }
            else if (isVerified === false) {
                await notifService.createNotificationByAdmin({
                    userId: updatedUser.id,
                    type: 'VERIFICATION',
                    title: 'ยืนยันตัวตนไม่สำเร็จ',
                    body: 'ข้อมูลบัตรประชาชน/รูปถ่ายของคุณไม่ผ่านการตรวจสอบ กรุณาตรวจสอบและส่งใหม่อีกครั้ง',
                    link: '/profile/verification',
                    metadata: {
                        kind: 'user_verification',
                        userId: updatedUser.id,
                        initiatedBy: 'system'
                    }
                });
            }
        } catch (e) {
            console.error('Failed to create verification notification:', e);
        }
    }

    res.status(200).json({ success: true, message: "User status updated", data: updatedUser });
});

module.exports = {
    adminListUsers,
    getAllUsers,
    getUserById,
    getMyUser,
    getUserPublicById,
    createUser,
    updateCurrentUserProfile,
    adminUpdateUser,
    adminDeleteUser,
    setUserStatus,

};