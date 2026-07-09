import axiosInstance from "../utils/axiosInstance";

import {
    API,
    API_BASE_URL
} from "../config/api";

// ✅ FIX — pehle "localStorage.getItem('accessToken')" se manual
// Authorization header banta tha. Ab accessToken localStorage mein
// hota hi nahi (in-memory Zustand store mein hai), isliye ye hamesha
// "Bearer null" bhejta — sab requests 401 dete. axiosInstance ka
// request interceptor already sahi token laga deta hai, isliye har
// jagah se manual header hata diya.

// ================= SEND MESSAGE (non-streaming, kept for compatibility) =================

export async function sendMessage(request) {

    const response = await axiosInstance.post(
        API_BASE_URL + API.CHAT.SEND_MESSAGE,
        request
    );

    return response.data;
}

// ================= STREAM MESSAGE URL/HEADERS HELPER =================
// Used by chatStreamStore.js — fetch() ke saath native EventSource ki
// tarah axiosInstance ka interceptor nahi chalta, isliye is helper ko
// accessToken in-memory store se seedha padhna chahiye (localStorage se nahi).

export function getStreamUrl() {
    return API_BASE_URL + API.CHAT.STREAM;
}

export function getStreamAuthHeader() {
    // ✅ FIX — yahan bhi localStorage ki jagah Zustand in-memory store
    // se accessToken lo. Circular-import se bachne ke liye store ko
    // yahin (function ke andar) require/import karo.
    // eslint-disable-next-line global-require
    const useAuthStore = require("../store/authStore").default;
    const accessToken = useAuthStore.getState().accessToken;

    return {
        Authorization: `Bearer ${accessToken}`,
    };
}

// ================= MODELS (for the model-selector dropdown) =================

export async function getModels() {
    const response = await axiosInstance.get(API_BASE_URL + API.CHAT.MODELS);
    return response.data;
}

// ================= GET CONVERSATION =================

export async function getConversation(conversationId) {
    const response = await axiosInstance.get(
        API_BASE_URL + API.CONVERSATIONS.GET_BY_ID(conversationId)
    );
    return response.data;
}

// ================= GET RECENT =================

export async function getRecentChats() {
    const response = await axiosInstance.get(
        API_BASE_URL + API.CONVERSATIONS.GET_RECENT
    );
    return response.data;
}

// ================= SEARCH =================

export async function searchChats(keyword) {
    const response = await axiosInstance.get(
        API_BASE_URL + API.CONVERSATIONS.SEARCH + "?keyword=" + keyword
    );
    return response.data;
}

// ================= ARCHIVE =================

export async function archiveChat(id) {
    const response = await axiosInstance.put(
        API_BASE_URL + API.CONVERSATIONS.ARCHIVE(id),
        {}
    );
    return response.data;
}

// ================= RESTORE =================

export async function restoreChat(id) {
    const response = await axiosInstance.put(
        API_BASE_URL + API.CONVERSATIONS.RESTORE(id),
        {}
    );
    return response.data;
}

// ================= DELETE =================

export async function deleteChat(id) {
    const response = await axiosInstance.delete(
        API_BASE_URL + API.CONVERSATIONS.DELETE(id)
    );
    return response.data;
}

// ================= RENAME =================

export async function renameChat(id, title) {
    const response = await axiosInstance.put(
        API_BASE_URL + API.CONVERSATIONS.RENAME(id),
        { title }
    );
    return response.data;
}