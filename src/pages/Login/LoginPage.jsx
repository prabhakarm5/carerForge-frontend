import AuthLeftPanel from "../../components/auth/AuthLeftPanel";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="auth-login grid min-h-screen grid-cols-1 overflow-hidden bg-[#0a0713] lg:grid-cols-[34%_66%]">
      <AuthLeftPanel />
      <LoginForm />
    </div>
  );
}