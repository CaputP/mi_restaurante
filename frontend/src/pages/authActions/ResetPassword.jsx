import { useState } from "react";
import {
    FaArrowLeft,
    FaCheckCircle,
    FaKey,
    FaLock
} from "react-icons/fa";
import {
    Link,
    useSearchParams
} from "react-router-dom";

import logo from "../../assets/images/logo.webp";
import { ApiError } from "../../services/api";
import {
    resetPasswordRequest
} from "../../services/auth.service";
import "./authActions.css";

const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{10,72}$/;

function ResetPassword() {
    const [searchParams] = useSearchParams();

    const token =
        searchParams.get("token")?.trim() ?? "";

    const [password, setPassword] = useState("");
    const [
        confirmarPassword,
        setConfirmarPassword
    ] = useState("");

    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] =
        useState(false);

    const [isSuccess, setIsSuccess] =
        useState(false);

    async function handleSubmit(event) {
        event.preventDefault();

        setError("");

        if (!token) {
            setError(
                "El enlace de recuperación no contiene un token válido."
            );
            return;
        }

        if (!passwordRegex.test(password)) {
            setError(
                "La contraseña debe tener entre 10 y 72 caracteres, una mayúscula, una minúscula y un número."
            );
            return;
        }

        if (password !== confirmarPassword) {
            setError(
                "Las contraseñas no coinciden."
            );
            return;
        }

        setIsSubmitting(true);

        try {
            await resetPasswordRequest({
                token,
                password,
                confirmarPassword
            });

            setPassword("");
            setConfirmarPassword("");
            setIsSuccess(true);
        } catch (requestError) {
            if (requestError instanceof ApiError) {
                setError(requestError.message);
                return;
            }

            console.error(
                "Error restableciendo contraseña:",
                requestError
            );

            setError(
                "Ocurrió un error inesperado."
            );
        } finally {
            setIsSubmitting(false);
        }
    }

    if (!token) {
        return (
            <main className="auth-action-page">
                <section className="auth-action-card">
                    <Link
                        to="/"
                        className="auth-action-logo"
                    >
                        <img
                            src={logo}
                            alt="El Vallecito de Chocco"
                        />
                    </Link>

                    <div className="auth-action-icon error">
                        <FaKey />
                    </div>

                    <h1>Enlace no válido</h1>

                    <p className="auth-action-description">
                        El enlace no contiene la información
                        necesaria para cambiar tu contraseña.
                    </p>

                    <Link
                        to="/recuperar-password"
                        className="auth-action-primary-link"
                    >
                        Solicitar un enlace nuevo
                    </Link>
                </section>
            </main>
        );
    }

    if (isSuccess) {
        return (
            <main className="auth-action-page">
                <section className="auth-action-card">
                    <Link
                        to="/"
                        className="auth-action-logo"
                    >
                        <img
                            src={logo}
                            alt="El Vallecito de Chocco"
                        />
                    </Link>

                    <div className="auth-action-icon success">
                        <FaCheckCircle />
                    </div>

                    <h1>Contraseña actualizada</h1>

                    <p className="auth-action-description">
                        Tu contraseña fue restablecida
                        correctamente. Las sesiones anteriores
                        dejaron de ser válidas.
                    </p>

                    <Link
                        to="/login"
                        className="auth-action-primary-link"
                    >
                        Iniciar sesión
                    </Link>
                </section>
            </main>
        );
    }

    return (
        <main className="auth-action-page">
            <section className="auth-action-card">
                <Link
                    to="/"
                    className="auth-action-logo"
                >
                    <img
                        src={logo}
                        alt="El Vallecito de Chocco"
                    />
                </Link>

                <div className="auth-action-icon">
                    <FaLock />
                </div>

                <h1>Nueva contraseña</h1>

                <p className="auth-action-description">
                    Crea una contraseña segura para volver a
                    ingresar a tu cuenta.
                </p>

                <form
                    className="auth-action-form"
                    onSubmit={handleSubmit}
                    noValidate
                >
                    <div className="auth-action-group">
                        <label htmlFor="new-password">
                            Nueva contraseña
                        </label>

                        <input
                            type="password"
                            id="new-password"
                            value={password}
                            minLength={10}
                            maxLength={72}
                            autoComplete="new-password"
                            placeholder="Ingresa la nueva contraseña"
                            onChange={(event) => {
                                setPassword(
                                    event.target.value
                                );
                                setError("");
                            }}
                        />
                    </div>

                    <div className="auth-action-group">
                        <label htmlFor="confirm-new-password">
                            Confirmar contraseña
                        </label>

                        <input
                            type="password"
                            id="confirm-new-password"
                            value={confirmarPassword}
                            minLength={10}
                            maxLength={72}
                            autoComplete="new-password"
                            placeholder="Repite la contraseña"
                            onChange={(event) => {
                                setConfirmarPassword(
                                    event.target.value
                                );
                                setError("");
                            }}
                        />
                    </div>

                    <p className="auth-password-help">
                        Debe tener al menos 10 caracteres,
                        una mayúscula, una minúscula y un
                        número.
                    </p>

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
                        <FaKey />

                        <span>
                            {isSubmitting
                                ? "Actualizando..."
                                : "Cambiar contraseña"}
                        </span>
                    </button>
                </form>

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

export default ResetPassword;
