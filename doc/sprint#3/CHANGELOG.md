## Sprint 3 - Item13 Passenger Report Driver
- Added passenger ability to submit reports against drivers after a trip is completed (within 3 days of completion).
- Enforced business rules: passenger must own the booking, route status must be COMPLETED, and contact phone/email are required.
- Added category options (INAPPROPRIATE_BEHAVIOR, LOST_ITEM, CLEANLINESS, OTHER, VIOLATED_AGREEMENT, DETAILS_MISMATCH) with status transitions (PENDING, UNDER_REVIEW, CONTACTING_DRIVER, RESOLVED, CLOSED).
- Enabled media upload on report creation (up to 3 files; images <=10MB, videos <=30MB; png/jpg/jpeg/mp4) with Cloudinary storage.
- Exposed APIs: create report, get my reports (pagination/filter), get report by id, get booking reports, check-can-report, list categories/statuses.