import axiosInstance from "../utils/axiosInstance";
import { API } from "../config/api";

export async function searchLiveJobs({ query, location = "", country = "in", page = 1 }) {
  const response = await axiosInstance.get(API.JOBS.SEARCH, {
    params: { query: query.trim(), location: location.trim(), country, page },
    timeout: 30_000,
  });
  return response.data;
}