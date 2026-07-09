// ✅ FIX — pehle yahan accessToken, refreshToken, fingerprint teeno
// localStorage mein save ho rahe the — ye XSS ke against unsafe hai.
// Ab: accessToken sirf in-memory (Zustand authStore) mein rehta hai,
// refreshToken aur fingerprint dono httpOnly cookies hain (backend
// CookieUtil unhe set/read karta hai) — frontend JS inhe kabhi chhoo
// hi nahi sakta, isliye inke liye storage helper ki zaroorat hi nahi.
// Sirf "user" (naam/email/role/profileImage jaisi non-sensitive
// display info) localStorage mein rakhna theek hai — reload pe UI
// turant dikhane ke liye (asli auth check to refresh-token cookie se hoga).
export const tokenStorage = {

    setUser(user) {
        localStorage.setItem(
            "user",
            JSON.stringify(user));
    },

    getUser() {
        const raw = localStorage.getItem("user");
        return raw ? JSON.parse(raw) : null;
    },

    clear() {
        localStorage.removeItem("user");
    }

};