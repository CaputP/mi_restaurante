import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { LEGAL_PROVIDER, LEGAL_VERSIONS } from "../../config/legal.config";
import {
    createConsumerClaimRequest,
    getConsumerClaimOptionsRequest,
    getConsumerClaimReceiptRequest
} from "../../services/consumerClaim.service";
import "./legal.css";

const initialForm = {
    sucursalId: "",
    tipoDocumento: "DNI",
    numeroDocumento: "",
    nombreCompleto: "",
    domicilio: "",
    telefono: "",
    correo: "",
    esMenorEdad: false,
    nombreApoderado: "",
    tipo: "RECLAMO",
    bienContratado: "SERVICIO",
    descripcionBien: "",
    montoReclamado: "",
    detalle: "",
    pedidoConsumidor: "",
    canalRespuesta: "CORREO",
    aceptaPrivacidad: false
};

function ConsumerClaimsPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [form, setForm] = useState(initialForm);
    const [branches, setBranches] = useState([]);
    const [receipt, setReceipt] = useState(null);
    const [receiptAccess, setReceiptAccess] = useState(null);
    const [message, setMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const controller = new AbortController();
        getConsumerClaimOptionsRequest(controller.signal)
            .then(setBranches)
            .catch((error) => {
                if (error?.name !== "AbortError") setMessage(error.message);
            });

        const codigo = searchParams.get("codigo");
        const token = searchParams.get("token");
        if (codigo && token) {
            getConsumerClaimReceiptRequest(codigo, token, controller.signal)
                .then((record) => {
                    setReceipt(record);
                    setReceiptAccess({ codigo, token });
                })
                .catch((error) => {
                    if (error?.name !== "AbortError") setMessage(error.message);
                });
        }
        return () => controller.abort();
    }, [searchParams]);

    function updateField(event) {
        const { name, value, type, checked } = event.target;
        setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
        setMessage("");
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setIsSubmitting(true);
        setMessage("");
        try {
            const result = await createConsumerClaimRequest({
                ...form,
                montoReclamado: form.montoReclamado === "" ? null : Number(form.montoReclamado),
                versionPrivacidad: LEGAL_VERSIONS.privacy
            });
            setReceipt(result.reclamo);
            setReceiptAccess({ codigo: result.reclamo.codigo, token: result.tokenConsulta });
            setSearchParams({ codigo: result.reclamo.codigo, token: result.tokenConsulta }, { replace: true });
            setForm(initialForm);
            globalThis.scrollTo({ top: 0, behavior: "smooth" });
        } catch (error) {
            setMessage(error.message ?? "No se pudo registrar el reclamo.");
        } finally {
            setIsSubmitting(false);
        }
    }

    if (receipt) {
        return (
            <main className="legal-page complaint-page">
                <article className="legal-card complaint-receipt">
                    <nav className="legal-back"><Link to="/">← Volver al inicio</Link></nav>
                    <span className="legal-eyebrow">Constancia electrónica</span>
                    <h1>Libro de Reclamaciones</h1>
                    <p className="receipt-provider">
                        <strong>{LEGAL_PROVIDER.tradeName}</strong><br />
                        {LEGAL_PROVIDER.legalName} · RUC {LEGAL_PROVIDER.ruc}<br />
                        {LEGAL_PROVIDER.address}
                    </p>
                    <p className="receipt-code">Código: <strong>{receipt.codigo}</strong></p>
                    <div className="receipt-status">Estado: {receipt.estado.replaceAll("_", " ")}</div>
                    <dl className="receipt-grid">
                        <div><dt>Fecha</dt><dd>{new Date(receipt.createdAt).toLocaleString("es-PE")}</dd></div>
                        <div><dt>Tipo</dt><dd>{receipt.tipo}</dd></div>
                        <div><dt>Consumidor</dt><dd>{receipt.nombreCompleto}</dd></div>
                        <div><dt>Documento</dt><dd>{receipt.tipoDocumento} {receipt.numeroDocumento}</dd></div>
                        <div><dt>Bien o servicio</dt><dd>{receipt.descripcionBien}</dd></div>
                        <div><dt>Canal de respuesta</dt><dd>{receipt.canalRespuesta}</dd></div>
                    </dl>
                    <section><h2>Detalle</h2><p>{receipt.detalle}</p></section>
                    <section><h2>Pedido del consumidor</h2><p>{receipt.pedidoConsumidor}</p></section>
                    {receipt.respuesta && <section><h2>Respuesta del proveedor</h2><p>{receipt.respuesta}</p><p><strong>Medidas adoptadas:</strong> {receipt.medidasAdoptadas ?? "No aplica"}</p></section>}
                    <p className="receipt-note">Presentar este registro no impide acudir a otras vías de solución de controversias ni constituye por sí solo una aceptación del pedido.</p>
                    <div className="legal-form-actions no-print">
                        <button type="button" className="legal-action" onClick={() => globalThis.print()}>Imprimir constancia</button>
                        <button type="button" className="legal-action secondary" onClick={() => { setReceipt(null); setReceiptAccess(null); setSearchParams({}, { replace: true }); }}>Registrar otro</button>
                    </div>
                    {receiptAccess && <small className="private-link-warning no-print">El enlace contiene una clave privada de consulta. No lo compartas públicamente.</small>}
                </article>
            </main>
        );
    }

    return (
        <main className="legal-page complaint-page">
            <article className="legal-card">
                <nav className="legal-back"><Link to="/">← Volver al inicio</Link><Link to="/legal/privacidad">Política de Privacidad</Link></nav>
                <header>
                    <span className="legal-eyebrow">Atención al consumidor</span>
                    <h1>Libro de Reclamaciones</h1>
                    <p>Proveedor: {LEGAL_PROVIDER.legalName} · RUC {LEGAL_PROVIDER.ruc} · {LEGAL_PROVIDER.address}</p>
                    <p>Contacto: {LEGAL_PROVIDER.email} · {LEGAL_PROVIDER.phone}</p>
                    <p><strong>Reclamo:</strong> disconformidad con un producto o servicio. <strong>Queja:</strong> malestar respecto de la atención.</p>
                </header>

                {message && <div className="legal-form-message" role="alert">{message}</div>}

                <form className="complaint-form" onSubmit={handleSubmit}>
                    <fieldset>
                        <legend>1. Identificación del consumidor</legend>
                        <label>Nombre completo<input name="nombreCompleto" value={form.nombreCompleto} onChange={updateField} maxLength="200" required /></label>
                        <label>Tipo de documento<select name="tipoDocumento" value={form.tipoDocumento} onChange={updateField}><option>DNI</option><option>CE</option><option>PASAPORTE</option><option>RUC</option><option>OTRO</option></select></label>
                        <label>Número de documento<input name="numeroDocumento" value={form.numeroDocumento} onChange={updateField} maxLength="20" required /></label>
                        <label>Domicilio<input name="domicilio" value={form.domicilio} onChange={updateField} maxLength="300" required /></label>
                        <label>Correo electrónico<input type="email" name="correo" value={form.correo} onChange={updateField} maxLength="160" required /></label>
                        <label>Teléfono<input type="tel" name="telefono" value={form.telefono} onChange={updateField} maxLength="30" /></label>
                        <label className="complaint-checkbox"><input type="checkbox" name="esMenorEdad" checked={form.esMenorEdad} onChange={updateField} /> Soy menor de edad</label>
                        {form.esMenorEdad && <label>Padre, madre o apoderado<input name="nombreApoderado" value={form.nombreApoderado} onChange={updateField} maxLength="200" required /></label>}
                    </fieldset>

                    <fieldset>
                        <legend>2. Producto o servicio</legend>
                        <label>Sede<select name="sucursalId" value={form.sucursalId} onChange={updateField}><option value="">No especificada / canal web</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.nombre}</option>)}</select></label>
                        <label>Tipo<select name="bienContratado" value={form.bienContratado} onChange={updateField}><option value="PRODUCTO">Producto</option><option value="SERVICIO">Servicio</option></select></label>
                        <label className="complaint-full">Descripción<input name="descripcionBien" value={form.descripcionBien} onChange={updateField} maxLength="300" required /></label>
                        <label>Monto reclamado (S/), si aplica<input type="number" name="montoReclamado" value={form.montoReclamado} onChange={updateField} min="0" step="0.01" /></label>
                    </fieldset>

                    <fieldset>
                        <legend>3. Reclamación y pedido</legend>
                        <label>Clasificación<select name="tipo" value={form.tipo} onChange={updateField}><option value="RECLAMO">Reclamo</option><option value="QUEJA">Queja</option></select></label>
                        <label>Canal de respuesta<select name="canalRespuesta" value={form.canalRespuesta} onChange={updateField}><option value="CORREO">Correo</option><option value="TELEFONO">Teléfono</option><option value="DOMICILIO">Domicilio</option></select></label>
                        <label className="complaint-full">Detalle<textarea name="detalle" value={form.detalle} onChange={updateField} minLength="10" maxLength="5000" rows="5" required /></label>
                        <label className="complaint-full">Pedido concreto del consumidor<textarea name="pedidoConsumidor" value={form.pedidoConsumidor} onChange={updateField} minLength="5" maxLength="3000" rows="4" required /></label>
                    </fieldset>

                    <label className="complaint-privacy">
                        <input type="checkbox" name="aceptaPrivacidad" checked={form.aceptaPrivacidad} onChange={updateField} required />
                        <span>Declaro haber leído la <Link to="/legal/privacidad" target="_blank">Política de Privacidad</Link> aplicable a la gestión de esta comunicación.</span>
                    </label>
                    <p className="receipt-note">El proveedor debe responder en un máximo de 15 días hábiles. El registro no limita otros derechos del consumidor.</p>
                    <p className="receipt-note">Si el canal virtual no se encuentra disponible, solicita el Libro de Reclamaciones físico de respaldo en el establecimiento.</p>
                    <button type="submit" className="legal-action" disabled={isSubmitting}>{isSubmitting ? "Registrando..." : "Registrar y generar constancia"}</button>
                </form>
            </article>
        </main>
    );
}

export default ConsumerClaimsPage;
