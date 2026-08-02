import {
    apiRequest
} from "./api";

export async function getSaleTicketRequest(
    token,
    saleId,
    signal
) {
    const response =
        await apiRequest(
            `/tickets/sales/${saleId}`,
            {
                token,
                signal
            }
        );

    return response.data.ticket;
}