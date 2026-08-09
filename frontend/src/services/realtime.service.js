const API_URL =
    import.meta.env.VITE_API_URL ??
    "http://localhost:3000/api/v1";

export function connectRealtimeEvents({
    onChange,
    onStatusChange
}) {
    const source = new EventSource(
        `${API_URL}/realtime/events`,
        {
            withCredentials: true
        }
    );

    function parseEvent(event) {
        try {
            const data = JSON.parse(event.data);

            if (
                data?.type === "DATA_CHANGED" &&
                Array.isArray(data.resources)
            ) {
                onChange(data);
            }
        } catch (error) {
            console.error(
                "Se recibió una actualización en tiempo real inválida:",
                error
            );
        }
    }

    source.addEventListener(
        "connected",
        () => onStatusChange("CONNECTED")
    );
    source.addEventListener(
        "data-changed",
        parseEvent
    );
    source.addEventListener(
        "server-closing",
        () => onStatusChange("RECONNECTING")
    );
    source.onerror = () => {
        onStatusChange("RECONNECTING");
    };

    onStatusChange("CONNECTING");

    return () => {
        source.removeEventListener(
            "data-changed",
            parseEvent
        );
        source.close();
        onStatusChange("DISCONNECTED");
    };
}
