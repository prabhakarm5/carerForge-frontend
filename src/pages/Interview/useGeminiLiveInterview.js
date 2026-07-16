import { useCallback, useEffect, useRef, useState } from "react";
import { GoogleGenAI } from "@google/genai";
import { getLiveInterviewToken } from "../../services/interviewService";

function bytesToBase64(bytes) {
  let binary = "";
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function downsampleToPcm16(input, inputRate, outputRate = 16000) {
  const ratio = inputRate / outputRate;
  const length = Math.max(1, Math.round(input.length / ratio));
  const output = new Int16Array(length);
  for (let index = 0; index < length; index += 1) {
    const start = Math.floor(index * ratio);
    const end = Math.min(input.length, Math.floor((index + 1) * ratio));
    let sum = 0;
    for (let cursor = start; cursor < end; cursor += 1) sum += input[cursor];
    const sample = Math.max(-1, Math.min(1, sum / Math.max(1, end - start)));
    output[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  return new Uint8Array(output.buffer);
}

function canvasBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.48));
}

export default function useGeminiLiveInterview(config) {
  const sessionRef = useRef(null);
  const streamRef = useRef(null);
  const inputContextRef = useRef(null);
  const outputContextRef = useRef(null);
  const outputGainRef = useRef(null);
  const processorRef = useRef(null);
  const videoTimerRef = useRef(null);
  const frameSendingRef = useRef(false);
  const sourcesRef = useRef(new Set());
  const nextAudioTimeRef = useRef(0);
  const intentionalCloseRef = useRef(false);
  const responseTimerRef = useRef(null);
  const voiceHintTimerRef = useRef(null);
  const speechHeardRef = useRef(false);
  const pendingTranscriptRef = useRef([]);
  const transcriptSourceRef = useRef({ candidate: "", interviewer: "" });
  const transcriptTimerRef = useRef(null);
  const levelUpdatedAtRef = useRef(0);
  const outputLevelUpdatedAtRef = useRef(0);
  const connectedAtRef = useRef(0);
  const statusRef = useRef("idle");
  const voiceRunStartedAtRef = useRef(0);
  const answerVoiceStartedAtRef = useRef(0);
  const lastAudibleAtRef = useRef(0);
  const lastCandidateTranscriptAtRef = useRef(0);
  const clarityTimerRef = useRef(null);
  const modelResponseTimerRef = useRef(null);
  const lastInterruptionAtRef = useRef(0);

  const [status, setStatus] = useState("idle");
  const [micEnabled, setMicEnabledState] = useState(true);
  const [cameraEnabled, setCameraEnabledState] = useState(true);
  const [speakerEnabled, setSpeakerEnabledState] = useState(true);
  const [inputLevel, setInputLevel] = useState(0);
  const [outputLevel, setOutputLevel] = useState(0);
  const [connectionMs, setConnectionMs] = useState(null);
  const [transcript, setTranscript] = useState([]);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const stopOutput = useCallback(() => {
    sourcesRef.current.forEach((source) => { try { source.stop(); } catch { /* source already ended */ } });
    sourcesRef.current.clear();
    nextAudioTimeRef.current = 0;
    setOutputLevel(0);
  }, []);

  const flushTranscript = useCallback(() => {
    window.clearTimeout(transcriptTimerRef.current);
    transcriptTimerRef.current = null;
    const queued = pendingTranscriptRef.current.splice(0);
    if (!queued.length) return;
    setTranscript((current) => {
      const next = [...current];
      queued.forEach(({ role, text }) => {
        const last = next[next.length - 1];
        if (last?.role === role && !last.final) last.text += text;
        else next.push({ id: `${Date.now()}-${next.length}`, role, text, final: false });
      });
      return next.slice(-60);
    });
  }, []);

  const addTranscript = useCallback((role, incomingText) => {
    if (!incomingText?.trim()) return;

    const previous = transcriptSourceRef.current[role] || "";

    // Gemini may resend a complete partial or an overlapping suffix.
    // Keep only genuinely new text so captions never repeat words.
    if (incomingText === previous || previous.endsWith(incomingText)) return;
    let overlap = 0;
    if (incomingText.startsWith(previous)) {
      overlap = previous.length;
    } else {
      const maxOverlap = Math.min(previous.length, incomingText.length);
      for (let size = maxOverlap; size > 0; size -= 1) {
        if (previous.endsWith(incomingText.slice(0, size))) {
          overlap = size;
          break;
        }
      }
    }
    const delta = incomingText.slice(overlap);
    transcriptSourceRef.current[role] = previous + delta;

    if (!delta) return;
    pendingTranscriptRef.current.push({ role, text: delta });
    if (!transcriptTimerRef.current) {
      transcriptTimerRef.current = window.setTimeout(flushTranscript, 120);
    }
  }, [flushTranscript]);

  const clearVoiceTimers = useCallback(() => {
    window.clearTimeout(responseTimerRef.current);
    window.clearTimeout(voiceHintTimerRef.current);
    window.clearTimeout(clarityTimerRef.current);
    window.clearTimeout(modelResponseTimerRef.current);
    responseTimerRef.current = null;
    voiceHintTimerRef.current = null;
    clarityTimerRef.current = null;
    modelResponseTimerRef.current = null;
  }, []);

  const close = useCallback((reason = "ended") => {
    intentionalCloseRef.current = true;
    window.clearInterval(videoTimerRef.current);
    clearVoiceTimers();
    window.clearTimeout(transcriptTimerRef.current);
    processorRef.current?.disconnect();
    processorRef.current = null;
    sessionRef.current?.sendRealtimeInput?.({ audioStreamEnd: true });
    sessionRef.current?.close?.();
    sessionRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    inputContextRef.current?.close().catch(() => {});
    outputContextRef.current?.close().catch(() => {});
    inputContextRef.current = null;
    outputContextRef.current = null;
    outputGainRef.current = null;
    stopOutput();
    voiceRunStartedAtRef.current = 0;
    answerVoiceStartedAtRef.current = 0;
    lastAudibleAtRef.current = 0;
    setInputLevel(0);
    setOutputLevel(0);
    setStatus(reason);
  }, [clearVoiceTimers, stopOutput]);

  const playPcm = useCallback(async (base64) => {
    window.clearTimeout(modelResponseTimerRef.current);
    modelResponseTimerRef.current = null;
    const context = outputContextRef.current;
    if (!context) return;
    if (context.state === "suspended") await context.resume();
    const bytes = base64ToBytes(base64);
    const samples = new Int16Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 2));
    let outputEnergy = 0;
    for (let index = 0; index < samples.length; index += 8) {
      const normalized = samples[index] / 32768;
      outputEnergy += normalized * normalized;
    }
    const outputRms = Math.sqrt(outputEnergy / Math.max(1, Math.ceil(samples.length / 8)));
    const levelNow = performance.now();
    if (levelNow - outputLevelUpdatedAtRef.current > 60) {
      setOutputLevel(Math.min(1, outputRms * 5));
      outputLevelUpdatedAtRef.current = levelNow;
    }
    const buffer = context.createBuffer(1, samples.length, 24000);
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < samples.length; index += 1) channel[index] = samples[index] / 32768;
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(outputGainRef.current || context.destination);
    const startAt = Math.max(context.currentTime + 0.018, nextAudioTimeRef.current || 0);
    source.start(startAt);
    nextAudioTimeRef.current = startAt + buffer.duration;
    sourcesRef.current.add(source);
    source.onended = () => {
      sourcesRef.current.delete(source);
      if (!sourcesRef.current.size) setOutputLevel(0);
    };
    setStatus("interviewer-speaking");
  }, []);

  const scheduleNoAnswerPrompt = useCallback(() => {
    clearVoiceTimers();
    speechHeardRef.current = false;
    answerVoiceStartedAtRef.current = 0;
    voiceRunStartedAtRef.current = 0;
    voiceHintTimerRef.current = window.setTimeout(() => {
      if (!speechHeardRef.current && !answerVoiceStartedAtRef.current && sessionRef.current) {
        setNotice("I cannot hear an answer yet. Check your microphone or move closer.");
      }
    }, 5000);
    responseTimerRef.current = window.setTimeout(() => {
      if (!sessionRef.current || speechHeardRef.current || answerVoiceStartedAtRef.current) return;
      sessionRef.current.sendClientContent({
        turns: "[SESSION EVENT] The candidate has stayed silent. Politely ask whether the microphone is working or whether they need more time, then repeat the current question once.",
        turnComplete: true,
      });
    }, 10000);
  }, [clearVoiceTimers]);

  const scheduleModelResponseWatchdog = useCallback(() => {
    window.clearTimeout(modelResponseTimerRef.current);
    modelResponseTimerRef.current = window.setTimeout(() => {
      if (!sessionRef.current || statusRef.current === "interviewer-speaking") return;
      sessionRef.current.sendClientContent({
        turns: "[SESSION EVENT] The candidate finished an answer but the interview did not continue. Acknowledge the answer briefly and ask the next relevant follow-up question.",
        turnComplete: true,
      });
    }, 7000);
  }, []);

  const start = useCallback(async (mediaStream, videoElement) => {
    if (sessionRef.current || status === "connecting") return;
    intentionalCloseRef.current = false;
    connectedAtRef.current = performance.now();
    setConnectionMs(null);
    setError("");
    setNotice("Preparing secure live audio...");
    setTranscript([]);
    transcriptSourceRef.current = { candidate: "", interviewer: "" };
    setOutputLevel(0);
    setStatus("connecting");
    streamRef.current = mediaStream;
    setMicEnabledState(mediaStream.getAudioTracks().some((track) => track.enabled));
    setCameraEnabledState(mediaStream.getVideoTracks().some((track) => track.enabled));

    try {
      const credentials = await getLiveInterviewToken(config);
      const outputContext = new AudioContext({ sampleRate: 24000, latencyHint: "interactive" });
      const inputContext = new AudioContext({ latencyHint: "interactive" });
      outputContextRef.current = outputContext;
      inputContextRef.current = inputContext;

      const outputGain = outputContext.createGain();
      const compressor = outputContext.createDynamicsCompressor();
      outputGain.gain.value = speakerEnabled ? 1.12 : 0;
      compressor.threshold.value = -24;
      compressor.knee.value = 18;
      compressor.ratio.value = 3;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.25;
      outputGain.connect(compressor);
      compressor.connect(outputContext.destination);
      outputGainRef.current = outputGain;
      await Promise.all([outputContext.resume(), inputContext.resume()]);

      const ai = new GoogleGenAI({ apiKey: credentials.token, apiVersion: "v1alpha" });
      const liveSession = await ai.live.connect({
        model: credentials.model,
        config: {},
        callbacks: {
          onopen: () => {
            setConnectionMs(Math.round(performance.now() - connectedAtRef.current));
            setNotice(credentials.chargedTokens ? `${credentials.chargedTokens} credits used for this live room.` : "Secure room connected.");
            setStatus("connected");
          },
          onmessage: (message) => {
            const content = message.serverContent;
            if (content?.interrupted) {
              stopOutput();
              setStatus("listening");
              setNotice("Interruption detected. Listening to you now.");
            }
            if (content?.inputTranscription?.text) {
              speechHeardRef.current = true;
              lastCandidateTranscriptAtRef.current = Date.now();
              answerVoiceStartedAtRef.current = 0;
              clearVoiceTimers();
              scheduleModelResponseWatchdog();
              setNotice("");
              addTranscript("candidate", content.inputTranscription.text);
            }
            if (content?.outputTranscription?.text) {
              window.clearTimeout(modelResponseTimerRef.current);
              modelResponseTimerRef.current = null;
              addTranscript("interviewer", content.outputTranscription.text);
            }
            content?.modelTurn?.parts?.forEach((part) => {
              if (part.inlineData?.data) playPcm(part.inlineData.data);
            });
            if (content?.turnComplete) {
              flushTranscript();
              transcriptSourceRef.current = { candidate: "", interviewer: "" };
              setTranscript((current) => current.map((item, index) =>
                index === current.length - 1 ? { ...item, final: true } : item));
              setStatus("listening");
              scheduleNoAnswerPrompt();
            }
            if (message.goAway?.timeLeft) {
              setNotice("The interview connection will refresh shortly.");
            }
          },
          onerror: () => {
            setError("Live voice connection failed. Please rejoin the room.");
            setStatus("error");
          },
          onclose: () => {
            if (!intentionalCloseRef.current) {
              setError("The live connection ended. Rejoin to continue.");
              setStatus("disconnected");
            }
          },
        },
      });
      sessionRef.current = liveSession;

      const audioTrack = mediaStream.getAudioTracks()[0];
      if (!audioTrack) throw new Error("A microphone is required for the live interview.");
      audioTrack.onended = () => {
        setMicEnabledState(false);
        setInputLevel(0);
        clearVoiceTimers();
        setError("Microphone disconnected. Reconnect it, then rejoin the room.");
        sessionRef.current?.sendRealtimeInput?.({ audioStreamEnd: true });
      };
      audioTrack.onmute = () => {
        setInputLevel(0);
        setNotice("Microphone audio stopped. Check the browser or device microphone.");
      };
      audioTrack.onunmute = () => {
        setNotice("Microphone audio restored. You can continue speaking.");
        scheduleNoAnswerPrompt();
      };
      mediaStream.getVideoTracks().forEach((track) => {
        track.onended = () => setCameraEnabledState(false);
      });

      const source = inputContext.createMediaStreamSource(mediaStream);
      const processor = inputContext.createScriptProcessor(2048, 1, 1);
      const silentGain = inputContext.createGain();
      silentGain.gain.value = 0;
      processorRef.current = processor;
      processor.onaudioprocess = (event) => {
        if (!sessionRef.current || !audioTrack.enabled) return;
        const input = event.inputBuffer.getChannelData(0);
        let energy = 0;
        for (let index = 0; index < input.length; index += 4) energy += input[index] * input[index];
        const rms = Math.sqrt(energy / Math.ceil(input.length / 4));
        const now = performance.now();
        if (now - levelUpdatedAtRef.current > 100) {
          setInputLevel(Math.min(1, rms * 18));
          levelUpdatedAtRef.current = now;
        }
        const audibleThreshold = 0.016;
        if (rms > audibleThreshold) {
          if (!voiceRunStartedAtRef.current) voiceRunStartedAtRef.current = now;
          lastAudibleAtRef.current = now;
          window.clearTimeout(clarityTimerRef.current);
          clarityTimerRef.current = null;

          const sustainedVoice = now - voiceRunStartedAtRef.current >= 350;
          if (sustainedVoice && !answerVoiceStartedAtRef.current) {
            answerVoiceStartedAtRef.current = Date.now();
            window.clearTimeout(responseTimerRef.current);
            window.clearTimeout(voiceHintTimerRef.current);
            responseTimerRef.current = null;
            voiceHintTimerRef.current = null;
            setNotice("Voice detected. Listening to your answer...");
          }

          if (sustainedVoice && statusRef.current === "interviewer-speaking" && now - lastInterruptionAtRef.current > 2200) {
            lastInterruptionAtRef.current = now;
            stopOutput();
            setStatus("listening");
            setNotice("You interrupted the interviewer. Listening to you now.");
          }
        } else {
          voiceRunStartedAtRef.current = 0;
          const answerStartedAt = answerVoiceStartedAtRef.current;
          const quietFor = lastAudibleAtRef.current ? now - lastAudibleAtRef.current : 0;
          if (answerStartedAt && quietFor > 1400 && !clarityTimerRef.current) {
            clarityTimerRef.current = window.setTimeout(() => {
              clarityTimerRef.current = null;
              if (!sessionRef.current || lastCandidateTranscriptAtRef.current >= answerStartedAt) return;
              answerVoiceStartedAtRef.current = 0;
              setNotice("I heard audio but could not understand it clearly. Please repeat closer to the microphone.");
              sessionRef.current.sendClientContent({
                turns: "[SESSION EVENT] Voice activity was detected, but no usable transcription arrived. Briefly say the audio was unclear and ask the candidate to repeat the answer more clearly.",
                turnComplete: true,
              });
            }, 2400);
          }
        }
        const pcm = downsampleToPcm16(input, inputContext.sampleRate);
        sessionRef.current.sendRealtimeInput({
          audio: { data: bytesToBase64(pcm), mimeType: "audio/pcm;rate=16000" },
        });
      };
      source.connect(processor);
      processor.connect(silentGain);
      silentGain.connect(inputContext.destination);

      const canvas = document.createElement("canvas");
      canvas.width = 320;
      canvas.height = 240;
      const context = canvas.getContext("2d", { alpha: false, desynchronized: true });
      const sendVideoFrame = async () => {
        const videoTrack = mediaStream.getVideoTracks()[0];
        if (frameSendingRef.current || document.hidden || !sessionRef.current ||
            !videoTrack?.enabled || !videoElement?.videoWidth) return;
        frameSendingRef.current = true;
        try {
          context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
          const blob = await canvasBlob(canvas);
          if (!blob || !sessionRef.current) return;
          const bytes = new Uint8Array(await blob.arrayBuffer());
          sessionRef.current.sendRealtimeInput({
            video: { data: bytesToBase64(bytes), mimeType: "image/jpeg" },
          });
        } finally {
          frameSendingRef.current = false;
        }
      };
      videoTimerRef.current = window.setInterval(sendVideoFrame, 1800);
      window.setTimeout(sendVideoFrame, 300);
      liveSession.sendClientContent({ turns: "Begin the interview now.", turnComplete: true });
    } catch (startError) {
      close("error");
      const message = startError?.response?.data?.message || startError?.message || "Could not join the live interview.";
      setError(message);
      throw startError;
    }
  }, [addTranscript, clearVoiceTimers, close, config, flushTranscript, playPcm, scheduleModelResponseWatchdog, scheduleNoAnswerPrompt, speakerEnabled, status, stopOutput]);

  const setMicEnabled = useCallback((enabled) => {
    streamRef.current?.getAudioTracks().forEach((track) => { track.enabled = enabled; });
    if (!enabled) {
      clearVoiceTimers();
      sessionRef.current?.sendRealtimeInput?.({ audioStreamEnd: true });
      setInputLevel(0);
      setNotice("Microphone muted. Unmute when you are ready to answer.");
    } else {
      setNotice("Microphone is live. You can continue speaking.");
      scheduleNoAnswerPrompt();
    }
    setMicEnabledState(enabled);
  }, [clearVoiceTimers, scheduleNoAnswerPrompt]);

  const setCameraEnabled = useCallback((enabled) => {
    streamRef.current?.getVideoTracks().forEach((track) => { track.enabled = enabled; });
    setCameraEnabledState(enabled && Boolean(streamRef.current?.getVideoTracks().length));
  }, []);

  const setSpeakerEnabled = useCallback((enabled) => {
    const context = outputContextRef.current;
    const gain = outputGainRef.current;
    if (context && gain) gain.gain.setTargetAtTime(enabled ? 1.12 : 0, context.currentTime, 0.025);
    if (!enabled) stopOutput();
    setSpeakerEnabledState(enabled);
    setNotice(enabled ? "Speaker on." : "Speaker muted.");
  }, [stopOutput]);

  useEffect(() => {
    const stopWhenHidden = () => { if (document.hidden && sessionRef.current) close("paused-background"); };
    const stopOnPageHide = () => close("ended");
    document.addEventListener("visibilitychange", stopWhenHidden);
    window.addEventListener("pagehide", stopOnPageHide);
    return () => {
      document.removeEventListener("visibilitychange", stopWhenHidden);
      window.removeEventListener("pagehide", stopOnPageHide);
      close("ended");
    };
  }, [close]);

  return {
    status, error, notice, transcript, connectionMs, inputLevel, outputLevel,
    micEnabled, cameraEnabled, speakerEnabled,
    start, close, setMicEnabled, setCameraEnabled, setSpeakerEnabled,
  };
}
