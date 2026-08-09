export const LEGAL_VERSIONS = Object.freeze({
    terms: "1.0-2026-08-08",
    privacy: "1.0-2026-08-08",
    reservations: "1.0-2026-08-08",
    cookies: "1.0-2026-08-08"
});

export const LEGAL_PROVIDER = Object.freeze({
    tradeName: "El Vallecito de Chocco",
    legalName:
        import.meta.env.VITE_LEGAL_BUSINESS_NAME?.trim() ||
        "Dato pendiente de configuración",
    ruc:
        import.meta.env.VITE_LEGAL_RUC?.trim() ||
        "Dato pendiente de configuración",
    address:
        import.meta.env.VITE_LEGAL_ADDRESS?.trim() ||
        "Chocco, Santiago - Cusco, Perú",
    email:
        import.meta.env.VITE_LEGAL_EMAIL?.trim() ||
        "Dato pendiente de configuración",
    phone:
        import.meta.env.VITE_LEGAL_PHONE?.trim() ||
        "+51 994 744 356",
    dataBankRegistration:
        import.meta.env.VITE_DATA_BANK_REGISTRATION?.trim() ||
        "Dato pendiente de configuración"
});

export const LEGAL_CONFIGURATION_COMPLETE = [
    "VITE_LEGAL_BUSINESS_NAME",
    "VITE_LEGAL_RUC",
    "VITE_LEGAL_EMAIL"
].every((key) => Boolean(import.meta.env[key]?.trim()));
