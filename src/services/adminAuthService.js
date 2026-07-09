import axiosInstance from "../utils/axiosInstance";

import {

    API,
    API_BASE_URL

}

from "../config/api";

// ✅ FIX — pehle "axios" (plain, bina baseURL/withCredentials/CSRF/
// interceptor ke) use ho raha tha. Agar admin-login flow bhi cookies
// set/read karta hai backend se (jaise fingerprint ya session cookie),
// to withCredentials: true ke bina wo kaam hi nahi karega. axiosInstance
// use karo taaki sab admin calls bhi consistent tareeke se cookies +
// CSRF header ke saath jaayein.

export async function sendAdminOtp(

    email,

    password

) {

    const response = await axiosInstance.post(

        API_BASE_URL +

        API.AUTH.ADMIN_LOGIN,

        {

            email,

            password

        }

    );

    return response.data;

}



export async function verifyAdminOtp(

    email,

    otp,

    fingerprint

) {

    const response = await axiosInstance.post(

        API_BASE_URL +

        API.AUTH.VERIFY_ADMIN_LOGIN_OTP,

        {

            email,

            otp,

            fingerprint

        }

    );

    return response.data;

}



export async function resendAdminOtp(

    email

) {

    return axiosInstance.post(

        API_BASE_URL +

        API.AUTH.RESEND_ADMIN_LOGIN_OTP,

        {

            email

        }

    );

}