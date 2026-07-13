import axiosInstance from "../utils/axiosInstance";

export function trackPageView(path) {
  return axiosInstance.post("/api/telemetry/page-view", {
    path,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Unknown",
    locale: navigator.language || "Unknown",
  });
}