const asyncHandler = require("express-async-handler");
const reportService = require("../services/report.service");
const { uploadToCloudinary } = require("../utils/cloudinary");
const ApiError = require("../utils/ApiError");

// Validate file sizes
const VALIDATION = {
  IMAGE_MAX_SIZE: 10 * 1024 * 1024, // 10 MB per image
  VIDEO_MAX_SIZE: 30 * 1024 * 1024, // 30 MB per video
  IMAGE_EXTENSIONS: ["png", "jpg", "jpeg"],
  VIDEO_EXTENSIONS: ["mp4"],
  MAX_TOTAL_FILES: 3, // Max 3 files total (images + videos combined)
  MAX_VIDEO_DURATION: 60 // seconds
};

const createReport = asyncHandler(async (req, res) => {
  const passengerId = req.user.sub;
  const { bookingId, category, reportTopic, reportDescription, contactFirstName, contactLastName, contactPhoneNumber, contactEmail } = req.body;

  // Validate required fields
  if (!bookingId || !category || !reportTopic || !reportDescription) {
    throw new ApiError(400, "Missing required fields: bookingId, category, reportTopic, reportDescription");
  }

  if (!contactFirstName || !contactLastName || !contactPhoneNumber) {
    throw new ApiError(400, "Missing required contact fields: contactFirstName, contactLastName, contactPhoneNumber");
  }

  // Validate category
  const validCategories = ["INAPPROPRIATE_BEHAVIOR", "LOST_ITEM", "CLEANLINESS", "OTHER", "VIOLATED_AGREEMENT", "DETAILS_MISMATCH"];
  if (!validCategories.includes(category)) {
    throw new ApiError(400, "Invalid report category");
  }

  // Get files from multer
  const mediaFiles = req.files || [];

  // Validate total files count
  if (mediaFiles.length === 0) {
    throw new ApiError(400, "At least one media file is required");
  }

  if (mediaFiles.length > VALIDATION.MAX_TOTAL_FILES) {
    throw new ApiError(400, `Maximum ${VALIDATION.MAX_TOTAL_FILES} media files allowed (combined images and videos)`);
  }

  const uploadedImages = [];
  let uploadedVideo = null;
  let videoCount = 0;
  let imageCount = 0;

  // Process each media file
  for (const file of mediaFiles) {
    // Determine file type from MIME type
    const mimeType = file.mimetype || "";
    const isImage = mimeType.startsWith("image/");
    const isVideo = mimeType.startsWith("video/");

    if (!isImage && !isVideo) {
      throw new ApiError(400, `Invalid file type: ${file.originalname}. Allowed: images (png, jpg, jpeg) and videos (mp4)`);
    }

    // Get extension
    const ext = file.mimetype?.split('/')[1] || file.originalname.split(".").pop().toLowerCase();

    if (isImage) {
      // Validate image
      if (file.size > VALIDATION.IMAGE_MAX_SIZE) {
        throw new ApiError(400, `Image ${file.originalname} exceeds ${VALIDATION.IMAGE_MAX_SIZE / (1024 * 1024)} MB limit`);
      }

      if (!VALIDATION.IMAGE_EXTENSIONS.includes(ext)) {
        throw new ApiError(400, `Invalid image format: ${ext}. Allowed: ${VALIDATION.IMAGE_EXTENSIONS.join(", ")}`);
      }

      imageCount++;

      // Upload image to Cloudinary
      const uploadResult = await uploadToCloudinary(file.buffer, "reports/images");
      uploadedImages.push(uploadResult.url);
    } else if (isVideo) {
      // Validate video
      if (file.size > VALIDATION.VIDEO_MAX_SIZE) {
        throw new ApiError(400, `Video exceeds ${VALIDATION.VIDEO_MAX_SIZE / (1024 * 1024)} MB limit`);
      }

      if (!VALIDATION.VIDEO_EXTENSIONS.includes(ext)) {
        throw new ApiError(400, `Invalid video format: ${ext}. Allowed: ${VALIDATION.VIDEO_EXTENSIONS.join(", ")}`);
      }

      videoCount++;

      // Upload video to Cloudinary with video resource type
      const uploadResult = await uploadToCloudinary(file.buffer, "reports/videos", "video");
      uploadedVideo = uploadResult.url;
    }
  }

  // Create report
  const reportData = {
    bookingId,
    category,
    reportTopic,
    reportDescription,
    reportImages: uploadedImages.length > 0 ? uploadedImages : null,
    reportVideo: uploadedVideo,
    contactFirstName,
    contactLastName,
    contactPhoneNumber,
    contactEmail
  };

  const report = await reportService.createReport(reportData, passengerId);

  res.status(201).json({
    success: true,
    message: "Report created successfully",
    data: report
  });
});

const getMyReports = asyncHandler(async (req, res) => {
  const passengerId = req.user.sub;
  const { page = 1, limit = 10, status, category } = req.query;

  const result = await reportService.getUserReports(passengerId, {
    page: parseInt(page),
    limit: parseInt(limit),
    status,
    category
  });

  res.status(200).json({
    success: true,
    message: "Reports retrieved successfully",
    ...result
  });
});

const getReportById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.sub;

  const report = await reportService.getReportById(id, userId);

  res.status(200).json({
    success: true,
    message: "Report retrieved successfully",
    data: report
  });
});

const getBookingReports = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const passengerId = req.user.sub;

  const reports = await reportService.getBookingReports(bookingId, passengerId);

  res.status(200).json({
    success: true,
    message: "Booking reports retrieved successfully",
    data: reports
  });
});

const checkCanReport = asyncHandler(async (req, res) => {
  const passengerId = req.user.sub;
  const { bookingId } = req.params;

  const result = await reportService.canReportTrip(bookingId, passengerId);

  res.status(200).json({
    success: true,
    data: result
  });
});

const getReportCategories = asyncHandler(async (req, res) => {
  const categories = [
    { value: "INAPPROPRIATE_BEHAVIOR", label: "พฤติกรรมที่ไม่เหมาะสม" },
    { value: "LOST_ITEM", label: "ลืมของ" },
    { value: "CLEANLINESS", label: "ความสะอาด" },
    { value: "OTHER", label: "อื่นๆ" },
    { value: "VIOLATED_AGREEMENT", label: "ละเมิดข้อตกลง" },
    { value: "DETAILS_MISMATCH", label: "รายละเอียดไม่ตรงกับในระบบ" }
  ];

  res.status(200).json({
    success: true,
    data: categories
  });
});

const getReportStatuses = asyncHandler(async (req, res) => {
  const statuses = [
    { value: "PENDING", label: "รอดำเนินการ" },
    { value: "UNDER_REVIEW", label: "กำลังตรวจสอบ" },
    { value: "CONTACTING_DRIVER", label: "กำลังติดต่อคนขับ" },
    { value: "RESOLVED", label: "แก้ไขแล้ว" },
    { value: "CLOSED", label: "ปิด" }
  ];

  res.status(200).json({
    success: true,
    data: statuses
  });
});

module.exports = {
  createReport,
  getMyReports,
  getReportById,
  getBookingReports,
  checkCanReport,
  getReportCategories,
  getReportStatuses
};
