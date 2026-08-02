import {
    apiRequest
} from "./api";

export async function getBranchAvailabilityRequest(
    token,
    branchId,
    signal
) {
    const response =
        await apiRequest(
            `/branches/${branchId}/availability`,
            {
                token,
                signal
            }
        );

    return response.data;
}

export async function replaceBranchSchedulesRequest(
    token,
    branchId,
    schedules
) {
    const response =
        await apiRequest(
            `/branches/${branchId}/schedules`,
            {
                method: "PUT",
                token,
                body: {
                    horarios:
                        schedules
                }
            }
        );

    return response.data;
}

export async function createAvailabilityBlockRequest(
    token,
    branchId,
    data
) {
    const response =
        await apiRequest(
            `/branches/${branchId}/blocks`,
            {
                method: "POST",
                token,
                body: data
            }
        );

    return response.data;
}

export async function updateAvailabilityBlockRequest(
    token,
    branchId,
    blockId,
    data
) {
    const response =
        await apiRequest(
            `/branches/${branchId}/blocks/${blockId}`,
            {
                method: "PATCH",
                token,
                body: data
            }
        );

    return response.data;
}

export async function updateAvailabilityBlockStatusRequest(
    token,
    branchId,
    blockId,
    estado
) {
    const response =
        await apiRequest(
            `/branches/${branchId}/blocks/${blockId}/status`,
            {
                method: "PATCH",
                token,
                body: {
                    estado
                }
            }
        );

    return response.data;
}