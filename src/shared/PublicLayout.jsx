import { Outlet } from "react-router-dom";
import PublicNavbar from "./PublicNavbar";

export default function PublicLayout() {
  return (
    <div className="min-h-screen bg-[var(--page-bg)] text-[var(--text-primary)] transition-colors duration-200">
      <PublicNavbar />
      <div className="pt-14 sm:pt-16">
        <Outlet />
      </div>
    </div>
  );
}
