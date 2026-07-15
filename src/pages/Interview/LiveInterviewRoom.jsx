import { useEffect, useMemo, useRef, useState } from "react";
import {
  Camera, CameraOff, Captions, Loader2, Mic, MicOff, PhoneOff,
  Radio, RotateCcw, ShieldCheck, Volume2, VolumeX, Wifi,
} from "lucide-react";
import toast from "react-hot-toast";
import useGeminiLiveInterview from "./useGeminiLiveInterview";
import InterviewSessionReport from "./InterviewSessionReport";
import { createSessionReport } from "./interviewReportUtils";
import InterviewRobotAvatar from "./InterviewRobotAvatar";
import "./LiveInterviewRoom.css";

const ACTIVE_STATES = ["connected", "listening", "interviewer-speaking"];

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

export default function LiveInterviewRoom({ config, onExit, onRecharge }) {
  const videoRef = useRef(null);
  const [joining, setJoining] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [report, setReport] = useState(null);
  const live = useGeminiLiveInterview(config);
  const active = ACTIVE_STATES.includes(live.status);
  const latestCaption = live.transcript[live.transcript.length - 1];

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

  async function join() {
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
  }

  async function toggleCamera() {
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
  }

  function exit() {
    const sessionReport = createSessionReport(live.transcript, seconds, config);
    live.close("ended");
    setReport(sessionReport);
  }

  if (report) {
    return <InterviewSessionReport report={report} onDone={onExit} />;
  }

  return (
    <div className="live-interview-room">
      <header className="live-room-header">
        <div className="live-room-identity">
          <span className="live-dot" />
          <div><strong>{config.role}</strong><small>{config.company || "AI mock interview"}</small></div>
        </div>
        <div className="live-room-meta">
          <span className={`live-room-status status-${live.status}`}><Radio size={12} />{statusText(live.status)}</span>
          <span className="live-call-time">{formatDuration(seconds)}</span>
          <span className="live-network"><Wifi size={12} />{connectionLabel}</span>
        </div>
      </header>

      <main className={`live-call-stage ${transcriptOpen ? "transcript-open" : ""}`}>
        <div className="live-participants">
          <section className={`live-video-tile ai-tile ${live.status === "interviewer-speaking" ? "is-speaking" : ""}`}>
            <div className="ai-avatar-stage">
              <InterviewRobotAvatar
                speaking={live.status === "interviewer-speaking"}
                level={live.outputLevel}
              />
            </div>
            <div className="ai-camera-light" aria-hidden="true" />
            <div className="live-person-label"><span>AI Interviewer</span><small>{live.status === "interviewer-speaking" ? "Speaking" : "Present"}</small></div>
            {live.status === "interviewer-speaking" && <div className="voice-wave" aria-label="Interviewer speaking"><i /><i /><i /><i /><i /></div>}
          </section>

          <section className={`live-video-tile candidate-tile ${live.inputLevel > 0.12 ? "is-speaking" : ""}`}>
            <video ref={videoRef} autoPlay muted playsInline />
            {!live.cameraEnabled && <div className="camera-off-state"><span className="candidate-initial">You</span><small>Camera off</small></div>}
            <div className="live-person-label"><span>You</span><small>{live.micEnabled ? "Mic live" : "Muted"}</small></div>
            <div className="mic-level" title="Microphone level"><i style={{ transform: `scaleX(${Math.max(0.03, live.inputLevel)})` }} /></div>
          </section>

          {latestCaption && active && <div className={`live-caption-strip ${latestCaption.role}`} aria-live="polite">
            <strong>{latestCaption.role === "interviewer" ? "Interviewer" : "You"}</strong>
            <span>{latestCaption.text}</span>
          </div>}
        </div>

        {transcriptOpen && <aside className="live-transcript-panel">
          <header><div><strong>Transcript</strong><small>Stored only for this room</small></div><ShieldCheck size={15} /></header>
          <div className="live-transcript-scroll">
            {live.transcript.length === 0 ? <p className="live-empty-transcript">Conversation captions will appear here.</p> : live.transcript.map((item) => (
              <article className={`live-caption ${item.role}`} key={item.id}>
                <span>{item.role === "interviewer" ? "Interviewer" : "You"}</span><p>{item.text}</p>
              </article>
            ))}
          </div>
        </aside>}

        {!active && <div className="join-call-overlay">
          <div className="join-call-dialog">
            <span className="join-room-icon"><Mic size={22} /></span>
            <h2>{live.status === "paused-background" ? "Interview paused" : "Ready to enter?"}</h2>
            <p>The interviewer will greet you, ask for your introduction, and continue with adaptive questions.</p>
            <ul><li>Speaker on by default</li><li>Camera optional</li><li>Credits charged only after secure room setup</li></ul>
            <button type="button" onClick={join} disabled={joining || live.status === "connecting"}>
              {joining || live.status === "connecting" ? <Loader2 size={17} className="animate-spin" /> : <Radio size={17} />}
              {joining || live.status === "connecting" ? "Connecting..." : live.status === "idle" ? "Join interview" : "Rejoin interview"}
            </button>
            {live.error && <em>{live.error}</em>}
          </div>
        </div>}

        {live.notice && active && <div className="live-room-notice">{live.notice}</div>}
      </main>

      <footer className="live-room-controls">
        <button type="button" className={live.speakerEnabled ? "control-active" : "control-off"} onClick={() => live.setSpeakerEnabled(!live.speakerEnabled)} disabled={!active} title={live.speakerEnabled ? "Mute speaker" : "Turn speaker on"}>{live.speakerEnabled ? <Volume2 size={19} /> : <VolumeX size={19} />}<span>Speaker</span></button>
        <button type="button" className={live.cameraEnabled ? "control-active" : "control-off"} onClick={toggleCamera} disabled={!active} title={live.cameraEnabled ? "Turn camera off" : "Turn camera on"}>{live.cameraEnabled ? <Camera size={19} /> : <CameraOff size={19} />}<span>Camera</span></button>
        <button type="button" className={`mic-primary ${live.micEnabled ? "control-active" : "control-off"}`} onClick={() => live.setMicEnabled(!live.micEnabled)} disabled={!active} title={live.micEnabled ? "Mute microphone" : "Unmute microphone"}>{live.micEnabled ? <Mic size={20} /> : <MicOff size={20} />}<span>{live.micEnabled ? "Mute" : "Unmute"}</span></button>
        <button type="button" className={transcriptOpen ? "control-active" : ""} onClick={() => setTranscriptOpen((value) => !value)} title="Toggle transcript"><Captions size={19} /><span>Captions</span></button>
        <button type="button" className="control-end" onClick={exit} title="End interview"><PhoneOff size={19} /><span>End</span></button>
        {!active && live.status !== "idle" && <button type="button" onClick={join} disabled={joining}><RotateCcw size={18} /><span>Rejoin</span></button>}
      </footer>
    </div>
  );
}
