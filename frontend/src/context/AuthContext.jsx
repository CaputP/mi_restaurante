import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState
} from "react";

import {
    acceptLegalPoliciesRequest,
    getCurrentUserRequest,
    googleLoginRequest,
    loginRequest,
    logoutRequest,
    renewSessionRequest,
    registerRequest
} from "../services/auth.service";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [usuario, setUsuario] = useState(null);
    const [isLoadingSession, setIsLoadingSession] =
        useState(true);

    useEffect(() => {
        const controller = new AbortController();

        async function restoreSession() {
            try {
                const currentUser =
                    await getCurrentUserRequest(
                        controller.signal
                    );

                setUsuario(currentUser);
            } catch (error) {
                if (
                    error?.name ===
                    "AbortError"
                ) {
                    return;
                }

                if (error?.status !== 401) {
                    console.error(
                        "No se pudo restaurar la sesión:",
                        error
                    );
                }

                setUsuario(null);
            } finally {
                if (
                    !controller.signal.aborted
                ) {
                    setIsLoadingSession(false);
                }
            }
        }

        void restoreSession();

        return () => {
            controller.abort();
        };
    }, []);

    useEffect(() => {
        function clearExpiredSession() {
            setUsuario(null);
        }

        globalThis.addEventListener(
            "vallecito:session-expired",
            clearExpiredSession
        );

        return () => {
            globalThis.removeEventListener(
                "vallecito:session-expired",
                clearExpiredSession
            );
        };
    }, []);

    useEffect(() => {
        if (!usuario) {
            return undefined;
        }

        let lastRenewal = Date.now();
        let renewing = false;

        async function renewSession() {
            if (renewing) {
                return;
            }

            renewing = true;

            try {
                await renewSessionRequest();
                lastRenewal = Date.now();
            } catch (error) {
                if (error?.status !== 401) {
                    console.error(
                        "No se pudo renovar la sesión:",
                        error
                    );
                }
            } finally {
                renewing = false;
            }
        }

        const timer = setInterval(
            () => {
                void renewSession();
            },
            30 * 60 * 1000
        );

        function handleVisibilityChange() {
            if (
                document.visibilityState === "visible" &&
                Date.now() - lastRenewal >=
                    30 * 60 * 1000
            ) {
                void renewSession();
            }
        }

        document.addEventListener(
            "visibilitychange",
            handleVisibilityChange
        );

        return () => {
            clearInterval(timer);
            document.removeEventListener(
                "visibilitychange",
                handleVisibilityChange
            );
        };
    }, [usuario]);

    const saveSession = useCallback((authResult) => {
        setUsuario(authResult.usuario);
    }, []);

    const login = useCallback(async (correo, password) => {
        const result = await loginRequest(
            correo,
            password
        );

        saveSession(result);

        return result.usuario;
    }, [saveSession]);

    const register = useCallback(async (data) => {
        const result = await registerRequest(data);

        saveSession(result);

        return result.usuario;
    }, [saveSession]);

    const loginWithGoogle = useCallback(async (data) => {
        const result =
            await googleLoginRequest(data);

        saveSession(result);

        return result.usuario;
    }, [saveSession]);

    const logout = useCallback(async () => {
        setUsuario(null);

        try {
            await logoutRequest();
        } catch (error) {
            console.error(
                "No se pudo cerrar la sesión en el servidor:",
                error
            );
        }
    }, []);

    const acceptLegalPolicies = useCallback(async (data) => {
        const updatedUser = await acceptLegalPoliciesRequest(data);
        setUsuario(updatedUser);
        return updatedUser;
    }, []);

    const token = usuario
        ? "cookie-session"
        : null;

    const value = useMemo(
        () => ({
            token,
            usuario,
            isAuthenticated: Boolean(usuario),
            isLoadingSession,
            login,
            loginWithGoogle,
            register,
            acceptLegalPolicies,
            logout
        }),
        [
            token,
            usuario,
            isLoadingSession,
            login,
            loginWithGoogle,
            register,
            acceptLegalPolicies,
            logout
        ]
    );

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );

}

// El hook comparte archivo con el proveedor de contexto de forma intencional.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error(
            "useAuth debe utilizarse dentro de AuthProvider."
        );
    }

    return context;
}
