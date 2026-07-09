import { ShieldCheck } from "lucide-react";

function HumanVerification({ human, setHuman }) {
    return (
        <label className="flex items-center justify-between gap-3 px-4 py-3.5 cursor-pointer group">
            <div className="flex items-center gap-3">
                <div className="relative">
                    <input
                        type="checkbox"
                        checked={human}
                        onChange={(e) => setHuman(e.target.checked)}
                        className="peer sr-only"
                    />
                    <div className="w-5 h-5 rounded-md border border-white/15 bg-slate-900/60 peer-checked:bg-violet-600 peer-checked:border-violet-600 transition-all duration-150 flex items-center justify-center">
                        {human && (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        )}
                    </div>
                </div>
                <span className="text-slate-300 text-[13.5px] font-medium group-hover:text-slate-200 transition-colors">
                    I am Human
                </span>
            </div>

            <div className="flex flex-col items-end gap-0.5">
                <ShieldCheck size={16} className="text-violet-400" />
                <span className="text-[8px] font-bold uppercase tracking-tighter text-slate-500">
                    SecureGuard AI
                </span>
            </div>
        </label>
    );
}

export default HumanVerification;