import axiosInstance from "../utils/axiosInstance";
import useAuthStore from "../store/authStore";

import {
    API,
    API_BASE_URL
} from "../config/api";

// ✅ FIX — pehle yahan "getAuthHeader()" tha jo
// localStorage.getItem("accessToken") se manual header banata tha.
// Ye ab galat hai kyunki accessToken localStorage mein hota hi nahi
// (in-memory Zustand store mein hai). axiosInstance ka request
// interceptor already sahi token lagata hai, isliye manual header ki
// zaroorat nahi — har jagah se hata diya.

// ================= SEND MESSAGE (non-streaming, kept for compatibility) =================

export async function sendMessage(request) {

    const response = await axiosInstance.post(
        API_BASE_URL + API.CHAT.SEND_MESSAGE,
        request
    );

    return response.data;
}

// ================= STREAM MESSAGE URL/HEADERS HELPER =================
// Used by chatStreamStore.js — fetch() with a ReadableStream reader can't
// go through axiosInstance (axios buffers the whole response), so we
// expose the raw URL + auth header here instead.
// ✅ FIX — ye dono functions missing the, isliye build fail ho raha tha
// (chatStreamStore.js inko import kar raha tha).

export function getStreamUrl() {
    return API_BASE_URL + API.CHAT.STREAM;
}

export function getStreamAuthHeader() {
    const accessToken = useAuthStore.getState().accessToken;
    return {
        Authorization: `Bearer ${accessToken}`,
    };
}

// ================= MODELS (for the model-selector dropdown) =================
// ✅ FIX — ye bhi missing tha, ChatPage.jsx isko conversationService se
// import karta hai (wahan bhi add kiya hai), lekin agar kahin chatService
// se bhi import ho raha ho purani jagah se, isliye yahan bhi rakha.

export async function getModels() {
    const response = await axiosInstance.get(
        API_BASE_URL + API.CHAT.MODELS
    );
    return response.data; // [{ id, label, description, vision }, ...]
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