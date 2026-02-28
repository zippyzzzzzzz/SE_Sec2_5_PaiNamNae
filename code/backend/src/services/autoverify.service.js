const axios = require("axios");
const FormData = require("form-data");
const prisma = require("../utils/prisma");

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
  autoVerifyDriverVerification,
};
