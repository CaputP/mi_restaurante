import { FaSignInAlt, FaUserPlus } from "react-icons/fa";
import { useState } from "react";
import GoogleAuthButton from "./GoogleAuthButton";
import "./login.css";
import logo from "../../assets/images/logo.png";

// Importamos la función de validación
import { validateAuthForm } from "./validations";

function Login() {

    // Estado para alternar entre iniciar sesión y registrarse
    const [isRegister, setIsRegister] = useState(false);

    // Estados de los campos del formulario
    const [nombre, setNombre] = useState("");
    const [correo, setCorreo] = useState("");
    const [telefono, setTelefono] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    // Estado que almacena los mensajes de error
    const [errors, setErrors] = useState({
        nombre: "",
        correo: "",
        telefono: "",
        password: "",
        confirmPassword: ""
    });

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
            confirmPassword: ""
        });

        // Limpiamos los campos por seguridad
        setPassword("");
        setConfirmPassword("");
        setNombre("");
        setCorreo("");
        setTelefono("");
    }

    /*
     * Se ejecuta cuando Google autentica
     * correctamente al usuario.
     */
    const handleGoogleSuccess = (credentialResponse) => {
        console.log(
            "Token JWT de Google recibido:",
            credentialResponse.credential
        );

        // Posteriormente enviaremos este token al backend
    };

    /*
     * Se ejecuta cuando ocurre un error
     * durante la autenticación con Google.
     */
    const handleGoogleError = () => {
        console.log("Error al autenticar con Google");
    };

    /*
     * Controla el envío del formulario.
     *
     * 1. Evita que la página se recargue.
     * 2. Ejecuta las validaciones.
     * 3. Muestra los errores encontrados.
     * 4. Detiene el proceso si existen errores.
     * 5. Continúa con login o registro.
     */
    function handleSubmit(event) {
        event.preventDefault();

        // Validamos todos los campos
        const newErrors = validateAuthForm({
            isRegister,
            nombre,
            correo,
            telefono,
            password,
            confirmPassword
        });

        // Guardamos los errores para mostrarlos en pantalla
        setErrors(newErrors);

        // Verificamos si existe al menos un mensaje de error
        const hasErrors = Object.values(newErrors).some(
            (error) => error !== ""
        );

        // Si existe algún error, detenemos la función
        if (hasErrors) {
            return;
        }

        // Limpiamos los datos antes de enviarlos
        const nombreLimpio = nombre.trim();
        const correoLimpio = correo.trim().toLowerCase();
        const telefonoLimpio = telefono.trim();

        if (isRegister) {
            console.log("Registrando usuario clásico...");
            console.log("Nombre:", nombreLimpio);
            console.log("Correo:", correoLimpio);
            console.log("Teléfono:", telefonoLimpio);
            
            // Aquí irá posteriormente el fetch del registro
        } else {
            console.log("Iniciando sesión clásica...");
            console.log("Correo:", correoLimpio);
            

            // Aquí irá posteriormente el fetch del login
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

                            {/* Botón principal */}
                            <button type="submit" className="login-submit-button">
                                <span className="login-submit-icon">
                                    {isRegister ? <FaUserPlus /> : <FaSignInAlt />}
                                </span>

                                <span className="login-submit-text">
                                    {isRegister ? "Registrarme" : "Ingresar"}
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
                            />
                        </form>
                    </div>
                </section>
        </main>
    );
}

export default Login;