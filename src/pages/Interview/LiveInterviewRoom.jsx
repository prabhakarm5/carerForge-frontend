import { useRef, useState } from "react";
import { Camera, CameraOff, Loader2, Mic, MicOff, PhoneOff, Radio, RotateCcw, ShieldCheck, Volume2 } from "lucide-react";
import toast from "react-hot-toast";
import useGeminiLiveInterview from "./useGeminiLiveInterview";
import "./LiveInterviewRoom.css";

function statusText(status) {
  if (status === "connecting") return "Connecting securely...";
  if (status === "interviewer-speaking") return "Interviewer is speaking";
  if (status === "listening") return "Listening to you";
  if (status === "connected") return "Interview is live";
  if (status === "paused-background") return "Paused because the app went to background";
  if (status === "disconnected") return "Connection ended";
  if (status === "error") return "Could not connect";
  return "Ready to join";
}

export default function LiveInterviewRoom({ config, onExit }) {
  const videoRef = useRef(null);
  const [joining, setJoining] = useState(false);
  const live = useGeminiLiveInterview(config);
  const active = ["connected", "listening", "interviewer-speaking"].includes(live.status);

  async function join() {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      toast.error("Microphone needs HTTPS or localhost. Open this app on a secure URL.");
      return;
    }
    setJoining(true);
    try {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
          video: { facingMode: "user", width: { ideal: 960 }, height: { ideal: 720 } },
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
      if (error?.name === "NotAllowedError") toast.error("Allow microphone permission from the browser address bar, then retry.");
      else toast.error(error?.response?.data?.message || "Could not start the live interview.");
    } finally {
      setJoining(false);
    }
  }

  function exit() {
    live.close("ended");
    onExit?.();
  }

  return (
    <div className="live-interview-room">
      <header className="live-room-header">
        <div><span className="live-dot" /><strong>CareerForge Interview Room</strong><small>{config.role}{config.company ? ` at ${config.company}` : ""}</small></div>
        <div className={`live-room-status status-${live.status}`}><Radio size={13} />{statusText(live.status)}</div>
      </header>

      <main className="live-video-grid">
        <section className={`live-video-tile ai-tile ${live.status === "interviewer-speaking" ? "is-speaking" : ""}`}>
          <div className="ai-avatar-stage">
            <img src="/images/ai-interviewer.png" alt="AI interviewer" />
            <span className="ai-mouth-reaction" aria-hidden="true"><i /></span>
          </div>
          <div className="live-tile-shade" />
          <div className="live-person-label"><span>AI Interviewer</span><small><Volume2 size={11} /> Gemini Live voice</small></div>
          {live.status === "interviewer-speaking" && <div className="voice-wave" aria-label="Interviewer speaking"><i /><i /><i /><i /><i /></div>}
        </section>

        <section className={`live-video-tile candidate-tile ${live.micEnabled && active ? "is-speaking" : ""}`}>
          <video ref={videoRef} autoPlay muted playsInline />
          {!live.cameraEnabled && <div className="camera-off-state"><CameraOff size={28} /><span>Camera off</span></div>}
          {!active && <div className="join-room-overlay">
            <span className="join-room-icon"><Mic size={24} /></span>
            <h2>{live.status === "paused-background" ? "Interview paused" : "Ready for your interview?"}</h2>
            <p>Microphone is required. Camera is optional and can be turned off anytime.</p>
            <button type="button" onClick={join} disabled={joining || live.status === "connecting"}>
              {joining || live.status === "connecting" ? <Loader2 size={17} className="animate-spin" /> : <Radio size={17} />}
              {live.status === "paused-background" ? "Rejoin interview" : "Join and start"}
            </button>
            {live.error && <em>{live.error}</em>}
          </div>}
          <div className="live-person-label"><span>You</span><small>{live.micEnabled ? <><Mic size={11} /> Mic on</> : <><MicOff size={11} /> Muted</>}</small></div>
        </section>
      </main>

      <aside className="live-transcript" aria-live="polite">
        <div className="live-transcript-head"><strong>Live transcript</strong><span><ShieldCheck size={12} /> Session only</span></div>
        <div className="live-transcript-scroll">
          {live.transcript.length === 0 ? <p className="live-empty-transcript">The conversation will appear here when the interview starts.</p> : live.transcript.map((item) => (
            <div className={`live-caption ${item.role}`} key={item.id}><span>{item.role === "interviewer" ? "Interviewer" : "You"}</span><p>{item.text}</p></div>
          ))}
        </div>
      </aside>

      <footer className="live-room-controls">
        <button type="button" className={live.micEnabled ? "control-active" : "control-off"} onClick={() => live.setMicEnabled(!live.micEnabled)} disabled={!active} title={live.micEnabled ? "Mute" : "Unmute"}>{live.micEnabled ? <Mic size={19} /> : <MicOff size={19} />}<span>{live.micEnabled ? "Mute" : "Unmute"}</span></button>
        <button type="button" className={live.cameraEnabled ? "control-active" : "control-off"} onClick={() => live.setCameraEnabled(!live.cameraEnabled)} disabled={!active} title={live.cameraEnabled ? "Turn camera off" : "Turn camera on"}>{live.cameraEnabled ? <Camera size={19} /> : <CameraOff size={19} />}<span>Camera</span></button>
        <button type="button" className="control-end" onClick={exit} title="End interview"><PhoneOff size={19} /><span>End</span></button>
        {!active && live.status !== "idle" && <button type="button" onClick={join} disabled={joining}><RotateCcw size={18} /><span>Rejoin</span></button>}
      </footer>
    </div>
  );
}
