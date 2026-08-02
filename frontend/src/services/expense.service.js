import {
    apiRequest
} from "./api";

function addParameter(
    params,
    name,
    value
) {
    if (
        value !== undefined &&
        value !== null &&
        value !== ""
    ) {
        params.set(
            name,
            String(value)
        );
    }
}

export async function getExpenseOptionsRequest(
    token,
    {
        sucursalId = "",
        signal
    } = {}
) {
    const params =
        new URLSearchParams();

    addParameter(
        params,
        "sucursalId",
        sucursalId
    );

    const query =
        params.toString();

    const response =
        await apiRequest(
            `/expenses/options${
                query
                    ? `?${query}`
                    : ""
            }`,
            {
                token,
                signal
            }
        );

    return response.data;
}

export async function listExpensesRequest(
    token,
    {
        search = "",
        sucursalId = "",
        categoriaGastoId = "",
        cajaId = "",
        metodoPago = "",
        estado = "TODOS",
        salioDeCaja = "TODOS",
        fechaDesde = "",
        fechaHasta = "",
        page = 1,
        limit = 20,
        signal
    } = {}
) {
    const params =
        new URLSearchParams();

    addParameter(
        params,
        "search",
        search.trim()
    );

    addParameter(
        params,
        "sucursalId",
        sucursalId
    );

    addParameter(
        params,
        "categoriaGastoId",
        categoriaGastoId
    );

    addParameter(
        params,
        "cajaId",
        cajaId
    );

    addParameter(
        params,
        "metodoPago",
        metodoPago
    );

    addParameter(
        params,
        "estado",
        estado
    );

    addParameter(
        params,
        "salioDeCaja",
        salioDeCaja
    );

    addParameter(
        params,
        "fechaDesde",
        fechaDesde
    );

    addParameter(
        params,
        "fechaHasta",
        fechaHasta
    );

    addParameter(
        params,
        "page",
        page
    );

    addParameter(
        params,
        "limit",
        limit
    );

    const response =
        await apiRequest(
            `/expenses?${params.toString()}`,
            {
                token,
                signal
            }
        );

    return response.data;
}

export async function getExpenseByIdRequest(
    token,
    expenseId,
    signal
) {
    const response =
        await apiRequest(
            `/expenses/${expenseId}`,
            {
                token,
                signal
            }
        );

    return response.data.gasto;
}

export function createExpenseRequest(
    token,
    data
) {
    return apiRequest(
        "/expenses",
        {
            method: "POST",
            token,
            body: data
        }
    );
}

export function createExpenseCategoryRequest(
    token,
    data
) {
    return apiRequest(
        "/expenses/categories",
        {
            method: "POST",
            token,
            body: data
        }
    );
}

export function voidExpenseRequest(
    token,
    expenseId,
    data
) {
    return apiRequest(
        `/expenses/${expenseId}/void`,
        {
            method: "PATCH",
            token,
            body: data
        }
    );
}