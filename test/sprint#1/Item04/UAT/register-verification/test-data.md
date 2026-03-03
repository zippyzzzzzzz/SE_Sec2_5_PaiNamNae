# UAT Register Verification - Test Data

- **images/TC1/id.png** – photo of a valid Thai national ID card.
- **images/TC1/selfie.png** – clear selfie of the same person.
- **images/TC2/id.jpg** – photo of a valid Thai national ID card.
- **images/TC2/selfie.jpg** – clear selfie of the different person that look similar.
- **images/TC3/id.jpg** – photo of a valid Thai national ID card.
- **images/TC3/selfie.jpg** – random selfie that does not match the ID.
- **images/TC4/id.png** – photo of a valid Thai national ID card but the entered id `4444444444444` does not match.
- **images/TC4/selfie.png** – clear selfie of the same person.
- **images/TC5/id.png** – photo of a valid Thai national ID card.
- **images/TC5/selfie.jpg** - random selfie that does not match the ID.

Numeric test values:

- National ID for valid cases: `3411700830334`.
- Expiry date for valid cases: `21-03-2025T00:00:00.000Z`.

Generated user data such as email and username are randomized by the Robot keyword `Generate Random String` 