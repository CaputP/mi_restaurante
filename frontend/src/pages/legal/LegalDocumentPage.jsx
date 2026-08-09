import { Link } from "react-router-dom";
import { LEGAL_CONFIGURATION_COMPLETE, LEGAL_PROVIDER } from "../../config/legal.config";
import { legalDocuments } from "./legalDocuments";
import "./legal.css";

function LegalDocumentPage({ documentKey }) {
    const document = legalDocuments[documentKey];

    return (
        <main className="legal-page">
            <article className="legal-card">
                <nav className="legal-back" aria-label="Navegación legal">
                    <Link to="/">← Volver al inicio</Link>
                    <Link to="/libro-de-reclamaciones">Libro de Reclamaciones</Link>
                </nav>

                {!LEGAL_CONFIGURATION_COMPLETE && (
                    <div className="legal-warning" role="alert">
                        La identidad legal, RUC o correo oficial aún deben configurarse antes del despliegue público.
                    </div>
                )}

                <header>
                    <span className="legal-eyebrow">Información legal</span>
                    <h1>{document.title}</h1>
                    <p><strong>Versión:</strong> {document.version} · <strong>Vigente desde:</strong> 8 de agosto de 2026</p>
                    <p>{document.intro}</p>
                </header>

                {document.sections.map((section) => (
                    <section key={section.title}>
                        <h2>{section.title}</h2>
                        {section.paragraphs?.map((paragraph) => (
                            <p key={paragraph}>{paragraph}</p>
                        ))}
                        {section.bullets && (
                            <ul>
                                {section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
                            </ul>
                        )}
                        {section.action === "cookies" && (
                            <button
                                type="button"
                                className="legal-action"
                                onClick={() => globalThis.dispatchEvent(new Event("vallecito:open-cookie-settings"))}
                            >
                                Configurar cookies
                            </button>
                        )}
                    </section>
                ))}

                <footer className="legal-provider">
                    <strong>{LEGAL_PROVIDER.tradeName}</strong>
                    <span>{LEGAL_PROVIDER.legalName} · RUC {LEGAL_PROVIDER.ruc}</span>
                    <span>{LEGAL_PROVIDER.address} · {LEGAL_PROVIDER.email} · {LEGAL_PROVIDER.phone}</span>
                </footer>
            </article>
        </main>
    );
}

export default LegalDocumentPage;
