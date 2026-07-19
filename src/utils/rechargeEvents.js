export const RECHARGE_REQUIRED_EVENT = "careerforge:recharge-required";

const CREDIT_CODES = new Set([
  "NO_TOKENS",
  "INSUFFICIENT_TOKENS",
  "INSUFFICIENT_CREDITS",
  "WALLET_EMPTY",
  "MODEL_LOCKED",
]);

export function rechargeReasonFromError(error) {
  const status = Number(error?.response?.status || 0);
  const data = error?.response?.data || {};
  const code = String(data.code || data.errorCode || data.error || "").toUpperCase();
  const message = String(data.message || error?.message || "").toLowerCase();

  if (status === 402 || CREDIT_CODES.has(code)) return "tokens";
  if (/insufficient|out of (tokens|credits)|not enough.*(token|credit)|recharge required|wallet.*empty/.test(message)) {
    return "tokens";
  }
  return null;
}

export function requestRecharge(reason = "tokens", source = "") {
  if (typeof window === "undefined") return;
  window.setTimeout(() => {
    window.dispatchEvent(new CustomEvent(RECHARGE_REQUIRED_EVENT, {
      detail: { reason, source },
    }));
  }, 0);
}

export function notifyRechargeForError(error) {
  const reason = rechargeReasonFromError(error);
  if (!reason) return false;
  requestRecharge(reason, error?.config?.url || "api");
  return true;
}