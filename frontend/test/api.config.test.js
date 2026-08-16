import { describe, expect, it } from "vitest";
import { resolveApiUrl } from "../src/config/api.config";

describe("resolveApiUrl", () => {
    it("usa el proxy del mismo origen cuando no hay configuración", () => {
        expect(resolveApiUrl(undefined, true)).toBe("/api/v1");
    });

    it("impide publicar una URL local por accidente", () => {
        expect(
            resolveApiUrl(
                "http://localhost:3000/api/v1",
                true
            )
        ).toBe("/api/v1");
    });

    it("conserva una API externa válida y elimina la barra final", () => {
        expect(
            resolveApiUrl(
                "https://api.example.com/api/v1/",
                true
            )
        ).toBe("https://api.example.com/api/v1");
    });

    it("permite una API local configurada durante desarrollo", () => {
        expect(
            resolveApiUrl(
                "http://localhost:3000/api/v1",
                false
            )
        ).toBe("http://localhost:3000/api/v1");
    });
});
