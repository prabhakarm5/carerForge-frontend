import axiosInstance from "../utils/axiosInstance";

const ROOT = "/api/support/tickets";

export async function getSupportTickets() {
  const response = await axiosInstance.get(ROOT);
  return response.data;
}

export async function getSupportTicket(id) {
  const response = await axiosInstance.get(ROOT + "/" + id);
  return response.data;
}

export async function createSupportTicket(payload) {
  const response = await axiosInstance.post(ROOT, payload);
  return response.data;
}

export async function replySupportTicket(id, message) {
  const response = await axiosInstance.post(ROOT + "/" + id + "/messages", { message });
  return response.data;
}

export async function resolveSupportTicket(id) {
  const response = await axiosInstance.patch(ROOT + "/" + id + "/resolve");
  return response.data;
}

export async function reopenSupportTicket(id) {
  const response = await axiosInstance.patch(ROOT + "/" + id + "/reopen");
  return response.data;
}