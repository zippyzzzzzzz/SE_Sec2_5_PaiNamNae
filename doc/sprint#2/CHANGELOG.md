## Sprint 2 - No.4 AutoVerification
- Add admin user verification management page
- Add pending status for admin review when model confidence is low
- Integrate OCR service into autoVerify workflow
  - Extract data from OCR and merge with existing verification flow
  - Update validation logic to support OCR data comparison (ID number, name, driver license number)
  - Enhance Decision Engine to consider both face and OCR results before final decision (APPROVED/REVIEW/REJECT)
- Update Register flow to handle OCR results without breaking existing system logic
- Enhance Profile Verification page to include OCR scanning and update verification status
- Enhance Driver Verification page to integrate driver license OCR with existing flow
- Update verification status display based on combined OCR and face recognition results
- Add database fields for OCR confidence scores and result summary (if needed)
- Add UAT and API test for autoVerify in register flow

## Sprint 2 - No.12 Notification
- Add push token registration endpoint
- Add booking chat message creation endpoint
- Add message history endpoint
- Add data-only FCM dispatch for booking messages
- Add service worker handling for background notifications and deep-link focus/open logic
- Add foreground notification rendering and token bootstrap in Nuxt plugin
- Add database models PushSubscription and Message; extend Notification for BOOKING flow and link to User/Booking
