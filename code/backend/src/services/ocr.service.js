const axios = require("axios");
const prisma = require("../utils/prisma");

const OCR_API_URL = process.env.OCR_API_URL || "https://api.aigen.online/aiscript/idcard/v2";
const OCR_API_KEY = process.env.AIGEN_OCR_KEY || process.env.OCR_API_KEY;

async function imageUrlToBase64(imageUrl) {
  const resp = await axios.get(imageUrl, { responseType: "arraybuffer", timeout: 20000 });
  return Buffer.from(resp.data, "binary").toString("base64");
}

async function extractIdCardData(imageUrl) {
  console.log("[OCR] using key?", Boolean(OCR_API_KEY));
  if (!OCR_API_KEY) {
    return { ok: false, error: "OCR_API_NOT_CONFIGURED" };
  }

  try {
    const base64 = await imageUrlToBase64(imageUrl);
    const response = await axios.post(
      OCR_API_URL,
      { image: base64 },
      {
        headers: {
          "X-AIGEN-KEY": OCR_API_KEY,
          "Content-Type": "application/json",
        },
        timeout: 20000,
      }
    );

    const raw = response.data?.data?.[0] || response.data;
    if (!raw) {
      return { ok: false, error: "INVALID_OCR_RESPONSE" };
    }

    const idNumber = raw.id_number?.value || raw.id_number;
    const expiryDate = raw.doe_th?.value || raw.expiry_date || raw.expiry_date_th;

    if (idNumber) {
      return {
        ok: true,
        data: {
          idNumber,
          expiryDate,
          name: raw.title_name_surname_th?.value || raw.name || null,
          dateOfBirth: raw.date_of_birth || raw.dob || null,
          gender: raw.gender || null,
          address: raw.address_full?.value || raw.address || null,
          fullResponse: response.data,
        },
      };
    }
    return { ok: false, error: "INVALID_OCR_RESPONSE" };
  } catch (err) {
    console.error("OCR extraction failed:", err.response?.data || err.message);
    return {
      ok: false,
      error: err.response?.data?.message || err.response?.data || "OCR_API_FAILED",
    };
  }
}


function normalizeIdNumber(idNumber) {
  if (!idNumber) return null;
  return String(idNumber).replace(/[\s\-]/g, "").trim();
}

function normalizeExpiryDate(dateStr) {
  if (!dateStr) return null;
  
  let date;
  
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    date = new Date(dateStr);
  }
  // DD/MM/YYYY
  else if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    const [day, month, year] = dateStr.split("/");
    date = new Date(`${year}-${month}-${day}`);
  }
  // MM/DD/YYYY
  else if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    const [month, day, year] = dateStr.split("/");
    date = new Date(`${year}-${month}-${day}`);
  }
  
  if (isNaN(date?.getTime())) {
    return null;
  }
  
  return date.toISOString().split("T")[0]; // Return YYYY-MM-DD
}

function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  
  const s1 = String(str1).toLowerCase().trim();
  const s2 = String(str2).toLowerCase().trim();
  
  if (s1 === s2) return 100;
  
  let matches = 0;
  const maxLen = Math.max(s1.length, s2.length);
  
  for (let i = 0; i < Math.min(s1.length, s2.length); i++) {
    if (s1[i] === s2[i]) matches++;
  }
  
  return (matches / maxLen) * 100;
}

async function verifyIdCard(
  nationalIdPhotoUrl,
  userProvidedIdNumber,
  userProvidedExpiryDate
) {
  // Extract data from OCR
  const ocrResult = await extractIdCardData(nationalIdPhotoUrl);
  
  if (!ocrResult.ok) {
    return {
      verificationStatus: "AUTO_REJECTED",
      error: ocrResult.error,
      message: "ไม่สามารถสแกนบัตรประชาชนได้ กรุณาส่งรูปที่ชัดเจนขึ้น",
      confidence: 0,
    };
  }

  const ocrData = ocrResult.data;
  
  // Normalize values for comparison
  const normalizedOcrId = normalizeIdNumber(ocrData.idNumber);
  const normalizedUserId = normalizeIdNumber(userProvidedIdNumber);
  
  const normalizedOcrDate = normalizeExpiryDate(ocrData.expiryDate);
  const normalizedUserDate = normalizeExpiryDate(userProvidedExpiryDate);
  
  // Check ID number match
  const idNumberMatch = normalizedOcrId === normalizedUserId;
  const idNumberSimilarity = calculateSimilarity(
    normalizedOcrId,
    normalizedUserId
  );
  
  // Check expiry date match (exact date or within 1 day tolerance)
  const expiryDateMatch =
    normalizedOcrDate === normalizedUserDate ||
    (normalizedOcrDate &&
      normalizedUserDate &&
      Math.abs(
        new Date(normalizedOcrDate) - new Date(normalizedUserDate)
      ) <= 86400000); // 1 day in ms
  
  const expiryDateSimilarity = expiryDateMatch ? 100 : calculateSimilarity(
    normalizedOcrDate || "",
    normalizedUserDate || ""
  );
  
  // Calculate overall confidence
  const confidence = (idNumberSimilarity + expiryDateSimilarity) / 2;
  
  // Determine verification status
  let verificationStatus;
  let message;
  
  if (idNumberMatch && expiryDateMatch) {
    
    verificationStatus = "VERIFIED";
    message = "ข้อมูลบัตรประชาชนตรงกับที่ระบบสแกนได้";
  } else if (confidence >= 75) {

    verificationStatus = "BORDERLINE";
    message = "ข้อมูลบัตรประชาชนใกล้เคียง รอการตรวจสอบเพิ่มเติม";
  } else {

    verificationStatus = "AUTO_REJECTED";
    message = "ข้อมูลบัตรประชาชนไม่ตรงกับข้อมูลที่ระบบสแกนได้";
  }
  
  return {
    verificationStatus,
    ocrData: {
      idNumber: ocrData.idNumber,
      expiryDate: ocrData.expiryDate,
      name: ocrData.name,
      dateOfBirth: ocrData.dateOfBirth,
    },
    idNumberMatch,
    idNumberSimilarity: Math.round(idNumberSimilarity * 100) / 100,
    expiryDateMatch,
    expiryDateSimilarity: Math.round(expiryDateSimilarity * 100) / 100,
    confidence: Math.round(confidence * 100) / 100,
    message,
  };
}

module.exports = {
  extractIdCardData,
  verifyIdCard,
  normalizeIdNumber,
  normalizeExpiryDate,
};
