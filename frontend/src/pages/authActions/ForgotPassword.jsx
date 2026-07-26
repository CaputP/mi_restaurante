import { useState } from "react";
import {
    FaArrowLeft,
    FaEnvelope,
    FaPaperPlane
} from "react-icons/fa";
import { Link } from "react-router-dom";

import logo from "../../assets/images/logo.png";
import { ApiError } from "../../services/api";
import {
    forgotPasswordRequest
} from "../../services/auth.service";
import "./authActions.css";

function ForgotPassword() {
    const [correo, setCorreo] = useState("");
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [isSubmitting, setIsSubmitting] =
        useState(false);

    async function handleSubmit(event) {
        event.preventDefault();

        setError("");
        setMessage("");

        const correoLimpio =
            correo.trim().toLowerCase();

        if (!correoLimpio) {
            setError(
                "Ingresa tu correo electrónico."
            );
            return;
        }

        const emailRegex =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(correoLimpio)) {
            setError(
                "Ingresa un correo electrónico válido."
            );
            return;
        }

        setIsSubmitting(true);

        try {
            const response =
                await forgotPasswordRequest(
                    correoLimpio
                );

            setMessage(response.message);
        } catch (requestError) {
            if (requestError instanceof ApiError) {
                setError(requestError.message);
                return;
            }

            console.error(
                "Error solicitando recuperación:",
                requestError
            );

            setError(
                "Ocurrió un error inesperado."
            );
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <main className="auth-action-page">
            <section className="auth-action-card">
                <Link
                    to="/"
                    className="auth-action-logo"
                    aria-label="Volver al inicio"
                >
                    <img
                        src={logo}
                        alt="El Vallecito de Chocco"
                    />
                </Link>

                <div className="auth-action-icon">
                    <FaEnvelope />
                </div>

                <h1>Recuperar contraseña</h1>

                <p className="auth-action-description">
                    Ingresa el correo asociado a tu
                    cuenta. Te enviaremos un enlace para
                    establecer una nueva contraseña.
                </p>

                {message ? (
                    <div
                        className="auth-action-message success"
                        role="status"
                    >
                        {message}
                    </div>
                ) : (
                    <form
                        className="auth-action-form"
                        onSubmit={handleSubmit}
                        noValidate
                    >
                        <div className="auth-action-group">
                            <label htmlFor="recovery-email">
                                Correo electrónico
                            </label>

                            <input
                                type="email"
                                id="recovery-email"
                                value={correo}
                                maxLength={150}
                                placeholder="ejemplo@gmail.com"
                                autoComplete="email"
                                onChange={(event) => {
                                    setCorreo(
                                        event.target.value
                                    );
                                    setError("");
                                }}
                            />
                        </div>

                        {error && (
                            <div
                                className="auth-action-message error"
                                role="alert"
                            >
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="auth-action-submit"
                            disabled={isSubmitting}
                        >
                            <FaPaperPlane />

                            <span>
                                {isSubmitting
                                    ? "Enviando..."
                                    : "Enviar enlace"}
                            </span>
                        </button>
                    </form>
                )}

                <Link
                    to="/login"
                    className="auth-action-back"
                >
                    <FaArrowLeft />
                    <span>Volver al inicio de sesión</span>
                </Link>
            </section>
        </main>
    );
}

export default ForgotPassword;