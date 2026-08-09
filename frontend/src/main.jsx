import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { AuthProvider } from "./context/AuthContext";
import { CookiePreferencesProvider } from "./context/CookiePreferencesContext";
import { RealtimeProvider } from "./context/RealtimeContext";

createRoot(document.getElementById("root")).render(
    <StrictMode>
        <CookiePreferencesProvider>
            <AuthProvider>
                <RealtimeProvider>
                    <App />
                </RealtimeProvider>
            </AuthProvider>
        </CookiePreferencesProvider>
    </StrictMode>
);
