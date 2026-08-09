import { ApiError } from "../../../services/api";

export const EMPTY_CASH_OPTIONS = {
    sucursales: [],
    vendedores: [],
    estados: [],
    sucursalSeleccionadaId: null,
    vendedorActualId: null
};

export const EMPTY_SALE_OPTIONS = {
    sucursales: [],
    cajas: [],
    pedidos: [],
    metodosPago: []
};

export const EMPTY_PAGINATION = {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1
};

export const EMPTY_EXPENSE_OPTIONS = {
    sucursales: [],
    categorias: [],
    cajas: [],
    metodosPago: [],
    sucursalSeleccionadaId: null
};

export function getTodayInputValue() {
    return new Date().toLocaleDateString("en-CA", {
        timeZone: "America/Lima"
    });
}

export function createPaymentRow(amount = 0) {
    return {
        id: crypto.randomUUID(),
        metodoPago: "EFECTIVO",
        monto: amount > 0 ? amount.toFixed(2) : "",
        numeroOperacion: "",
        montoRecibido: amount > 0 ? amount.toFixed(2) : ""
    };
}

export function isAbortError(error) {
    return error?.name === "AbortError";
}

export function getErrorMessage(error) {
    if (!(error instanceof ApiError)) {
        return null;
    }

    const validationMessage = error.errors?.[0]?.mensaje;
    return validationMessage
        ? `${error.message} ${validationMessage}`
        : error.message;
}

export function numberValue(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
}

export function roundMoney(value) {
    return Number(value.toFixed(2));
}

export function getPromotionalDiscount(sale) {
    if (!sale) {
        return 0;
    }

    return roundMoney(
        (sale.promocionesAplicadas ?? []).reduce(
            (total, promotion) => total + numberValue(promotion.montoDescuento),
            0
        )
    );
}

export function formatMoney(value) {
    return new Intl.NumberFormat("es-PE", {
        style: "currency",
        currency: "PEN"
    }).format(numberValue(value));
}

export function formatDateTime(value) {
    if (!value) {
        return "-";
    }

    return new Date(value).toLocaleString("es-PE", {
        dateStyle: "short",
        timeStyle: "short"
    });
}

export function formatDate(value) {
    if (!value) {
        return "-";
    }

    return new Date(value).toLocaleDateString("es-PE", {
        dateStyle: "short"
    });
}

export function formatLabel(value) {
    return String(value ?? "")
        .toLowerCase()
        .replaceAll("_", " ")
        .replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}
