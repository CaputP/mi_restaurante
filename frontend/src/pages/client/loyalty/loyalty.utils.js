import {
    ApiError
} from "../../../services/api";

export function isAbortError(error) {
    return error?.name === "AbortError";
}

export function getErrorMessage(error) {
    if (!(error instanceof ApiError)) {
        return null;
    }

    const validationMessage =
        error.errors?.[0]?.mensaje ??
        error.errors?.[0]?.message;

    return validationMessage
        ? `${error.message} ${validationMessage}`
        : error.message;
}

export function numberValue(value) {
    const result = Number(value);

    return Number.isFinite(result)
        ? result
        : 0;
}

export function formatMoney(value) {
    return new Intl.NumberFormat(
        "es-PE",
        {
            style: "currency",
            currency: "PEN",
            minimumFractionDigits: 2
        }
    ).format(numberValue(value));
}

export function formatQuantity(value) {
    return new Intl.NumberFormat(
        "es-PE",
        {
            maximumFractionDigits: 3
        }
    ).format(numberValue(value));
}

export function formatDate(value) {
    if (!value) {
        return "-";
    }

    const serializedValue = String(value);
    const isDatabaseDate =
        /^\d{4}-\d{2}-\d{2}(?:T00:00:00(?:\.000)?Z)?$/.test(
            serializedValue
        );
    const date = isDatabaseDate
        ? new Date(
              `${serializedValue.slice(
                  0,
                  10
              )}T00:00:00`
          )
        : new Date(value);

    return date.toLocaleDateString(
        "es-PE",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    );
}

export function formatDateTime(value) {
    if (!value) {
        return "-";
    }

    return new Date(value).toLocaleString(
        "es-PE",
        {
            dateStyle: "short",
            timeStyle: "short",
            timeZone: "America/Lima"
        }
    );
}

export function formatRefreshTime(value) {
    if (!value) {
        return "";
    }

    const date =
        value instanceof Date
            ? value
            : new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return new Intl.DateTimeFormat(
        "es-PE",
        {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            timeZone: "America/Lima"
        }
    ).format(date);
}

export function formatLabel(value) {
    return String(value ?? "")
        .toLowerCase()
        .replaceAll("_", " ")
        .replace(
            /(^|\s)\S/g,
            (letter) =>
                letter.toUpperCase()
        );
}

export function benefitScopeText(benefit) {
    const applicableBranches =
        Array.isArray(
            benefit?.sucursalesAplicables
        )
            ? benefit.sucursalesAplicables.filter(Boolean)
            : [];

    if (applicableBranches.length > 0) {
        return applicableBranches.join(", ");
    }

    return benefit?.sucursal?.nombre ??
        "Todas las sucursales";
}

export function rewardValueText(reward) {
    switch (reward.tipoRecompensa) {
        case "PRODUCTO_GRATIS":
            return reward.productoPremio?.nombre ??
                "Producto gratis";

        case "DESCUENTO_FIJO":
            return formatMoney(
                reward.valorReferencia
            );

        case "DESCUENTO_PORCENTAJE":
            return `${numberValue(
                reward.valorReferencia
            )}% de descuento`;

        case "BENEFICIO":
            return "Beneficio especial";

        default:
            return "Premio";
    }
}

export function programRewardText(program) {
    switch (program.tipoRecompensa) {
        case "PRODUCTO_GRATIS": {
            const productName =
                program.productoPremio?.nombre ??
                "Producto seleccionado";
            const quantity =
                numberValue(program.cantidadPremio);

            return quantity > 1
                ? `${formatQuantity(quantity)} × ${productName} gratis`
                : `${productName} gratis`;
        }

        case "DESCUENTO_FIJO":
            return numberValue(
                program.montoDescuento
            ) > 0
                ? `${formatMoney(
                      program.montoDescuento
                  )} de descuento`
                : "Descuento";

        case "DESCUENTO_PORCENTAJE":
            return numberValue(
                program.porcentajeDescuento
            ) > 0
                ? `${formatQuantity(
                      program.porcentajeDescuento
                  )}% de descuento`
                : "Descuento porcentual";

        case "BENEFICIO":
            return program.descripcionBeneficio ??
                "Beneficio especial";

        default:
            return "Premio";
    }
}

export function programRequirementText(program) {
    const visits = numberValue(
        program.visitasRequeridas
    );
    const amount = numberValue(
        program.montoRequerido
    );

    if (program.tipo === "VISITAS") {
        return `${visits} visita${
            visits === 1 ? "" : "s"
        }`;
    }

    if (program.tipo === "MONTO_CONSUMIDO") {
        return `${formatMoney(amount)} de consumo`;
    }

    return `${visits} visita${
        visits === 1 ? "" : "s"
    } y ${formatMoney(amount)} de consumo`;
}

export function promotionBenefitText(promotion) {
    switch (promotion.tipo) {
        case "DESCUENTO_FIJO":
            return `${formatMoney(
                promotion.valor
            )} de descuento`;

        case "DESCUENTO_PORCENTAJE":
            return `${formatQuantity(
                promotion.valor
            )}% de descuento`;

        case "PRODUCTO_GRATIS":
            return `${formatQuantity(
                Math.floor(
                    numberValue(
                        promotion.valor
                    )
                )
            )} producto(s) gratis`;

        case "COMBO":
            return `Combo por ${formatMoney(
                promotion.valor
            )}`;

        default:
            return "Beneficio promocional";
    }
}

export function promotionProductsText(products = []) {
    if (products.length === 0) {
        return "Aplica a toda la carta";
    }

    const names = products
        .map((product) => product.nombre)
        .filter(Boolean);

    return names.join(", ");
}
