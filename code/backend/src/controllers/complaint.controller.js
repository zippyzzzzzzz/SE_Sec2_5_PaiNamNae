const complaintService = require('../services/complaint.service');
const { uploadToCloudinary } = require('../utils/cloudinary');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('express-async-handler');

const createComplaint = asyncHandler(async (req, res) => {
    const { bookingId, category, description, contactName, contactPhone } = req.body;
    const userId = req.user.id;

    if (!bookingId || !category || !description || !contactName || !contactPhone) {
        throw new ApiError(400, 'Missing required fields');
    }

    // ตรวจสอบว่ามี Emoji ในคำอธิบายหรือไม่ (Server-side validation)
    const extendedEmojiRegex = /[\u{1F300}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F1E0}-\u{1F1FF}]/u;
    
    if (extendedEmojiRegex.test(description)) {
        throw new ApiError(400, 'Description cannot contain emojis.');
    }

    if (extendedEmojiRegex.test(contactName)) {
        throw new ApiError(400, 'Contact name cannot contain emojis.');
    }

    if (extendedEmojiRegex.test(contactPhone)) {
        throw new ApiError(400, 'Contact phone cannot contain emojis.');
    }

    let photoUrls = [];
    let videoUrl = null;

    // อัปโหลดรูปภาพ (ถ้ามี)
    if (req.files && req.files.photos) {
        for (const file of req.files.photos) {
            const result = await uploadToCloudinary(file.buffer, 'painamnae/complaints/photos');
            photoUrls.push(result.secure_url);
        }
    }

    // อัปโหลดวิดีโอ (ถ้ามี)
    if (req.files && req.files.video) {
        const file = req.files.video[0];
        const result = await uploadToCloudinary(file.buffer, 'painamnae/complaints/videos', 'video');
        videoUrl = result.secure_url;
    }

    const complaint = await complaintService.createComplaint({
        bookingId,
        userId,
        category,
        description,
        photos: photoUrls,
        video: videoUrl,
        contactName,
        contactPhone
    });

    res.status(201).json({
        success: true,
        message: 'Complaint submitted successfully',
        data: complaint
    });
});

const getMyComplaints = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const complaints = await complaintService.getComplaintsByUserId(userId);
    res.json({
        success: true,
        data: complaints
    });
});

const getComplaintDetail = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const complaint = await complaintService.getComplaintById(id);

    if (!complaint) {
        throw new ApiError(404, 'Complaint not found');
    }

    // ตรวจสอบสิทธิ์ (เจ้าของเรื่องหรือ Admin)
    if (complaint.userId !== req.user.id && req.user.role !== 'ADMIN') {
        throw new ApiError(403, 'Forbidden');
    }

    res.json({
        success: true,
        data: complaint
    });
});

module.exports = {
    createComplaint,
    getMyComplaints,
    getComplaintDetail
};
