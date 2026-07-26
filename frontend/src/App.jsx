//==================================
// IMPORTAMOS HOME
//==================================
import {BrowserRouter, Routes, Route} from "react-router-dom"
import Home from "./pages/home"
import Login from "./pages/login/login"
import Register from "./pages/register/register"
import Reservations from "./pages/reservations/reservations"
import Admin from "./pages/admin/admin"
import ProtectedRoute from "./routes/ProtectedRoute";

import ForgotPassword from "./pages/authActions/ForgotPassword";
import ResetPassword from "./pages/authActions/ResetPassword";
import VerifyEmail from "./pages/authActions/VerifyEmail";

//==================================
// COMPONENTE PRINCIPAL
//==================================

function App(){
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
            path="/reservations"
            element={
                <ProtectedRoute>
                    <Reservations />
                </ProtectedRoute>
            }
        />

        <Route
            path="/admin"
            element={
                <ProtectedRoute
                    allowedRoles={[
                        "ADMINISTRADOR_GENERAL",
                        "ADMINISTRADOR_SUCURSAL"
                    ]}
                >
                    <Admin />
                </ProtectedRoute>
            }
        />

        <Route
            path="/recuperar-password"
            element={<ForgotPassword />}
        />

        <Route
            path="/restablecer-password"
            element={<ResetPassword />}
        />

        <Route
            path="/verificar-correo"
            element={<VerifyEmail />}
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;