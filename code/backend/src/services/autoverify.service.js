// services/autoverify.service.js

const prisma = require("../utils/prisma");
const { compareFaces } = require("./faceRecognition.service");
const {
  callAigenOCR,
  compareDriverLicense,
} = require("./ocr.service");

const DRIVER_FACE_THRESHOLD = parseFloat(
  process.env.DRIVER_AUTO_VERIFY_CONFIDENCE_THRESHOLD ||
  process.env.FACE_THRESHOLD ||
  75
);

async function autoVerifyDriverVerification(verification) {
  if (!verification?.licensePhotoUrl || !verification?.selfiePhotoUrl) {
    return { verified: false, status: "PENDING", error: "MISSING_PHOTOS" };
  }

  /* ===============================
     STEP 1: OCR
  =============================== */

  const ocrResult = await callAigenOCR({
    imageUrl: verification.licensePhotoUrl,
    documentType: "DRIVER_LICENSE",
  });

  if (!ocrResult.ok) {
    return { verified: false, status: "PENDING", error: ocrResult.error };
  }

  const isDataMatch = compareDriverLicense(
    verification.inputData,   // ต้องเก็บ input จาก frontend ไว้
    ocrResult.data
  );

  if (!isDataMatch) {
    await prisma.driverVerification.update({
      where: { id: verification.id },
      data: { status: "REJECTED" },
    });

    return {
      verified: false,
      status: "REJECTED",
      error: "DATA_MISMATCH",
    };
  }

  /* ===============================
     STEP 2: FACE RECOGNITION
  =============================== */

  const faceResult = await compareFaces({
    imageUrl1: verification.licensePhotoUrl,
    imageUrl2: verification.selfiePhotoUrl,
    apiKey: process.env.FACE_DRIVER_KEY || process.env.FACE_API_KEY,
    apiSecret:
      process.env.FACE_DRIVER_SECRET || process.env.FACE_API_SECRET,
  });

  if (!faceResult.ok) {
    return { verified: false, status: "PENDING", error: faceResult.error };
  }

  const verified = faceResult.confidence >= DRIVER_FACE_THRESHOLD;

  if (verified) {
    await prisma.$transaction(async (tx) => {
      await tx.driverVerification.update({
        where: { id: verification.id },
        data: { status: "APPROVED" },
      });

      await tx.user.update({
        where: { id: verification.userId },
        data: { isVerified: true, role: "DRIVER" },
      });
    });
  } else {
    await prisma.driverVerification.update({
      where: { id: verification.id },
      data: { status: "REJECTED" },
    });
  }

  return {
    verified,
    status: verified ? "APPROVED" : "REJECTED",
    confidence: faceResult.confidence,
    threshold: DRIVER_FACE_THRESHOLD,
  };
}

module.exports = {
  autoVerifyDriverVerification,
};