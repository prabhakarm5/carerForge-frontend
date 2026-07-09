import axiosInstance from "../utils/axiosInstance";
import { API } from "../config/api";

// ================= GET WALLET BALANCE =================
export async function getWallet() {
    
    const response = await axiosInstance.get(
        API.WALLET.GET_WALLET
    );
    return response.data; // { totalTokens, usedTokens, remainingTokens, currentPlanId, currentPlanName }
}

// ================= GET TRANSACTION HISTORY =================
export async function getWalletHistory() {
    const response = await axiosInstance.get(
        API.WALLET.HISTORY
    );
    return response.data; // array of { amount, transactionType, featureType, description, createdAt }
}