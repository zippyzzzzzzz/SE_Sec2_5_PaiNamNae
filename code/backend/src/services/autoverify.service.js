const axios = require("axios");
const FormData = require("form-data");
const prisma = require("../utils/prisma");
const { verifyIdCard } = require("./ocr.service");

// two levels of thresholds: low = auto reject, high = auto approve
const USER_FACE_HIGH_THRESHOLD = parseFloat(
  process.env.USER_AUTO_VERIFY_CONFIDENCE_THRESHOLD ||
  process.env.AUTO_VERIFY_FACE_THRESHOLD ||
  process.env.FACE_THRESHOLD ||
  75
);
const USER_FACE_LOW_THRESHOLD = parseFloat(
  process.env.USER_AUTO_VERIFY_LOW_CONFIDENCE_THRESHOLD ||
  process.env.USER_AUTO_VERIFY_LOW_THRESHOLD ||
  // default  lower value (e.g. 50)
  50
);

const DRIVER_FACE_THRESHOLD = parseFloat(
  process.env.DRIVER_AUTO_VERIFY_CONFIDENCE_THRESHOLD ||
  process.env.FACE_DRIVER_THRESHOLD ||
  process.env.AUTO_VERIFY_FACE_THRESHOLD ||
  process.env.FACE_THRESHOLD ||
  75
);

const FACE_API_DISABLE_PROXY =
  String(process.env.FACE_API_DISABLE_PROXY ?? "true").toLowerCase() !==
  "false";

async function compareFaces(imageUrl1, imageUrl2, apiKey, apiSecret) {
  if (!apiKey || !apiSecret) {
    return { ok: false, error: "FACE_API_NOT_CONFIGURED" };
  }

  const form = new FormData();
  form.append("api_key", apiKey);
  form.append("api_secret", apiSecret);
  form.append("image_url1", imageUrl1);
  form.append("image_url2", imageUrl2);

  try {
    const response = await axios.post(
      "https://api-us.faceplusplus.com/facepp/v3/compare",
      form,
      {
        headers: form.getHeaders(),
        timeout: 20000,
        ...(FACE_API_DISABLE_PROXY ? { proxy: false } : {}),
      }
    );

    return { ok: true, confidence: Number(response?.data?.confidence || 0) };
  } catch (err) {
    console.error("Auto verify failed:", err.response?.data || err.message);
    return { ok: false, error: "FACE_API_FAILED" };
  }
}

async function autoVerifyUser(user) {
  if (!user?.nationalIdPhotoUrl || !user?.selfiePhotoUrl) {
    return { verified: false, error: "MISSING_PHOTOS", status: "PENDING" };
  }

  const result = await compareFaces(
    user.nationalIdPhotoUrl,
    user.selfiePhotoUrl,
    process.env.FACE_API_KEY,
    process.env.FACE_API_SECRET
  );
  if (!result.ok) return { verified: false, error: result.error, status: "PENDING" };

  const conf = result.confidence;
  let status;
  const updateData = {
      autoVerifyConfidence: conf,
      autoVerifyHighThreshold: USER_FACE_HIGH_THRESHOLD,
      autoVerifyLowThreshold: USER_FACE_LOW_THRESHOLD,
  };
  if (conf >= USER_FACE_HIGH_THRESHOLD) {
    status = "VERIFIED"; // auto approve
    updateData.isVerified = true;
    updateData.verificationStatus = status;
  } else if (conf < USER_FACE_LOW_THRESHOLD) {
    status = "AUTO_REJECTED"; // too low, do not bother admin
    updateData.verificationStatus = status;
  } else {
    status = "PENDING"; // borderline, wait for admin review
    updateData.verificationStatus = status;
  }
  await prisma.user.update({
      where: { id: user.id },
      data: updateData,
  });

  return {
    verified: status === "VERIFIED",
    status,
    confidence: conf,
    highThreshold: USER_FACE_HIGH_THRESHOLD,
    lowThreshold: USER_FACE_LOW_THRESHOLD,
  };
}

/**
 * Integrated verification: combines OCR (ID card data) + Face (photo comparison)
 * Used during user registration
 * @param {Object} user - User object with photos and ID info
 * @returns {Object} Verification result with combined status
 */
async function autoVerifyUserWithOCR(user) {
  if (!user?.nationalIdPhotoUrl || !user?.selfiePhotoUrl) {
    return { verified: false, error: "MISSING_PHOTOS", status: "PENDING" };
  }

  if (!user?.nationalIdNumber || !user?.nationalIdExpiryDate) {
    return { verified: false, error: "MISSING_ID_INFO", status: "PENDING" };
  }

  // Step 1: Verify ID Card data via OCR
  console.log("[AutoVerify] Starting OCR ID card verification...");
  const ocrResult = await verifyIdCard(
    user.nationalIdPhotoUrl,
    user.nationalIdNumber,
    user.nationalIdExpiryDate
  );

  console.log("[AutoVerify] OCR Result:", {
    status: ocrResult.verificationStatus,
    confidence: ocrResult.confidence,
    idMatch: ocrResult.idNumberMatch,
    dateMatch: ocrResult.expiryDateMatch,
  });

  // Step 2: Verify Face match via Face++ API
  console.log("[AutoVerify] Starting face comparison verification...");
  const faceResult = await compareFaces(
    user.nationalIdPhotoUrl,
    user.selfiePhotoUrl,
    process.env.FACE_API_KEY,
    process.env.FACE_API_SECRET
  );

  if (!faceResult.ok) {
    console.log("[AutoVerify] Face comparison failed:", faceResult.error);
    return { 
      verified: false, 
      error: faceResult.error, 
      status: "PENDING",
      ocrVerification: ocrResult,
    };
  }

  const faceConfidence = faceResult.confidence;
  console.log("[AutoVerify] Face Confidence:", faceConfidence);
  console.log("[AutoVerify] thresholds high/low", USER_FACE_HIGH_THRESHOLD, USER_FACE_LOW_THRESHOLD);

  // Step 3: Combine OCR + Face results for final status
  let finalStatus;
  const updateData = {
    autoVerifyConfidence: faceConfidence,
    autoVerifyHighThreshold: USER_FACE_HIGH_THRESHOLD,
    autoVerifyLowThreshold: USER_FACE_LOW_THRESHOLD,
    ocrVerificationStatus: ocrResult.verificationStatus, // Store OCR result
    ocrData: ocrResult.ocrData, // Store extracted data for audit
  };

  // Decision logic:
  // - If OCR verification failed (AUTO_REJECTED - extraction failed OR data mismatch) → overall AUTO_REJECTED
  // - If OCR is borderline OR face is borderline → PENDING (needs admin review)
  // - If OCR is verified AND face is high confidence → VERIFIED (auto-approve)
  // - If OCR is verified AND face is low confidence → AUTO_REJECTED (face mismatch)

  const ocrVerified = ocrResult.verificationStatus === "VERIFIED";
  const ocrBorderline = ocrResult.verificationStatus === "BORDERLINE";
  const ocrAutoRejected = ocrResult.verificationStatus === "AUTO_REJECTED";
  const faceHighConfidence = faceConfidence >= USER_FACE_HIGH_THRESHOLD;
  const faceLowConfidence = faceConfidence < USER_FACE_LOW_THRESHOLD;
  console.log("[AutoVerify] ocrVerified",ocrVerified,"ocrBorderline",ocrBorderline,"ocrAutoRejected",ocrAutoRejected);
  console.log("[AutoVerify] faceHigh",faceHighConfidence,"faceLow",faceLowConfidence);

  if (ocrAutoRejected) {
    // OCR verification failed - either extraction failed or data doesn't match
    finalStatus = "AUTO_REJECTED";
  } else if (ocrBorderline || (ocrVerified && (faceConfidence >= USER_FACE_LOW_THRESHOLD && faceConfidence < USER_FACE_HIGH_THRESHOLD))) {
    // Either OCR is borderline, OR OCR passed but face is borderline
    finalStatus = "PENDING";
  } else if (ocrVerified && faceHighConfidence) {
    // Both OCR and face verification passed
    finalStatus = "VERIFIED";
    updateData.isVerified = true;
  } else if (ocrVerified && faceLowConfidence) {
    // OCR passed but face confidence is too low - clear photo mismatch
    finalStatus = "AUTO_REJECTED";
  } else {
    // Safe default: require admin review
    finalStatus = "PENDING";
  }
  console.log("[AutoVerify] finalStatus", finalStatus);

  updateData.verificationStatus = finalStatus;

  // Update user with combined verification results
  await prisma.user.update({
    where: { id: user.id },
    data: updateData,
  });

  return {
    verified: finalStatus === "VERIFIED",
    status: finalStatus,
    faceConfidence,
    faceHighThreshold: USER_FACE_HIGH_THRESHOLD,
    faceLowThreshold: USER_FACE_LOW_THRESHOLD,
    ocrVerification: ocrResult,
    combinedMessage: `ID Card: ${ocrResult.message} | Face: ${
      faceHighConfidence
        ? "일치 (높은 신뢰도)"
        : faceLowConfidence
        ? "불일치 (낮은 신뢰도)"
        : "근접한 일치 (관리자 검토 필요)"
    }`,
  };
}

async function autoVerifyDriverVerification(verification) {
  if (!verification?.licensePhotoUrl || !verification?.selfiePhotoUrl) {
    return { verified: false, status: "PENDING", error: "MISSING_PHOTOS" };
  }

  const result = await compareFaces(
    verification.licensePhotoUrl,
    verification.selfiePhotoUrl,
    process.env.FACE_DRIVER_KEY || process.env.FACE_API_KEY,
    process.env.FACE_DRIVER_SECRET || process.env.FACE_API_SECRET
  );
  if (!result.ok) return { verified: false, status: "PENDING", error: result.error };

  const verified = result.confidence >= DRIVER_FACE_THRESHOLD;
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
    await prisma.$transaction(async (tx) => {
      await tx.driverVerification.update({
        where: { id: verification.id },
        data: { status: "REJECTED" },
      });
      await tx.user.update({
        where: { id: verification.userId },
        data: { isVerified: false, role: "PASSENGER" },
      });
      await tx.route.updateMany({
        where: {
          driverId: verification.userId,
          status: "AVAILABLE",
        },
        data: {
          status: "CANCELLED",
        },
      });
    });
  }

  return {
    verified,
    status: verified ? "APPROVED" : "REJECTED",
    confidence: result.confidence,
    threshold: DRIVER_FACE_THRESHOLD,
  };
}

module.exports = {
  autoVerifyUser,
  autoVerifyUserWithOCR,
  autoVerifyDriverVerification,
};
