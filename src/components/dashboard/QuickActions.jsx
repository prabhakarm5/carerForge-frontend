/* QuickActions.jsx */
import { MessageSquarePlus, Image, FileText, Mail } from "lucide-react";
import { Link } from "react-router-dom";

const actions = [
  { title: "New Chat",     icon: MessageSquarePlus, path: "/chat",            color: "violet" },
  { title: "Resume AI",    icon: FileText,          path: "/resume",          color: "emerald" },
  { title: "Cover Letter", icon: Mail,              path: "/cover-letter",    color: "cyan" },
  { title: "Image AI",     icon: Image,             path: "/image-generator", color: "pink" },
];

const colorMap = {
  violet:   "from-violet-500 to-violet-600",
  pink:     "from-pink-500 to-pink-600",
  cyan:     "from-cyan-500 to-cyan-600",
  emerald:  "from-emerald-500 to-emerald-600",
};

function QuickActions() {
  return (
    <section className="
      relative
      rounded-3xl
      bg-slate-900/80
      backdrop-blur-md
      border border-slate-700/50
      shadow-xl
      p-5 sm:p-8
      w-full
      overflow-hidden
    ">
      {/* subtle background glow */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-violet-500/20 rounded-full blur-3xl pointer-events-none" />

      <h2 className="text-xl sm:text-2xl font-bold text-white mb-6 relative z-10">
        Quick Actions
      </h2>

      <div className="
        grid
        grid-cols-2
        sm:grid-cols-4
        gap-4
        relative z-10
      ">
        {actions.map((item, idx) => {
          const Icon = item.icon;
          return (
            <Link
              key={idx}
              to={item.path}
              className="
                group
                block
                rounded-2xl
                bg-slate-800/60
                border border-slate-700
                hover:border-slate-600
                transition-all
                duration-300
                ease-in-out
                active:scale-95
                p-4
                text-center
              "
            >
              <div
                className={`
                  w-10 h-10
                  mx-auto
                  rounded-xl
                  bg-gradient-to-br
                  ${colorMap[item.color]}
                  flex
                  items-center
                  justify-center
                  shadow-lg
                  group-hover:shadow-xl
                  transition-shadow
                `}
              >
                <Icon className="w-5 h-5 text-white" />
              </div>
              <p className="mt-2 text-sm font-medium text-slate-200 group-hover:text-white truncate">
                {item.title}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export default QuickActions;