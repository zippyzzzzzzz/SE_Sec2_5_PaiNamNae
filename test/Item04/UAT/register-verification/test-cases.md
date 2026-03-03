# UAT Register Verification - Test Cases

- **TC1 – High confidence (VERIFIED)**
  * Images: clear `id.png` + `selfie.png`
  * Same ID and expiry
  * Expect DB status `VERIFIED`, `isVerified` true
  * Reason: OCR match & face match high → auto approved

- **TC2 – Borderline (PENDING)**
  * Images: valid id but similar `selfie.jpg`
  * Same ID and expiry
  * Expect DB status `PENDING`, `isVerified` false
  * Reason: OCR or face confidence middling → wait for manual review

- **TC3 – Low confidence (REJECTED)**
  * Images: clear `id.jpg` + mismatched `selfie.jpg`
  * Same ID and expiry
  * Expect DB `AUTO_REJECTED`, `isVerified` false
  * Reason: confidence too low → auto reject

- **TC4 – OCR mismatch (REJECTED)**
  * Images: clear `id.png` + `selfie.png`
  * Wrong id data `4444444444444`
  * Expect DB `AUTO_REJECTED`, `isVerified` false
  * Reason: OCR data doesn’t match the supplied number

- **TC5 – Face mismatch (REJECTED)**
  * Images: valid id but wrong `selfie.jpg`
  * Expect DB `AUTO_REJECTED`, `isVerified` false
  * Reason: face comparison fails
