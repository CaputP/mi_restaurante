import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import { useCookiePreferences } from "../../context/CookiePreferencesContext";

function GoogleAuthButton({
    onSuccess,
    onError,
    canAuthenticate = true
}) {
    const { preferences, enableGoogleAuth } = useCookiePreferences();
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    if (!preferences?.googleAuth) {
        return (
            <div className="google-btn-container">
                <button type="button" className="google-consent-button" onClick={enableGoogleAuth}>
                    Habilitar acceso con Google
                </button>
                <small>Esta opción carga servicios externos de Google.</small>
            </div>
        );
    }

    if (!googleClientId) {
        return <p className="auth-server-message">El acceso con Google no está configurado.</p>;
    }

    if (!canAuthenticate) {
        return <p className="google-legal-hint">Acepta los Términos y la Política de Privacidad para registrarte con Google.</p>;
    }

    return (
        <div className="google-btn-container">
            <GoogleOAuthProvider clientId={googleClientId}>
                <GoogleLogin
                    onSuccess={onSuccess}
                    onError={onError}
                    theme="outline"
                    size="large"
                    text="continue_with"
                    width="360px"
                />
            </GoogleOAuthProvider>
        </div>
    );
}

export default GoogleAuthButton;
