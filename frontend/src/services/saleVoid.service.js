import {
    apiRequest
} from "./api";

export function voidSaleRequest(
    token,
    saleId,
    data
) {
    return apiRequest(
        `/sales/${saleId}/void`,
        {
            method: "PATCH",
            token,
            body: data
        }
    );
}
