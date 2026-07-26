import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState
} from "react";

import {
    getCurrentUserRequest,
    googleLoginRequest,
    loginRequest,
    registerRequest
} from "../services/auth.service";

const AuthContext = createContext(null);

const TOKEN_STORAGE_KEY = "vallecito_access_token";

export function AuthProvider({ children }) {
    const [token, setToken] = useState(() =>
        sessionStorage.getItem(TOKEN_STORAGE_KEY)
    );

    const [usuario, setUsuario] = useState(null);
    const [isLoadingSession, setIsLoadingSession] =
        useState(true);

    useEffect(() => {
        const controller = new AbortController();

        async function restoreSession() {
            if (!token) {
                setUsuario(null);
                setIsLoadingSession(false);
                return;
            }

            try {
                const currentUser =
                    await getCurrentUserRequest(token);

                setUsuario(currentUser);
            } catch (error) {
                console.error(
                    "No se pudo restaurar la sesión:",
                    error
                );

                sessionStorage.removeItem(
                    TOKEN_STORAGE_KEY
                );

                setToken(null);
                setUsuario(null);
            } finally {
                setIsLoadingSession(false);
            }
        }

        void restoreSession();

        return () => {
            controller.abort();
        };
    }, [token]);

    function saveSession(authResult) {
        sessionStorage.setItem(
            TOKEN_STORAGE_KEY,
            authResult.token
        );

        setToken(authResult.token);
        setUsuario(authResult.usuario);
    }

    async function login(correo, password) {
        const result = await loginRequest(
            correo,
            password
        );

        saveSession(result);

        return result.usuario;
    }

    async function register(data) {
        const result = await registerRequest(data);

        saveSession(result);

        return result.usuario;
    }

    function logout() {
        sessionStorage.removeItem(TOKEN_STORAGE_KEY);

        setToken(null);
        setUsuario(null);
    }

    const value = useMemo(
        () => ({
            token,
            usuario,
            isAuthenticated: Boolean(
                token && usuario
            ),
            isLoadingSession,
            login,
            loginWithGoogle,
            register,
            logout
        }),
        [token, usuario, isLoadingSession]
    );

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );

    async function loginWithGoogle(credential) {
    const result =
        await googleLoginRequest(credential);

    saveSession(result);

    return result.usuario;
}
}

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error(
            "useAuth debe utilizarse dentro de AuthProvider."
        );
    }

    return context;
}