import axiosInstance from "../utils/axiosInstance";
import { API } from "../config/api";

export async function getAdminOverview() {
  const response = await axiosInstance.get(API.ADMIN.MONITORING);
  return response.data;
}

export async function getAdminUsers(page = 0, size = 20, query = "") {
  const response = await axiosInstance.get(API.ADMIN.GET_ALL_USERS, {
    params: { page, size, q: query.trim() },
  });
  return response.data;
}

export async function getAdminUserActivity(id) {
  const response = await axiosInstance.get(API.ADMIN.USER_ACTIVITY(id));
  return response.data;
}

export async function updateAdminUser(id, action) {
  const endpoint = {
    enable: API.ADMIN.ENABLE_USER(id),
    disable: API.ADMIN.DISABLE_USER(id),
    block: API.ADMIN.BLOCK_USER(id),
    unblock: API.ADMIN.UNBLOCK_USER(id),
  }[action];
  if (!endpoint) throw new Error("Unsupported admin action");
  const response = await axiosInstance.put(endpoint);
  return response.data;
}

export async function deleteAdminUser(id) {
  const response = await axiosInstance.delete(API.ADMIN.DELETE_USER(id));
  return response.data;
}

export async function sendAdminMessage(id, payload) {
  const response = await axiosInstance.post(API.ADMIN.MESSAGE_USER(id), payload);
  return response.data;
}

export async function getAdminPlans() {
  const response = await axiosInstance.get(API.PLANS.GET_ALL);
  return response.data;
}

export async function saveAdminPlan(id, payload) {
  const response = id
    ? await axiosInstance.put(API.ADMIN.PLAN(id), payload)
    : await axiosInstance.post(API.ADMIN.PLANS, payload);
  return response.data;
}

export async function deleteAdminPlan(id) {
  const response = await axiosInstance.delete(API.ADMIN.PLAN(id));
  return response.data;
}

export async function getAdminPromos() {
  const response = await axiosInstance.get(API.ADMIN.PROMOS);
  return response.data;
}

export async function saveAdminPromo(id, payload) {
  const response = id
    ? await axiosInstance.put(API.ADMIN.PROMO(id), payload)
    : await axiosInstance.post(API.ADMIN.PROMOS, payload);
  return response.data;
}

export async function deleteAdminPromo(id) {
  const response = await axiosInstance.delete(API.ADMIN.PROMO(id));
  return response.data;
}