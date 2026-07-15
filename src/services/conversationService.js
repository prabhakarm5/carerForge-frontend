import axiosInstance from "../utils/axiosInstance";
import { dedupeRead, invalidateRead } from "../utils/requestDedupe";

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
    return dedupeRead("chat:models", async () => {
        const response = await axiosInstance.get(API_BASE_URL + API.CHAT.MODELS);
        return response.data;
    }, 60_000);
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
    return dedupeRead(`chat:conversation:${conversationId}`, async () => {
        const response = await axiosInstance.get(API_BASE_URL + API.CONVERSATIONS.GET_BY_ID(conversationId));
        return response.data;
    }, 600);
}

export async function getConversationStatus(conversationId) {
    return dedupeRead(`chat:status:${conversationId}`, async () => {
        const response = await axiosInstance.get(API_BASE_URL + "/api/conversations/" + conversationId + "/status");
        return response.data;
    }, 2_000);
}
// ================= GET RECENT =================

export async function getRecentChats() {
    return dedupeRead("chat:recent", async () => {
        const response = await axiosInstance.get(API_BASE_URL + API.CONVERSATIONS.GET_RECENT);
        return response.data;
    }, 1_200);
}

// ================= SEARCH =================

export async function searchChats(keyword) {
    const normalized = keyword.trim();
    return dedupeRead(`chat:search:${normalized.toLowerCase()}`, async () => {
        const response = await axiosInstance.get(API_BASE_URL + API.CONVERSATIONS.SEARCH, {
            params: { keyword: normalized },
        });
        return response.data;
    }, 1_000);
}

// ================= ARCHIVE =================

export async function archiveChat(id) {
    const response = await axiosInstance.put(
        API_BASE_URL + API.CONVERSATIONS.ARCHIVE(id),
        {}
    );
    invalidateRead("chat:");
    return response.data;
}

// ================= RESTORE =================

export async function restoreChat(id) {
    const response = await axiosInstance.put(
        API_BASE_URL + API.CONVERSATIONS.RESTORE(id),
        {}
    );
    invalidateRead("chat:");
    return response.data;
}

// ================= DELETE =================

export async function deleteChat(id) {
    const response = await axiosInstance.delete(
        API_BASE_URL + API.CONVERSATIONS.DELETE(id)
    );
    invalidateRead("chat:");
    return response.data;
}

// ================= RENAME =================

export async function renameChat(id, title) {
    const response = await axiosInstance.put(
        API_BASE_URL + API.CONVERSATIONS.RENAME(id),
        { title }
    );
    invalidateRead("chat:");
    return response.data;
}