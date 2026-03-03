# UAT Verification - Test Cases

These scenarios are a high‑level overview used by multiple suites (registration, driver verification, and general user checks). Each suite supplies concrete inputs; the intent is described below.

- **Successful auto‑verify**
  * Clear document and selfie, matching ID/expiry
  * Expect `VERIFIED` status, `isVerified=true`

- **Borderline or uncertain**
  * Slightly poor image quality or OCR/face confidence near thresholds
  * Expect `PENDING` status for manual review

- **Low confidence mismatch**
  * Bad images or mismatched selfie/document
  * Expect `AUTO_REJECTED`, user must retry or contact support

- **Data mismatch / OCR failure**
  * OCR extracted values don't match entered ID/expiry
  * Expect `AUTO_REJECTED`, error message suggests correction

- **Face comparison failure**
  * Document data correct but selfie does not resemble the ID/license
  * Expect `AUTO_REJECTED` (or possibly `PENDING` if OCR borderline)

Individual Robot test files then implement these cases with appropriate parameters.