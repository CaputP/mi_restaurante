import { apiRequest } from "./api";

export async function listCategoriesRequest(
    token,
    {
        search = "",
        estado = "TODOS",
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

    const query = params.toString();

    const response = await apiRequest(
        `/admin/catalog/categories${
            query ? `?${query}` : ""
        }`,
        {
            token,
            signal
        }
    );

    return response.data;
}

export async function createCategoryRequest(
    token,
    data
) {
    const response = await apiRequest(
        "/admin/catalog/categories",
        {
            method: "POST",
            token,
            body: data
        }
    );

    return response;
}

export async function updateCategoryRequest(
    token,
    id,
    data
) {
    const response = await apiRequest(
        `/admin/catalog/categories/${id}`,
        {
            method: "PATCH",
            token,
            body: data
        }
    );

    return response;
}

export async function updateCategoryStatusRequest(
    token,
    id,
    estado
) {
    const response = await apiRequest(
        `/admin/catalog/categories/${id}/status`,
        {
            method: "PATCH",
            token,
            body: {
                estado
            }
        }
    );

    return response;
}

export async function getProductOptionsRequest(
    token,
    signal
) {
    const response = await apiRequest(
        "/admin/catalog/product-options",
        {
            token,
            signal
        }
    );

    return response.data;
}

export async function listProductsRequest(
    token,
    {
        search = "",
        estado = "TODOS",
        categoriaId = "",
        sucursalId = "",
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

    if (categoriaId) {
        params.set(
            "categoriaId",
            categoriaId
        );
    }

    if (sucursalId) {
        params.set(
            "sucursalId",
            sucursalId
        );
    }

    const query = params.toString();

    const response = await apiRequest(
        `/admin/catalog/products${
            query ? `?${query}` : ""
        }`,
        {
            token,
            signal
        }
    );

    return response.data;
}

export async function createProductRequest(
    token,
    data
) {
    return apiRequest(
        "/admin/catalog/products",
        {
            method: "POST",
            token,
            body: data
        }
    );
}

export async function updateProductRequest(
    token,
    id,
    data
) {
    return apiRequest(
        `/admin/catalog/products/${id}`,
        {
            method: "PATCH",
            token,
            body: data
        }
    );
}

export async function updateProductStatusRequest(
    token,
    id,
    estado
) {
    return apiRequest(
        `/admin/catalog/products/${id}/status`,
        {
            method: "PATCH",
            token,
            body: {
                estado
            }
        }
    );
}