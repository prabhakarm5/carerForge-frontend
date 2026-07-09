import axiosInstance from "../utils/axiosInstance";
import { API } from "../config/api";

export async function generateImage(prompt, image) {
  const formData = new FormData();
  formData.append("prompt", prompt);
  if (image) formData.append("image", image);
  const response = await axiosInstance.post(API.IMAGES.GENERATE, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}

export async function getImageHistory() {
  const response = await axiosInstance.get(API.IMAGES.HISTORY);
  return response.data;
}

export async function deleteImage(imageId) {
  await axiosInstance.delete(API.IMAGES.DELETE(imageId));
}

export async function toggleFavorite(imageId) {
  const response = await axiosInstance.patch(API.IMAGES.FAVORITE(imageId), {});
  return response.data;
}

export async function downloadImage(imageId) {
  const response = await axiosInstance.get(API.IMAGES.DOWNLOAD(imageId));
  return response.data;
}

// ✅ FIX — ye function missing tha, GeneratedImageCard.jsx isko import
// kar raha tha isliye build fail ho raha tha.
export async function regenerateImage(imageId) {
  const response = await axiosInstance.post(API.IMAGES.REGENERATE(imageId), {});
  return response.data;
}