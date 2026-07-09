import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";

export default function BrandLogo({ to = "/", compact = false, className = "" }) {
  return (
    <Link to={to} className={`inline-flex items-center gap-2.5 text-inherit no-underline ${className}`}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#ff6b4a] text-white shadow-[0_8px_22px_rgba(255,107,74,0.22)]"><Sparkles size={18} strokeWidth={2.2} /></span>
      {!compact && <span className="whitespace-nowrap text-[15px] font-extrabold">CareerForge <span className="text-[#ff6b4a]">AI</span></span>}
    </Link>
  );
}
