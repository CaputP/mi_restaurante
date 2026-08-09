import {
    apiRequest
} from "./api";

export async function listBackupsRequest(
    token,
    {
        page = 1,
        limit = 20,
        estado = "TODOS",
        signal
    } = {}
) {
    const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        estado
    });
    const response = await apiRequest(
        `/backups?${params.toString()}`,
        {
            token,
            signal
        }
    );

    return response.data;
}

export function requestManualBackupRequest(
    token,
    password
) {
    return apiRequest(
        "/backups",
        {
            method: "POST",
            token,
            body: {
                password
            }
        }
    );
}
