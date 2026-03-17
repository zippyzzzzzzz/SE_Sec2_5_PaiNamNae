# Passenger Verification Robot Test Result

Run date: 2026-03-03
Suite: `test/Item04/UAT/passenger-verification/passenger_verification.robot`

## Summary
- Total: 6
- Passed: 5
- Failed: 1

## Test Result
| TC | Expected | Actual | Result |
|---|---|---|---|
| TC1 Face Match + Card Valid + OCR Match | PASS | `register status = 409` | FAIL |
| TC2 Face Match + Card Invalid + OCR Match | FAIL | `verificationStatus = AUTO_REJECTED` | PASS |
| TC3 Face Mismatch + Card Valid + OCR Match | FAIL | `verificationStatus = AUTO_REJECTED` | PASS |
| TC4 Face Match + Card Valid + OCR Mismatch | FAIL | `verificationStatus = AUTO_REJECTED` | PASS |
| TC5 Face Match + Card Invalid + OCR Mismatch | FAIL | `verificationStatus = AUTO_REJECTED` | PASS |
| TC6 Face Mismatch + Card Valid + OCR Mismatch | FAIL | `verificationStatus = AUTO_REJECTED` | PASS |

## Artifacts
- `output.xml`
- `log.html`
- `report.html`

All artifacts are in:
`test/Item04/UAT/passenger-verification/`
