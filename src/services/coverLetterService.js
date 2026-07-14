import axiosInstance from "../utils/axiosInstance";
import { API } from "../config/api";

const LONG_REQUEST_TIMEOUT_MS = 90_000;

export async function getCoverLetters() {
  const response = await axiosInstance.get(API.COVER_LETTERS.GET_ALL);
  return response.data;
}

export async function getCoverLetterStyles() {
  const response = await axiosInstance.get(API.COVER_LETTERS.STYLES);
  return response.data;
}

export async function getCoverLetter(id) {
  const response = await axiosInstance.get(API.COVER_LETTERS.GET_BY_ID(id));
  return response.data;
}

export async function generateCoverLetter(payload) {
  const response = await axiosInstance.post(API.COVER_LETTERS.GENERATE, payload, { timeout: LONG_REQUEST_TIMEOUT_MS });
  return response.data;
}

export async function updateCoverLetter(id, content) {
  const response = await axiosInstance.put(API.COVER_LETTERS.UPDATE(id), { content });
  return response.data;
}

export async function regenerateCoverLetter(id, payload) {
  const response = await axiosInstance.post(API.COVER_LETTERS.REGENERATE(id), payload, { timeout: LONG_REQUEST_TIMEOUT_MS });
  return response.data;
}

export async function deleteCoverLetter(id) {
  await axiosInstance.delete(API.COVER_LETTERS.DELETE(id));
}

export async function downloadCoverLetter(id, format = "pdf") {
  let response;
  try {
    response = await axiosInstance.get(API.COVER_LETTERS.DOWNLOAD(id, format), {
      responseType: "arraybuffer",
      timeout: LONG_REQUEST_TIMEOUT_MS,
    });
  } catch (error) {
    if (error.response?.data instanceof ArrayBuffer) {
      try {
        const payload = JSON.parse(new TextDecoder().decode(new Uint8Array(error.response.data)));
        throw new Error(payload.message || "Could not download the cover letter.", { cause: error });
      } catch (parseError) {
        if (parseError instanceof SyntaxError) throw error;
        throw parseError;
      }
    }
    throw error;
  }

  const disposition = response.headers["content-disposition"] || "";
  const utf8Name = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  const plainName = disposition.match(/filename="?([^";]+)"?/i)?.[1];
  const fileName = decodeURIComponent(utf8Name || plainName || `CareerForge_Cover_Letter.${format}`);
  const contentType = response.headers["content-type"] || "application/octet-stream";
  const objectUrl = URL.createObjectURL(new Blob([response.data], { type: contentType }));
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
}
