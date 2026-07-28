import { apiRequest } from "./api";

export async function getAdminDashboardRequest(
    token,
    signal
) {
    const response = await apiRequest(
        "/admin/dashboard",
        {
            token,
            signal
        }
    );

    return response.data;
}