import { Sparkles } from "lucide-react";

// ✅ FIX — pehle ka BrandLogo "bg-clip-text text-transparent" gradient-text
// trick use kar raha tha. Ye trick fragile hai — agar gradient background
// class kisi bhi wajah se apply nahi hoti (class purge, wrong parent
// display type, CSS load order), to text ka color transparent hi reh
// jaata hai aur poora naam GHOST/invisible dikhta hai.
//
// Is naye version mein:
// - Icon badge: gradient background (safe, kyunki ye normal bg-color hai,
//   text nahi)
// - Brand text: solid white color, NO gradient-text, NO clip trick
// Isliye ye kabhi invisible nahi hoga, chahe kahin bhi use karo.
export default function BrandLogo({ size = "md", showText = true }) {
  const sizes = {
    xs: { icon: "h-7 w-7", iconSize: 13, text: "text-sm" },
    sm: { icon: "h-7 w-7", iconSize: 14, text: "text-base" },
    md: { icon: "h-9 w-9", iconSize: 18, text: "text-xl" },
    lg: { icon: "h-11 w-11", iconSize: 22, text: "text-2xl" },
  };
  const s = sizes[size] || sizes.md;

  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={`grid ${s.icon} shrink-0 place-items-center rounded-xl bg-gradient-to-br from-cyan-400 via-blue-500 to-fuchsia-600 shadow-[0_4px_14px_-2px_rgba(56,189,248,0.55)]`}
      >
        <Sparkles size={s.iconSize} className="text-white" strokeWidth={2.5} />
      </span>
      {showText && <span className={`brand-logo-text ${s.text} font-black tracking-tight text-white whitespace-nowrap`}>
        CareerForge<span className="text-cyan-300"> AI</span>
      </span>}
    </span>
  );
}