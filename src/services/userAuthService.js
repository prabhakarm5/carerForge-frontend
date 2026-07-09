//userAuthService.js
import axiosInstance from "../utils/axiosInstance";

import {

    API,
    API_BASE_URL

}

from "../config/api";


// ================= AUTH SERVICE =================
//Login user function
export async function loginUser(

    email,

    password,

    fingerprint

) {

    const response = await axiosInstance.post(

        API_BASE_URL +

        API.AUTH.LOGIN,

        {

            email,

            password,

            fingerprint

        }

    );

    

    return response.data;

}


//register user function
export async function registerUser(formData){

    const response = await axiosInstance.post(

        API_BASE_URL + API.AUTH.REGISTER,

        formData,

        {

            headers:{

                "Content-Type":

                "multipart/form-data"

            }

        }

    );

    return response.data;

}

//================= EMAIL RESEND VERIFICATION SERVICE =================
export async function resendVerificationEmail(email) {

    const response = await axiosInstance.post(

        API_BASE_URL +
        API.AUTH.RESEND_VERIFICATION,

        {
            email
        }

    );

    return response.data;

}

// ================= FORGOT PASSWORD =================
// Sends OTP to the user's registered email
export async function forgotPassword(email) {

    const response = await axiosInstance.post(

        API_BASE_URL +
        API.AUTH.FORGOT_PASSWORD,

        {
            email
        }

    );

    return response.data; // { message, resendAvailableAt }
}

// ================= VERIFY RESET OTP =================
// Backend now returns a one-time `resetToken` along with the message.
// OTP is single-use on the backend — it gets deleted the moment it's verified,
// so it can never be replayed even within its original expiry window.
export async function verifyResetOtp(

    email,

    otp

) {

    const response = await axiosInstance.post(

        API_BASE_URL +
        API.AUTH.VERIFY_RESET_OTP,

        {
            email,
            otp
        }

    );

    return response.data; // { message, resetToken }
}

// ================= RESET PASSWORD =================
// Takes resetToken instead of email — the email is resolved server-side
// from the token, so the frontend can never spoof/change whose password
// gets reset. Token is single-use and short-lived (5 min).
export async function resetPassword(

    resetToken,

    newPassword

) {

    const response = await axiosInstance.post(

        API_BASE_URL +
        API.AUTH.RESET_PASSWORD,

        {
            resetToken,
            newPassword
        }

    );

    return response.data; // { message }
}

// ================= RESEND RESET OTP =================
export async function resendResetOtp(

    email

) {

    const response = await axiosInstance.post(

        API_BASE_URL +
        API.AUTH.RESEND_RESET_OTP,

        {
            email
        }

    );

    return response.data; // { message, resendAvailableAt }
}

// ================= REFRESH TOKEN =================
// ✅ Backend (AuthRefreshTokenAndLogoutController) refreshToken aur
// fingerprint dono cookie se hi padhta hai (cookieUtil.extractRefreshTokenFromCookie
// / extractFingerprintFromCookie) — body mein kuch bhejne ki zaroorat
// nahi. axiosInstance ka withCredentials: true cookies khud bhej dega.
export async function refreshToken() {

    const response = await axiosInstance.post(

        API_BASE_URL +
        API.AUTH.REFRESH_TOKEN

    );

    return response.data; // { accessToken, tokenType, message }
}

// ================= LOGOUT (current device) =================
export async function logout() {

    const response = await axiosInstance.post(

        API_BASE_URL +
        API.AUTH.LOGOUT

    );

    return response.data; // { message }
}

// ================= LOGOUT ALL DEVICES =================
export async function logoutAllDevices() {

    const response = await axiosInstance.post(

        API_BASE_URL +
        API.AUTH.LOGOUT_ALL_DEVICES

    );

    return response.data; // { message }
}