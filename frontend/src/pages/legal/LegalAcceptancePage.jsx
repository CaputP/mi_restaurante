import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { LEGAL_VERSIONS } from "../../config/legal.config";
import { getHomePathByRole } from "../../utils/roleRoutes";
import "./legal.css";

function LegalAcceptancePage() {
    const { usuario, isAuthenticated, isLoadingSession, acceptLegalPolicies } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [terms, setTerms] = useState(false);
    const [privacy, setPrivacy] = useState(false);
    const [error, setError] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    if (isLoadingSession) return <main className="legal-page"><p>Comprobando sesión...</p></main>;
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    if (!usuario.requiereAceptacionLegal) {
        return <Navigate to={getHomePathByRole(usuario.rol.codigo, usuario.permisos)} replace />;
    }

    async function handleSubmit(event) {
        event.preventDefault();
        if (!terms || !privacy) {
            setError("Debes revisar y marcar ambas declaraciones para continuar.");
            return;
        }
        setIsSaving(true);
        try {
            const updated = await acceptLegalPolicies({
                aceptaTerminos: true,
                versionTerminos: LEGAL_VERSIONS.terms,
                aceptaPrivacidad: true,
                versionPrivacidad: LEGAL_VERSIONS.privacy
            });
            const requestedPath = location.state?.from;
            navigate(
                typeof requestedPath === "string" && requestedPath.startsWith("/") && !requestedPath.startsWith("//")
                    ? requestedPath
                    : getHomePathByRole(updated.rol.codigo, updated.permisos),
                { replace: true }
            );
        } catch (requestError) {
            setError(requestError.message ?? "No se pudo registrar la aceptación.");
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <main className="legal-page">
            <article className="legal-card legal-acceptance-card">
                <span className="legal-eyebrow">Actualización necesaria</span>
                <h1>Revisa las condiciones vigentes</h1>
                <p>Para seguir usando los módulos protegidos necesitamos dejar constancia de que recibiste la información vigente. Esto no autoriza publicidad.</p>
                {error && <div className="legal-form-message" role="alert">{error}</div>}
                <form onSubmit={handleSubmit} className="legal-acceptance-form">
                    <label><input type="checkbox" checked={terms} onChange={(event) => setTerms(event.target.checked)} /><span>He leído y acepto los <Link to="/legal/terminos" target="_blank">Términos y Condiciones</Link>.</span></label>
                    <label><input type="checkbox" checked={privacy} onChange={(event) => setPrivacy(event.target.checked)} /><span>Declaro haber leído la <Link to="/legal/privacidad" target="_blank">Política de Privacidad</Link>.</span></label>
                    <button type="submit" className="legal-action" disabled={isSaving}>{isSaving ? "Guardando..." : "Aceptar y continuar"}</button>
                </form>
            </article>
        </main>
    );
}

export default LegalAcceptancePage;
