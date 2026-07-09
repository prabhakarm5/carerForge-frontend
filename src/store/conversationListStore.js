import { create } from "zustand";

// ✅ NAYA — halka-phulka cross-component signal store.
// Jab bhi koi naya conversation create hota hai ya background mein
// title generate hoke update hota hai, koi bhi component
// useConversationListStore.getState().bump() call kar sakta hai.
// Sidebar (aur bhavishya mein koi aur component) isko subscribe karke
// apni list refetch kar sakta hai — poore page ko reload kiye bina.
const useConversationListStore = create((set) => ({
  refreshTick: 0,
  bump: () => set((state) => ({ refreshTick: state.refreshTick + 1 })),
}));

export default useConversationListStore;