import { apiRequest } from "./api";

export async function getRolesRequest(
    token,
    signal
) {
    const response = await apiRequest(
        "/admin/roles",
        {
            token,
            signal
        }
    );

    return response.data;
}

export async function updateRolePermissionsRequest(
    token,
    roleId,
    permisoIds,
    password
) {
    return apiRequest(
        `/admin/roles/${roleId}/permissions`,
        {
            method: "PATCH",
            token,
            body: {
                permisoIds,
                password
            }
        }
    );
}
