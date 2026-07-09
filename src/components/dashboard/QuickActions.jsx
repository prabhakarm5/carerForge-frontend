import { MessageSquarePlus, Image, FileText, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";

const actions = [
  { title: "New Chat", icon: MessageSquarePlus, path: "/chat", color: "violet" },
  { title: "Image AI", icon: Image, path: "/image-generator", color: "pink" },
  { title: "PDF AI", icon: FileText, path: "/pdf-ai", color: "cyan" },
  { title: "Website AI", icon: Globe, path: "/website", color: "emerald" },
];

const colorMap = {
  violet: "bg-violet-500/10 text-violet-400 group-hover:bg-violet-600",
  pink: "bg-pink-500/10 text-pink-400 group-hover:bg-pink-600",
  cyan: "bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-600",
  emerald: "bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-600",
};

function QuickActions() {
  const navigate = useNavigate();

  return (
    <div className="rounded-2xl sm:rounded-3xl bg-slate-900 border border-slate-800 p-4 sm:p-6">
      <h2 className="text-base sm:text-xl font-bold text-white mb-4 sm:mb-5">Quick Actions</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {actions.map((item, index) => {
          const Icon = item.icon;
          return (
            <button
              key={index}
              onClick={() => navigate(item.path)}
              className="group rounded-xl sm:rounded-2xl bg-slate-800/60 border border-slate-800 hover:border-slate-700 transition-all duration-200 p-4 sm:p-6 active:scale-95"
            >
              <div
                className={`w-10 h-10 sm:w-12 sm:h-12 mx-auto rounded-lg sm:rounded-xl flex items-center justify-center transition-colors duration-200 ${colorMap[item.color]}`}
              >
                <Icon size={18} className="group-hover:text-white transition-colors sm:w-[22px] sm:h-[22px]" />
              </div>
              <p className="text-white text-xs sm:text-sm font-medium mt-2.5 sm:mt-3 leading-tight">
                {item.title}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default QuickActions;