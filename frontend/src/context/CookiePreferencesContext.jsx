import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState
} from "react";

const STORAGE_KEY = "vallecito_cookie_preferences_v1";
const CookiePreferencesContext = createContext(null);

function readPreferences() {
    try {
        const stored = JSON.parse(
            localStorage.getItem(STORAGE_KEY)
        );

        if (typeof stored?.googleAuth === "boolean") {
            return stored;
        }
    } catch {
        // Una preferencia corrupta se reemplaza con una nueva decisión.
    }

    return null;
}

export function CookiePreferencesProvider({ children }) {
    const [preferences, setPreferences] = useState(readPreferences);
    const [isPanelOpen, setIsPanelOpen] = useState(
        () => readPreferences() === null
    );

    const savePreferences = useCallback((nextPreferences) => {
        const value = {
            necessary: true,
            googleAuth: Boolean(nextPreferences.googleAuth),
            decidedAt: new Date().toISOString(),
            version: "1.0-2026-08-08"
        };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
        setPreferences(value);
        setIsPanelOpen(false);
    }, []);

    const openPreferences = useCallback(() => {
        setIsPanelOpen(true);
    }, []);

    useEffect(() => {
        globalThis.addEventListener(
            "vallecito:open-cookie-settings",
            openPreferences
        );

        return () => globalThis.removeEventListener(
            "vallecito:open-cookie-settings",
            openPreferences
        );
    }, [openPreferences]);

    const value = useMemo(() => ({
        preferences,
        isPanelOpen,
        savePreferences,
        openPreferences,
        closePreferences: () => {
            if (preferences) {
                setIsPanelOpen(false);
            }
        },
        enableGoogleAuth: () => savePreferences({ googleAuth: true })
    }), [preferences, isPanelOpen, savePreferences, openPreferences]);

    return (
        <CookiePreferencesContext.Provider value={value}>
            {children}
        </CookiePreferencesContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCookiePreferences() {
    const context = useContext(CookiePreferencesContext);

    if (!context) {
        throw new Error("useCookiePreferences debe utilizarse dentro de CookiePreferencesProvider.");
    }

    return context;
}
