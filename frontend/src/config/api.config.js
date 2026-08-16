const SAME_ORIGIN_API_URL = "/api/v1";

const LOCAL_API_PATTERN =
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(?:\/|$)/i;

export function resolveApiUrl(
    configuredUrl = import.meta.env.VITE_API_URL,
    isProduction = import.meta.env.PROD
) {
    const normalizedUrl = configuredUrl
        ?.trim()
        .replace(/\/+$/, "");

    if (
        !normalizedUrl ||
        (isProduction && LOCAL_API_PATTERN.test(normalizedUrl))
    ) {
        return SAME_ORIGIN_API_URL;
    }

    return normalizedUrl;
}

export const API_URL = resolveApiUrl();
