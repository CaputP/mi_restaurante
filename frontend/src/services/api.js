const API_URL =
    import.meta.env.VITE_API_URL ??
    "http://localhost:3000/api";

export class ApiError extends Error {
    constructor(message, status, code, errors = []) {
        super(message);

        this.name = "ApiError";
        this.status = status;
        this.code = code;
        this.errors = errors;
    }
}

export async function apiRequest(
    endpoint,
    {
        method = "GET",
        body,
        token,
        signal
    } = {}
) {
    const headers = {
        Accept: "application/json"
    };

    if (body !== undefined) {
        headers["Content-Type"] = "application/json";
    }

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    let response;

    try {
        response = await fetch(`${API_URL}${endpoint}`, {
            method,
            headers,
            body:
                body !== undefined
                    ? JSON.stringify(body)
                    : undefined,
            signal
        });
    } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
            throw error;
        }

        throw new ApiError(
            "No se pudo conectar con el servidor.",
            0,
            "NETWORK_ERROR"
        );
    }

let responseText;

try {
    responseText =
        await response.text();
} catch (error) {
    if (
        error instanceof DOMException &&
        error.name === "AbortError"
    ) {
        throw error;
    }

    throw new ApiError(
        "No se pudo leer la respuesta del servidor.",
        response.status,
        "SERVER_RESPONSE_READ_ERROR"
    );
}

    let result = {};

    if (responseText.trim()) {
        try {
            result =
                JSON.parse(
                    responseText
                );
        } catch {
            console.error(
                "Respuesta no JSON recibida:",
                {
                    endpoint,
                    status:
                        response.status,

                    contentType:
                        response.headers.get(
                            "content-type"
                        ),

                    response:
                        responseText.slice(
                            0,
                            500
                        )
                }
            );

            throw new ApiError(
                "El servidor devolvió una respuesta no válida.",
                response.status,
                "INVALID_SERVER_RESPONSE"
            );
        }
    }

    if (!response.ok) {
        throw new ApiError(
            result.message ?? "Ocurrió un error.",
            response.status,
            result.code ?? "API_ERROR",
            result.errors ?? []
        );
    }

    return result;
}