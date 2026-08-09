import { apiRequest } from "./api";

export async function getConsumerClaimOptionsRequest(signal) {
    const response = await apiRequest("/consumer-claims/options", { signal });
    return response.data.sucursales;
}

export async function createConsumerClaimRequest(data) {
    const response = await apiRequest("/consumer-claims", { method: "POST", body: data });
    return response.data;
}

export async function getConsumerClaimReceiptRequest(codigo, token, signal) {
    const response = await apiRequest(
        `/consumer-claims/${encodeURIComponent(codigo)}/receipt?token=${encodeURIComponent(token)}`,
        { signal }
    );
    return response.data.reclamo;
}

export async function listConsumerClaimsRequest(query = {}, signal) {
    const search = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
        if (value !== "" && value !== undefined && value !== null) search.set(key, value);
    });
    const response = await apiRequest(`/admin/consumer-claims?${search}`, { signal });
    return response.data;
}

export async function updateConsumerClaimRequest(id, data) {
    const response = await apiRequest(`/admin/consumer-claims/${id}`, { method: "PATCH", body: data });
    return response.data.reclamo;
}
