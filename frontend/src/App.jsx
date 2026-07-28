//==================================
// IMPORTAMOS HOME
//==================================

import {BrowserRouter, Routes, Route} from "react-router-dom"
import Home from "./pages/home"
import Login from "./pages/login/login"
import Register from "./pages/register/register"
import Reservations from "./pages/reservations/reservations"
import AdminLayout from "./layouts/AdminLayout";
import Admin from "./pages/admin/admin";
import AdminPlaceholder from "./pages/admin/AdminPlaceholder";
import ProtectedRoute from "./routes/ProtectedRoute";
import CatalogAdmin from "./pages/admin/catalog/CatalogAdmin";
import InventoryAdmin from "./pages/admin/inventory/InventoryAdmin";
import UsersAdmin from "./pages/admin/users/UsersAdmin";
import ReservationsAdmin from "./pages/admin/reservations/ReservationsAdmin";

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
                    <AdminLayout />
                </ProtectedRoute>
            }
        >
            <Route index element={<Admin />} />

            <Route
                path="reservas"
                element={<ReservationsAdmin />}
            />

            <Route
                path="pedidos"
                element={
                    <AdminPlaceholder
                        title="Gestión de pedidos"
                        description="Aquí se administrarán los pedidos, comandas, cocina, bar y entregas parciales."
                    />
                }
            />

            <Route
                path="ventas"
                element={
                    <AdminPlaceholder
                        title="Ventas y caja"
                        description="Aquí se administrarán las ventas, pagos, comprobantes, aperturas, cierres y movimientos de caja."
                    />
                }
            />

            <Route
                path="productos"
                element={<CatalogAdmin />}
            />

            <Route
                path="inventario"
                element={<InventoryAdmin />}
            />

            <Route
                path="usuarios"
                element={<UsersAdmin />}
            />

            <Route
                path="sucursales"
                element={
                    <AdminPlaceholder
                        title="Sucursales"
                        description="Aquí se administrarán las sucursales, zonas de atención y asignación de trabajadores."
                    />
                }
            />

            <Route
                path="reportes"
                element={
                    <AdminPlaceholder
                        title="Reportes"
                        description="Aquí se mostrarán los reportes de ventas, reservas, inventario, productos y caja."
                    />
                }
            />

            <Route
                path="configuracion"
                element={
                    <AdminPlaceholder
                        title="Configuración"
                        description="Aquí se configurarán los datos del negocio, métodos de pago, correlativos y parámetros del sistema."
                    />
                }
            />
        </Route>

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