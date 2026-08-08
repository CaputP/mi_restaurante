import {
    apiRequest
} from "./api";

export async function getNotificationsRequest(
    token,
    {
        page = 1,
        limit = 10,
        leida,
        tipo,
        prioridad
    } = {},
    signal
) {
    const params =
        new URLSearchParams();

    params.set(
        "page",
        String(page)
    );

    params.set(
        "limit",
        String(limit)
    );

    if (
        leida !== undefined
    ) {
        params.set(
            "leida",
            String(leida)
        );
    }

    if (tipo) {
        params.set(
            "tipo",
            tipo
        );
    }

    if (prioridad) {
        params.set(
            "prioridad",
            prioridad
        );
    }

    const response =
        await apiRequest(
            `/notifications?${params.toString()}`,
            {
                token,
                signal
            }
        );

    return response.data;
}

export async function getUnreadNotificationCountRequest(
    token,
    signal
) {
    const response =
        await apiRequest(
            "/notifications/unread-count",
            {
                token,
                signal
            }
        );

    return response.data;
}

export async function markNotificationAsReadRequest(
    token,
    notificationId
) {
    const response =
        await apiRequest(
            `/notifications/${notificationId}/read`,
            {
                method: "PATCH",
                token
            }
        );

    return response.data;
}

export async function markNotificationAsUnreadRequest(
    token,
    notificationId
) {
    const response =
        await apiRequest(
            `/notifications/${notificationId}/unread`,
            {
                method: "PATCH",
                token
            }
        );

    return response.data;
}

export async function markAllNotificationsAsReadRequest(
    token
) {
    const response =
        await apiRequest(
            "/notifications/read-all",
            {
                method: "PATCH",
                token
            }
        );

    return response.data;
}