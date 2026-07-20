import { NavLink, Link } from "react-router-dom";
import { Rocket } from "lucide-react";
import BrandLogo from "../shared/BrandLogo"; // apna actual path daalo

// Base classes shared by every nav pill. Kept as a plain string (not a
// function) so it never allocates on every render — tiny win, but free.
const BASE_LINK =
  "rounded-lg px-2 py-1.5 text-[11px] font-bold whitespace-nowrap transition-colors duration-150 sm:rounded-xl sm:px-4 sm:py-2 sm:text-sm";

function navLinkClass({ isActive }) {
  return `${BASE_LINK} ${isActive ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"}`;
}

export default function PublicNavbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-[100] border-b border-white/10 bg-[#07060e]/95 backdrop-blur-md">
      <nav
        className="mx-auto flex h-14 max-w-[1180px] items-center justify-between gap-2 px-2.5 sm:h-16 sm:px-6 lg:px-8"
        aria-label="Main navigation"
      >
        <Link
          to="/"
          aria-label="CareerForge AI home"
          className="min-w-0 shrink-0 transition-transform duration-150 hover:scale-[1.02] [&_.brand-logo-text]:hidden min-[380px]:[&_.brand-logo-text]:inline"
        >
          <BrandLogo size="sm" />
        </Link>

        <div className="flex min-w-0 shrink-0 items-center gap-1 sm:gap-2">
          {/* Home — always visible now, even on the smallest phones */}
          <NavLink to="/" end className={navLinkClass}>
            Home
          </NavLink>

          <a
            href="/#features"
            className="hidden rounded-lg px-3 py-2 text-sm font-bold text-slate-400 transition-colors duration-150 hover:text-white md:inline-flex"
          >
            Features
          </a>

          <NavLink to="/login" className={navLinkClass}>
            Log in
          </NavLink>

          <Link
            to="/register"
            className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-gradient-to-r from-cyan-400 via-blue-500 to-fuchsia-600 px-2.5 py-1.5 text-[11px] font-black text-white shadow-[0_6px_16px_-6px_rgba(56,189,248,0.45)] transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0 sm:rounded-xl sm:px-4 sm:py-2 sm:text-sm"
          >
            <Rocket size={13} className="shrink-0 sm:size-[15px]" />
            <span className="hidden min-[380px]:inline sm:hidden">100 Free</span>
            <span className="hidden sm:inline">Free 100 Credits</span>
          </Link>
        </div>
      </nav>
    </header>
  );
}