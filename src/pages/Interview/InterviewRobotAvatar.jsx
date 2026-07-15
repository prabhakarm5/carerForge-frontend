import { memo } from "react";
import "./InterviewRobotAvatar.css";

function InterviewRobotAvatar({ speaking, level = 0 }) {
  const voiceLevel = speaking ? Math.max(0.28, Math.min(1, level * 3.2)) : 0;

  return (
    <div
      className={`interview-robot ${speaking ? "is-speaking" : ""}`}
      style={{ "--voice-level": voiceLevel }}
      role="img"
      aria-label={speaking ? "AI robot interviewer speaking" : "AI robot interviewer waiting"}
    >
      <svg viewBox="0 0 800 620" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="robot-metal" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#d8e2ec" />
            <stop offset="0.48" stopColor="#8192a5" />
            <stop offset="1" stopColor="#344254" />
          </linearGradient>
          <linearGradient id="robot-dark-metal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2c3b4c" />
            <stop offset="1" stopColor="#101923" />
          </linearGradient>
          <radialGradient id="robot-core" cx="50%" cy="48%" r="55%">
            <stop offset="0" stopColor="#d7fbff" />
            <stop offset="0.35" stopColor="#22d3ee" />
            <stop offset="1" stopColor="#0e7490" />
          </radialGradient>
          <filter id="robot-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="7" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <ellipse className="robot-floor-shadow" cx="400" cy="590" rx="245" ry="25" />

        <g className="robot-body">
          <path className="robot-shoulder left" d="M348 475 C278 458 184 482 136 555 L130 620 H354 Z" />
          <path className="robot-shoulder right" d="M452 475 C522 458 616 482 664 555 L670 620 H446 Z" />
          <path className="robot-torso" d="M319 466 Q400 430 481 466 L532 620 H268 Z" />
          <path className="robot-chest-panel" d="M330 503 Q400 474 470 503 L492 620 H308 Z" />
          <circle className="robot-core-halo" cx="400" cy="548" r="52" />
          <circle className="robot-core" cx="400" cy="548" r="30" />
          <path className="robot-core-line" d="M400 499 V518 M400 578 V597 M351 548 H370 M430 548 H449" />
        </g>

        <g className="robot-neck">
          <path d="M342 442 H458 L448 505 H352 Z" />
          <path className="robot-neck-light" d="M365 456 H435 M360 473 H440 M358 490 H442" />
        </g>

        <g className="robot-head">
          <path className="robot-ear left" d="M247 241 H289 V368 H247 Q222 357 222 326 V283 Q222 252 247 241 Z" />
          <path className="robot-ear right" d="M553 241 H511 V368 H553 Q578 357 578 326 V283 Q578 252 553 241 Z" />
          <circle className="robot-ear-light left" cx="251" cy="305" r="13" />
          <circle className="robot-ear-light right" cx="549" cy="305" r="13" />

          <path className="robot-cranium" d="M286 153 Q400 72 514 153 Q548 181 544 250 L525 409 Q516 459 463 480 H337 Q284 459 275 409 L256 250 Q252 181 286 153 Z" />
          <path className="robot-face" d="M302 179 Q400 121 498 179 Q520 194 517 244 L500 385 Q494 423 452 440 H348 Q306 423 300 385 L283 244 Q280 194 302 179 Z" />
          <path className="robot-brow" d="M319 248 Q354 223 386 250 M414 250 Q446 223 481 248" />

          <g className="robot-eyes">
            <path className="robot-eye-socket" d="M310 263 Q352 237 390 270 Q355 303 310 277 Z" />
            <path className="robot-eye-socket" d="M490 263 Q448 237 410 270 Q445 303 490 277 Z" />
            <ellipse className="robot-eye" cx="353" cy="270" rx="15" ry="11" />
            <ellipse className="robot-eye" cx="447" cy="270" rx="15" ry="11" />
            <circle className="robot-pupil" cx="353" cy="270" r="5" />
            <circle className="robot-pupil" cx="447" cy="270" r="5" />
          </g>

          <path className="robot-nose" d="M388 286 L373 334 Q400 348 427 334 L412 286" />
          <path className="robot-cheek-line" d="M306 322 L345 345 M494 322 L455 345" />

          <g className="robot-mouth-assembly">
            <path className="robot-mouth-cavity" d="M337 356 Q400 342 463 356 L454 409 Q400 432 346 409 Z" />
            <path className="robot-upper-lip" d="M340 357 Q400 344 460 357 L455 372 Q400 362 345 372 Z" />
            <g className="robot-lower-jaw" style={{ transform: `translateY(${voiceLevel * 18}px)` }}>
              <path d="M346 378 Q400 368 454 378 L448 414 Q400 435 352 414 Z" />
              <path className="robot-jaw-light" d="M362 393 Q400 403 438 393" />
            </g>
            <g className="robot-voice-bars">
              <rect x="361" y="374" width="5" height="18" rx="2" />
              <rect x="374" y="370" width="5" height="26" rx="2" />
              <rect x="387" y="367" width="5" height="32" rx="2" />
              <rect x="400" y="365" width="5" height="36" rx="2" />
              <rect x="413" y="367" width="5" height="32" rx="2" />
              <rect x="426" y="370" width="5" height="26" rx="2" />
              <rect x="439" y="374" width="5" height="18" rx="2" />
            </g>
          </g>

          <path className="robot-temple-line left" d="M277 230 L317 197" />
          <path className="robot-temple-line right" d="M523 230 L483 197" />
          <circle className="robot-status-light" cx="472" cy="188" r="6" />
        </g>
      </svg>
      <div className="robot-scan-line" aria-hidden="true" />
    </div>
  );
}

export default memo(InterviewRobotAvatar);
