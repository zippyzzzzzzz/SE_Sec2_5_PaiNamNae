const axios = require("axios");

/* =====================================================
   CONFIG
===================================================== */

const AIGEN_BASE_URL = "https://api.aigen.online/aiscript";
const ID_CARD_URL = `${AIGEN_BASE_URL}/idcard/v2`;
const DRIVER_LICENSE_URL = `${AIGEN_BASE_URL}/driver-license/v1`;

const AIGEN_KEY = process.env.AIGEN_OCR_KEY;

if (!AIGEN_KEY) {
  console.warn("⚠️  AIGEN_OCR_KEY is not configured");
}

/* =====================================================
   UTILS
===================================================== */

function normalizeText(text) {
  return text?.toString().trim().toLowerCase();
}

function normalizeDate(date) {
  if (!date) return null;
  try {
    return new Date(date).toISOString().split("T")[0];
  } catch {
    return null;
  }
}

async function imageUrlToBase64(imageUrl) {
  const response = await axios.get(imageUrl, {
    responseType: "arraybuffer",
    timeout: 20000,
  });

  const buffer = Buffer.from(response.data, "binary");
  return buffer.toString("base64");
}

/* =====================================================
   CORE OCR CALL
===================================================== */

async function callAigen(endpoint, base64Image) {
  try {
    const response = await axios.post(
      endpoint,
      { image: base64Image },
      {
        headers: {
          "X-AIGEN-KEY": AIGEN_KEY,
          "Content-Type": "application/json",
        },
        timeout: 20000,
      }
    );

    return {
      ok: true,
      raw: response.data,
    };
  } catch (err) {
    console.error(
      "AIGEN OCR error:",
      err.response?.data || err.message
    );

    return {
      ok: false,
      error: "OCR_FAILED",
    };
  }
}

/* =====================================================
   NATIONAL ID
===================================================== */

function mapNationalId(raw) {
  const data = raw?.data?.[0];
  if (!data) return null;

  return {
    idNumber: data.id_number?.value,
    expiryDateTh: data.doe_th?.value,
    issueDateTh: data.doi_th?.value,
    fullNameTh: data.title_name_surname_th?.value,
    addressFull: data.address_full?.value,
  };
}

async function scanNationalId(imageUrl) {
  if (!AIGEN_KEY) {
    return { ok: false, error: "OCR_API_NOT_CONFIGURED" };
  }

  try {
    const base64Image = await imageUrlToBase64(imageUrl);
    const result = await callAigen(ID_CARD_URL, base64Image);

    if (!result.ok) return result;

    const mapped = mapNationalId(result.raw);

    if (!mapped) {
      return { ok: false, error: "INVALID_OCR_RESPONSE" };
    }

    return { ok: true, data: mapped };
  } catch (err) {
    console.error("scanNationalId error:", err.message);
    return { ok: false, error: "IMAGE_FETCH_FAILED" };
  }
}

function compareNationalId(userInput, ocrData) {
  return (
    userInput.nationalId === ocrData?.idNumber
  );
}

/* =====================================================
   DRIVER LICENSE
===================================================== */

function mapDriverLicense(raw) {
  const data = raw?.data?.[0];
  if (!data) return null;

  return {
    firstName: data.first_name?.value,
    lastName: data.last_name?.value,
    licenseNumber: data.license_number?.value,
    licenseType: data.license_type?.value,
    issueDate: data.issue_date?.value,
    expiryDate: data.expiry_date?.value,
  };
}

async function scanDriverLicense(imageUrl) {
  if (!AIGEN_KEY) {
    return { ok: false, error: "OCR_API_NOT_CONFIGURED" };
  }

  try {
    const base64Image = await imageUrlToBase64(imageUrl);
    const result = await callAigen(DRIVER_LICENSE_URL, base64Image);

    if (!result.ok) return result;

    const mapped = mapDriverLicense(result.raw);

    if (!mapped) {
      return { ok: false, error: "INVALID_OCR_RESPONSE" };
    }

    return { ok: true, data: mapped };
  } catch (err) {
    console.error("scanDriverLicense error:", err.message);
    return { ok: false, error: "IMAGE_FETCH_FAILED" };
  }
}

function compareDriverLicense(userInput, ocrData) {
  return (
    normalizeText(userInput.firstName) === normalizeText(ocrData?.firstName) &&
    normalizeText(userInput.lastName) === normalizeText(ocrData?.lastName) &&
    userInput.licenseNumber === ocrData?.licenseNumber
  );
}

/* =====================================================
   EXPORT
===================================================== */

module.exports = {
  scanNationalId,
  scanDriverLicense,
  compareNationalId,
  compareDriverLicense,
};