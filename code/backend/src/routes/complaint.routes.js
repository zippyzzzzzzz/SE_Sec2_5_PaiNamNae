const express = require('express');
const complaintController = require('../controllers/complaint.controller');
const { protect } = require('../middlewares/auth');
const complaintUpload = require('../middlewares/complaintUpload');

const router = express.Router();

router.post(
    '/',
    protect,
    complaintUpload.fields([
        { name: 'photos', maxCount: 3 },
        { name: 'video', maxCount: 1 }
    ]),
    complaintController.createComplaint
);

router.get('/me', protect, complaintController.getMyComplaints);
router.get('/:id', protect, complaintController.getComplaintDetail);

module.exports = router;
