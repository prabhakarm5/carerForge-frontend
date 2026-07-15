function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, Math.round(value)));
}

function wordCount(value) {
  return String(value || "").trim().split(/\s+/).filter(Boolean).length;
}

export function createSessionReport(transcript, durationSeconds, config) {
  const candidateTurns = transcript.filter((item) => item.role === "candidate" && item.text?.trim());
  const interviewerTurns = transcript.filter((item) => item.role === "interviewer" && item.text?.trim());
  const candidateText = candidateTurns.map((item) => item.text).join(" ");
  const words = wordCount(candidateText);
  const averageWords = candidateTurns.length ? Math.round(words / candidateTurns.length) : 0;
  const fillers = candidateText.match(/\b(?:um+|uh+|hmm+|like|basically|actually|matlab)\b/gi)?.length || 0;
  const minutes = Math.max(durationSeconds / 60, 0.5);
  const speakingPace = Math.round(words / minutes);

  let score = 38;
  score += Math.min(candidateTurns.length * 6, 24);
  score += Math.min(words / 14, 18);
  if (averageWords >= 20 && averageWords <= 120) score += 10;
  if (interviewerTurns.length >= 3) score += 5;
  score -= Math.min(fillers * 1.4, 10);
  score = clamp(score, candidateTurns.length ? 42 : 20, 94);

  const strengths = [];
  if (candidateTurns.length >= 3) strengths.push(`Stayed engaged across ${candidateTurns.length} captured answers.`);
  if (averageWords >= 25) strengths.push("Added useful detail instead of relying on one-line answers.");
  if (averageWords > 0 && averageWords <= 100) strengths.push("Kept most responses concise enough for an interview setting.");
  if (fillers <= Math.max(2, candidateTurns.length)) strengths.push("Used relatively few filler words in the captured transcript.");
  if (!strengths.length) strengths.push("Completed a live practice attempt and established a baseline.");

  const improvements = [];
  if (candidateTurns.length < 3) improvements.push("Complete more questions so the assessment has stronger evidence.");
  if (averageWords < 20) improvements.push("Expand answers with situation, action, and a measurable result.");
  if (averageWords > 120) improvements.push("Lead with the direct answer, then keep supporting detail focused.");
  if (fillers > Math.max(2, candidateTurns.length)) improvements.push("Pause silently instead of using repeated filler words.");
  improvements.push("Use one role-relevant example with numbers in your next practice round.");

  return {
    score,
    answers: candidateTurns.length,
    words,
    speakingPace,
    durationSeconds,
    role: config?.role || "Mock interview",
    strengths: strengths.slice(0, 3),
    improvements: improvements.slice(0, 3),
  };
}
