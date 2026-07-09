import axiosInstance from "../utils/axiosInstance";
import { API } from "../config/api";

// ================= GET ALL ACTIVE PLANS =================
// ✅ FIX — ab "signal" accept karta hai taaki caller (HomePage) timeout
// laga sake. Agar backend slow/unreachable ho to request cancel ho
// jaayegi aur UI infinite spinner mein fasegi nahi.
export async function getPlans({ signal } = {}) {
    const response = await axiosInstance.get(
        API.PLANS.GET_ALL,
        { signal }
    );

    return response.data;
}