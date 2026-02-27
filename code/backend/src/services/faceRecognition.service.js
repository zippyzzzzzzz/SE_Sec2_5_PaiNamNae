// services/faceRecognition.service.js

const axios = require("axios");
const FormData = require("form-data");

const FACE_API_DISABLE_PROXY =
  String(process.env.FACE_API_DISABLE_PROXY ?? "true").toLowerCase() !==
  "false";

async function compareFaces({
  imageUrl1,
  imageUrl2,
  apiKey,
  apiSecret,
}) {
  if (!apiKey || !apiSecret) {
    return { ok: false, error: "FACE_API_NOT_CONFIGURED" };
  }

  if (!imageUrl1 || !imageUrl2) {
    return { ok: false, error: "MISSING_IMAGES" };
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

    return {
      ok: true,
      confidence: Number(response?.data?.confidence || 0),
    };
  } catch (err) {
    console.error("Face compare failed:", err.response?.data || err.message);
    return { ok: false, error: "FACE_API_FAILED" };
  }
}

module.exports = {
  compareFaces,
};