/* eslint-disable react-refresh/only-export-components */
import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import toast from "react-hot-toast";

function recognitionConstructor() {
  return window.SpeechRecognition || window.webkitSpeechRecognition;
}

export function speechSupported() {
  return Boolean(recognitionConstructor());
}

export function stopSpeaking() {
  window.speechSynthesis?.cancel();
}

export function speakText(text, language = "en-IN") {
  if (!window.speechSynthesis || !text?.trim()) return false;
  const clean = text
    .replace(/```[\s\S]*?```/g, " Code example omitted. ")
    .replace(/[`#>*_~[\]()]/g, " ")
    .replace(/https?:\/\/\S+/g, " link ")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean) return false;
  stopSpeaking();
  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.lang = language;
  utterance.rate = 1;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
  return true;
}

export function VoiceInputButton({ value = "", onChange, disabled, language = "en-IN", className = "", title = "Speak" }) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  const startingTextRef = useRef("");

  useEffect(() => () => recognitionRef.current?.abort(), []);

  function toggle() {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const Recognition = recognitionConstructor();
    if (!Recognition) {
      toast.error("Voice typing is not supported in this browser. Use Chrome or Edge.");
      return;
    }
    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;
    startingTextRef.current = value.trim();
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = (event) => {
      setListening(false);
      if (event.error !== "aborted") toast.error(event.error === "not-allowed" ? "Microphone permission is required." : "Voice input stopped. Please retry.");
    };
    recognition.onresult = (event) => {
      let transcript = "";
      for (let index = 0; index < event.results.length; index += 1) transcript += event.results[index][0].transcript;
      onChange?.([startingTextRef.current, transcript.trim()].filter(Boolean).join(startingTextRef.current ? " " : ""));
    };
    recognitionRef.current = recognition;
    recognition.start();
  }

  return (
    <button type="button" onClick={toggle} disabled={disabled} className={`${className} ${listening ? "voice-control-listening" : ""}`} title={listening ? "Stop listening" : title} aria-label={listening ? "Stop listening" : title}>
      {listening ? <MicOff size={16} /> : <Mic size={16} />}
    </button>
  );
}

export function SpeakButton({ text, disabled, language = "en-IN", className = "", title = "Read aloud" }) {
  const [speaking, setSpeaking] = useState(false);

  function toggle() {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    if (!speakText(text, language)) return;
    setSpeaking(true);
    const poll = window.setInterval(() => {
      if (!window.speechSynthesis?.speaking) {
        window.clearInterval(poll);
        setSpeaking(false);
      }
    }, 250);
  }

  useEffect(() => () => stopSpeaking(), []);
  return (
    <button type="button" onClick={toggle} disabled={disabled || !text?.trim()} className={className} title={speaking ? "Stop reading" : title} aria-label={speaking ? "Stop reading" : title}>
      {speaking ? <VolumeX size={15} /> : <Volume2 size={15} />}
    </button>
  );
}
