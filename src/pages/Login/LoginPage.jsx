import AuthLeftPanel from "../../components/auth/AuthLeftPanel";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="auth-login grid min-h-[100dvh] grid-cols-1 overflow-hidden bg-[#0a0713] lg:grid-cols-[42%_58%]">
      <AuthLeftPanel />
      <LoginForm />
    </div>
  );
}