const axios = require("axios");
const prisma = require("../utils/prisma");

const OCR_API_URL = process.env.OCR_API_URL || "https://api.aigen.online/aiscript/idcard/v2";
const OCR_API_KEY = process.env.AIGEN_OCR_KEY || process.env.OCR_API_KEY;

// --- Helper Functions ---
async function imageUrlToBase64(imageUrl) {
  const resp = await axios.get(imageUrl, { responseType: "arraybuffer", timeout: 20000 });
  return Buffer.from(resp.data, "binary").toString("base64");
}

/**
 * ฟังก์ชันหลักในการยิง API ไปหา AIGEN
 */
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
    // แก้ไข : ตรวจสอบว่าเป็น Object หรือไม่ ถ้าใช่ให้ดึงค่า .value ออกมา
const getVal = (field) => {
    if (!field) return null;
    return typeof field === 'object' ? field.value : field;
};

    // --- แก้ไข: รองรับทั้งเลข 13 หลัก (ID) และ 8 หลัก (Driving License) จากทุก Key ที่ AIGEN อาจส่งมา ---
    const idNumber = getVal(raw.id_number) || 
                 getVal(raw.dl_number) || 
                 getVal(raw.license_no) || 
                 getVal(raw.license_number);
                     
    // --- แก้ไข: ดึงวันหมดอายุจากฟิลด์ใบขับขี่ (doe_th / expiry_date_en) ---
   const expiryDate = getVal(raw.doe_th) || 
                   getVal(raw.expiry_date_th) || 
                   getVal(raw.expiry_date) || 
                   getVal(raw.doe_en);              

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

// --- การเตรียมข้อมูลก่อนเปรียบเทียบ ---
function normalizeIdNumber(idNumber) {
  if (!idNumber) return null;
  return String(idNumber).replace(/[\s\-]/g, "").trim();
}

function normalizeExpiryDate(dateStr) {
  if (!dateStr) return null;
  let date;
  // 1. ตรวจสอบ Format YYYY-MM-DD (ISO)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    date = new Date(dateStr);
  } 
  // 2. ตรวจสอบ Format MM/DD/YYYY หรือ DD/MM/YYYY
  else if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    const parts = dateStr.split("/");
    let month = parseInt(parts[0]);
    let day = parseInt(parts[1]);
    let year = parseInt(parts[2]);

    // สลับตำแหน่งถ้ากรอกมาแบบ 03/21/2568 (เดือน/วัน/ปี)
    // หากเลขตัวกลางเกิน 12 แสดงว่าเป็น 'วัน' แน่นอน
    if (month <= 12 && day > 12) {
      // ยืนยันว่าเป็น MM/DD/YYYY
    } else {
      // ถ้าไม่ใช่ ให้มองเป็น DD/MM/YYYY ตามมาตรฐานไทยปกติ
      [day, month] = [month, day];
    }

    // แก้ไขเรื่องปี พ.ศ. -> ค.ศ.
    if (year > 2400) {
      year -= 543;
    }

    date = new Date(year, month - 1, day);
  }
  
  if (isNaN(date?.getTime())) {
    return null;
  }
  
  // คืนค่าเป็น YYYY-MM-DD เสมอเพื่อใช้เปรียบเทียบกับ OCR
  return date.toISOString().split("T")[0];
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

// --- ฟังก์ชันยืนยันบัตรประชาชน (User ทั่วไป) ---
async function verifyIdCard(nationalIdPhotoUrl, userProvidedIdNumber, userProvidedExpiryDate) {
  const ocrResult = await extractIdCardData(nationalIdPhotoUrl);
  if (!ocrResult.ok) {
    return { verificationStatus: "AUTO_REJECTED", message: "สแกนไม่สำเร็จ", confidence: 0 };
  }

  const ocrData = ocrResult.data;
  const normalizedOcrId = normalizeIdNumber(ocrData.idNumber);
  const normalizedUserId = normalizeIdNumber(userProvidedIdNumber);
  
  // เปลี่ยนตรงนี้: จาก === เป็นการดู Similarity
  const idSimilarity = calculateSimilarity(normalizedOcrId, normalizedUserId);
  const idMatch = idSimilarity === 100;
  const dateMatch = normalizeExpiryDate(ocrData.expiryDate) === normalizeExpiryDate(userProvidedExpiryDate);

  // ตัดสินใจใหม่: ถ้าเลขตรงเป๊ะ = VERIFIED, ถ้าหน้าตรงแต่เลขเพี้ยนนิหน่อย = BORDERLINE
  let status = "AUTO_REJECTED";

  if (idSimilarity === 100 && dateMatch) {
    status = "VERIFIED";    // ตรงเป๊ะ -> ยอมยิง Face API ต่อ
  } else if (idSimilarity >= 80) {
    status = "BORDERLINE";  // เกือบตรง (ผิด 1-2 ตัว) -> ยอมยิง Face API ต่อ
  } else if (idSimilarity >= 30) {
    status = "NEEDS_REVIEW"; // พออ่านได้แต่ไม่ตรง -> ส่ง Admin (PENDING) ไม่ยิง Face API (ประหยัดเงิน)
  } else {
    status = "AUTO_REJECTED"; // ไม่ตรงเลย หรือรูปไม่ใช่บัตร -> ปัดตก (REJECTED) ไม่เสียเงิน ไม่รบกวน Admin
  }

 return {
    verificationStatus: status,
    ocrData,
    idNumberMatch: idMatch,
    idNumberSimilarity: idSimilarity, // ส่งค่านี้กลับไปดูด้วย
    expiryDateMatch: dateMatch,
    message: idMatch ? "ข้อมูลตรงกัน" : `เลขบัตรใกล้เคียง (${idSimilarity.toFixed(2)}%)`
  };
}


// --- ฟังก์ชันยืนยันใบขับขี่ (Driver) มีความยืดหยุ่นกว่าบัตรประชาชนเล็กน้อยด้วย Similarity ---
//1. ตรวจเลขใบขับขี่ + วันหมดอายุ (OCR)
async function verifyDrivingLicense(licensePhotoUrl, userProvidedLicenseNumber, userProvidedExpiryDate) {
  // 1. ดึงข้อมูลจากรูป
  const ocrResult = await extractIdCardData(licensePhotoUrl);
  
  if (!ocrResult.ok) {
    return { verificationStatus: "AUTO_REJECTED", error: ocrResult.error, confidence: 0 };
  }

  const ocrData = ocrResult.data;
  
  // 2. Normalize ข้อมูล
  const normalizedOcrId = normalizeIdNumber(ocrData.idNumber);
  const normalizedUserId = normalizeIdNumber(userProvidedLicenseNumber);
  const normalizedOcrDate = normalizeExpiryDate(ocrData.expiryDate);
  const normalizedUserDate = normalizeExpiryDate(userProvidedExpiryDate);
  
  // 3. คำนวณความเหมือน (ป้องกัน OCR อ่านผิดบางตัว)
  const idMatch = normalizedOcrId === normalizedUserId;
  const idSimilarity = calculateSimilarity(normalizedOcrId, normalizedUserId);
  const dateMatch = normalizedOcrDate === normalizedUserDate;

//  เพิ่ม Log ตรวจสอบค่าที่นี่
  console.log("[OCR_DEBUG] Comparison Results:", {
    ocrIdDetected: normalizedOcrId,
    userInputId: normalizedUserId,
    idSimilarity: idSimilarity.toFixed(2) + "%",
    ocrDateDetected: normalizedOcrDate,
    userInputDate: normalizedUserDate,
    isDateMatch: dateMatch
  });


  // 4. ตัดสินใจ
  let status = "AUTO_REJECTED";
  if (idSimilarity === 100 && dateMatch) {
  status = "VERIFIED";
} else if (idSimilarity >= 80) {
  status = "BORDERLINE";
} else if (idSimilarity >= 30) { // <--- เช็คตรงนี้! ถ้าเดิมเป็นเลขอื่น ให้แก้เป็น 30
  status = "NEEDS_REVIEW";
} else {
  status = "AUTO_REJECTED";
}

  console.log("[OCR_DEBUG] Final Decision Status:", status); // เพิ่ม Log

  return {
    verificationStatus: status,
    idNumberMatch: idMatch,
    expiryDateMatch: dateMatch,
    confidence: idSimilarity,
    ocrData: ocrData
  };
}

// --- Export ฟังก์ชัน ---
module.exports = {
  extractIdCardData,
  verifyIdCard, // สามารถเติม Logic คล้ายกันได้
  verifyDrivingLicense,
  normalizeIdNumber,
  normalizeExpiryDate,
  calculateSimilarity
};