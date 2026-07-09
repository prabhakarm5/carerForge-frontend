//userService.js
import axiosInstance from "../utils/axiosInstance";
import { API } from "../config/api";

// ✅ FIX — pehle "axios" (bina baseURL/withCredentials/interceptor ke)
// use ho raha tha, aur Authorization header localStorage se manually
// ban raha tha. Dono galat: (1) axios plain hone ki wajah se cookie
// nahi jaati thi, CSRF header nahi lagta tha, 401-refresh interceptor
// bhi kaam nahi karta tha (2) accessToken ab localStorage mein hai hi
// nahi. Ab axiosInstance use karo — baaki sab (auth header, CSRF,
// refresh-on-401) wo khud handle kar leta hai.

export async function getProfile() {
  const response = await axiosInstance.get(API.USER.GET_PROFILE);
  return response.data;
}

export async function updateProfile(data) {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, value);
    }
  });
  const response = await axiosInstance.put(
    API.USER.UPDATE_PROFILE,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return response.data;
}

export async function updateAvatar(file) {
  const formData = new FormData();
  formData.append("profileImage", file);
  const response = await axiosInstance.put(
    API.USER.UPDATE_PROFILE,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return response.data;
}