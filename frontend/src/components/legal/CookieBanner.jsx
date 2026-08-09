import { useState } from "react";
import { Link } from "react-router-dom";
import { useCookiePreferences } from "../../context/CookiePreferencesContext";
import "./cookie-banner.css";

function CookieBanner() {
    const {
        preferences,
        isPanelOpen,
        savePreferences,
        closePreferences
    } = useCookiePreferences();
    const [googleAuth, setGoogleAuth] = useState(
        preferences?.googleAuth ?? false
    );

    if (!isPanelOpen) {
        return null;
    }

    return (
        <section
            className="cookie-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cookie-title"
        >
            <div className="cookie-panel__content">
                <div>
                    <span className="cookie-panel__eyebrow">Tu privacidad</span>
                    <h2 id="cookie-title">Preferencias de cookies</h2>
                    <p>
                        Usamos cookies técnicas para mantener la sesión y proteger formularios.
                        Google solo se carga si autorizas esa función opcional.
                    </p>
                    <Link to="/legal/cookies">Ver Política de Cookies</Link>
                </div>

                <div className="cookie-panel__options">
                    <label>
                        <input type="checkbox" checked disabled />
                        <span>
                            <strong>Necesarias</strong>
                            <small>Sesión, seguridad CSRF y funcionamiento del sistema.</small>
                        </span>
                    </label>
                    <label>
                        <input
                            type="checkbox"
                            checked={googleAuth}
                            onChange={(event) => setGoogleAuth(event.target.checked)}
                        />
                        <span>
                            <strong>Acceso con Google</strong>
                            <small>Carga servicios de Google para autenticarte.</small>
                        </span>
                    </label>
                </div>

                <div className="cookie-panel__actions">
                    {preferences && (
                        <button type="button" className="cookie-button secondary" onClick={() => {
                            setGoogleAuth(preferences.googleAuth);
                            closePreferences();
                        }}>
                            Cancelar
                        </button>
                    )}
                    <button type="button" className="cookie-button secondary" onClick={() => {
                        setGoogleAuth(false);
                        savePreferences({ googleAuth: false });
                    }}>
                        Solo necesarias
                    </button>
                    <button type="button" className="cookie-button primary" onClick={() => savePreferences({ googleAuth })}>
                        Guardar preferencias
                    </button>
                </div>
            </div>
        </section>
    );
}

export default CookieBanner;
