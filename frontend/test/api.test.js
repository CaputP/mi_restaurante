import {
    beforeEach,
    describe,
    expect,
    it,
    vi
} from "vitest";

function jsonResponse(body, status = 200) {
    return {
        ok: status >= 200 && status < 300,
        status,
        headers: {
            get: () => "application/json"
        },
        text: async () => JSON.stringify(body)
    };
}

describe("apiRequest", () => {
    beforeEach(() => {
        vi.resetModules();
        vi.stubGlobal("fetch", vi.fn());
    });

    it("usa cookies y propaga el token CSRF sin exponer el JWT", async () => {
        fetch
            .mockResolvedValueOnce(
                jsonResponse({
                    success: true,
                    data: {
                        csrfToken: "csrf-from-server"
                    }
                })
            )
            .mockResolvedValueOnce(
                jsonResponse({
                    success: true,
                    data: {}
                })
            );

        const { apiRequest } = await import(
            "../src/services/api"
        );

        await apiRequest("/auth/login", {
            method: "POST",
            body: {
                correo: "test@example.com",
                password: "secret"
            }
        });

        await apiRequest("/sales", {
            method: "POST",
            token: "legacy-token-that-must-not-be-sent",
            body: {}
        });

        const loginOptions = fetch.mock.calls[0][1];
        const saleOptions = fetch.mock.calls[1][1];

        expect(loginOptions.credentials).toBe("include");
        expect(loginOptions.headers.Authorization).toBeUndefined();
        expect(saleOptions.credentials).toBe("include");
        expect(saleOptions.headers.Authorization).toBeUndefined();
        expect(saleOptions.headers["X-CSRF-Token"]).toBe(
            "csrf-from-server"
        );
    });

    it("descarga archivos autenticados y conserva el nombre del servidor", async () => {
        const file = new Blob(["report-content"], {
            type: "application/pdf"
        });

        fetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            headers: {
                get: (name) =>
                    name.toLowerCase() === "content-disposition"
                        ? 'attachment; filename="reporte.pdf"'
                        : null
            },
            blob: async () => file
        });

        const { apiDownload } = await import(
            "../src/services/api"
        );
        const result = await apiDownload(
            "/reports/export.pdf"
        );

        expect(result.filename).toBe("reporte.pdf");
        expect(result.blob).toBe(file);
        expect(fetch).toHaveBeenCalledWith(
            "http://localhost:3000/api/v1/reports/export.pdf",
            expect.objectContaining({
                method: "GET",
                credentials: "include"
            })
        );
    });
});
