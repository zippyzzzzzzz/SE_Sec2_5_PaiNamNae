# UAT Verification - Test Design

This document describes the overall test design for automatic identity verification in various user flows.

## Goal

Ensure that the system correctly processes OCR and face comparisons and reflects the result both in the database and on the user interface.

## Approach

- Use Robot Framework with Selenium to simulate user interactions (form submission, file upload).
- Query the PostgreSQL database to verify the recorded verification statuses and related data.
- Maintain separate Robot suites per workflow but share common keywords for submission and validation.

## Key logic

1. **OCR extraction** from documents produces a status (`VERIFIED`, `BORDERLINE`, `AUTO_REJECTED`) based on matching confidence.
2. **Face comparison** yields a confidence score evaluated against configured high/low thresholds.
3. **Result combination** drives final status:
   * OCR auto‑rejected → final `AUTO_REJECTED`
   * OCR borderline or face borderline → final `PENDING`
   * OCR verified + high face confidence → final `VERIFIED` (`isVerified=true`)
   * OCR verified + low face confidence → final `AUTO_REJECTED`

## Environment

- Application accessible at `${BASE_URL}`
- Database connection to the UAT environment
- OCR and face API keys set in environment variables

## Execution

Each Robot suite:

1. Creates a temporary user.
2. Fills the form, uploads document and selfie, enters ID/expiry.
3. Waits for back‑end processing and checks DB state.
4. Visits the profile page to confirm UI badge/status.
5. Deletes the test user record when done.

This design ensures consistency across all verification-related UAT testing.
