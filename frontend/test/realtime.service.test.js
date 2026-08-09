import {
    afterEach,
    describe,
    expect,
    it,
    vi
} from "vitest";

import {
    connectRealtimeEvents
} from "../src/services/realtime.service";

class FakeEventSource {
    static instances = [];

    constructor(url, options) {
        this.url = url;
        this.options = options;
        this.listeners = new Map();
        this.close = vi.fn();
        FakeEventSource.instances.push(this);
    }

    addEventListener(name, listener) {
        this.listeners.set(name, listener);
    }

    removeEventListener(name) {
        this.listeners.delete(name);
    }

    emit(name, data = {}) {
        this.listeners.get(name)?.({
            data: JSON.stringify(data)
        });
    }
}

describe("servicio de eventos en tiempo real", () => {
    afterEach(() => {
        FakeEventSource.instances = [];
        vi.unstubAllGlobals();
    });

    it("abre un SSE autenticado por cookie y entrega cambios válidos", () => {
        vi.stubGlobal(
            "EventSource",
            FakeEventSource
        );

        const onChange = vi.fn();
        const onStatusChange = vi.fn();
        const disconnect =
            connectRealtimeEvents({
                onChange,
                onStatusChange
            });
        const source =
            FakeEventSource.instances[0];

        expect(source.url).toContain(
            "/api/v1/realtime/events"
        );
        expect(source.options).toEqual({
            withCredentials: true
        });

        source.emit("connected");
        source.emit("data-changed", {
            id: "event-1",
            type: "DATA_CHANGED",
            resources: [
                "RESERVATIONS",
                "NOTIFICATIONS"
            ]
        });

        expect(onStatusChange).toHaveBeenCalledWith(
            "CONNECTED"
        );
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({
                id: "event-1"
            })
        );

        disconnect();

        expect(source.close).toHaveBeenCalledTimes(1);
        expect(onStatusChange).toHaveBeenLastCalledWith(
            "DISCONNECTED"
        );
    });
});
