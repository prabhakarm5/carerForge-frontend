import React from "react";

const sections = [
  {
    title: "CareerForge AI kya hai?",
    text: "CareerForge AI ek AI-powered platform hai jahan user AI chat, resume help, image tools, PDF tools aur career-related features use kar sakta hai.",
  },
  {
    title: "Account kaise banaye?",
    text: "User register page par jaakar name, email, mobile aur password enter kare. Email verification complete karne ke baad account activate ho jayega.",
  },
  {
    title: "Login kaise kare?",
    text: "Verified email aur password se login kare. Login ke baad dashboard open hoga jahan available AI features dikhte hain.",
  },
  {
    title: "Tokens kya hote hain?",
    text: "CareerForge AI me har AI feature ke liye tokens use hote hain. Signup par user ko initial free tokens milte hain.",
  },
  {
    title: "AI Chat kaise use kare?",
    text: "Chat page par question type kare aur send button dabaye. AI response generate karega aur conversation history save hogi.",
  },
  {
    title: "Payment kaise kare?",
    text: "Plans page par plan choose kare. Razorpay checkout open hoga. UPI, card ya net banking se payment complete kar sakte hain.",
  },
  {
    title: "Security",
    text: "CareerForge AI secure login, JWT authentication, OTP verification aur encrypted password system use karta hai.",
  },
];

export default function UserDocumentation() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white px-6 py-10">
      <div className="max-w-6xl mx-auto">
        <div className="rounded-3xl border border-white/10 bg-white/10 backdrop-blur-xl p-8 shadow-2xl">
          <p className="text-indigo-300 font-semibold mb-3">User Guide</p>

          <h1 className="text-4xl md:text-6xl font-black mb-5">
            CareerForge AI Documentation
          </h1>

          <p className="text-slate-300 text-lg max-w-3xl">
            Ye guide normal users ke liye hai. Isme app ka use, account,
            tokens, AI features aur payment process simple language me explain
            kiya gaya hai.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mt-8">
          {sections.map((item, index) => (
            <div
              key={index}
              className="rounded-2xl border border-white/10 bg-white/10 p-6 shadow-xl hover:scale-[1.02] transition"
            >
              <div className="w-12 h-12 rounded-xl bg-indigo-500/30 flex items-center justify-center text-xl font-bold mb-4">
                {index + 1}
              </div>

              <h2 className="text-2xl font-bold mb-3">{item.title}</h2>

              <p className="text-slate-300 leading-relaxed">{item.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-3xl border border-emerald-400/20 bg-emerald-500/10 p-6">
          <h2 className="text-2xl font-bold mb-2">Need Help?</h2>
          <p className="text-slate-300">
            Agar login, payment, tokens ya AI feature me problem aaye to support
            team se contact kare ya dashboard ke help section ko use kare.
          </p>
        </div>
      </div>
    </div>
  );
}