export const supportEmail = (import.meta.env.VITE_SUPPORT_EMAIL || "").trim();

export function supportDestination() {
  return supportEmail ? `mailto:${supportEmail}` : "/login?next=%2Fsettings%3Fsection%3Dsupport";
}