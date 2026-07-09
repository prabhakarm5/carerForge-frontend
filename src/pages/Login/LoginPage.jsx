import AuthLeftPanel from "../../components/auth/AuthLeftPanel";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="auth-login grid min-h-[calc(100vh-4rem)] grid-cols-1 bg-[var(--page-bg)] lg:grid-cols-[44%_56%]">
      <AuthLeftPanel />
      <LoginForm />
    </div>
  );
}
