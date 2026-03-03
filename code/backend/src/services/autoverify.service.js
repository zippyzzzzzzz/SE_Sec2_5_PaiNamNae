const axios = require("axios");
const FormData = require("form-data");
const prisma = require("../utils/prisma");
//  Import ทั้ง verifyIdCard และ verifyDrivingLicense มาใช้งาน
const { verifyIdCard, verifyDrivingLicense } = require("./ocr.service");

const USER_FACE_HIGH_THRESHOLD = parseFloat(
  process.env.USER_AUTO_VERIFY_CONFIDENCE_THRESHOLD ||
  process.env.AUTO_VERIFY_FACE_THRESHOLD ||
  process.env.FACE_THRESHOLD || 75
);
const USER_FACE_LOW_THRESHOLD = parseFloat(
  process.env.USER_AUTO_VERIFY_LOW_CONFIDENCE_THRESHOLD ||
  process.env.USER_AUTO_VERIFY_LOW_THRESHOLD || 50
);

const DRIVER_FACE_THRESHOLD = parseFloat(
  process.env.DRIVER_AUTO_VERIFY_CONFIDENCE_THRESHOLD ||
  process.env.FACE_DRIVER_THRESHOLD ||
  process.env.AUTO_VERIFY_FACE_THRESHOLD ||
  process.env.FACE_THRESHOLD || 75
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
    status = "VERIFIED"; 
    updateData.isVerified = true;
    updateData.verificationStatus = status;
  } else if (conf < USER_FACE_LOW_THRESHOLD) {
    status = "AUTO_REJECTED"; 
    updateData.verificationStatus = status;
  } else {
    status = "PENDING"; 
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

async function autoVerifyUserWithOCR(user) {
  if (!user?.nationalIdPhotoUrl || !user?.selfiePhotoUrl) {
    return { verified: false, error: "MISSING_PHOTOS", status: "PENDING" };
  }

  if (!user?.nationalIdNumber || !user?.nationalIdExpiryDate) {
    return { verified: false, error: "MISSING_ID_INFO", status: "PENDING" };
  }

  //verivy ID card data via OCR first
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

  //verify OCR result before doing face comparison - if OCR fails (AUTO_REJECTED) then no need to do face comparison as we already know it won't verify
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

  //combine OCR and face verification results to determine final verification status
  let finalStatus;
  const updateData = {
    autoVerifyConfidence: faceConfidence,
    autoVerifyHighThreshold: USER_FACE_HIGH_THRESHOLD,
    autoVerifyLowThreshold: USER_FACE_LOW_THRESHOLD,
    ocrVerificationStatus: ocrResult.verificationStatus, 
    ocrData: ocrResult.ocrData, 
  };

  const ocrVerified = ocrResult.verificationStatus === "VERIFIED";
  const ocrBorderline = ocrResult.verificationStatus === "BORDERLINE";
  const ocrAutoRejected = ocrResult.verificationStatus === "AUTO_REJECTED";
  const faceHighConfidence = faceConfidence >= USER_FACE_HIGH_THRESHOLD;
  const faceLowConfidence = faceConfidence < USER_FACE_LOW_THRESHOLD;
  console.log("[AutoVerify] ocrVerified",ocrVerified,"ocrBorderline",ocrBorderline,"ocrAutoRejected",ocrAutoRejected);
  console.log("[AutoVerify] faceHigh",faceHighConfidence,"faceLow",faceLowConfidence);

  if (ocrAutoRejected) {
    
    finalStatus = "AUTO_REJECTED";
  } else if (ocrBorderline || (ocrVerified && (faceConfidence >= USER_FACE_LOW_THRESHOLD && faceConfidence < USER_FACE_HIGH_THRESHOLD))) {
    
    finalStatus = "PENDING";
  } else if (ocrVerified && faceHighConfidence) {
    
    finalStatus = "VERIFIED";
    updateData.isVerified = true;
  } else if (ocrVerified && faceLowConfidence) {
    
    finalStatus = "AUTO_REJECTED";
  } else {
    
    finalStatus = "PENDING";
  }
  console.log("[AutoVerify] finalStatus", finalStatus);

  updateData.verificationStatus = finalStatus;

  //update user
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
        ? "Match"
        : faceLowConfidence
        ? "Mismatch"
        : "Borderline"
    }`,
  };
}

async function autoVerifyDriverVerification(verification) {
  // 1. ตรวจสอบว่ามีรูปภาพครบถ้วนไหม
  if (!verification?.licensePhotoUrl || !verification?.selfiePhotoUrl) {
    return { verified: false, status: "PENDING", error: "MISSING_PHOTOS" };
  }

  // --- เพิ่ม: ตรวจ OCR ก่อน ---
  console.log("[DriverVerify] Starting OCR License verification...");
  const ocrResult = await verifyDrivingLicense(
    verification.licensePhotoUrl,
    verification.licenseNumber, // เลขใบขับขี่ที่ User กรอก
    verification.licenseExpiryDate
  );

  console.log("[DriverVerify] OCR Decision:", ocrResult.verificationStatus);

  // เคสที่ 1: แย่มาก ปัดตกเลย
  if (ocrResult.verificationStatus === "AUTO_REJECTED") {
    console.log("[DriverVerify] OCR very low confidence. Rejecting immediately to save cost.");
    await updateDriverStatus(verification, "REJECTED");
    return { 
      verified: false, 
      status: "REJECTED", 
      error: "OCR_REJECTED", 
      message: "ข้อมูลไม่ตรงกับรูปภาพอย่างรุนแรง โปรดถ่ายรูปบัตรให้ชัดเจน" 
    };
  }

  // เคสที่ 2: พออ่านได้แต่ไม่ตรง (ส่งแอดมิน แต่ไม่จ่ายเงินค่า Face API)
  if (ocrResult.verificationStatus === "NEEDS_REVIEW") {
    console.log("[DriverVerify] OCR mismatch but readable. Sending to PENDING without Face API.");
    await updateDriverStatus(verification, "PENDING");
    return { 
      verified: false, 
      status: "PENDING", 
      message: "ข้อมูลไม่ชัดเจน กำลังรอเจ้าหน้าที่ตรวจสอบรูปภาพเบื้องต้น" 
    };
  }

  
  // เคสที่ 3: ข้อมูล OCR ผ่านเกณฑ์ (>= 80%) ถึงจะยอมจ่ายเงินยิง Face API
  console.log("[DriverVerify] OCR passed threshold. Starting face comparison...");
  // --- ตรวจใบหน้า ---
  const result = await compareFaces(
    verification.licensePhotoUrl,
    verification.selfiePhotoUrl,
    process.env.FACE_DRIVER_KEY || process.env.FACE_API_KEY,
    process.env.FACE_DRIVER_SECRET || process.env.FACE_API_SECRET
  );

  if (!result.ok) {
      await updateDriverStatus(verification, "PENDING"); // ถ้า Face API ล่ม ให้แอดมินตรวจมือ
      return { verified: false, status: "PENDING", error: result.error };
  }

  const faceConfidence = result.confidence;
  const facePassed = faceConfidence >= DRIVER_FACE_THRESHOLD;

  //  [Decision Engine] สรุปผล: ต้องผ่านทั้ง OCR (VERIFIED/BORDERLINE) และ Face Match ถึงจะ APPROVED
  // ถ้า OCR เป็น BORDERLINE แต่หน้าตรงเป๊ะ เราอาจจะส่งให้ Admin ตรวจต่อ (PENDING)
  let finalStatus;
  if (facePassed && ocrResult.verificationStatus === "VERIFIED") {
    finalStatus = "APPROVED";
  } else if (!facePassed) {
    finalStatus = "REJECTED"; // หน้าไม่เหมือน ปัดตกทันที
  } else {
    finalStatus = "PENDING";  // กรณีหน้าเหมือนแต่ OCR ก้ำกึ่ง (BORDERLINE)
  }

  //  [DB Update] บันทึกผลลง Database
  await updateDriverStatus(verification, finalStatus);

  return {
    verified: finalStatus === "APPROVED",
    status: finalStatus,
    confidence: faceConfidence,
    threshold: DRIVER_FACE_THRESHOLD,
    ocrStatus: ocrResult.verificationStatus,
    message: finalStatus === "APPROVED" ? "ยืนยันผู้ขับขี่สำเร็จ" : "ข้อมูลไม่ชัดเจนหรือชื่อไม่ตรง"
  };

  // [Helper Function] แยก Logic การอัปเดตตารางเพื่อความสะอาดของโค้ด
  async function updateDriverStatus(verification, status) {
  return await prisma.$transaction(async (tx) => {
    // อัปเดตตารางใบขออนุมัติ
    await tx.driverVerification.update({
      where: { id: verification.id },
      data: { status: status },
    });

    if (status === "APPROVED") {
      // ถ้าผ่าน ให้เป็น DRIVER
      await tx.user.update({
        where: { id: verification.userId },
        data: { role: "DRIVER" },
      });
    } else if (status === "REJECTED") {
      // ถ้าไม่ผ่าน ให้กลับเป็น PASSENGER และยกเลิกงาน
      await tx.user.update({
        where: { id: verification.userId },
        data: { role: "PASSENGER" },
      });
      await tx.route.updateMany({
        where: { driverId: verification.userId, status: "AVAILABLE" },
        data: { status: "CANCELLED" },
      });
    }
  });
}

}


module.exports = {
  autoVerifyUser,
  autoVerifyUserWithOCR,
  autoVerifyDriverVerification,
};
