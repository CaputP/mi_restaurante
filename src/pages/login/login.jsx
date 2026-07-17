import { FaSignInAlt } from "react-icons/fa";
import { useState } from "react";
import "./login.css"
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

function Login() {
    const googleClientId = "949837373074-ogp692j5frscosvnrgcckep6kuueld9.apps.googleusercontent.com";
    const handleGoogleSuccess = (credentialResponse) => {
        console.log("Token JWT de Google recibido:", credentialResponse.credential);
        // Aquí puedes enviar este token a tu base de datos o backend para validar al usuario
    };
    const handleGoogleError = () => {
        console.log("Error al autenticar con Google");
    };
    
    const [correo, setCorreo] = useState("")
    const [password, setPassword] = useState("")

    function handleSubmit(event) {
        event.preventDefault()

        console.log("correo", correo)
        console.log("password", password)
    }
    return (
        <GoogleOAuthProvider clientId={googleClientId}>
            <main className="login-page">
                <section className="login-container">
                    <div className="login-image">
                        <div className="login-image-overlay">
                            <h2>El Vallecito de Chocco</h2>
                            <p>Bienvenido a nuestro sistema</p>
                        </div>
                    </div>

                    <div className="login-content">
                        <form className="login-form" onSubmit={handleSubmit}>
                            <h1>Iniciar sesión</h1>
                            <p className="login-subtitle">
                                Ingresa tus datos para acceder al sistema
                            </p>

                            <div className="form-group">
                                <label htmlFor="correo">Correo electrónico</label>
                                <input
                                    type="email"
                                    id="correo"
                                    placeholder="ejemplo@gmail.com"
                                    value={correo}
                                    onChange={(event) => setCorreo(event.target.value)}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="password">Contraseña</label>
                                <input
                                    type="password"
                                    id="password"
                                    placeholder="Ingresa tu contraseña"
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                />
                            </div>
                            {/* Agregado tu icono FaSignInAlt importado para que el botón se vea genial */}
                            <button type="submit">
                                <FaSignInAlt /> Ingresar
                            </button>

                            {/* 1. AGREGA ESTE SEPARADOR */}
                            <div className="login-separator">
                                <span>o</span>
                            </div>

                            {/* 2. AGREGA EL BOTÓN OFICIAL AQUÍ */}
                            <div className="google-btn-container">
                                <GoogleLogin
                                    onSuccess={handleGoogleSuccess}
                                    onError={handleGoogleError}
                                    theme="outline"
                                    size="large"
                                    text="signin_with"
                                    width="360"
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