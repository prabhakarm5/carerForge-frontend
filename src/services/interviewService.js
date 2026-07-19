import axiosInstance from "../utils/axiosInstance";
import { API } from "../config/api";

const INTERVIEW_TIMEOUT_MS = 90_000;

export async function getLiveInterviewToken(payload) {
  const response = await axiosInstance.post(API.INTERVIEWS.LIVE_TOKEN, payload, { timeout: 9_000 });
  return response.data;
}

export async function extractInterviewContext(file, model = "", onProgress, contextType = "JOB_DESCRIPTION") {
  const formData = new FormData();
  formData.append("file", file);
  if (model) formData.append("model", model);
  formData.append("contextType", contextType);
  const response = await axiosInstance.post(API.INTERVIEWS.EXTRACT_CONTEXT, formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: INTERVIEW_TIMEOUT_MS,
    onUploadProgress: (event) => {
      if (!event.total || !onProgress) return;
      onProgress(Math.min(55, Math.round((event.loaded / event.total) * 55)));
    },
  });
  return response.data;
}

export async function getInterviews() {
  const response = await axiosInstance.get(API.INTERVIEWS.GET_ALL);
  return response.data;
}

export async function getInterview(id) {
  const response = await axiosInstance.get(API.INTERVIEWS.GET_BY_ID(id));
  return response.data;
}

export async function startInterview(payload) {
  const response = await axiosInstance.post(API.INTERVIEWS.START, payload, { timeout: INTERVIEW_TIMEOUT_MS });
  return response.data;
}

export async function answerInterview(id, answer) {
  const response = await axiosInstance.post(API.INTERVIEWS.ANSWER(id), { answer }, { timeout: INTERVIEW_TIMEOUT_MS });
  return response.data;
}

export async function deleteInterview(id) {
  await axiosInstance.delete(API.INTERVIEWS.DELETE(id));
}
