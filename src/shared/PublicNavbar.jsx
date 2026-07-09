import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import BrandLogo from "./BrandLogo";

const links = [
  { label: "Features", href: "/#features", id: "features" },
  { label: "ATS Template", href: "/#ats-template", id: "ats-template" },
  { label: "Workflow", href: "/#how-it-works", id: "how-it-works" },
  { label: "Plans", href: "/#pricing", id: "pricing" },
];

// ✅ FIX — dark/light theme toggle poora hata diya. Ab sirf ek fixed
// light theme hai, isliye useTheme/ThemeContext ki yahan zaroorat nahi.
export default function PublicNavbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeId, setActiveId] = useState("");
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const sections = links.map((l) => document.getElementById(l.id)).filter(Boolean);
    if (!sections.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        });
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [location.pathname]);

  const navLinkClass = ({ isActive }) =>
    `rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors duration-150 ${
      isActive ? "bg-orange-50 text-[#e45738]" : "text-slate-500 hover:text-slate-900"
    }`;

  return (
    <header
      className={`sticky inset-x-0 top-0 z-50 border-b bg-white/85 text-slate-900 backdrop-blur-md transition-shadow duration-200 ${
        scrolled ? "border-slate-200 shadow-[0_8px_24px_-10px_rgba(15,23,42,0.12)]" : "border-transparent shadow-none"
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-[1180px] items-center justify-between px-5 lg:px-8" aria-label="Main navigation">
        <Link to="/" className="transition-transform duration-150 hover:scale-[1.02]">
          <BrandLogo />
        </Link>

        <div className="hidden items-center gap-1 rounded-full border border-slate-200 bg-slate-50/70 p-1 md:flex">
          {links.map((link) => {
            const active = activeId === link.id;
            return (
              <a
                key={link.label}
                href={link.href}
                aria-current={active ? "true" : undefined}
                className={`relative flex items-center rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                  active
                    ? "bg-white text-slate-900 shadow-[0_4px_14px_-4px_rgba(15,23,42,0.16)]"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {link.label}
              </a>
            );
          })}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <NavLink to="/login" className={navLinkClass}>
            Log in
          </NavLink>
          <Link
            to="/register"
            className="rounded-lg bg-gradient-to-r from-[#ff6b4a] to-[#ff8a5c] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_-6px_rgba(255,107,74,0.45)] transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-6px_rgba(255,107,74,0.55)] active:translate-y-0"
          >
            Build resume
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 md:hidden"
          aria-label="Toggle navigation"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-slate-200 bg-white px-5 py-4 md:hidden">
          <div className="mx-auto flex max-w-[1180px] flex-col gap-1">
            {links.map((link) => {
              const active = activeId === link.id;
              return (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150 ${
                    active ? "bg-orange-50 text-[#e45738]" : "text-slate-600"
                  }`}
                >
                  {link.label}
                </a>
              );
            })}

            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-center text-sm font-semibold text-slate-700"
              >
                Log in
              </Link>
              <Link
                to="/register"
                onClick={() => setOpen(false)}
                className="rounded-lg bg-gradient-to-r from-[#ff6b4a] to-[#ff8a5c] px-4 py-2.5 text-center text-sm font-semibold text-white"
              >
                Get started
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}