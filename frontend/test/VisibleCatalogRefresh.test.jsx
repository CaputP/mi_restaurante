import {
    act,
    render,
    screen
} from "@testing-library/react";
import {
    afterEach,
    describe,
    expect,
    it,
    vi
} from "vitest";

import useVisibleCatalogRefresh from "../src/pages/client/loyalty/useVisibleCatalogRefresh";

function RefreshProbe() {
    const version =
        useVisibleCatalogRefresh(
            60_000
        );

    return <span>{version}</span>;
}

describe("actualización temporal de beneficios", () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it("invalida el catálogo visible al cambiar su vigencia", () => {
        vi.useFakeTimers();

        render(<RefreshProbe />);

        expect(
            screen.getByText("0")
        ).toBeInTheDocument();

        act(() => {
            vi.advanceTimersByTime(
                60_000
            );
        });

        expect(
            screen.getByText("1")
        ).toBeInTheDocument();
    });

    it("agrupa foco y visibilidad consecutivos en una sola recarga", () => {
        vi.useFakeTimers();

        render(<RefreshProbe />);

        act(() => {
            window.dispatchEvent(
                new Event("focus")
            );
            document.dispatchEvent(
                new Event(
                    "visibilitychange"
                )
            );
        });

        expect(
            screen.getByText("1")
        ).toBeInTheDocument();
    });
});
