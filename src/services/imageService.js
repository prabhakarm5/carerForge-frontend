import axiosInstance from "../utils/axiosInstance";
import { API } from "../config/api";
import { dedupeRead } from "../utils/requestDedupe";

const IMAGE_REQUEST_TIMEOUT_MS = 180_000;

function requireImageId(imageId) {
  if (!imageId || imageId === "undefined") throw new Error("Image id is missing. Refresh history and try again.");
  return imageId;
}

export async function generateImage(prompt, image, model) {
  const formData = new FormData();
  formData.append("prompt", prompt);
  if (model) formData.append("model", model);
  if (image) formData.append("image", image);
  const response = await axiosInstance.post(API.IMAGES.GENERATE, formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: IMAGE_REQUEST_TIMEOUT_MS,
  });
  return response.data;
}

export async function getImageModels() {
  return dedupeRead("images:models", async () => {
    const response = await axiosInstance.get(API.IMAGES.MODELS);
    return response.data || [];
  }, 300_000);
}

export async function getImageHistory() {
  const response = await axiosInstance.get(API.IMAGES.HISTORY);
  return response.data || [];
}

export async function deleteImage(imageId) {
  await axiosInstance.delete(API.IMAGES.DELETE(requireImageId(imageId)));
}

export async function toggleFavorite(imageId) {
  const response = await axiosInstance.patch(API.IMAGES.FAVORITE(requireImageId(imageId)), {});
  return response.data;
}

export async function downloadImage(imageId) {
  const response = await axiosInstance.get(API.IMAGES.DOWNLOAD(requireImageId(imageId)));
  return response.data;
}

export async function regenerateImage(imageId) {
  const response = await axiosInstance.post(API.IMAGES.REGENERATE(requireImageId(imageId)), {}, {
    timeout: IMAGE_REQUEST_TIMEOUT_MS,
  });
  return response.data;
}