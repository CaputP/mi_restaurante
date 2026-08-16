import {
    useEffect,
    useState
} from "react";

const DEFAULT_REFRESH_INTERVAL_MS =
    60_000;

/**
 * Recarga vigencias mientras la pestaña está visible y al recuperar foco.
 * Así un cambio por hora o fecha no depende de que exista una mutación SSE.
 */
export default function useVisibleCatalogRefresh(
    intervalMs = DEFAULT_REFRESH_INTERVAL_MS
) {
    const [version, setVersion] =
        useState(0);

    useEffect(() => {
        let lastRefreshAt =
            Number.NEGATIVE_INFINITY;

        const refreshIfVisible = () => {
            const now =
                Date.now();

            if (
                document.visibilityState ===
                    "visible" &&
                now - lastRefreshAt >=
                    500
            ) {
                lastRefreshAt = now;
                setVersion(
                    (previous) =>
                        previous + 1
                );
            }
        };

        const intervalId =
            window.setInterval(
                refreshIfVisible,
                intervalMs
            );

        window.addEventListener(
            "focus",
            refreshIfVisible
        );
        document.addEventListener(
            "visibilitychange",
            refreshIfVisible
        );

        return () => {
            window.clearInterval(
                intervalId
            );
            window.removeEventListener(
                "focus",
                refreshIfVisible
            );
            document.removeEventListener(
                "visibilitychange",
                refreshIfVisible
            );
        };
    }, [intervalMs]);

    return version;
}
