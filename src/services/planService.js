import axiosInstance from "../utils/axiosInstance";
import { API } from "../config/api";

// ================= GET ALL ACTIVE PLANS =================

export async function getPlans() {

    const response = await axiosInstance.get(

        API.PLANS.GET_ALL

    );

    return response.data;
}

