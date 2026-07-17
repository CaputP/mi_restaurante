import { FaSignInAlt, FaUserPlus } from "react-icons/fa";
import { useState } from "react";
import "./login.css"
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import logo from "../../assets/images/logo.png"

function Login() {
    const googleClientId = "949837373074-ogp692j5frscosvncrgcckep6kuueld9.apps.googleusercontent.com";
    
    // Estado para alternar entre Login y Registro
    const [isRegister, setIsRegister] = useState(false);
    
    // Estados para los campos del formulario
    const [nombre, setNombre] = useState("");
    const [correo, setCorreo] = useState("");
    const [password, setPassword] = useState("");

    const handleGoogleSuccess = (credentialResponse) => {
        console.log("Token JWT de Google recibido:", credentialResponse.credential);
        // Recuerda que con Google, el registro y login son automáticos en el backend
    };

    const handleGoogleError = () => {
        console.log("Error al autenticar con Google");
    };
    
    function handleSubmit(event) {
        event.preventDefault();
        if (isRegister) {
            console.log("Registrando usuario clásico...");
            console.log("Nombre:", nombre);
            console.log("Correo:", correo);
            console.log("Password:", password);
            // Aquí enviarías los datos a tu endpoint de registro (ej. /api/auth/register)
        } else {
            console.log("Iniciando sesión clásica...");
            console.log("Correo:", correo);
            console.log("Password:", password);
            // Aquí enviarías los datos a tu endpoint de login (ej. /api/auth/login)
        }
    }

    return (
        <GoogleOAuthProvider clientId={googleClientId}>
            <main className="login-page">
                <section className="login-container">
                    
                    {/* Panel Izquierdo (Se mantiene idéntico y elegante) */}
                    <div className="login-image">
                        <div className="login-image-overlay">
                            <div className="login-sidebar-logo">
                                <img src={logo} alt="Logo El Vallecito de Chocco" />
                            </div>
                            <h2>Bienvenido de nuevo</h2>
                            <p>Bienvenido a nuestro sistema</p>
                        </div>
                    </div>

                    {/* Panel Derecho (Dinámico) */}
                    <div className="login-content">
                        <form className="login-form" onSubmit={handleSubmit}>
                            
                            {/* Títulos dinámicos según el estado */}
                            <h1>{isRegister ? "Crear cuenta" : "Iniciar sesión"}</h1>
                            <p className="login-subtitle">
                                {isRegister 
                                    ? "Regístrate para gestionar tus pedidos" 
                                    : "Ingresa tus datos para acceder al sistema"
                                }
                            </p>

                            {/* CAMPO DINÁMICO: Solo se muestra si está en modo registro */}
                            {isRegister && (
                                <div className="form-group">
                                    <label htmlFor="nombre">Nombre completo</label>
                                    <input
                                        type="text"
                                        id="nombre"
                                        placeholder="Tu nombre y apellido"
                                        value={nombre}
                                        onChange={(event) => setNombre(event.target.value)}
                                        required
                                    />
                                </div>
                            )}

                            <div className="form-group">
                                <label htmlFor="correo">Correo electrónico</label>
                                <input
                                    type="email"
                                    id="correo"
                                    placeholder="ejemplo@gmail.com"
                                    value={correo}
                                    onChange={(event) => setCorreo(event.target.value)}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="password">Contraseña</label>
                                <input
                                    type="password"
                                    id="password"
                                    placeholder={isRegister ? "Crea una contraseña segura" : "Ingresa tu contraseña"}
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    required
                                />
                            </div>

                            {/* Botón principal dinámico con su respectivo icono */}
                            <button type="submit">
                                {isRegister ? (
                                    <>
                                        <FaUserPlus /> Registrarme
                                    </>
                                ) : (
                                    <>
                                        <FaSignInAlt /> Ingresar
                                    </>
                                )}
                            </button>

                            {/* Enlace para alternar entre Login y Registro */}
                            <p className="toggle-form-text">
                                {isRegister ? "¿Ya tienes una cuenta?" : "¿No tienes una cuenta?"}{" "}
                                <span onClick={() => setIsRegister(!isRegister)}>
                                    {isRegister ? "Inicia sesión" : "Regístrate aquí"}
                                </span>
                            </p>

                            <div className="login-separator">
                                <span>o</span>
                            </div>

                            <div className="google-btn-container">
                                <GoogleLogin
                                    onSuccess={handleGoogleSuccess}
                                    onError={handleGoogleError}
                                    theme="outline"
                                    size="large"
                                    text={isRegister ? "signup_with" : "signin_with"} // Google cambia el texto automáticamente a "Registrarse con Google"
                                    width="360px"
                                />
                            </div>
                        </form>
                    </div>
                </section>
            </main>
        </GoogleOAuthProvider>
    );
}

export default Login;