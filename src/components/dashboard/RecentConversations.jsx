import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, Clock, ArrowRight, RotateCcw } from "lucide-react";
import { getRecentChats } from "../../services/conversationService";
import { handleApiError } from "../../utils/errorHandler";

function RecentConversations() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    loadConversations();
  }, []);

  async function loadConversations() {
    try {
      setLoading(true);
      setError(false);
      const data = await getRecentChats();
      setConversations((data || []).slice(0, 5));
    } catch (err) {
      setError(true);
      handleApiError(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl sm:rounded-3xl bg-slate-900 border border-slate-800 p-4 sm:p-6">
      <div className="flex justify-between items-center mb-4 sm:mb-5">
        <h2 className="text-base sm:text-xl text-white font-bold">Recent Conversations</h2>
        <button
          onClick={() => navigate("/chat")}
          className="flex items-center gap-1 text-xs sm:text-sm text-slate-400 hover:text-violet-400 transition-colors shrink-0"
        >
          View all <ArrowRight size={14} />
        </button>
      </div>

      {loading ? (
        <div className="space-y-2.5 sm:space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-[70px] sm:h-[88px] rounded-xl sm:rounded-2xl bg-slate-800/60 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-8 sm:py-10">
          <p className="text-slate-500 text-sm mb-2">Failed to load conversations</p>
          <button
            onClick={loadConversations}
            className="inline-flex items-center gap-1.5 text-sm text-violet-400 hover:text-violet-300"
          >
            <RotateCcw size={14} /> Retry
          </button>
        </div>
      ) : conversations.length === 0 ? (
        <div className="text-center py-12 sm:py-16">
          <MessageSquare size={28} className="mx-auto text-slate-700 mb-3" />
          <p className="text-slate-500 text-sm">No conversations yet</p>
          <button
            onClick={() => navigate("/chat")}
            className="mt-3 text-sm text-violet-400 hover:text-violet-300"
          >
            Start your first chat →
          </button>
        </div>
      ) : (
        <div className="space-y-2.5 sm:space-y-3">
          {conversations.map((conversation) => (
            <div
              key={conversation.id}
              onClick={() => navigate("/chat/" + conversation.id)}
              className="p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-800 hover:border-violet-600/50 hover:bg-slate-800/50 transition-all duration-200 cursor-pointer active:scale-[0.99]"
            >
              <div className="flex justify-between items-start gap-2 sm:gap-3">
                <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
                  <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-violet-500/10 shrink-0">
                    <MessageSquare size={14} className="text-violet-400 sm:w-4 sm:h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-white font-medium text-xs sm:text-sm truncate">
                      {conversation.title}
                    </h3>
                    {conversation.featureType && (
                      <p className="text-slate-500 text-[10px] sm:text-xs mt-0.5 sm:mt-1">
                        {conversation.featureType}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-slate-500 text-[10px] sm:text-xs shrink-0 whitespace-nowrap">
                  <Clock size={11} />
                  {conversation.updatedAt
                    ? new Date(conversation.updatedAt).toLocaleDateString()
                    : ""}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default RecentConversations;