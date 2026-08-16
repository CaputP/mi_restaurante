import {
    lazy
} from "react";
import {
    Navigate,
    useRoutes
} from "react-router-dom";

import ProtectedRoute from "./ProtectedRoute";

const Home = lazy(() =>
    import("../pages/home")
);
const Login = lazy(() =>
    import("../pages/login/login")
);
const Reservations = lazy(() =>
    import("../pages/reservations/reservations")
);
const ReservationPaymentReceiptPage = lazy(() =>
    import("../pages/reservations/ReservationPaymentReceiptPage")
);
const ClientLoyalty = lazy(() =>
    import("../pages/client/loyalty/ClientLoyalty")
);
const ClientLoyaltyLayout = lazy(() =>
    import("../pages/client/loyalty/ClientLoyaltyLayout")
);
const ClientLoyaltyPrograms = lazy(() =>
    import("../pages/client/loyalty/ClientLoyaltyPrograms")
);
const ClientPromotions = lazy(() =>
    import("../pages/client/loyalty/ClientPromotions")
);
const ClientReviews = lazy(() =>
    import("../pages/client/reviews/ClientReviews")
);
const ForgotPassword = lazy(() =>
    import("../pages/authActions/ForgotPassword")
);
const ResetPassword = lazy(() =>
    import("../pages/authActions/ResetPassword")
);
const VerifyEmail = lazy(() =>
    import("../pages/authActions/VerifyEmail")
);
const NotFound = lazy(() =>
    import("../pages/notFound/NotFound")
);
const LegalDocumentPage = lazy(() =>
    import("../pages/legal/LegalDocumentPage")
);
const ConsumerClaimsPage = lazy(() =>
    import("../pages/legal/ConsumerClaimsPage")
);
const LegalAcceptancePage = lazy(() =>
    import("../pages/legal/LegalAcceptancePage")
);

const AdminLayout = lazy(() =>
    import("../layouts/AdminLayout")
);
const Admin = lazy(() =>
    import("../pages/admin/admin")
);
const ReservationsAdmin = lazy(() =>
    import("../pages/admin/reservations/ReservationsAdmin")
);
const OrdersAdmin = lazy(() =>
    import("../pages/admin/orders/OrdersAdmin")
);
const CommandsAdmin = lazy(() =>
    import("../pages/admin/commands/CommandsAdmin")
);
const DeliveriesAdmin = lazy(() =>
    import("../pages/admin/deliveries/DeliveriesAdmin")
);
const SalesCashAdmin = lazy(() =>
    import("../pages/admin/sales/SalesCashAdmin")
);
const SaleTicketPage = lazy(() =>
    import("../pages/admin/sales/SaleTicketPage")
);
const VoidSalePage = lazy(() =>
    import("../pages/admin/sales/VoidSalePage")
);
const CatalogAdmin = lazy(() =>
    import("../pages/admin/catalog/CatalogAdmin")
);
const InventoryAdmin = lazy(() =>
    import("../pages/admin/inventory/InventoryAdmin")
);
const UsersAdmin = lazy(() =>
    import("../pages/admin/users/UsersAdmin")
);
const RolesAdmin = lazy(() =>
    import("../pages/admin/roles/RolesAdmin")
);
const BranchAvailabilityAdmin = lazy(() =>
    import("../pages/admin/branches/BranchAvailabilityAdmin")
);
const BranchesAdmin = lazy(() =>
    import("../pages/admin/branches/BranchesAdmin")
);
const ReportsAdmin = lazy(() =>
    import("../pages/admin/reports/ReportsAdmin")
);
const LoyaltyLayout = lazy(() =>
    import("../pages/admin/loyalty/LoyaltyLayout")
);
const LoyaltyAdmin = lazy(() =>
    import("../pages/admin/loyalty/LoyaltyAdmin")
);
const LoyaltyCustomersAdmin = lazy(() =>
    import("../pages/admin/loyalty/LoyaltyCustomersAdmin")
);
const PromotionsAdmin = lazy(() =>
    import("../pages/admin/promotions/PromotionsAdmin")
);
const SettingsAdmin = lazy(() =>
    import("../pages/admin/settings/SettingsAdmin")
);
const BackupsAdmin = lazy(() =>
    import("../pages/admin/backups/BackupsAdmin")
);
const ConsumerClaimsAdmin = lazy(() =>
    import("../pages/admin/claims/ConsumerClaimsAdmin")
);
const ReviewsAdmin = lazy(() =>
    import("../pages/admin/reviews/ReviewsAdmin")
);

const OperationalLayout = lazy(() =>
    import("../layouts/OperationalLayout")
);
const OperationHome = lazy(() =>
    import("../pages/operation/OperationHome")
);

const ADMIN_ROLES = [
    "ADMINISTRADOR_GENERAL",
    "ADMINISTRADOR_SUCURSAL"
];

const OPERATIONAL_ROLES = [
    ...ADMIN_ROLES,
    "VENDEDOR",
    "MOZO",
    "COCINA"
];

function protect(
    element,
    allowedRoles = [],
    requiredPermissions = []
) {
    return (
        <ProtectedRoute
            allowedRoles={allowedRoles}
            requiredPermissions={requiredPermissions}
        >
            {element}
        </ProtectedRoute>
    );
}

const routes = [
    {
        path: "/",
        element: <Home />
    },
    {
        path: "/login",
        element: <Login />
    },
    {
        path: "/register",
        element: (
            <Navigate
                to="/login?mode=register"
                replace
            />
        )
    },
    {
        path: "/reservations",
        element: protect(
            <Reservations />,
            ["CLIENTE"],
            ["RESERVA_CREAR"]
        )
    },
    {
        path: "/reservations/:reservationId/payments/:paymentId/receipt",
        element: protect(
            <ReservationPaymentReceiptPage />,
            ["CLIENTE"],
            ["CLIENTE_HISTORIAL_VER"]
        )
    },
    {
        path: "/fidelizacion",
        element: protect(
            <ClientLoyaltyLayout />,
            ["CLIENTE"],
            ["CLIENTE_PREMIOS_VER"]
        ),
        children: [
            {
                index: true,
                element: <ClientLoyalty />
            },
            {
                path: "programas",
                element: <ClientLoyaltyPrograms />
            },
            {
                path: "promociones",
                element: <ClientPromotions />
            }
        ]
    },
    {
        path: "/opiniones",
        element: protect(
            <ClientReviews />,
            ["CLIENTE"],
            ["CLIENTE_HISTORIAL_VER"]
        )
    },
    {
        path: "/recuperar-password",
        element: <ForgotPassword />
    },
    {
        path: "/restablecer-password",
        element: <ResetPassword />
    },
    {
        path: "/verificar-correo",
        element: <VerifyEmail />
    },
    {
        path: "/legal/terminos",
        element: <LegalDocumentPage documentKey="terms" />
    },
    {
        path: "/legal/privacidad",
        element: <LegalDocumentPage documentKey="privacy" />
    },
    {
        path: "/legal/cookies",
        element: <LegalDocumentPage documentKey="cookies" />
    },
    {
        path: "/legal/reservas-cancelaciones",
        element: <LegalDocumentPage documentKey="reservations" />
    },
    {
        path: "/libro-de-reclamaciones",
        element: <ConsumerClaimsPage />
    },
    {
        path: "/aceptar-politicas",
        element: <LegalAcceptancePage />
    },
    {
        path: "/admin",
        element: protect(
            <AdminLayout />,
            ADMIN_ROLES
        ),
        children: [
            {
                index: true,
                element: protect(
                    <Admin />,
                    ADMIN_ROLES,
                    ["DASHBOARD_VER"]
                )
            },
            {
                path: "reservas",
                element: protect(
                    <ReservationsAdmin />,
                    ADMIN_ROLES,
                    ["RESERVA_CREAR"]
                )
            },
            {
                path: "reservas/:reservationId/pagos/:paymentId/constancia",
                element: protect(
                    <ReservationPaymentReceiptPage />,
                    ADMIN_ROLES,
                    ["RESERVA_CREAR"]
                )
            },
            {
                path: "pedidos",
                element: protect(
                    <OrdersAdmin />,
                    ADMIN_ROLES,
                    ["PEDIDO_VER"]
                )
            },
            {
                path: "comandas",
                element: protect(
                    <CommandsAdmin />,
                    ADMIN_ROLES,
                    ["COMANDA_VER"]
                )
            },
            {
                path: "entregas",
                element: protect(
                    <DeliveriesAdmin />,
                    ADMIN_ROLES,
                    ["ENTREGA_REGISTRAR"]
                )
            },
            {
                path: "ventas",
                element: protect(
                    <SalesCashAdmin />,
                    ADMIN_ROLES,
                    ["VENTA_CREAR"]
                )
            },
            {
                path: "ventas/ticket/:saleId",
                element: protect(
                    <SaleTicketPage />,
                    ADMIN_ROLES,
                    ["VENTA_CREAR"]
                )
            },
            {
                path: "ventas/anular/:saleId",
                element: protect(
                    <VoidSalePage />,
                    ADMIN_ROLES,
                    ["VENTA_ANULAR"]
                )
            },
            {
                path: "productos",
                element: protect(
                    <CatalogAdmin />,
                    ADMIN_ROLES,
                    ["PRODUCTO_GESTIONAR"]
                )
            },
            {
                path: "inventario",
                element: protect(
                    <InventoryAdmin />,
                    ADMIN_ROLES,
                    ["INVENTARIO_VER"]
                )
            },
            {
                path: "usuarios",
                element: protect(
                    <UsersAdmin />,
                    ADMIN_ROLES,
                    ["USUARIO_GESTIONAR"]
                )
            },
            {
                path: "roles",
                element: protect(
                    <RolesAdmin />,
                    ["ADMINISTRADOR_GENERAL"],
                    ["ROL_GESTIONAR"]
                )
            },
            {
                path: "sucursales/:branchId/disponibilidad",
                element: protect(
                    <BranchAvailabilityAdmin />,
                    ADMIN_ROLES,
                    ["SUCURSAL_GESTIONAR"]
                )
            },
            {
                path: "sucursales",
                element: protect(
                    <BranchesAdmin />,
                    [
                        "ADMINISTRADOR_GENERAL"
                    ],
                    ["SUCURSAL_GESTIONAR"]
                )
            },
            {
                path: "reportes",
                element: protect(
                    <ReportsAdmin />,
                    ADMIN_ROLES,
                    ["REPORTE_VER"]
                )
            },
            {
                path: "fidelizacion",
                element: protect(
                    <LoyaltyLayout />,
                    ADMIN_ROLES,
                    ["FIDELIZACION_GESTIONAR"]
                ),
                children: [
                    {
                        index: true,
                        element: <LoyaltyAdmin />
                    },
                    {
                        path: "clientes",
                        element: <LoyaltyCustomersAdmin />
                    }
                ]
            },
            {
                path: "promociones",
                element: protect(
                    <PromotionsAdmin />,
                    ADMIN_ROLES,
                    ["PROMOCION_GESTIONAR"]
                )
            },
            {
                path: "configuracion",
                element: protect(
                    <SettingsAdmin />,
                    ADMIN_ROLES,
                    ["CONFIGURACION_GESTIONAR"]
                )
            },
            {
                path: "respaldos",
                element: protect(
                    <BackupsAdmin />,
                    ["ADMINISTRADOR_GENERAL"],
                    ["RESPALDO_GESTIONAR"]
                )
            },
            {
                path: "reclamaciones",
                element: protect(
                    <ConsumerClaimsAdmin />,
                    ADMIN_ROLES,
                    ["RECLAMO_GESTIONAR"]
                )
            },
            {
                path: "resenas",
                element: protect(
                    <ReviewsAdmin />,
                    ADMIN_ROLES,
                    ["RESENA_GESTIONAR"]
                )
            }
        ]
    },
    {
        path: "/operacion",
        element: protect(
            <OperationalLayout />,
            OPERATIONAL_ROLES
        ),
        children: [
            {
                index: true,
                element: <OperationHome />
            },
            {
                path: "pedidos",
                element: protect(
                    <OrdersAdmin />,
                    [
                        ...ADMIN_ROLES,
                        "VENDEDOR"
                    ],
                    ["PEDIDO_VER"]
                )
            },
            {
                path: "cocina",
                element: protect(
                    <CommandsAdmin />,
                    [
                        ...ADMIN_ROLES,
                        "COCINA"
                    ],
                    ["COMANDA_VER"]
                )
            },
            {
                path: "entregas",
                element: protect(
                    <DeliveriesAdmin />,
                    [
                        ...ADMIN_ROLES,
                        "MOZO"
                    ],
                    ["ENTREGA_REGISTRAR"]
                )
            },
            {
                path: "ventas",
                element: protect(
                    <SalesCashAdmin />,
                    [
                        ...ADMIN_ROLES,
                        "VENDEDOR"
                    ],
                    ["VENTA_CREAR"]
                )
            },
            {
                path: "ventas/ticket/:saleId",
                element: protect(
                    <SaleTicketPage />,
                    [
                        ...ADMIN_ROLES,
                        "VENDEDOR"
                    ],
                    ["VENTA_CREAR"]
                )
            },
            {
                path: "ventas/anular/:saleId",
                element: protect(
                    <VoidSalePage />,
                    [
                        ...ADMIN_ROLES,
                        "VENDEDOR"
                    ],
                    ["VENTA_ANULAR"]
                )
            }
        ]
    },
    {
        path: "*",
        element: <NotFound />
    }
];

function AppRoutes() {
    return useRoutes(routes);
}

export default AppRoutes;
