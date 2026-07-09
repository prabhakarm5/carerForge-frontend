import { create } from "zustand";
import { getStreamUrl, getStreamAuthHeader } from "../services/chatService";
import { refreshToken } from "../services/authService";
import useAuthStore from "../store/authStore";
import useConversationListStore from "../store/conversationListStore";

function defaultStreamEntry(controller) {
    return {
        text: "",
        done: false,
        waiting: true,
        statusLabel: "thinking",
        modelSwitchNotice: null,
        error: null,
        donePayload: null,
        thoughts: [], // "thought process" panel
        lastEventAt: Date.now(), // watchdog: last time ANY event touched this stream
        controller,
    };
}

function getCsrfTokenFromCookie() {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
}

// How often accumulated text is pushed into the store while streaming.
// FIX (root cause of "bahut lag/atak raha hai" during streaming):
// every store update forces the chat UI to re-parse the FULL accumulated
// answer from scratch (markdown blocks, code blocks, syntax highlighting
// tokens — all of it, every time). Flushing on every animation frame
// (up to ~60x/sec) meant that cost was paid up to 60 times a second and
// grew with the length of the answer, which is exactly what a freeze /
// stutter under long responses looks like. Batching flushes to a fixed
// interval cuts the number of full re-parses by ~3-4x while still
// reading as smooth, continuous typing to the user.
const FLUSH_INTERVAL_MS = 45;

const useChatStreamStore = create((set, get) => ({
    streamsById: {},

    startStream: ({ tempKey, conversationId, message, model, image, onMeta, onError }) => {
        const controller = new AbortController();

        set((state) => ({
            streamsById: {
                ...state.streamsById,
                [tempKey]: defaultStreamEntry(controller),
            },
        }));

        let activeStoreKey = tempKey;

        let pendingText = "";
        let flushTimer = null;
        let lastFlushAt = 0;

        const doFlush = () => {
            flushTimer = null;
            lastFlushAt = performance.now();
            if (!pendingText) return;
            const toApply = pendingText;
            pendingText = "";
            writeToStore((existing) => ({
                ...existing,
                text: existing.text + toApply,
                waiting: false,
                statusLabel: "generating",
            }));
        };

        const scheduleFlush = () => {
            if (flushTimer) return;
            const elapsed = performance.now() - lastFlushAt;
            const wait = Math.max(0, FLUSH_INTERVAL_MS - elapsed);
            flushTimer = setTimeout(doFlush, wait);
        };

        const flushPendingTextSync = () => {
            if (flushTimer) {
                clearTimeout(flushTimer);
                flushTimer = null;
            }
            if (!pendingText) return;
            const toApply = pendingText;
            pendingText = "";
            writeToStore((existing) => ({
                ...existing,
                text: existing.text + toApply,
                waiting: false,
                statusLabel: "generating",
            }));
        };

        const writeToStore = (updater) => {
            set((state) => {
                const key = activeStoreKey;
                const existing = state.streamsById[key] || defaultStreamEntry(controller);
                const updated = updater(existing);
                return {
                    streamsById: {
                        ...state.streamsById,
                        [key]: { ...updated, lastEventAt: Date.now() },
                    },
                };
            });
        };

        const appendText = (toAppend) => {
            if (!toAppend) return;
            pendingText += toAppend;
            scheduleFlush();
        };

        function extractFieldValue(line, prefix) {
            return line.slice(prefix.length);
        }

        function handleEvent(rawEvent) {
            let eventName = "message";
            const dataLines = [];

            for (const line of rawEvent.split("\n")) {
                if (line.startsWith("event:")) {
                    eventName = extractFieldValue(line, "event:").trim();
                } else if (line.startsWith("data:")) {
                    dataLines.push(extractFieldValue(line, "data:"));
                }
            }

            if (!dataLines.length) return;
            const data = dataLines.join("\n");
            if (data === "") return;

            if (eventName === "meta") {
                try {
                    const meta = JSON.parse(data);
                    if (meta.isNew && meta.conversationId && meta.conversationId !== activeStoreKey) {
                        flushPendingTextSync();
                        const newKey = meta.conversationId;
                        const oldKey = activeStoreKey;
                        set((state) => {
                            const next = { ...state.streamsById };
                            const existing = next[oldKey];
                            if (existing) {
                                next[newKey] = existing;
                                delete next[oldKey];
                            }
                            return { streamsById: next };
                        });
                        activeStoreKey = newKey;
                        useConversationListStore.getState().bump();
                    }
                    onMeta && onMeta(meta);
                } catch {
                    /* ignore malformed meta */
                }
                return;
            }

            if (eventName === "thought") {
                try {
                    const payload = JSON.parse(data);
                    writeToStore((existing) => ({
                        ...existing,
                        thoughts: [...existing.thoughts, payload.label],
                    }));
                } catch {
                    /* ignore malformed thought */
                }
                return;
            }

            if (eventName === "status") {
                flushPendingTextSync();
                writeToStore((existing) => ({
                    ...existing,
                    statusLabel: data.trim(),
                    waiting: existing.text ? false : true,
                }));
                return;
            }

            if (eventName === "title_updated") {
                try {
                    const payload = JSON.parse(data);
                    writeToStore((existing) => ({ ...existing, latestTitle: payload.title }));
                    useConversationListStore.getState().bump();
                } catch {
                    /* ignore */
                }
                return;
            }

            if (eventName === "model_switched") {
                try {
                    const payload = JSON.parse(data);
                    writeToStore((existing) => ({
                        ...existing,
                        modelSwitchNotice: payload.message,
                        switchedModel: payload.to,
                    }));
                    setTimeout(() => {
                        writeToStore((existing) => ({ ...existing, modelSwitchNotice: null }));
                    }, 6000);
                } catch {
                    /* ignore malformed payload */
                }
                return;
            }

            if (eventName === "chunk") {
                try {
                    const payload = JSON.parse(data);
                    appendText(payload.content ?? "");
                } catch {
                    appendText(data);
                }
                return;
            }

            if (eventName === "done") {
                flushPendingTextSync();
                try {
                    const payload = JSON.parse(data);
                    writeToStore((existing) => ({
                        ...existing,
                        done: true,
                        waiting: false,
                        donePayload: payload,
                    }));
                } catch {
                    writeToStore((existing) => ({ ...existing, done: true, waiting: false }));
                }
                return;
            }

            if (eventName === "error") {
                flushPendingTextSync();
                try {
                    const payload = JSON.parse(data);
                    writeToStore((existing) => ({
                        ...existing,
                        error: payload,
                        errorAfterText: !!existing.text,
                        done: true,
                        waiting: false,
                    }));
                    onError && onError(payload);
                } catch {
                    writeToStore((existing) => ({
                        ...existing,
                        done: true,
                        waiting: false,
                        errorAfterText: !!existing.text,
                    }));
                }
            }
        }

        async function run() {
            try {
                const csrfToken = getCsrfTokenFromCookie();

                const headers = {
                    "Content-Type": "application/json",
                    Accept: "text/event-stream",
                    ...getStreamAuthHeader(),
                    ...(csrfToken ? { "X-XSRF-TOKEN": csrfToken } : {}),
                };

                let response = await fetch(getStreamUrl(), {
                    method: "POST",
                    headers,
                    credentials: "include",
                    body: JSON.stringify({
                        conversationId: conversationId || null,
                        message,
                        model: model || null,
                        image: image || null,
                    }),
                    signal: controller.signal,
                });

                if (response.status === 401) {
                    const data = await refreshToken();
                    useAuthStore.getState().setAccessToken(data.accessToken);

                    response = await fetch(getStreamUrl(), {
                        method: "POST",
                        headers: {
                            ...headers,
                            Authorization: `Bearer ${data.accessToken}`,
                        },
                        credentials: "include",
                        body: JSON.stringify({
                            conversationId: conversationId || null,
                            message,
                            model: model || null,
                            image: image || null,
                        }),
                        signal: controller.signal,
                    });
                }

                if (!response.ok || !response.body) {
                    throw new Error(`Stream request failed (${response.status})`);
                }

                const reader = response.body.getReader();
                const decoder = new TextDecoder("utf-8");
                let sseBuffer = "";

                // eslint-disable-next-line no-constant-condition
                while (true) {
                    const { value, done } = await reader.read();
                    if (done) break;

                    sseBuffer += decoder.decode(value, { stream: true });

                    let boundary;
                    while ((boundary = sseBuffer.indexOf("\n\n")) !== -1) {
                        const rawEvent = sseBuffer.slice(0, boundary);
                        sseBuffer = sseBuffer.slice(boundary + 2);
                        handleEvent(rawEvent);
                    }
                }

                if (sseBuffer.trim()) handleEvent(sseBuffer);

                flushPendingTextSync();

                writeToStore((existing) => {
                    if (existing.done) return existing;
                    return {
                        ...existing,
                        done: true,
                        waiting: false,
                        errorAfterText: !!existing.text,
                        error: existing.text
                            ? existing.error
                            : (existing.error || { code: "GENERAL", message: "Stream ended unexpectedly" }),
                    };
                });
            } catch (err) {
                flushPendingTextSync();
                if (err?.name !== "AbortError") {
                    writeToStore((existing) => ({
                        ...existing,
                        error: { code: "GENERAL", message: err?.message || "Stream failed" },
                        errorAfterText: !!existing.text,
                        done: true,
                        waiting: false,
                    }));
                    onError && onError(err);
                } else {
                    writeToStore((existing) => ({
                        ...existing,
                        done: true,
                        waiting: false,
                    }));
                }
            }
        }

        run();
    },

    stopStream: (key) => {
        const s = get().streamsById[key];
        if (s?.controller) {
            try { s.controller.abort(); } catch { /* noop */ }
        }
        set((state) => ({
            streamsById: {
                ...state.streamsById,
                [key]: { ...(state.streamsById[key] || {}), done: true, waiting: false },
            },
        }));
    },

    clearStream: (key) => {
        set((state) => {
            const next = { ...state.streamsById };
            delete next[key];
            return { streamsById: next };
        });
    },
}));

export default useChatStreamStore;