export const WORKSPACE_HISTORY_EVENT = "cf:workspace-history:refresh";
export const WORKSPACE_CONTEXT_EVENT = "cf:workspace-context:change";

export function notifyWorkspaceHistoryChanged(kind) {
  window.dispatchEvent(new CustomEvent(WORKSPACE_HISTORY_EVENT, { detail: { kind } }));
}

export function publishWorkspaceContext(context = {}) {
  window.dispatchEvent(new CustomEvent(WORKSPACE_CONTEXT_EVENT, { detail: context }));
}
