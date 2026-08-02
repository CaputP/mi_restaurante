//==================================
// IMPORTACION
//==================================

import OperationalLayout from "./layouts/OperationalLayout";
import OperationHome from "./pages/operation/OperationHome";

import LoyaltyAdmin from "./pages/admin/loyalty/LoyaltyAdmin";

import LoyaltyCustomersAdmin from "./pages/admin/loyalty/LoyaltyCustomersAdmin";

import PromotionsAdmin from "./pages/admin/promotions/PromotionsAdmin";

//==================================
// IMPORTACION ADMIN
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
import OrdersAdmin from "./pages/admin/orders/OrdersAdmin";
import CommandsAdmin from "./pages/admin/commands/CommandsAdmin";   
import DeliveriesAdmin from "./pages/admin/deliveries/DeliveriesAdmin";
import SalesCashAdmin from "./pages/admin/sales/SalesCashAdmin";
import ReportsAdmin from "./pages/admin/reports/ReportsAdmin";
import BranchesAdmin from "./pages/admin/branches/BranchesAdmin";
import BranchAvailabilityAdmin from "./pages/admin/branches/BranchAvailabilityAdmin";
import SettingsAdmin from "./pages/admin/settings/SettingsAdmin";

import VoidSalePage from "./pages/admin/sales/VoidSalePage";

import SaleTicketPage from "./pages/admin/sales/SaleTicketPage";

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
                element={<OrdersAdmin />}
            />

            <Route
                path="comandas"
                element={<CommandsAdmin />}
            />

            <Route
                path="entregas"
                element={<DeliveriesAdmin />}
            />

            <Route
                path="ventas"
                element={<SalesCashAdmin />}
            />

            <Route
                path="ventas/ticket/:saleId"
                element={<SaleTicketPage />}
            />

            <Route
                path="ventas/anular/:saleId"
                element={<VoidSalePage />}
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
                path="sucursales/:branchId/disponibilidad"
                element={
                    <BranchAvailabilityAdmin />
                }
            />

            <Route
                path="sucursales"
                element={
                    <ProtectedRoute
                        allowedRoles={[
                            "ADMINISTRADOR_GENERAL"
                        ]}
                    >
                        <BranchesAdmin />
                    </ProtectedRoute>
                }
            />

            <Route
                path="reportes"
                element={<ReportsAdmin />}
            />

            <Route
                path="fidelizacion"
                element={
                    <LoyaltyAdmin />
                }
            />

            <Route
                path="fidelizacion/clientes"
                element={
                    <LoyaltyCustomersAdmin />
                }
            />

            <Route
                path="promociones"
                element={
                    <PromotionsAdmin />
                }
            />

            <Route
                path="configuracion"
                element={<SettingsAdmin />}
            />

        </Route>

        <Route
            path="/operacion"
            element={
                <ProtectedRoute
                    allowedRoles={[
                        "ADMINISTRADOR_GENERAL",
                        "ADMINISTRADOR_SUCURSAL",
                        "VENDEDOR",
                        "MOZO",
                        "COCINA"
                    ]}
                >
                    <OperationalLayout />
                </ProtectedRoute>
            }
        >
            <Route
                index
                element={
                    <OperationHome />
                }
            />

            <Route
                path="pedidos"
                element={
                    <ProtectedRoute
                        allowedRoles={[
                            "ADMINISTRADOR_GENERAL",
                            "ADMINISTRADOR_SUCURSAL",
                            "VENDEDOR"
                        ]}
                    >
                        <OrdersAdmin />
                    </ProtectedRoute>
                }
            />

            <Route
                path="cocina"
                element={
                    <ProtectedRoute
                        allowedRoles={[
                            "ADMINISTRADOR_GENERAL",
                            "ADMINISTRADOR_SUCURSAL",
                            "COCINA"
                        ]}
                    >
                        <CommandsAdmin />
                    </ProtectedRoute>
                }
            />

            <Route
                path="entregas"
                element={
                    <ProtectedRoute
                        allowedRoles={[
                            "ADMINISTRADOR_GENERAL",
                            "ADMINISTRADOR_SUCURSAL",
                            "MOZO"
                        ]}
                    >
                        <DeliveriesAdmin />
                    </ProtectedRoute>
                }
            />

            <Route
                path="ventas"
                element={
                    <ProtectedRoute
                        allowedRoles={[
                            "ADMINISTRADOR_GENERAL",
                            "ADMINISTRADOR_SUCURSAL",
                            "VENDEDOR"
                        ]}
                    >
                        <SalesCashAdmin />
                    </ProtectedRoute>
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