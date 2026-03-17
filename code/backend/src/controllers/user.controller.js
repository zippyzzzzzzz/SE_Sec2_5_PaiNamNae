const asyncHandler = require('express-async-handler');
const userService = require("../services/user.service");
const ApiError = require('../utils/ApiError');
const { uploadToCloudinary } = require('../utils/cloudinary');
const notifService = require('../services/notification.service');
const { autoVerifyUser, autoVerifyUserWithOCR } = require("../services/autoverify.service");

// --- [เพิ่ม] Helper Function สำหรับแปลง พ.ศ. เป็น ค.ศ. ---
const normalizeThaiYear = (dateString) => {
    if (!dateString) return dateString;
    try {
        const dateObj = new Date(dateString);
        const year = dateObj.getFullYear();
        // ถ้าปี > 2400 (เช่น 2568) ให้ลบออก 543 เพื่อให้เป็น ค.ศ. (2025)
        if (year > 2400) {
            dateObj.setFullYear(year - 543);
            return dateObj.toISOString();
        }
        return dateString;
    } catch (error) {
        console.error("[Date Normalizer] Error parsing date:", error);
        return dateString;
    }
};

 // ดึงรายชื่อ User ทั้งหมด (Admin)
 
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


 // สร้าง User ใหม่ (Register รอบแรก)
 
const createUser = asyncHandler(async (req, res) => {
    const userData = req.body;

    // --- [เพิ่ม] ดักแปลงวันที่ตอน Register ---
    if (userData.nationalIdExpiryDate) {
        userData.nationalIdExpiryDate = normalizeThaiYear(userData.nationalIdExpiryDate);
    }

    if (!req.files || !req.files.nationalIdPhotoUrl || !req.files.selfiePhotoUrl) {
        throw new ApiError(400, "National ID photo and selfie photo are required.");
    }

    const [nationalIdResult, selfieResult] = await Promise.all([
        uploadToCloudinary(req.files.nationalIdPhotoUrl[0].buffer, 'painamnae/national_ids'),
        uploadToCloudinary(req.files.selfiePhotoUrl[0].buffer, 'painamnae/selfies')
    ]);

    userData.nationalIdPhotoUrl = nationalIdResult.url;
    userData.selfiePhotoUrl = selfieResult.url;

    // บันทึก User ลงฐานข้อมูล
    const newUser = await userService.createUser(userData);

    // เริ่มกระบวนการตรวจสอบอัตโนมัติ
    const verifyResult = await autoVerifyUserWithOCR(newUser);
    const updatedUser = await userService.getUserById(newUser.id);

    // จัดการ Notification ตามผลลัพธ์
    let notifPayload = { userId: newUser.id, type: 'VERIFICATION', link: '/profile/verification' };
    
    if (verifyResult.status === 'VERIFIED') {
        notifPayload.title = 'ยืนยันตัวตนสำเร็จ';
        notifPayload.body = `บัตรประชาชนและใบหน้าตรงกัน (${verifyResult.faceConfidence.toFixed(2)}%)`;
    } else if (verifyResult.status === 'PENDING') {
        notifPayload.title = 'กำลังรอการตรวจสอบ';
        notifPayload.body = `ข้อมูลอยู่ระหว่างการตรวจสอบโดยแอดมิน (${verifyResult.ocrVerification?.message || 'รอคิวตรวจสอบ'})`;
    } else {
        let reason = verifyResult.ocrVerification?.verificationStatus === 'AUTO_REJECTED' 
            ? 'ข้อมูลบัตรไม่ชัดเจนหรือข้อมูลไม่ตรง' 
            : 'ใบหน้าไม่ตรงกับบัตรประชาชน';
        notifPayload.title = 'การยืนยันตัวตนล้มเหลว';
        notifPayload.body = `${reason} กรุณาลองใหม่`;
    }
    await notifService.createNotificationByAdmin(notifPayload);

    res.status(201).json({
        success: true,
        message: "User created and verification processed.",
        data: updatedUser,
        verification: verifyResult
    });
});



 // อัปเดตข้อมูลโปรไฟล์ (การกรอกรอบที่สอง เพื่อยืนยันตัวตน)
 // [UPDATE]: แก้ไข Logic ให้บันทึกข้อมูลทับค่าเก่าก่อนเริ่ม OCR
 
const updateCurrentUserProfile = asyncHandler(async (req, res) => {
    
    console.log("--- [DEBUG 1] Request Body ---", req.body);

    // 1. รับข้อมูล Text Fields (เช่น เลขบัตรประชาชนที่กรอกรอบสอง)
    const updateData = { ...req.body };

    // --- [เพิ่ม] ดักแปลงวันที่ตอน Update Profile ---
    if (updateData.nationalIdExpiryDate) {
        updateData.nationalIdExpiryDate = normalizeThaiYear(updateData.nationalIdExpiryDate);
        console.log("--- [FIXED] Expiry Date Normalized to ค.ศ. ---", updateData.nationalIdExpiryDate);
    }

    // 2. จัดการอัปโหลดไฟล์รูปภาพ
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

    console.log("--- [DEBUG 2] Data to Service ---", updateData);

    //  [แก้ 1]: บันทึกข้อมูลลง DB ทันที
    // เราไม่เอาตัวแปรที่ Return จากตรงนี้ไปใช้ตรวจโดยตรง 
    // เพื่อป้องกันกรณี Service คืนค่ามาไม่ครบ
    await userService.updateUserProfile(req.user.sub, updateData);

    //  [แก้ 2]: ดึงข้อมูลสดๆ (Fresh Fetch)
    // มันคือการบังคับดึงข้อมูลที่ 'เขียนทับ' แล้วออกมาจากฐานข้อมูลจริงๆ
    const userUpdated = await userService.getUserById(req.user.sub);

    console.log("--- [DEBUG 3] Data from DB ---", userUpdated.nationalIdNumber);

    // Log ดูเพื่อความชัวร์ว่าเลขบัตรเปลี่ยนหรือยัง
    console.log(`[Verify] Checking OCR with New ID: ${userUpdated.nationalIdNumber}`);

    // 4. เริ่มรันเครื่องจักร OCR โดยใช้ข้อมูล "ล่าสุด" (userUpdated)
    let verifyResult = null;
    if (userUpdated.nationalIdPhotoUrl && userUpdated.selfiePhotoUrl) {
        console.log(`[UpdateProfile] Running OCR for user: ${userUpdated.id} with UPDATED data`);
        
        // แก้ไขจุดที่เคย Error: เปลี่ยนจาก userBeforeVerify เป็น userUpdated
        verifyResult = await autoVerifyUserWithOCR(userUpdated);

        // 5. สร้างการแจ้งเตือน (Notification) ตามผลลัพธ์ที่ได้
        let notifPayload = {
            userId: userUpdated.id,
            type: 'VERIFICATION',
            link: '/profile/verification',
        };

        if (verifyResult.status === 'VERIFIED') {
            notifPayload.title = 'ยืนยันตัวตนสำเร็จ';
            notifPayload.body = `ข้อมูลล่าสุดและใบหน้าตรงกัน (${verifyResult.faceConfidence.toFixed(2)}%)`;
        } else if (verifyResult.status === 'PENDING') {
            notifPayload.title = 'กำลังรอการตรวจสอบ';
            notifPayload.body = `ข้อมูลอยู่ระหว่างการตรวจสอบโดยแอดมิน (${verifyResult.ocrVerification?.message || 'รอคิวตรวจสอบ'})`;
        } else {
            // กรณี AUTO_REJECTED หรือ REJECTED
            let reason = verifyResult.ocrVerification?.verificationStatus === 'AUTO_REJECTED' 
                ? 'เลขบัตรหรือวันหมดอายุไม่ตรงกับรูปภาพ' 
                : 'ใบหน้าในรูปไม่ตรงกับบัตรประชาชน';
            notifPayload.title = 'การยืนยันตัวตนล้มเหลว';
            notifPayload.body = `${reason} กรุณาลองใหม่อีกครั้ง`;
        }

        await notifService.createNotificationByAdmin(notifPayload);
    }

    // 6. ดึงข้อมูลล่าสุด (ที่มีสถานะใหม่แล้ว) ส่งกลับหน้าบ้าน
    const finalUser = await userService.getUserById(userUpdated.id);

    res.status(200).json({
        success: true,
        message: verifyResult ? `Profile updated with ${verifyResult.status} status` : "Profile updated",
        data: finalUser,
        verification: verifyResult
    });
});

const adminUpdateUser = asyncHandler(async (req, res) => {
    // --- [เพิ่ม] ดักแปลงวันที่สำหรับ Admin Update ด้วย ---
    if (req.body.nationalIdExpiryDate) {
        req.body.nationalIdExpiryDate = normalizeThaiYear(req.body.nationalIdExpiryDate);
    }
    
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
            const title = isVerified ? 'ยืนยันตัวตนสำเร็จ' : 'ยืนยันตัวตนไม่สำเร็จ';
            const body = isVerified 
                ? 'แอดมินได้ตรวจสอบบัญชีของคุณแล้ว ตอนนี้คุณสามารถใช้งานได้เต็มรูปแบบ' 
                : 'ข้อมูลบัตรประชาชน/รูปถ่ายของคุณไม่ผ่านการตรวจสอบ กรุณาส่งใหม่อีกครั้ง';

            await notifService.createNotificationByAdmin({
                userId: updatedUser.id,
                type: 'VERIFICATION',
                title,
                body,
                link: '/profile/verification',
                metadata: { kind: 'user_verification', userId: updatedUser.id, initiatedBy: 'admin' }
            });
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