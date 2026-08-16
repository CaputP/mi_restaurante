import {
    describe,
    expect,
    it
} from "vitest";

import {
    benefitScopeText,
    formatDate,
    formatDateTime,
    formatRefreshTime,
    getErrorMessage,
    promotionBenefitText,
    promotionProductsText
} from "../src/pages/client/loyalty/loyalty.utils";

describe("formato de fechas de fidelización", () => {
    it("conserva el día calendario de los campos Date enviados a medianoche UTC", () => {
        expect(
            formatDate(
                "2026-08-01T00:00:00.000Z"
            )
        ).toBe("01/08/2026");
    });

    it("acepta también una fecha calendario sin componente de hora", () => {
        expect(
            formatDate("2026-08-01")
        ).toBe("01/08/2026");
    });

    it("muestra las horas comerciales en la zona de Lima", () => {
        expect(
            formatDateTime(
                "2026-08-01T15:00:00.000Z"
            )
        ).toContain("10:00");

        expect(
            formatRefreshTime(
                "2026-08-01T15:00:00.000Z"
            )
        ).toContain("10:00");
    });

    it("enumera todos los productos de una promoción", () => {
        expect(
            promotionProductsText([
                { nombre: "Trucha" },
                { nombre: "Cuy" },
                { nombre: "Chicha" },
                { nombre: "Papa" }
            ])
        ).toBe(
            "Trucha, Cuy, Chicha, Papa"
        );
    });

    it("no anuncia fracciones de productos gratis heredadas", () => {
        expect(
            promotionBenefitText({
                tipo: "PRODUCTO_GRATIS",
                valor: 1.5
            })
        ).toBe("1 producto(s) gratis");
    });

    it("muestra únicamente las sucursales donde el beneficio es aplicable", () => {
        expect(
            benefitScopeText({
                sucursal: null,
                sucursalesAplicables: [
                    "Sede Chocco",
                    "Sede Centro"
                ]
            })
        ).toBe("Sede Chocco, Sede Centro");
    });

    it("no expone mensajes internos de errores inesperados", () => {
        expect(
            getErrorMessage(
                new Error(
                    "Cannot read properties of undefined"
                )
            )
        ).toBeNull();
    });
});
