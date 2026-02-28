# OCR Integration Guide

## Overview

OCR (Optical Character Recognition) service integration has been added to the user verification flow. This uses the **Aigen** OCR endpoint which expects the image encoded as base64 and the API key supplied in header `X-AIGEN-KEY`.

During registration, the system now:

1. **Scans the ID card** using Aigen OCR API to extract:
   - National ID number (เลขประจำตัวประชาชน)
   - Expiration date (วันหมดอายุ)
   - Additional info (name, date of birth, etc.) for audit purposes

2. **Compares OCR data** with user-provided information:
   - ID numbers are normalized and compared (exact match required)
   - Expiration dates are checked (exact match or within 1 day tolerance)

3. **Performs face verification** using Face++ API (existing)

4. **Combines results** to determine verification status

## Verification Logic

The system now performs **integrated verification** combining both OCR and Face data:

### Status Determination

```
┌─────────────────────────────────────────┐
│   OCR Verification Result               │
├─────────────────────────────────────────┤
│ VERIFIED      → ID data matches exactly │
│ BORDERLINE    → Close match (≥75%)      │
│ REJECTED      → No match                │
└─────────────────────────────────────────┘
              AND
┌─────────────────────────────────────────┐
│   Face Verification Result              │
├─────────────────────────────────────────┤
│ HIGH          → Confidence ≥ 75%        │
│ MEDIUM        → 50-75% confidence       │
│ LOW           → Confidence < 50%        │
└─────────────────────────────────────────┘
              ↓
┌──────────────────────────────────────┐
│   Combined Final Status               │
├──────────────────────────────────────┤
│ VERIFIED:      OCR ✓ + Face HIGH  ✓  │
│ PENDING:       Either is BORDERLINE   │
│ AUTO_REJECTED: OCR ✗ or Face LOW  ✗  │
│ REJECTED:      OCR data mismatch  ✗  │
└──────────────────────────────────────┘
```

### Final Status Definitions

| Status | Condition | Action |
|--------|-----------|--------|
| **VERIFIED** | OCR exact match + Face high confidence | Auto-approved, user can immediately use platform |
| **PENDING** | Either OCR is borderline OR Face is medium confidence | Awaits admin review |
| **AUTO_REJECTED** | OCR matches but Face confidence very low | Rejected automatically, user can resubmit |
| **REJECTED** | OCR data doesn't match | Clear fraud attempt, rejected immediately |

## Environment Variables

```env
# OCR/ID card recognition service
OCR_API_URL=https://api.aigen.online/aiscript/idcard/v2
OCR_API_KEY=AGqjis6jztewt4hp6yi434mcufmc30ba8h

# Face verification thresholds (existing)
USER_AUTO_VERIFY_CONFIDENCE_THRESHOLD=75       # For auto-approval
USER_AUTO_VERIFY_LOW_CONFIDENCE_THRESHOLD=50   # For auto-rejection
```

## Database Schema Changes

### Added Fields to User Model

| Field | Type | Purpose |
|-------|------|---------|
| `ocrVerificationStatus` | String | Stores OCR result (VERIFIED, BORDERLINE, REJECTED) |
| `ocrData` | JSON | Stores extracted ID data for audit: `{ idNumber, expiryDate, name, dateOfBirth, gender, address }` |

### Migration

```sql
-- Created by: 20260228132024_add_ocr_verification
ALTER TABLE "User" ADD COLUMN "ocrVerificationStatus" TEXT;
ALTER TABLE "User" ADD COLUMN "ocrData" JSONB;
```

## Service Architecture

### 1. OCR Service (`src/services/ocr.service.js`)

**Functions:**

- `extractIdCardData(imageUrl)`  
  Calls Aigen API to extract ID card information

- `verifyIdCard(nationalIdPhotoUrl, userProvidedIdNumber, userProvidedExpiryDate)`  
  Compares OCR extraction with user-provided data
  - Returns: `{ verificationStatus, ocrData, idNumberMatch, expiryDateMatch, confidence, message }`

**Utility Functions:**
- `normalizeIdNumber()` - Removes dashes/spaces for comparison
- `normalizeExpiryDate()` - Parses various date formats (YYYY-MM-DD, DD/MM/YYYY)
- `calculateSimilarity()` - Computes string similarity percentage

### 2. Auto-Verify Service (`src/services/autoverify.service.js`)

**New Function:**

- `autoVerifyUserWithOCR(user)`  
  Integrated verification combining OCR + Face
  - Called during user registration
  - Returns: `{ verified, status, faceConfidence, ocrVerification, combinedMessage }`

**Existing Functions:**
- `autoVerifyUser()` - Legacy face-only verification (unchanged)
- `autoVerifyDriverVerification()` - Driver license verification (unchanged)

## Registration Flow

```
User Registration Request
    ↓
[Upload Photos] - National ID + Selfie
    ↓
[Cloudinary Upload]
    ↓
[Create User Record]
    ↓
[Call autoVerifyUserWithOCR]
    │
    ├─→ Extract ID data via OCR API
    │   └─→ Get: id_number, expiry_date, name, etc.
    │
    ├─→ Compare OCR data with user-provided values
    │   ├─→ Normalize ID number
    │   ├─→ Normalize expiry date
    │   └─→ Calculate similarity
    │
    ├─→ Compare faces via Face++ API
    │   └─→ Get confidence score
    │
    └─→ Combine results
        ├─→ VERIFIED (OCR ✓ + Face HIGH)
        ├─→ PENDING (Either is borderline)
        ├─→ AUTO_REJECTED (OCR ✓ + Face LOW)
        └─→ REJECTED (OCR data mismatch)
    ↓
[Send Notification]
    ├─→ VERIFIED: "ID card & face verified"
    ├─→ PENDING: "Awaiting admin review"
    ├─→ AUTO_REJECTED: "Face doesn't match ID"
    └─→ REJECTED: "ID data mismatch"
    ↓
Registration Complete
```

## Notification Messages (Thai)

### VERIFIED
```
Title: ยืนยันตัวตนสำเร็จ
Body: บัตรประชาชนและใบหน้าตรงกัน ระบบตรวจสอบอัตโนมัติผ่าน (XX.XX%)
```

### PENDING
```
Title: กำลังรอการตรวจสอบ
Body: ข้อมูลของคุณอยู่ระหว่างการตรวจสอบโดยแอดมิน
Details: Include OCR result message
```

### AUTO_REJECTED
```
Title: การยืนยันตัวตนล้มเหลว
Body: ใบหน้าในบัตรประชาชนและรูปถ่ายของคุณไม่ตรงกัน
Action: User can resubmit
```

### REJECTED (OCR Mismatch)
```
Title: การยืนยันตัวตนล้มเหลว
Body: ข้อมูลบัตรประชาชนไม่ตรงกับที่ระบบสแกนได้
Action: User must provide correct ID
```

## API Data Format

### ## OCR API Request

The Aigen endpoint requires a **base64 encoded image** (not URL) and key header:

```json
type RequestBody = { "image": "<base64 string>" }
```

With HTTP headers:
```
Content-Type: application/json
X-AIGEN-KEY: <your key>
```

(Older code previously attempted to send a URL and `X-API-Key` – this no longer works.)

### OCR API Response (Aigen)
```json
{
  "id_number": "1234567890123",
  "expiry_date": "2028-12-31",  // or "31/12/2028" or "12/31/2028"
  "name": "John Doe",
  "date_of_birth": "1990-01-15",
  "gender": "M",
  "address": "123 Main St"
}
```

### Verification Response
```json
{
  "verificationStatus": "VERIFIED",  // or BORDERLINE, REJECTED
  "ocrData": {
    "idNumber": "1234567890123",
    "expiryDate": "2028-12-31",
    "name": "John Doe",
    "dateOfBirth": "1990-01-15"
  },
  "idNumberMatch": true,
  "idNumberSimilarity": 100,
  "expiryDateMatch": true,
  "expiryDateSimilarity": 100,
  "confidence": 100,
  "message": "ข้อมูลบัตรประชาชนตรงกับที่ระบบสแกนได้"
}
```

## Testing

### Test Case 1: Perfect Match
```
User provides:
- ID: 1234567890123
- Expiry: 2028-12-31

OCR extracts:
- ID: 1234567890123
- Expiry: 2028-12-31

Face confidence: 95%

Result: VERIFIED ✓
```

### Test Case 2: Borderline OCR
```
User provides:
- ID: 1234567890123
- Expiry: 2028-12-31

OCR extracts:
- ID: 1234567890124 (off by 1 digit)
- Expiry: 2028-12-31

Similarity: 92% (matches ≥75%)

Result: PENDING (need admin review)
```

### Test Case 3: OCR Rejected
```
User provides:
- ID: 1234567890123
- Expiry: 2028-12-31

OCR extracts:
- ID: 9876543210987
- Expiry: 2030-01-15

Similarity: 0% (no match)

Result: REJECTED (fraud alert)
```

### Test Case 4: Face Mismatch
```
User provides valid ID data

OCR: VERIFIED ✓
Face confidence: 45% (< 50 LOW_THRESHOLD)

Result: AUTO_REJECTED (face in ID doesn't match selfie)
```

## Audit Trail

All OCR data is stored in the database for admin review:

```javascript
user.ocrVerificationStatus   // VERIFIED, BORDERLINE, REJECTED
user.ocrData = {
  idNumber: "...",
  expiryDate: "...",
  name: "...",
  dateOfBirth: "...",
  gender: "...",
  address: "..."
}
```

Admin can view this data when reviewing PENDING users in the admin panel.

## Future Enhancements

1. **Support for other ID types** (passport, driver's license, etc.)
2. **Expiration date validation** - Reject expired IDs automatically
3. **Age verification** - Minimum age requirement check
4. **Regional support** - Different OCR providers for different countries
5. **Manual OCR override** - Admin interface to manually enter ID data for failed OCR
6. **Confidence thresholds** - Configurable thresholds for BORDERLINE classification
7. **Re-verification** - Allow users to resubmit OCR data for better quality

## Troubleshooting

### OCR API Error
```
"error": "OCR_API_FAILED"
```
- Check `OCR_API_KEY` in `.env`
- Check `OCR_API_URL` is reachable
- Verify image URL is valid and accessible

### Invalid Date Format
```
"dateMatch": false
```
- OCR returned unexpected date format
- Check Aigen API documentation for expected formats
- normalizeExpiryDate() handles: YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY

### High False Positive Rate
- Adjust similarity threshold (currently 75%)
- Review OCR extraction accuracy with Aigen support
- Check image quality requirements

## Files Modified

1. **src/services/ocr.service.js** (NEW)
   - OCR extraction and verification logic

2. **src/services/autoverify.service.js**
   - Added `autoVerifyUserWithOCR()` function
   - Integrated OCR + Face verification logic
   - Updated exports

3. **src/controllers/user.controller.js**
   - Updated `createUser()` to use `autoVerifyUserWithOCR()`
   - Enhanced notification messages with OCR details

4. **prisma/schema.prisma**
   - Added `ocrVerificationStatus` field
   - Added `ocrData` JSON field

5. **prisma/migrations/20260228132024_add_ocr_verification**
   - Database migration for new fields

## Rollback Instructions

If you need to revert the OCR integration:

```bash
# Revert database migration
npx prisma migrate resolve --rolled-back 20260228132024_add_ocr_verification

# Revert code changes (git)
git checkout src/services/autoverify.service.js
git checkout src/services/ocr.service.js
git checkout src/controllers/user.controller.js
git checkout prisma/schema.prisma

# Restore original createUser to use autoVerifyUser()
```

## Support

For issues with:
- **OCR extraction**: Contact Aigen API support
- **Face verification**: Contact Face++ API support
- **Integration logic**: Check logs in Node.js console
