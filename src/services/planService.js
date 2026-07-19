import axios from "axios";
import { API, API_BASE_URL } from "../config/api";

// ================= GET ALL ACTIVE PLANS =================
// ✅ FIX — ab "signal" accept karta hai taaki caller (HomePage) timeout
// laga sake. Agar backend slow/unreachable ho to request cancel ho
// jaayegi aur UI infinite spinner mein fasegi nahi.
export async function getPlans({ signal } = {}) {
    // Plans are public. Keep this request outside the authenticated client so
    // an expired private session can never redirect the public home page.
    const response = await axios.get(`${API_BASE_URL}${API.PLANS.GET_ALL}`, {
        signal,
        withCredentials: false,
    });

    return response.data;
}