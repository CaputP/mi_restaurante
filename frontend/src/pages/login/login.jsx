import { FaSignInAlt, FaUserPlus } from "react-icons/fa";
import { useState } from "react";
import GoogleAuthButton from "./GoogleAuthButton";
import "./login.css";
import logo from "../../assets/images/logo.webp";

import {
    getHomePathByRole
} from "../../utils/roleRoutes";

import {
    Link,
    useLocation,
    useNavigate
} from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { ApiError } from "../../services/api";
import { LEGAL_VERSIONS } from "../../config/legal.config";

// Importamos la función de validación
import { validateAuthForm } from "./validations";

function Login() {

    const location = useLocation();

    // Estado para alternar entre iniciar sesión y registrarse
    const [isRegister, setIsRegister] = useState(() =>
        new URLSearchParams(
            location.search
        ).get("mode") === "register"
    );

    // Estados de los campos del formulario
    const [nombre, setNombre] = useState("");
    const [correo, setCorreo] = useState("");
    const [telefono, setTelefono] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [aceptaTerminos, setAceptaTerminos] = useState(false);
    const [aceptaPrivacidad, setAceptaPrivacidad] = useState(false);

    // Estado que almacena los mensajes de error
    const [errors, setErrors] = useState({
        nombre: "",
        correo: "",
        telefono: "",
        password: "",
        confirmPassword: "",
        aceptaTerminos: "",
        aceptaPrivacidad: ""
    });

    const navigate = useNavigate();

    const {
        login,
        loginWithGoogle,
        register
    } = useAuth();

    const [isSubmitting, setIsSubmitting] =
        useState(false);

    const [serverMessage, setServerMessage] =
        useState("");

    /*
     * Elimina únicamente el error del campo
     * que el usuario está corrigiendo.
     */
    function clearFieldError(fieldName) {
        setErrors((previousErrors) => ({
            ...previousErrors,
            [fieldName]: ""
        }));
    }

    /*
     * Cambia entre el formulario de registro
     * y el formulario de inicio de sesión.
     */
    function handleToggleForm() {
        setIsRegister((previousValue) => !previousValue);

        // Limpiamos todos los errores al cambiar de formulario
        setErrors({
            nombre: "",
            correo: "",
            telefono: "",
            password: "",
            confirmPassword: "",
            aceptaTerminos: "",
            aceptaPrivacidad: ""
        });

        // Limpiamos los campos por seguridad
        setPassword("");
        setConfirmPassword("");
        setNombre("");
        setCorreo("");
        setTelefono("");
        setAceptaTerminos(false);
        setAceptaPrivacidad(false);
    }

    function redirectAuthenticatedUser(
        usuario
    ) {
        const requestedPath =
            location.state?.from;
        const safeRequestedPath =
            typeof requestedPath === "string" &&
            requestedPath.startsWith("/") &&
            !requestedPath.startsWith("//")
                ? requestedPath
                : null;

        navigate(
            safeRequestedPath ??
                getHomePathByRole(
                    usuario.rol.codigo,
                    usuario.permisos
                ),
            {
                replace:
                    true
            }
        );
    }

    /*
     * Se ejecuta cuando Google autentica
     * correctamente al usuario.
     */
    const handleGoogleSuccess = async (
        credentialResponse
    ) => {
        setServerMessage("");

        const credential =
            credentialResponse.credential;

        if (!credential) {
            setServerMessage(
                "Google no devolvió una credencial válida."
            );
            return;
        }

        setIsSubmitting(true);

        try {
            const usuario =
                await loginWithGoogle({
                    credential,
                    aceptaTerminos: isRegister
                        ? aceptaTerminos
                        : undefined,
                    versionTerminos: isRegister
                        ? LEGAL_VERSIONS.terms
                        : undefined,
                    aceptaPrivacidad: isRegister
                        ? aceptaPrivacidad
                        : undefined,
                    versionPrivacidad: isRegister
                        ? LEGAL_VERSIONS.privacy
                        : undefined
                });

            redirectAuthenticatedUser(usuario);
        } catch (error) {
            if (error instanceof ApiError) {
                setServerMessage(error.message);
                return;
            }

            console.error(
                "Error iniciando sesión con Google:",
                error
            );

            setServerMessage(
                "No se pudo iniciar sesión con Google."
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    /*
     * Se ejecuta cuando ocurre un error
     * durante la autenticación con Google.
     */
    const handleGoogleError = () => {
        setServerMessage(
            "Google no pudo completar el inicio de sesión."
        );
    };

    function splitFullName(fullName) {
        const parts = fullName
            .trim()
            .split(/\s+/)
            .filter(Boolean);

        /*
        * Para cuatro o más palabras se consideran las
        * dos últimas como apellidos.
        *
        * Ejemplo:
        * JUAN CLIMACO PRADA MENDOZA
        */
        const lastNameCount =
            parts.length >= 4 ? 2 : 1;

        return {
            nombres: parts
                .slice(0, -lastNameCount)
                .join(" "),
            apellidos: parts
                .slice(-lastNameCount)
                .join(" ")
        };
    }

    /*
     * Controla el envío del formulario.
     *
     * 1. Evita que la página se recargue.
     * 2. Ejecuta las validaciones.
     * 3. Muestra los errores encontrados.
     * 4. Detiene el proceso si existen errores.
     * 5. Continúa con login o registro.
     */

    async function handleSubmit(event) {
        event.preventDefault();

        setServerMessage("");

        const newErrors = validateAuthForm({
            isRegister,
            nombre,
            correo,
            telefono,
            password,
            confirmPassword,
            aceptaTerminos,
            aceptaPrivacidad
        });

        setErrors(newErrors);

        const hasErrors = Object.values(
            newErrors
        ).some((error) => error !== "");

        if (hasErrors) {
            return;
        }

        const correoLimpio =
            correo.trim().toLowerCase();

        setIsSubmitting(true);

        try {
            if (isRegister) {
                const {
                    nombres,
                    apellidos
                } = splitFullName(nombre);

                const usuario = await register({
                    nombres,
                    apellidos,
                    telefono: telefono.trim(),
                    correo: correoLimpio,
                    password,
                    confirmarPassword:
                        confirmPassword,
                    aceptaTerminos,
                    versionTerminos:
                        LEGAL_VERSIONS.terms,
                    aceptaPrivacidad,
                    versionPrivacidad:
                        LEGAL_VERSIONS.privacy
                });

                redirectAuthenticatedUser(
                    usuario
                );

                return;
            }

            const usuario = await login(
                correoLimpio,
                password
            );

            redirectAuthenticatedUser(
                usuario
            );

        } catch (error) {
            if (error instanceof ApiError) {
                setServerMessage(error.message);

                if (
                    error.code ===
                    "VALIDATION_ERROR"
                ) {
                    const backendErrors = {};

                    for (const item of error.errors) {
                        if (item.campo) {
                            backendErrors[
                                item.campo
                            ] = item.mensaje;
                        }
                    }

                    setErrors(
                        (previousErrors) => ({
                            ...previousErrors,
                            ...backendErrors
                        })
                    );
                }

                return;
            }

            console.error(
                "Error inesperado:",
                error
            );

            setServerMessage(
                "Ocurrió un error inesperado."
            );
        } finally {
            setIsSubmitting(false);
        }
    }


    return (
        <main className="login-page">
                <section className="login-container">

                    {/* Panel izquierdo */}
                    <div className="login-image">
                        <div className="login-image-overlay">
                            <div className="login-sidebar-logo">
                                <img
                                    src={logo}
                                    alt="Logo El Vallecito de Chocco"
                                />
                            </div>
                            

                            <h2>Bienvenido de nuevo</h2>
                            <p>Bienvenido a nuestro sistema</p>
                        </div>
                    </div>

                    {/* Panel derecho */}
                    <div className="login-content">
                        <form
                            className="login-form"
                            onSubmit={handleSubmit}
                            noValidate
                        >
                            {/* Título dinámico */}
                            <h1>
                                {isRegister
                                    ? "Crear cuenta"
                                    : "Iniciar sesión"}
                            </h1>

                            {/* Subtítulo dinámico */}
                            <p className="login-subtitle">
                                {isRegister
                                    ? "Regístrate para gestionar tus pedidos"
                                    : "Ingresa tus datos para acceder al sistema"}
                            </p>

                            {/* Campo nombre: solo aparece en registro */}
                            {isRegister && (
                                <div className="form-group">
                                    <label htmlFor="nombre">
                                        Nombre completo
                                    </label>

                                    <input
                                        type="text"
                                        id="nombre"
                                        className={errors.nombre ? "input-error" : ""}
                                        placeholder="Ingresa tu nombre completo"
                                        value={nombre}
                                        maxLength={100}
                                        onChange={(event) => {
                                            /*
                                             * Convertimos automáticamente
                                             * el nombre a mayúsculas.
                                             *
                                             * También eliminamos números,
                                             * símbolos y espacios repetidos.
                                             */
                                            const nombreProcesado =
                                                event.target.value
                                                    .toUpperCase()
                                                    .replace(
                                                        /[^A-ZÁÉÍÓÚÜÑ ]/g,
                                                        ""
                                                    )
                                                    .replace(
                                                        /\s{2,}/g,
                                                        " "
                                                    );

                                            setNombre(nombreProcesado);
                                            clearFieldError("nombre");
                                        }}
                                    />

                                    {/* Error del nombre */}
                                    {errors.nombre && (
                                        <span className="error-message">
                                            {errors.nombre}
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* Campo teléfono: solo aparece en registro */}
                            {isRegister && (
                                <div className="form-group">
                                    <label htmlFor="telefono">
                                        Teléfono
                                    </label>

                                    <input
                                        type="tel"
                                        id="telefono"
                                        className={errors.telefono ? "input-error" : ""}
                                        placeholder="999999999"
                                        value={telefono}
                                        maxLength={9}
                                        inputMode="numeric"
                                        onChange={(event) => {
                                            /*
                                             * Eliminamos cualquier carácter
                                             * que no sea un número.
                                             *
                                             * slice(0, 9) garantiza que solo
                                             * se guarden nueve dígitos.
                                             */
                                            const telefonoProcesado =
                                                event.target.value
                                                    .replace(/\D/g, "")
                                                    .slice(0, 9);

                                            setTelefono(
                                                telefonoProcesado
                                            );

                                            clearFieldError("telefono");
                                        }}
                                    />

                                    {/* Error del teléfono */}
                                    {errors.telefono && (
                                        <span className="error-message">
                                            {errors.telefono}
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* Campo correo */}
                            <div className="form-group">
                                <label htmlFor="correo">
                                    Correo electrónico
                                </label>

                                <input
                                    type="email"
                                    id="correo"
                                    maxLength={150}
                                    className={errors.correo ? "input-error" : ""}
                                    placeholder="ejemplo@gmail.com"
                                    value={correo}
                                    onChange={(event) => {
                                        setCorreo(event.target.value.trim().toLowerCase());
                                        clearFieldError("correo");
                                    }}
                                />

                                {/* Error del correo */}
                                {errors.correo && (
                                    <span className="error-message">
                                        {errors.correo}
                                    </span>
                                )}
                            </div>

                            {/* Campo contraseña */}
                            <div className="form-group">
                                <label htmlFor="password">
                                    Contraseña
                                </label>

                                <input
                                    type="password"
                                    id="password"
                                    maxLength={72}
                                    className={errors.password ? "input-error" : ""}
                                    placeholder={
                                        isRegister
                                            ? "Crea una contraseña segura"
                                            : "Ingresa tu contraseña"
                                    }
                                    value={password}
                                    onChange={(event) => {
                                        setPassword(
                                            event.target.value
                                        );

                                        clearFieldError("password");

                                        /*
                                         * También limpiamos el error de
                                         * confirmación porque depende de
                                         * la contraseña principal.
                                         */
                                        if (confirmPassword !== "") {
                                            clearFieldError(
                                                "confirmPassword"
                                            );
                                        }
                                    }}
                                />

                                {/* Error de contraseña */}
                                {errors.password && (
                                    <span className="error-message">
                                        {errors.password}
                                    </span>
                                )}
                            </div>

                            {!isRegister && (
                                <div className="forgot-password-container">
                                    <Link to="/recuperar-password">
                                        ¿Olvidaste tu contraseña?
                                    </Link>
                                </div>
                            )}

                            {/* Confirmar contraseña: solo aparece en registro */}
                            {isRegister && (
                                <div className="form-group">
                                    <label htmlFor="confirmPassword">
                                        Confirmar contraseña
                                    </label>

                                    <input
                                        type="password"
                                        id="confirmPassword"
                                        maxLength={72}
                                        className={errors.confirmPassword ? "input-error" : ""}
                                        placeholder="Repite tu contraseña"
                                        value={confirmPassword}
                                        onChange={(event) => {
                                            setConfirmPassword(
                                                event.target.value
                                            );

                                            clearFieldError(
                                                "confirmPassword"
                                            );
                                        }}
                                    />

                                    {/* Error de confirmación */}
                                    {errors.confirmPassword && (
                                        <span className="error-message">
                                            {errors.confirmPassword}
                                        </span>
                                    )}
                                </div>
                            )}

                            {isRegister && (
                                <fieldset className="login-legal-consents">
                                    <legend>Condiciones necesarias</legend>
                                    <label>
                                        <input type="checkbox" checked={aceptaTerminos} onChange={(event) => {
                                            setAceptaTerminos(event.target.checked);
                                            clearFieldError("aceptaTerminos");
                                        }} />
                                        <span>He leído y acepto los <Link to="/legal/terminos" target="_blank">Términos y Condiciones</Link>.</span>
                                    </label>
                                    {errors.aceptaTerminos && <span className="error-message">{errors.aceptaTerminos}</span>}
                                    <label>
                                        <input type="checkbox" checked={aceptaPrivacidad} onChange={(event) => {
                                            setAceptaPrivacidad(event.target.checked);
                                            clearFieldError("aceptaPrivacidad");
                                        }} />
                                        <span>Declaro haber leído la <Link to="/legal/privacidad" target="_blank">Política de Privacidad</Link> aplicable a mi cuenta.</span>
                                    </label>
                                    {errors.aceptaPrivacidad && <span className="error-message">{errors.aceptaPrivacidad}</span>}
                                </fieldset>
                            )}

                            {serverMessage && (
                                <div
                                    className="auth-server-message"
                                    role="alert"
                                >
                                    {serverMessage}
                                </div>
                            )}

                            {/* Botón principal */}
                            <button
                                type="submit"
                                className="login-submit-button"
                                disabled={isSubmitting}
                            >
                                <span className="login-submit-icon">
                                    {isRegister
                                        ? <FaUserPlus />
                                        : <FaSignInAlt />}
                                </span>

                                <span className="login-submit-text">
                                    {isSubmitting
                                        ? "Procesando..."
                                        : isRegister
                                            ? "Registrarme"
                                            : "Ingresar"}
                                </span>
                            </button>

                            {/* Cambiar entre login y registro */}
                            <p className="toggle-form-text">
                                {isRegister
                                    ? "¿Ya tienes una cuenta?"
                                    : "¿No tienes una cuenta?"}{" "}
                                <span 
                                    role="button" 
                                    tabIndex={0} 
                                    onClick={handleToggleForm}
                                    onKeyDown={(e) => e.key === "Enter" && handleToggleForm()}
                                >
                                    {isRegister ? "Inicia sesión" : "Regístrate aquí"}
                                </span>
                            </p>

                            {/* Separador */}
                            <div className="login-separator">
                                <span>o</span>
                            </div>

                            {/* Autenticación con Google */}
                            <GoogleAuthButton
                                onSuccess={handleGoogleSuccess}
                                onError={handleGoogleError}
                                canAuthenticate={
                                    !isRegister ||
                                    (aceptaTerminos && aceptaPrivacidad)
                                }
                            />
                        </form>
                    </div>
                </section>
        </main>
    );
}

export default Login;
