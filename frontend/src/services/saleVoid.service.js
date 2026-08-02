import {
    apiRequest
} from "./api";

export function voidSaleRequest(
    token,
    saleId,
    motivo
) {
    return apiRequest(
        `/sales/${saleId}/void`,
        {
            method: "PATCH",
            token,
            body: {
                motivo
            }
        }
    );
}