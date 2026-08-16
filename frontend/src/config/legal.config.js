export const LEGAL_VERSIONS = Object.freeze({
    terms: "1.1-2026-08-15",
    privacy: "1.1-2026-08-15",
    reservations: "1.1-2026-08-15",
    cookies: "1.0-2026-08-08"
});

export const LEGAL_EFFECTIVE_DATES = Object.freeze({
    terms: "15 de agosto de 2026",
    privacy: "15 de agosto de 2026",
    reservations: "15 de agosto de 2026",
    cookies: "8 de agosto de 2026"
});

function publicValue(value, fallback) {
    const candidate = value?.trim();

    return candidate && !candidate.startsWith("replace-with-")
        ? candidate
        : fallback;
}

const primaryPhone = publicValue(
    import.meta.env.VITE_LEGAL_PHONE,
    "+51 994 744 356"
);
const secondaryPhone = publicValue(
    import.meta.env.VITE_LEGAL_SECONDARY_PHONE,
    "+51 925 957 233"
);

function phoneDigits(value) {
    return value.replace(/\D/g, "");
}

export const LEGAL_PROVIDER = Object.freeze({
    tradeName: "El Vallecito de Chocco",
    legalName: publicValue(
        import.meta.env.VITE_LEGAL_BUSINESS_NAME,
        "MENDOZA HUAMANI GRACIELA"
    ),
    providerType: "Persona natural con negocio",
    ruc: publicValue(import.meta.env.VITE_LEGAL_RUC, "10250028747"),
    address: publicValue(
        import.meta.env.VITE_LEGAL_ADDRESS,
        "Comunidad Chocco Kuychiro s/n, Santiago, Cusco, Cusco, Perú"
    ),
    email: publicValue(
        import.meta.env.VITE_LEGAL_EMAIL,
        "elvallecitodechocco@gmail.com"
    ),
    phone: primaryPhone,
    phoneHref: `+${phoneDigits(primaryPhone)}`,
    whatsapp: primaryPhone,
    whatsappHref: phoneDigits(primaryPhone),
    secondaryPhone,
    secondaryPhoneHref: `+${phoneDigits(secondaryPhone)}`,
    dataBankName: "Clientes, usuarios y reclamaciones de El Vallecito de Chocco",
    dataBankRegistration: publicValue(
        import.meta.env.VITE_DATA_BANK_REGISTRATION,
        ""
    ),
    receiptMode: "Boleta de venta física"
});

export const LEGAL_CONFIGURATION_COMPLETE = [
    LEGAL_PROVIDER.legalName,
    LEGAL_PROVIDER.ruc,
    LEGAL_PROVIDER.address,
    LEGAL_PROVIDER.email,
    LEGAL_PROVIDER.phone
].every(Boolean);
