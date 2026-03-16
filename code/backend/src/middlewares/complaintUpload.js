const multer = require('multer');
const ApiError = require('../utils/ApiError');

// เก็บไฟล์ใน memory เพื่อรอส่งต่อไปยัง Cloudinary
const storage = multer.memoryStorage();

const complaintUpload = multer({
    storage: storage,
    limits: { 
        fileSize: 30 * 1024 * 1024 // จำกัดที่ 30MB (สำหรับวิดีโอ)
    },
    fileFilter: (req, file, cb) => {
        if (file.fieldname === 'photos') {
            // อนุญาตเฉพาะรูปภาพ และจำกัดขนาดในระดับ Controller อีกที (ถ้าต้องการแยก)
            if (file.mimetype.startsWith('image/')) {
                cb(null, true);
            } else {
                cb(new ApiError(400, 'Only image files are allowed for photos!'), false);
            }
        } else if (file.fieldname === 'video') {
            // อนุญาตเฉพาะวิดีโอ MP4
            if (file.mimetype === 'video/mp4') {
                cb(null, true);
            } else {
                cb(new ApiError(400, 'Only MP4 video files are allowed!'), false);
            }
        } else {
            cb(new ApiError(400, 'Unexpected field'), false);
        }
    },
});

module.exports = complaintUpload;
