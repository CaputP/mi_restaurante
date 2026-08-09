import {
    Suspense
} from "react";
import {
    BrowserRouter
} from "react-router-dom";

import AppRoutes from "./routes/AppRoutes";
import CookieBanner from "./components/legal/CookieBanner";

function PageLoader() {
    return (
        <main
            aria-busy="true"
            aria-live="polite"
            style={{
                display: "grid",
                minHeight: "100vh",
                placeItems: "center",
                padding: "2rem"
            }}
        >
            <p>Cargando módulo...</p>
        </main>
    );
}

function App() {
    return (
        <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
                <AppRoutes />
            </Suspense>
            <CookieBanner />
        </BrowserRouter>
    );
}

export default App;
