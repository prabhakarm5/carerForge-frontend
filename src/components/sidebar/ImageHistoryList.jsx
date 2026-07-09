import { useEffect, useState } from "react";
import { Menu, Moon, Sun, X } from "lucide-react";
import BrandLogo from "../shared/BrandLogo";
import { useTheme } from "../shared/ThemeContext";

const links = [
  { label: "Features", href: "#features", id: "features", dot: "#8b5cf6" },
  { label: "ATS Template", href: "#ats-template", id: "ats-template", dot: "#ff6b4a" },
  { label: "Workflow", href: "#how-it-works", id: "how-it-works", dot: "#0ea5e9" },
  { label: "Plans", href: "#pricing", id: "pricing", dot: "#10b981" },
];

export default function PublicNavbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeId, setActiveId] = useState("");
  const { isDark, toggleTheme } = useTheme();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const sections = links
      .map((l) => document.getElementById(l.id))
      .filter(Boolean);
    if (!sections.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        });
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  return (
    <header
      className={`sticky inset-x-0 top-0 z-50 border-b bg-[var(--nav-bg)] text-[var(--text-primary)] backdrop-blur-md transition-shadow duration-200 ${
        scrolled ? "border-[var(--nav-border)] shadow-[0_8px_24px_rgba(0,0,0,0.10)]" : "border-transparent"
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-[1180px] items-center justify-between px-5 lg:px-8" aria-label="Main navigation">
        <a href="/" className="transition-transform duration-150 hover:scale-[1.03]">
          <BrandLogo />
        </a>

        <div className="hidden items-center gap-1 rounded-full border border-[var(--border-soft)] bg-[var(--surface-soft)]/60 p-1 md:flex">
          {links.map((link) => {
            const active = activeId === link.id;
            return (
              <a
                key={link.label}
                href={link.href}
                aria-current={active ? "true" : undefined}
                className={`group relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                  active
                    ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-[0_4px_14px_rgba(0,0,0,0.12)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full transition-all duration-200"
                  style={{
                    backgroundColor: link.dot,
                    boxShadow: active ? `0 0 0 4px ${link.dot}26` : "none",
                    transform: active ? "scale(1.15)" : "scale(1)",
                  }}
                />
                {link.label}
              </a>
            );
          })}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-10 w-10 items-center justify-center rounded-md border border-[var(--border-soft)] bg-[var(--surface-soft)] text-[var(--text-primary)] transition-transform duration-200 hover:-translate-y-0.5 hover:bg-[var(--surface-hover)]"
            aria-label="Toggle theme"
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            <span className="inline-block transition-transform duration-300" style={{ transform: isDark ? "rotate(0deg)" : "rotate(180deg)" }}>
              {isDark ? <Sun size={17} /> : <Moon size={17} />}
            </span>
          </button>
          <a href="/login" className="rounded-md px-3.5 py-2 text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            Log in
          </a>
          <a
            href="/register"
            className="rounded-md bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(255,107,74,0.24)] transition-transform duration-150 hover:-translate-y-0.5 hover:bg-[var(--accent-strong)]"
          >
            Build resume
          </a>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-md border border-[var(--border-soft)] bg-[var(--surface-soft)] md:hidden"
          aria-label="Toggle navigation"
        >
          {open ? <X size={21} /> : <Menu size={21} />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-[var(--nav-border)] bg-[var(--nav-bg)] px-5 py-4 md:hidden">
          <div className="mx-auto flex max-w-[1180px] flex-col gap-1">
            {links.map((link) => {
              const active = activeId === link.id;
              return (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-150 ${
                    active ? "bg-[var(--surface-soft)] text-[var(--text-primary)]" : "text-[var(--text-muted)]"
                  }`}
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: link.dot }} />
                  {link.label}
                  {active && <span className="ml-auto text-[10px] font-black uppercase tracking-wide text-[var(--accent)]">Here</span>}
                </a>
              );
            })}

            <button
              type="button"
              onClick={toggleTheme}
              className="mt-2 flex items-center justify-center gap-2 rounded-md border border-[var(--border-soft)] px-4 py-2.5 text-sm font-semibold"
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
              {isDark ? "Light mode" : "Dark mode"}
            </button>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <a href="/login" onClick={() => setOpen(false)} className="rounded-md border border-[var(--border-soft)] px-4 py-2.5 text-center text-sm font-semibold">
                Log in
              </a>
              <a href="/register" onClick={() => setOpen(false)} className="rounded-md bg-[var(--accent)] px-4 py-2.5 text-center text-sm font-semibold text-white">
                Get started
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
