# Driver Verification Robot Test Result

Run date: 2026-03-03  
Suite: `test/Item04/UAT/driver-verification/driver_verification.robot`

## Summary
- Total: 6
- Passed: 6
- Failed: 0

## Test Result
| TC | Expected | Actual | Result |
|---|---|---|---|
| TC1 Face Match + Card Valid + OCR Match | PASS | `status = APPROVED` | PASS |
| TC2 Face Match + Card Invalid + OCR Match | FAIL | `status = REJECTED` | PASS |
| TC3 Face Mismatch + Card Valid + OCR Match | FAIL | `status = REJECTED` | PASS |
| TC4 Face Match + Card Valid + OCR Mismatch | FAIL | `status = REJECTED` | PASS |
| TC5 Face Match + Card Invalid + OCR Mismatch | FAIL | `status = REJECTED` | PASS |
| TC6 Face Mismatch + Card Valid + OCR Mismatch | FAIL | `status = REJECTED` | PASS |

## Artifacts
- `output.xml`
- `log.html`
- `report.html`

All artifacts are in:
`test/Item04/UAT/driver-verification/`
