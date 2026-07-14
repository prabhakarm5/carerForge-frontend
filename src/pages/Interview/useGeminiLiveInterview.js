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

export default function useGeminiLiveInterview(config) {
  const sessionRef = useRef(null);
  const streamRef = useRef(null);
  const inputContextRef = useRef(null);
  const outputContextRef = useRef(null);
  const outputGainRef = useRef(null);
  const processorRef = useRef(null);
  const videoTimerRef = useRef(null);
  const sourcesRef = useRef(new Set());
  const nextAudioTimeRef = useRef(0);
  const intentionalCloseRef = useRef(false);
  const responseTimerRef = useRef(null);
  const speechHeardRef = useRef(false);
  const [status, setStatus] = useState("idle");
  const [micEnabled, setMicEnabledState] = useState(true);
  const [cameraEnabled, setCameraEnabledState] = useState(true);
  const [transcript, setTranscript] = useState([]);
  const [error, setError] = useState("");

  const stopOutput = useCallback(() => {
    sourcesRef.current.forEach((source) => { try { source.stop(); } catch { /* already stopped */ } });
    sourcesRef.current.clear();
    nextAudioTimeRef.current = 0;
  }, []);

  const close = useCallback((reason = "ended") => {
    intentionalCloseRef.current = true;
    window.clearInterval(videoTimerRef.current);
    window.clearTimeout(responseTimerRef.current);
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
    setStatus(reason);
  }, [stopOutput]);

  const playPcm = useCallback(async (base64) => {
    const context = outputContextRef.current;
    if (!context) return;
    if (context.state === "suspended") await context.resume();
    const bytes = base64ToBytes(base64);
    const samples = new Int16Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 2));
    const buffer = context.createBuffer(1, samples.length, 24000);
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < samples.length; index += 1) channel[index] = samples[index] / 32768;
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(outputGainRef.current || context.destination);
    const startAt = Math.max(context.currentTime + 0.025, nextAudioTimeRef.current || 0);
    source.start(startAt);
    nextAudioTimeRef.current = startAt + buffer.duration;
    sourcesRef.current.add(source);
    source.onended = () => sourcesRef.current.delete(source);
    setStatus("interviewer-speaking");
  }, []);

  const addTranscript = useCallback((role, text) => {
    if (!text?.trim()) return;
    setTranscript((current) => {
      const last = current[current.length - 1];
      if (last?.role === role && !last.final) {
        return [...current.slice(0, -1), { ...last, text: `${last.text}${text}` }];
      }
      return [...current, { id: `${Date.now()}-${current.length}`, role, text, final: false }].slice(-24);
    });
  }, []);

  const scheduleNoAnswerPrompt = useCallback(() => {
    window.clearTimeout(responseTimerRef.current);
    speechHeardRef.current = false;
    responseTimerRef.current = window.setTimeout(() => {
      if (!sessionRef.current || speechHeardRef.current) return;
      sessionRef.current.sendClientContent({
        turns: "[SESSION EVENT] The candidate has not given a clear audible answer yet. Ask whether they need more time, then repeat the current question briefly.",
        turnComplete: true,
      });
    }, 14000);
  }, []);

  const start = useCallback(async (mediaStream, videoElement) => {
    if (sessionRef.current || status === "connecting") return;
    intentionalCloseRef.current = false;
    setError("");
    setTranscript([]);
    setStatus("connecting");
    streamRef.current = mediaStream;
    setMicEnabledState(mediaStream.getAudioTracks().some((track) => track.enabled));
    setCameraEnabledState(mediaStream.getVideoTracks().some((track) => track.enabled));
    try {
      const credentials = await getLiveInterviewToken(config);
      const outputContext = new AudioContext({ sampleRate: 24000 });
      const inputContext = new AudioContext();
      outputContextRef.current = outputContext;
      inputContextRef.current = inputContext;
      const outputGain = outputContext.createGain();
      const compressor = outputContext.createDynamicsCompressor();
      outputGain.gain.value = 1.12;
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
          onopen: () => setStatus("connected"),
          onmessage: (message) => {
            const content = message.serverContent;
            if (content?.interrupted) stopOutput();
            if (content?.inputTranscription?.text) {
              speechHeardRef.current = true;
              window.clearTimeout(responseTimerRef.current);
              addTranscript("candidate", content.inputTranscription.text);
            }
            if (content?.outputTranscription?.text) addTranscript("interviewer", content.outputTranscription.text);
            content?.modelTurn?.parts?.forEach((part) => {
              if (part.inlineData?.data) playPcm(part.inlineData.data);
            });
            if (content?.turnComplete) {
              setTranscript((current) => current.map((item, index) => index === current.length - 1 ? { ...item, final: true } : item));
              setStatus("listening");
              scheduleNoAnswerPrompt();
            }
          },
          onerror: () => {
            setError("Live voice connection failed. Please rejoin the room.");
            setStatus("error");
          },
          onclose: () => {
            if (!intentionalCloseRef.current) setStatus("disconnected");
          },
        },
      });
      sessionRef.current = liveSession;

      const source = inputContext.createMediaStreamSource(mediaStream);
      const processor = inputContext.createScriptProcessor(4096, 1, 1);
      const silentGain = inputContext.createGain();
      silentGain.gain.value = 0;
      processorRef.current = processor;
      processor.onaudioprocess = (event) => {
        if (!sessionRef.current || !mediaStream.getAudioTracks()[0]?.enabled) return;
        const input = event.inputBuffer.getChannelData(0);
        let energy = 0;
        for (let index = 0; index < input.length; index += 4) energy += input[index] * input[index];
        const rms = Math.sqrt(energy / Math.ceil(input.length / 4));
        if (rms > 0.012) {
          speechHeardRef.current = true;
          window.clearTimeout(responseTimerRef.current);
        }
        const pcm = downsampleToPcm16(input, inputContext.sampleRate);
        sessionRef.current.sendRealtimeInput({ audio: { data: bytesToBase64(pcm), mimeType: "audio/pcm;rate=16000" } });
      };
      source.connect(processor);
      processor.connect(silentGain);
      silentGain.connect(inputContext.destination);

      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 384;
      const context = canvas.getContext("2d", { alpha: false });
      videoTimerRef.current = window.setInterval(() => {
        const videoTrack = mediaStream.getVideoTracks()[0];
        if (!sessionRef.current || !videoTrack?.enabled || !videoElement?.videoWidth) return;
        context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        const data = canvas.toDataURL("image/jpeg", 0.55).split(",")[1];
        sessionRef.current.sendRealtimeInput({ video: { data, mimeType: "image/jpeg" } });
      }, 1200);
      liveSession.sendClientContent({ turns: "Begin the interview now.", turnComplete: true });
    } catch (startError) {
      close("error");
      setError(startError?.response?.data?.message || startError?.message || "Could not join the live interview.");
      throw startError;
    }
  }, [addTranscript, close, config, playPcm, scheduleNoAnswerPrompt, status, stopOutput]);

  const setMicEnabled = useCallback((enabled) => {
    streamRef.current?.getAudioTracks().forEach((track) => { track.enabled = enabled; });
    if (!enabled) sessionRef.current?.sendRealtimeInput?.({ audioStreamEnd: true });
    setMicEnabledState(enabled);
  }, []);

  const setCameraEnabled = useCallback((enabled) => {
    streamRef.current?.getVideoTracks().forEach((track) => { track.enabled = enabled; });
    setCameraEnabledState(enabled);
  }, []);

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

  return { status, error, transcript, micEnabled, cameraEnabled, start, close, setMicEnabled, setCameraEnabled };
}
