import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Camera, CameraOff, Captions, Loader2, Mic, MicOff, PhoneOff,
  Radio, RotateCcw, ShieldCheck, Volume2, VolumeX, Wifi,
} from "lucide-react";
import toast from "react-hot-toast";
import useGeminiLiveInterview from "./useGeminiLiveInterview";
import InterviewSessionReport from "./InterviewSessionReport";
import { createSessionReport } from "./interviewReportUtils";

const ACTIVE_STATES = ["connected", "listening", "interviewer-speaking"];
const BAR_HEIGHTS = [8, 16, 22, 14, 9];
const INTERVIEWER_IDLE_VIDEO = import.meta.env.VITE_INTERVIEWER_IDLE_VIDEO_URL || "";
const INTERVIEWER_SPEAKING_VIDEO = import.meta.env.VITE_INTERVIEWER_SPEAKING_VIDEO_URL || INTERVIEWER_IDLE_VIDEO;

function statusText(status) {
  if (status === "connecting") return "Connecting";
  if (status === "interviewer-speaking") return "Interviewer speaking";
  if (status === "listening") return "Listening";
  if (status === "connected") return "Live";
  if (status === "paused-background") return "Paused in background";
  if (status === "disconnected") return "Connection ended";
  if (status === "error") return "Connection failed";
  return "Ready";
}

function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remaining = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remaining}`;
}

const controlClass = "grid h-[45px] w-[52px] place-content-center justify-items-center gap-1 rounded-lg border border-slate-700 bg-[#111a27] text-slate-300 transition hover:border-slate-500 hover:bg-[#162235] disabled:opacity-30 md:h-[52px] md:w-[62px]";

/**
 * Maya's avatar panel.
 * Movement is driven entirely through refs + a single requestAnimationFrame
 * loop instead of React state, so the "speaking" animation stays perfectly
 * smooth at 60fps and never triggers a re-render of this component (or its
 * siblings) on every audio frame. React only re-renders this when `status`
 * changes (a handful of times per interview), never on every level tick.
 */
const InterviewerPanel = memo(function InterviewerPanel({ status, outputLevelRef }) {
  const speaking = status === "interviewer-speaking";
  const mediaUrl = speaking ? INTERVIEWER_SPEAKING_VIDEO : INTERVIEWER_IDLE_VIDEO;
  const [failedVideoUrl, setFailedVideoUrl] = useState("");
  const videoFailed = Boolean(mediaUrl) && failedVideoUrl === mediaUrl;
  const frameRef = useRef(null);
  const wrapRef = useRef(null);
  const barRefs = useRef([]);
  const speakingRef = useRef(speaking);

  useEffect(() => {
    speakingRef.current = speaking;
  }, [speaking]);

  useEffect(() => {
    const tick = (t) => {
      const level = Math.max(0, Math.min(1, outputLevelRef.current || 0));
      const isSpeaking = speakingRef.current;

      if (wrapRef.current) {
        const bob = isSpeaking
          ? Math.sin(t / 150) * 2.4 * (0.35 + level)
          : Math.sin(t / 900) * 1.35;
        const drift = isSpeaking ? Math.sin(t / 260) * 0.35 : Math.sin(t / 1500) * 0.22;
        const scale = isSpeaking ? 1 + level * 0.018 : 1.018 + Math.sin(t / 1200) * 0.004;
        wrapRef.current.style.transform = `translate3d(${drift.toFixed(2)}px, ${bob.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
        wrapRef.current.style.filter = isSpeaking
          ? `brightness(${(1.03 + Math.min(0.08, level * 0.05)).toFixed(3)}) saturate(1.05)`
          : "none";
        wrapRef.current.style.boxShadow = isSpeaking
          ? `inset 0 0 0 1px rgba(34,211,238,.25), 0 0 ${18 + level * 30}px rgba(34,211,238,${(0.08 + level * 0.22).toFixed(2)})`
          : "none";
      }


      barRefs.current.forEach((el, i) => {
        if (!el) return;
        const base = BAR_HEIGHTS[i] || 10;
        const h = isSpeaking ? Math.max(4, base * (0.4 + level * 1.3)) : base;
        el.style.height = `${h.toFixed(1)}px`;
      });

      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [outputLevelRef]);

  return (
    <section className={`relative h-full min-h-0 overflow-hidden rounded-lg border bg-[#0a1019] ${speaking ? "border-cyan-400" : "border-slate-700"}`}>
      <div
        ref={wrapRef}
        className={`absolute -inset-1 overflow-hidden will-change-transform ${speaking ? "cf-interviewer-speaking" : "cf-interviewer-idle"}`}
      >
        {mediaUrl && !videoFailed ? (
          <video
            key={mediaUrl}
            className="h-full w-full object-cover object-[center_36%]"
            src={mediaUrl}
            poster="/images/ai-interviewer.png"
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            onError={() => setFailedVideoUrl(mediaUrl)}
            aria-label="Maya, professional CareerForge interviewer"
          />
        ) : (
          <img className="h-full w-full object-cover object-[center_36%]" src="/images/ai-interviewer.png" alt="Maya, professional CareerForge interviewer" />
        )}
        <div className="pointer-events-none absolute inset-0 border border-cyan-300/10 shadow-[inset_0_-48px_70px_rgba(3,6,10,.18)]" />
      </div>
      <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,.7)]" />
      <div className="absolute bottom-2.5 left-2.5 z-[3] flex items-center gap-2 rounded-md border border-slate-400/15 bg-[#05090fd1] px-2 py-1.5 backdrop-blur-sm">
        <span className="text-[10px] font-extrabold">Maya, Interviewer</span>
        <small className="text-[8px] text-slate-400">{speaking ? "Speaking" : "Present"}</small>
      </div>
      {speaking && (
        <div className="absolute bottom-2.5 right-2.5 z-[3] flex h-7 items-center gap-1 rounded-md bg-cyan-950/80 px-2" aria-label="Interviewer speaking">
          {BAR_HEIGHTS.map((height, index) => (
            <i
              ref={(el) => (barRefs.current[index] = el)}
              className="w-[3px] rounded-full bg-cyan-300 transition-[height] duration-75"
              style={{ height }}
              key={index}
            />
          ))}
        </div>
      )}
    </section>
  );
});

const CandidateVideo = memo(function CandidateVideo({ videoRef, cameraEnabled, micEnabled, inputLevel }) {
  return (
    <section className={`absolute right-2.5 top-2.5 z-[6] h-[112px] w-[86px] sm:h-[132px] sm:w-[102px] overflow-hidden rounded-lg border-2 bg-[#0a1019] shadow-2xl md:static md:h-auto md:w-auto md:border md:shadow-none ${inputLevel > 0.12 ? "border-cyan-400" : "border-slate-700"}`}>
      <video className="h-full w-full -scale-x-100 object-cover" ref={videoRef} autoPlay muted playsInline />
      {!cameraEnabled && (
        <div className="absolute inset-0 grid place-content-center justify-items-center gap-2 bg-[#0a111c] text-slate-500">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-cyan-300 text-sm font-black text-[#071018]">You</span>
          <small className="text-[10px]">Camera off</small>
        </div>
      )}
      <div className="absolute bottom-1.5 left-1.5 z-[3] flex items-center gap-2 rounded-md border border-slate-400/15 bg-[#05090fd1] px-1.5 py-1 md:bottom-2.5 md:left-2.5 md:px-2 md:py-1.5">
        <span className="text-[10px] font-extrabold">You</span>
        <small className="hidden text-[8px] text-slate-400 md:block">{micEnabled ? "Mic live" : "Muted"}</small>
      </div>
      <div className="absolute bottom-3 right-2.5 z-[3] hidden h-1 w-16 overflow-hidden rounded-full bg-slate-400/20 md:block" title="Microphone level">
        <i className="block h-full w-full origin-left bg-emerald-400 transition-transform duration-100" style={{ transform: `scaleX(${Math.max(0.03, inputLevel)})` }} />
      </div>
    </section>
  );
});

const TranscriptPanel = memo(function TranscriptPanel({ transcript }) {
  return (
    <aside className="absolute inset-x-1 bottom-1 z-[9] grid h-[min(46%,300px)] min-h-0 grid-rows-[52px_minmax(0,1fr)] overflow-hidden rounded-lg border border-slate-700 bg-[#090e16] shadow-2xl md:static md:h-auto md:rounded-none md:border-y-0 md:border-r-0 md:shadow-none">
      <header className="flex items-center justify-between border-b border-slate-800 px-3.5 text-slate-400">
        <div><strong className="block text-[11px] text-slate-100">Transcript</strong><small className="mt-0.5 block text-[8px]">Stored only for this room</small></div>
        <ShieldCheck size={15} />
      </header>
      <div className="min-h-0 overflow-y-auto p-2.5">
        {transcript.length === 0 ? (
          <p className="m-4 text-[10px] text-slate-600">Conversation captions will appear here.</p>
        ) : (
          transcript.map((item) => (
            <article className={`mb-3 border-l-2 pl-2 ${item.role === "candidate" ? "border-emerald-400" : "border-cyan-400"}`} key={item.id}>
              <span className="text-[8px] uppercase text-slate-500">{item.role === "interviewer" ? "Interviewer" : "You"}</span>
              <p className="mt-1 text-[10px] leading-4 text-slate-300">{item.text}</p>
            </article>
          ))
        )}
      </div>
    </aside>
  );
});

const FooterControls = memo(function FooterControls({
  active, speakerEnabled, cameraEnabled, micEnabled, transcriptOpen,
  onToggleSpeaker, onToggleCamera, onToggleMic, onToggleTranscript, onExit, onRejoin, joining, canRejoin,
}) {
  return (
    <footer className="flex items-center justify-center gap-1.5 border-t border-slate-800 bg-[#090e16] p-1.5 md:gap-2 md:p-2.5">
      <button type="button" className={`${controlClass} ${speakerEnabled ? "text-cyan-50" : "bg-red-950/50 text-red-300"}`} onClick={onToggleSpeaker} disabled={!active} title={speakerEnabled ? "Mute speaker" : "Turn speaker on"}>
        {speakerEnabled ? <Volume2 size={19} /> : <VolumeX size={19} />}<span className="text-[7px] md:text-[8px]">Speaker</span>
      </button>
      <button type="button" className={`${controlClass} ${cameraEnabled ? "text-cyan-50" : "bg-red-950/50 text-red-300"}`} onClick={onToggleCamera} disabled={!active} title={cameraEnabled ? "Turn camera off" : "Turn camera on"}>
        {cameraEnabled ? <Camera size={19} /> : <CameraOff size={19} />}<span className="text-[7px] md:text-[8px]">Camera</span>
      </button>
      <button type="button" className={`${controlClass} -translate-y-0.5 border-cyan-800 bg-cyan-950/50 ${micEnabled ? "text-cyan-50" : "border-red-900 bg-red-950/50 text-red-300"}`} onClick={onToggleMic} disabled={!active} title={micEnabled ? "Mute microphone" : "Unmute microphone"}>
        {micEnabled ? <Mic size={20} /> : <MicOff size={20} />}<span className="text-[7px] md:text-[8px]">{micEnabled ? "Mute" : "Unmute"}</span>
      </button>
      <button type="button" className={`${controlClass} ${transcriptOpen ? "text-cyan-100" : ""}`} onClick={onToggleTranscript} title="Toggle transcript">
        <Captions size={19} /><span className="text-[7px] md:text-[8px]">Captions</span>
      </button>
      <button type="button" className={`${controlClass} border-red-800 bg-red-600 text-white hover:bg-red-700`} onClick={onExit} title="End interview">
        <PhoneOff size={19} /><span className="text-[7px] md:text-[8px]">End</span>
      </button>
      {!active && canRejoin && (
        <button type="button" className={controlClass} onClick={onRejoin} disabled={joining}>
          <RotateCcw size={18} /><span className="text-[7px] md:text-[8px]">Rejoin</span>
        </button>
      )}
    </footer>
  );
});

export default function LiveInterviewRoom({ config, onExit, onRecharge }) {
  const videoRef = useRef(null);
  const [joining, setJoining] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [report, setReport] = useState(null);
  const live = useGeminiLiveInterview(config);
  const active = ACTIVE_STATES.includes(live.status);
  const latestCaption = live.transcript[live.transcript.length - 1];

  // Kept in a ref (not state) so the avatar's rAF loop can read the live
  // audio level every frame without forcing React to re-render anything.
  const outputLevelRef = useRef(0);

  useEffect(() => {
    outputLevelRef.current = live.outputLevel;
  }, [live.outputLevel]);

  useEffect(() => {
    if (!active) return undefined;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [active]);

  const connectionLabel = useMemo(() => {
    if (!live.connectionMs) return "Secure direct connection";
    if (live.connectionMs < 1500) return `${live.connectionMs} ms setup`;
    return `${(live.connectionMs / 1000).toFixed(1)} s setup`;
  }, [live.connectionMs]);

  const join = useCallback(async () => {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      toast.error("Microphone needs HTTPS or localhost. Open this app on a secure URL.");
      return;
    }
    setJoining(true);
    setSeconds(0);
    try {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1,
            sampleRate: { ideal: 48000 },
          },
          video: {
            facingMode: "user",
            width: { ideal: 960, max: 1280 },
            height: { ideal: 720, max: 720 },
            frameRate: { ideal: 24, max: 30 },
          },
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
          video: false,
        });
        toast("Camera unavailable. Joining with microphone only.");
      }
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      await live.start(stream, videoRef.current);
    } catch (error) {
      if (error?.response?.status === 402) onRecharge?.();
      else if (error?.name === "NotAllowedError") {
        toast.error("Allow microphone permission from the browser address bar, then retry.");
      } else {
        toast.error(error?.response?.data?.message || "Could not start the live interview.");
      }
    } finally {
      setJoining(false);
    }
  }, [live, onRecharge]);

  const toggleCamera = useCallback(async () => {
    if (live.cameraEnabled) {
      live.setCameraEnabled(false);
      return;
    }
    const stream = videoRef.current?.srcObject;
    const reusableTrack = stream?.getVideoTracks().find((track) => track.readyState === "live");
    if (reusableTrack) {
      reusableTrack.enabled = true;
      live.setCameraEnabled(true);
      return;
    }
    try {
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 960 }, height: { ideal: 720 } },
        audio: false,
      });
      const track = cameraStream.getVideoTracks()[0];
      stream?.addTrack(track);
      track.onended = () => live.setCameraEnabled(false);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      live.setCameraEnabled(true);
    } catch {
      toast.error("Camera permission was not granted.");
    }
  }, [live]);

  const exit = useCallback(() => {
    const sessionReport = createSessionReport(live.transcript, seconds, config);
    live.close("ended");
    setReport(sessionReport);
  }, [live, seconds, config]);

  const toggleTranscript = useCallback(() => setTranscriptOpen((value) => !value), []);
  const toggleSpeaker = useCallback(() => live.setSpeakerEnabled(!live.speakerEnabled), [live]);
  const toggleMic = useCallback(() => live.setMicEnabled(!live.micEnabled), [live]);

  if (report) {
    return <InterviewSessionReport report={report} onDone={onExit} />;
  }

  const statusTone = live.status === "interviewer-speaking"
    ? "border-cyan-800 text-cyan-300"
    : active ? "border-emerald-900 text-emerald-300" : "border-slate-700 text-slate-400";

  return (
    <div className="grid h-full min-h-0 grid-rows-[48px_minmax(0,1fr)_66px] overflow-hidden bg-[#05080d] text-slate-50 md:grid-rows-[56px_minmax(0,1fr)_76px]">
      <header className="flex min-w-0 items-center justify-between gap-3 border-b border-slate-800 bg-[#090e16] px-2.5 md:px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(52,211,153,.11)]" />
          <div className="min-w-0">
            <strong className="block max-w-[48vw] truncate text-[11px] md:max-w-[32vw] md:text-[13px]">{config.role}</strong>
            <small className="mt-0.5 block max-w-[48vw] truncate text-[8px] text-slate-500 md:max-w-[32vw] md:text-[9px]">{config.company || "AI mock interview"}</small>
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-1.5 md:gap-2.5">
          <span className={`flex h-7 w-7 items-center justify-center gap-1 rounded-md border bg-[#0d1521] px-0 text-[0] md:w-auto md:px-2 md:text-[10px] ${statusTone}`}><Radio size={12} />{statusText(live.status)}</span>
          <span className="flex h-7 items-center rounded-md border border-slate-700 bg-[#0d1521] px-2 text-[9px] tabular-nums text-slate-200 md:text-[10px]">{formatDuration(seconds)}</span>
          <span className="hidden h-7 items-center gap-1 rounded-md border border-slate-700 bg-[#0d1521] px-2 text-[10px] text-slate-400 lg:flex"><Wifi size={12} />{connectionLabel}</span>
        </div>
      </header>

      <main className={`relative min-h-0 min-w-0 overflow-hidden bg-[#03060a] md:grid ${transcriptOpen ? "md:grid-cols-[minmax(0,1fr)_300px]" : "md:grid-cols-1"}`}>
        <div className="relative h-full min-h-0 min-w-0 p-1 md:grid md:grid-cols-2 md:gap-2 md:p-2">
          <InterviewerPanel status={live.status} outputLevelRef={outputLevelRef} />
          <CandidateVideo videoRef={videoRef} cameraEnabled={live.cameraEnabled} micEnabled={live.micEnabled} inputLevel={live.inputLevel} />

          {latestCaption && active && !transcriptOpen && (
            <div className="absolute bottom-2.5 left-2 right-2 z-[12] flex max-h-[34%] items-start gap-2 overflow-y-auto rounded-md border border-slate-400/20 bg-[#03070cf2] px-2.5 py-2 shadow-xl backdrop-blur-sm sm:left-3 sm:right-3 md:left-1/2 md:right-auto md:max-h-[28%] md:w-fit md:max-w-[76%] md:-translate-x-1/2" aria-live="polite">
              <strong className={`sticky top-0 shrink-0 text-[9px] uppercase ${latestCaption.role === "interviewer" ? "text-cyan-300" : "text-emerald-300"}`}>{latestCaption.role === "interviewer" ? "Interviewer" : "You"}</strong>
              <span className="min-w-0 whitespace-pre-wrap break-words text-[11px] leading-4 text-slate-100 md:text-xs md:leading-5">{latestCaption.text}</span>
            </div>
          )}
        </div>

        {transcriptOpen && <TranscriptPanel transcript={live.transcript} />}

        {!active && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-[#020509c2] p-2.5 backdrop-blur-sm md:p-5">
            <div className="w-full max-w-[410px] rounded-lg border border-slate-700 bg-[#0b121d] p-4 text-center shadow-2xl md:p-6">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-cyan-800 bg-cyan-950/60 text-cyan-300"><Mic size={22} /></span>
              <h2 className="mb-1 mt-3 text-[17px] font-black md:text-xl">{live.status === "paused-background" ? "Interview paused" : "Ready to enter?"}</h2>
              <p className="text-[10px] leading-5 text-slate-400 md:text-[11px]">The interviewer will greet you, ask for your introduction, and continue with adaptive questions.</p>
              <ul className="mt-3 flex flex-wrap justify-center gap-1.5">
                {["Speaker on by default", "Camera optional", "Credits charged after setup"].map((item) => (
                  <li className="rounded border border-slate-700 bg-[#0f1927] px-2 py-1 text-[8px] text-slate-400" key={item}>{item}</li>
                ))}
              </ul>
              <button className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-cyan-400 px-4 text-[11px] font-black text-[#04141a] disabled:opacity-50" type="button" onClick={join} disabled={joining || live.status === "connecting"}>
                {joining || live.status === "connecting" ? <Loader2 size={17} className="animate-spin" /> : <Radio size={17} />}
                {joining || live.status === "connecting" ? "Connecting..." : live.status === "idle" ? "Join interview" : "Rejoin interview"}
              </button>
              {live.error && <em className="mt-2.5 block text-[9px] not-italic leading-4 text-red-300">{live.error}</em>}
            </div>
          </div>
        )}

        {live.notice && active && <div className="absolute bottom-[52px] left-1/2 z-[8] max-w-[80%] -translate-x-1/2 rounded-md border border-slate-700 bg-[#0c131ee6] px-2.5 py-1.5 text-[9px] text-slate-300 md:bottom-auto md:top-2.5">{live.notice}</div>}
      </main>

      <FooterControls
        active={active}
        speakerEnabled={live.speakerEnabled}
        cameraEnabled={live.cameraEnabled}
        micEnabled={live.micEnabled}
        transcriptOpen={transcriptOpen}
        onToggleSpeaker={toggleSpeaker}
        onToggleCamera={toggleCamera}
        onToggleMic={toggleMic}
        onToggleTranscript={toggleTranscript}
        onExit={exit}
        onRejoin={join}
        joining={joining}
        canRejoin={live.status !== "idle"}
      />
    </div>
  );
}