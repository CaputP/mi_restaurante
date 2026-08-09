import {
    fireEvent,
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

import AdminDialog from "../src/components/adminDialog/AdminDialog";

describe("AdminDialog", () => {
    afterEach(() => {
        document.body.style.overflow =
            "";
    });

    it("gestiona foco, bloqueo de scroll y cierre con Escape", () => {
        const opener =
            document.createElement(
                "button"
            );
        opener.textContent =
            "Abrir";
        document.body.append(
            opener
        );
        opener.focus();

        const onClose =
            vi.fn();
        const {
            unmount
        } = render(
            <AdminDialog
                labelledBy="dialog-title"
                onClose={onClose}
            >
                <h2 id="dialog-title">
                    Detalle
                </h2>
                <button type="button">
                    Cerrar
                </button>
            </AdminDialog>
        );

        expect(
            screen.getByRole("dialog")
        ).toHaveAttribute(
            "aria-modal",
            "true"
        );
        expect(
            screen.getByRole(
                "button",
                {
                    name: "Cerrar"
                }
            )
        ).toHaveFocus();
        expect(
            document.body.style.overflow
        ).toBe("hidden");

        fireEvent.keyDown(
            document,
            {
                key: "Escape"
            }
        );

        expect(
            onClose
        ).toHaveBeenCalledTimes(1);

        unmount();

        expect(opener).toHaveFocus();
        opener.remove();
    });
});
