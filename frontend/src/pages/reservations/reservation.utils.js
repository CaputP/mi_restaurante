export const ACTIVE_RESERVATION_STATES = new Set([
    "SOLICITADA",
    "EN_REVISION",
    "ESPERANDO_ADELANTO",
    "CONFIRMADA"
]);

export const RESCHEDULABLE_STATES = new Set([
    "SOLICITADA",
    "EN_REVISION"
]);

export const PAYABLE_STATES = new Set([
    "ESPERANDO_ADELANTO",
    "CONFIRMADA"
]);

export const STATUS_OPTIONS = [
    ["TODOS", "Todas"],
    ["SOLICITADA", "Solicitadas"],
    ["EN_REVISION", "En revisión"],
    ["ESPERANDO_ADELANTO", "Esperando adelanto"],
    ["CONFIRMADA", "Confirmadas"],
    ["ATENDIDA", "Atendidas"],
    ["CANCELADA", "Canceladas"]
];

export function formatMoney(value) {
    return new Intl.NumberFormat(
        "es-PE",
        {
            style: "currency",
            currency: "PEN",
            minimumFractionDigits: 2
        }
    ).format(Number(value) || 0);
}

export function formatDate(value) {
    if (!value) {
        return "-";
    }

    return new Date(
        `${value}T12:00:00`
    ).toLocaleDateString(
        "es-PE",
        {
            weekday: "short",
            day: "2-digit",
            month: "short",
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
            timeZone: "America/Lima",
            dateStyle: "short",
            timeStyle: "short"
        }
    );
}

export function formatLabel(value) {
    return String(value ?? "")
        .toLowerCase()
        .replaceAll("_", " ")
        .replace(
            /(^|\s)\S/g,
            (letter) => letter.toUpperCase()
        );
}

export function getTodayInputValue() {
    return new Intl.DateTimeFormat(
        "en-CA",
        {
            timeZone: "America/Lima",
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        }
    ).format(new Date());
}

export function getTomorrowInputValue() {
    const tomorrow =
        new Date(
            Date.now() +
                24 * 60 * 60 * 1000
        );

    return new Intl.DateTimeFormat(
        "en-CA",
        {
            timeZone: "America/Lima",
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        }
    ).format(tomorrow);
}

export function getErrorMessage(error) {
    const validationMessage =
        error?.errors?.[0]?.mensaje;

    return validationMessage
        ? `${error.message} ${validationMessage}`
        : error?.message ??
            "No se pudo completar la operación.";
}

export function isAbortError(error) {
    return error?.name === "AbortError";
}
