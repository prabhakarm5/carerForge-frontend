import { Link } from "react-router-dom";

function SidebarItem({ icon: Icon, text, path, active, onClick }) {
  return (
    <Link
      to={path}
      onClick={onClick}
      className={`
        relative flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5
        transition-all duration-200 group overflow-hidden
        ${
          active
            ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md shadow-violet-900/30"
            : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
        }
      `}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-1 rounded-full bg-white/70 shadow-[0_0_6px_rgba(255,255,255,0.7)]" />
      )}

      <Icon
        size={17}
        className={`
          shrink-0 transition-all duration-200
          ${
            active
              ? "drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]"
              : "group-hover:scale-110 group-hover:text-violet-400"
          }
        `}
      />

      <span
        className={`text-[13.5px] font-medium tracking-tight transition-colors ${
          active ? "text-white" : "group-hover:text-white"
        }`}
      >
        {text}
      </span>

      {!active && (
        <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      )}
    </Link>
  );
}

export default SidebarItem;