import axiosInstance from "../utils/axiosInstance";

import {
    API,
    API_BASE_URL
} from "../config/api";

// ✅ FIX — manual localStorage-based auth header hataya (axiosInstance
// interceptor khud token lagata hai). "getModels" bhi add kiya kyunki
// ChatPage.jsx isko yahan se import karta hai (isiliye build fail ho
// raha tha).
//
// ⚠️ NOTE bhai — ye file aur chatService.js dono mein GET_CONVERSATION,
// GET_RECENT, SEARCH, ARCHIVE, RESTORE, DELETE, RENAME, GET_MODELS —
// sab functions hubahu duplicate hain. Dono jagah se import ho rahe
// honge kahin na kahin — isse maintenance mushkil hoga. Suggest: in
// shared functions ko sirf ek hi file mein rakho.

// ================= MODELS (for the model-selector dropdown) =================

export async function getModels() {
    const response = await axiosInstance.get(
        API_BASE_URL + API.CHAT.MODELS
    );
    return response.data; // [{ id, label, description, vision }, ...]
}

// ================= SEND MESSAGE =================

export async function sendMessage(request) {
    const response = await axiosInstance.post(
        API_BASE_URL + API.CHAT.SEND_MESSAGE,
        request
    );
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