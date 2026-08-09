import { useCallback, useEffect, useState } from "react";
import { FaBookOpen, FaSyncAlt } from "react-icons/fa";
import { listConsumerClaimsRequest, updateConsumerClaimRequest } from "../../../services/consumerClaim.service";
import { useRealtimeVersion } from "../../../context/RealtimeContext";
import "./consumerClaimsAdmin.css";

const emptyData = { items: [], pagination: { page: 1, total: 0, totalPages: 1 } };

function ConsumerClaimsAdmin() {
    const realtimeVersion = useRealtimeVersion(["CLAIMS"]);
    const [data, setData] = useState(emptyData);
    const [filters, setFilters] = useState({ search: "", estado: "TODOS" });
    const [selected, setSelected] = useState(null);
    const [responseForm, setResponseForm] = useState({ estado: "EN_REVISION", respuesta: "", medidasAdoptadas: "" });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [feedback, setFeedback] = useState(null);

    const loadClaims = useCallback(async (signal) => {
        try {
            setData(await listConsumerClaimsRequest(filters, signal));
            setFeedback(null);
        } catch (error) {
            if (error?.name !== "AbortError") setFeedback({ type: "error", text: error.message });
        } finally {
            if (!signal?.aborted) setIsLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        const controller = new AbortController();
        const timer = globalThis.setTimeout(() => {
            void loadClaims(controller.signal);
        }, 0);
        return () => {
            globalThis.clearTimeout(timer);
            controller.abort();
        };
    }, [loadClaims, realtimeVersion]);

    function selectClaim(claim) {
        setSelected(claim);
        setResponseForm({
            estado: claim.estado === "RECIBIDO" ? "EN_REVISION" : claim.estado,
            respuesta: claim.respuesta ?? "",
            medidasAdoptadas: claim.medidasAdoptadas ?? ""
        });
        setFeedback(null);
    }

    async function saveResponse(event) {
        event.preventDefault();
        setIsSaving(true);
        try {
            const updated = await updateConsumerClaimRequest(selected.id, responseForm);
            setSelected(updated);
            setData((current) => ({ ...current, items: current.items.map((item) => item.id === updated.id ? updated : item) }));
            setFeedback({ type: "success", text: "La atención quedó registrada y, si se respondió, se notificó al consumidor." });
        } catch (error) {
            setFeedback({ type: "error", text: error.message });
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <section className="admin-page consumer-claims-admin">
            <header className="admin-page-header">
                <div><span className="admin-eyebrow">PROTECCIÓN AL CONSUMIDOR</span><h2>Libro de Reclamaciones</h2><p>Revisa, responde y conserva la trazabilidad de reclamos y quejas recibidos.</p></div>
                <button type="button" className="admin-button secondary" onClick={() => {
                    setIsLoading(true);
                    void loadClaims();
                }} disabled={isLoading}><FaSyncAlt /> Actualizar</button>
            </header>
            {feedback && <div className={`admin-feedback ${feedback.type}`} role="alert">{feedback.text}</div>}
            <div className="admin-filter-bar claims-filter">
                <input aria-label="Buscar reclamo" placeholder="Código, consumidor o documento" value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} />
                <select aria-label="Filtrar por estado" value={filters.estado} onChange={(event) => setFilters((current) => ({ ...current, estado: event.target.value }))}><option value="TODOS">Todos los estados</option><option value="RECIBIDO">Recibidos</option><option value="EN_REVISION">En revisión</option><option value="RESPONDIDO">Respondidos</option><option value="CERRADO">Cerrados</option></select>
            </div>
            <div className="claims-workspace">
                <section className="admin-surface claims-list">
                    <div className="claims-section-heading"><FaBookOpen /><strong>{data.pagination.total} registros</strong></div>
                    <div className="admin-table-shell responsive-cards"><table className="admin-data-table"><thead><tr><th>Código</th><th>Fecha</th><th>Consumidor</th><th>Tipo</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>
                        {data.items.map((claim) => <tr key={claim.id}><td data-label="Código"><strong>{claim.codigo}</strong></td><td data-label="Fecha">{new Date(claim.createdAt).toLocaleDateString("es-PE")}</td><td data-label="Consumidor">{claim.nombreCompleto}</td><td data-label="Tipo">{claim.tipo}</td><td data-label="Estado"><span className={`admin-status-badge claim-${claim.estado.toLowerCase()}`}>{claim.estado.replaceAll("_", " ")}</span></td><td data-label="Acciones"><button type="button" className="admin-button secondary" onClick={() => selectClaim(claim)}>Atender</button></td></tr>)}
                        {!isLoading && data.items.length === 0 && <tr><td colSpan="6">No hay registros para los filtros seleccionados.</td></tr>}
                    </tbody></table></div>
                </section>
                {selected && <aside className="admin-surface claim-detail">
                    <header><span className="admin-eyebrow">{selected.codigo}</span><h3>{selected.nombreCompleto}</h3><p>{selected.tipoDocumento} {selected.numeroDocumento} · {selected.correo} · Responder por {selected.canalRespuesta.toLowerCase()}</p></header>
                    <dl><div><dt>Bien o servicio</dt><dd>{selected.descripcionBien}</dd></div><div><dt>Detalle</dt><dd>{selected.detalle}</dd></div><div><dt>Pedido</dt><dd>{selected.pedidoConsumidor}</dd></div></dl>
                    <form onSubmit={saveResponse}>
                        <label>Estado<select value={responseForm.estado} onChange={(event) => setResponseForm((current) => ({ ...current, estado: event.target.value }))}><option value="EN_REVISION">En revisión</option><option value="RESPONDIDO">Respondido</option><option value="CERRADO">Cerrado</option></select></label>
                        <label>Respuesta<textarea rows="6" maxLength="5000" value={responseForm.respuesta} onChange={(event) => setResponseForm((current) => ({ ...current, respuesta: event.target.value }))} required={responseForm.estado === "RESPONDIDO"} /></label>
                        <label>Medidas adoptadas<textarea rows="4" maxLength="5000" value={responseForm.medidasAdoptadas} onChange={(event) => setResponseForm((current) => ({ ...current, medidasAdoptadas: event.target.value }))} /></label>
                        <div className="claim-detail-actions"><button type="button" className="admin-button secondary" onClick={() => setSelected(null)}>Cerrar panel</button><button type="submit" className="admin-button primary" disabled={isSaving}>{isSaving ? "Guardando..." : "Guardar atención"}</button></div>
                    </form>
                </aside>}
            </div>
        </section>
    );
}

export default ConsumerClaimsAdmin;
