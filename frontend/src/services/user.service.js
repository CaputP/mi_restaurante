import { apiRequest } from "./api";

export async function getUserOptionsRequest(
    token,
    signal
) {
    const response = await apiRequest(
        "/admin/users/options",
        {
            token,
            signal
        }
    );

    return response.data;
}

export async function listUsersRequest(
    token,
    {
        search = "",
        estado = "TODOS",
        rolId = "",
        sucursalId = "",
        page = 1,
        limit = 20,
        signal
    } = {}
) {
    const params = new URLSearchParams();

    if (search) {
        params.set("search", search);
    }

    if (estado) {
        params.set("estado", estado);
    }

    if (rolId) {
        params.set("rolId", rolId);
    }

    if (sucursalId) {
        params.set(
            "sucursalId",
            sucursalId
        );
    }

    params.set("page", String(page));
    params.set("limit", String(limit));

    const response = await apiRequest(
        `/admin/users?${params.toString()}`,
        {
            token,
            signal
        }
    );

    return response.data;
}

export async function createUserRequest(
    token,
    data
) {
    return apiRequest(
        "/admin/users",
        {
            method: "POST",
            token,
            body: data
        }
    );
}

export async function updateUserRequest(
    token,
    userId,
    data
) {
    return apiRequest(
        `/admin/users/${userId}`,
        {
            method: "PATCH",
            token,
            body: data
        }
    );
}

export async function updateUserStatusRequest(
    token,
    userId,
    estado
) {
    return apiRequest(
        `/admin/users/${userId}/status`,
        {
            method: "PATCH",
            token,
            body: {
                estado
            }
        }
    );
}

export async function resetUserPasswordRequest(
    token,
    userId,
    data
) {
    return apiRequest(
        `/admin/users/${userId}/password`,
        {
            method: "PATCH",
            token,
            body: data
        }
    );
}