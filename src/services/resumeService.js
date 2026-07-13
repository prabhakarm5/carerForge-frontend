import axiosInstance from "../utils/axiosInstance";
import { API, API_BASE_URL } from "../config/api";
import { refreshToken } from "./authService";
import useAuthStore from "../store/authStore";

const LONG_REQUEST_TIMEOUT_MS = 90_000;

export async function analyzeResume(file, jobDescription = "", model = "") {
  const formData = new FormData();
  formData.append("resume", file);
  if (jobDescription.trim()) {
    formData.append("jobDescription", jobDescription.trim());
  }
  if (model) formData.append("model", model);

  const response = await axiosInstance.post(API.RESUMES.ANALYZE, formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: LONG_REQUEST_TIMEOUT_MS,
  });
  return response.data;
}

export async function getResumeModels() {
  const response = await axiosInstance.get(API.RESUMES.MODELS);
  return response.data;
}

export async function getResumeProjects() {
  const response = await axiosInstance.get(API.RESUMES.GET_ALL);
  return response.data;
}

export async function getResumeProject(projectId) {
  const response = await axiosInstance.get(API.RESUMES.GET_BY_ID(projectId));
  return response.data;
}

export async function matchResumeToJob(projectId, jobDescription, model = "") {
  const response = await axiosInstance.post(
    API.RESUMES.MATCH_JOB(projectId),
    { jobDescription, model: model || null },
    { timeout: LONG_REQUEST_TIMEOUT_MS }
  );
  return response.data;
}

export async function askResumeCoach(projectId, message, model = "") {
  const response = await axiosInstance.post(
    API.RESUMES.CHAT(projectId),
    { message, model: model || null },
    { timeout: LONG_REQUEST_TIMEOUT_MS }
  );
  return response.data;
}

function csrfHeader() {
  const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
  return match ? { "X-XSRF-TOKEN": decodeURIComponent(match[1]) } : {};
}

async function openResumeStream(projectId, message, model, signal, accessToken) {
  return fetch(API_BASE_URL + API.RESUMES.CHAT_STREAM(projectId), {
    method: "POST",
    credentials: "include",
    signal,
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      Authorization: `Bearer ${accessToken || ""}`,
      ...csrfHeader(),
    },
    body: JSON.stringify({ message, model: model || null }),
  });
}

/**
 * Reads Resume Coach SSE with small buffered UI flushes. Gemini may emit many tiny
 * deltas; batching them avoids reparsing the full Markdown response on every byte.
 */
export async function streamResumeCoach(projectId, message, model, { onChunk, signal } = {}) {
  let token = useAuthStore.getState().accessToken;
  let response = await openResumeStream(projectId, message, model, signal, token);
  if (response.status === 401) {
    const refreshed = await refreshToken();
    token = refreshed.accessToken;
    useAuthStore.getState().setAccessToken(token);
    response = await openResumeStream(projectId, message, model, signal, token);
  }
  if (!response.ok || !response.body) {
    let reason = `Resume stream failed (${response.status})`;
    try {
      const payload = await response.json();
      reason = payload.message || reason;
    } catch {
      // Keep the status-based message when the body is not JSON.
    }
    throw new Error(reason);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let answer = "";
  let pending = "";
  let flushTimer = null;
  let streamError = null;
  let doneReceived = false;

  const flush = () => {
    flushTimer = null;
    if (!pending) return;
    answer += pending;
    pending = "";
    onChunk?.(answer);
  };
  const queueChunk = (text) => {
    pending += text;
    if (!flushTimer) flushTimer = window.setTimeout(flush, 80);
  };
  const handleEvent = (rawEvent) => {
    let type = "message";
    const dataLines = [];
    rawEvent.split("\n").forEach((line) => {
      if (line.startsWith("event:")) type = line.slice(6).trim();
      if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
    });
    if (!dataLines.length) return;
    const payload = JSON.parse(dataLines.join("\n"));
    if (type === "chunk" && payload.text) queueChunk(payload.text);
    if (type === "done") doneReceived = true;
    if (type === "error") streamError = new Error(payload.message || "Resume Coach stream failed.");
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
    let boundary;
    while ((boundary = buffer.indexOf("\n\n")) !== -1) {
      handleEvent(buffer.slice(0, boundary));
      buffer = buffer.slice(boundary + 2);
    }
  }
  buffer += decoder.decode();
  if (buffer.trim()) handleEvent(buffer);
  if (flushTimer) window.clearTimeout(flushTimer);
  flush();
  if (streamError) throw streamError;
  if (!doneReceived) throw new Error("Resume Coach connection ended before the answer completed. Please retry.");
  if (!answer.trim()) throw new Error("Resume Coach returned an empty response. Please retry.");
  return answer.trim();
}
export async function generateAtsResume(projectId, instructions = "", model = "") {
  const response = await axiosInstance.post(
    API.RESUMES.GENERATE(projectId),
    { instructions: instructions.trim() || null, model: model || null },
    { timeout: LONG_REQUEST_TIMEOUT_MS }
  );
  return response.data;
}

export async function deleteResumeProject(projectId) {
  await axiosInstance.delete(API.RESUMES.DELETE(projectId));
}

export async function downloadAtsResume(projectId, preferredName) {
  let response;
  try {
    response = await axiosInstance.get(API.RESUMES.DOWNLOAD(projectId), {
      responseType: "arraybuffer",
      timeout: LONG_REQUEST_TIMEOUT_MS,
    });
  } catch (error) {
    if (error.response?.data instanceof ArrayBuffer) {
      try {
        const payload = JSON.parse(new TextDecoder().decode(new Uint8Array(error.response.data)));
        throw new Error(payload.message || "Could not download the resume PDF.", { cause: error });
      } catch (parseError) {
        if (parseError instanceof SyntaxError) throw error;
        throw parseError;
      }
    }
    throw error;
  }

  const bytes = new Uint8Array(response.data);
  const signature = String.fromCharCode(...bytes.slice(0, 4));
  const contentType = String(response.headers["content-type"] || "").toLowerCase();
  if (signature !== "%PDF" && !contentType.includes("application/pdf")) {
    let message = "The server did not return a valid PDF. Please generate the ATS resume again.";
    try {
      const payload = JSON.parse(new TextDecoder().decode(bytes));
      message = payload.message || message;
    } catch {
      // Keep the safe user-facing message when the server returned non-JSON content.
    }
    throw new Error(message);
  }

  const disposition = response.headers["content-disposition"] || "";
  const utf8Name = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  const plainName = disposition.match(/filename="?([^";]+)"?/i)?.[1];
  const fileName = decodeURIComponent(utf8Name || plainName || preferredName || "ATS_Resume.pdf");

  const objectUrl = URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
}
