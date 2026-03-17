const express = require("express");
const router = express.Router();
const multer = require("multer");
const reportController = require("../controllers/report.controller");
const { protect } = require("../middlewares/auth.js");

// Configure multer for reports
const upload = multer({
  storage: multer.memoryStorage(), // Store in memory, will upload to Cloudinary
  limits: {
    fileSize: 30 * 1024 * 1024 // 30MB max per file
  }
});

// Apply JWT verification to all routes
router.use(protect);

/**
 * @route POST /api/reports
 * @desc Create a new report
 * @access Private (Passenger)
 * @body {string} bookingId - Booking ID
 * @body {string} category - Report category
 * @body {string} reportTopic - Report topic
 * @body {string} reportDescription - Report description
 * @body {File[]} media - Up to 3 media files combined (images: max 10MB each, video: max 30MB)
 *                        Can be: 3 images, 3 videos, 2 images + 1 video, etc.
 * @body {string} contactFirstName - Contact first name
 * @body {string} contactLastName - Contact last name
 * @body {string} contactPhoneNumber - Contact phone number
 * @body {string} contactEmail - Contact email
 */
router.post(
  "/",
  upload.array("media", 3), // Accept max 3 files of any type
  reportController.createReport
);

/**
 * @route GET /api/reports
 * @desc Get all reports for the logged-in user with pagination
 * @access Private (Passenger)
 * @query {number} page - Page number (default: 1)
 * @query {number} limit - Items per page (default: 10)
 * @query {string} status - Filter by report status
 * @query {string} category - Filter by report category
 */
router.get("/", reportController.getMyReports);

/**
 * @route GET /api/reports/categories
 * @desc Get all available report categories
 * @access Private
 */
router.get("/categories", reportController.getReportCategories);

/**
 * @route GET /api/reports/statuses
 * @desc Get all available report statuses
 * @access Private
 */
router.get("/statuses", reportController.getReportStatuses);

/**
 * @route GET /api/reports/check-can-report/:bookingId
 * @desc Check if user can report a specific booking
 * @access Private (Passenger)
 */
router.get("/check-can-report/:bookingId", reportController.checkCanReport);

/**
 * @route GET /api/reports/:id
 * @desc Get a specific report
 * @access Private (Passenger can only view their own)
 */
router.get("/:id", reportController.getReportById);

/**
 * @route GET /api/reports/booking/:bookingId
 * @desc Get all reports for a specific booking
 * @access Private (Passenger can only view their own bookings)
 */
router.get("/booking/:bookingId", reportController.getBookingReports);

module.exports = router;
