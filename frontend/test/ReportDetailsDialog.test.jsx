import {
    fireEvent,
    render,
    screen
} from "@testing-library/react";
import {
    describe,
    expect,
    it,
    vi
} from "vitest";

import ReportDetailsDialog from "../src/pages/admin/reports/ReportDetailsDialog";

const data = {
    tipo: "ADELANTOS_RESERVA",
    registros: [
        {
            id: "payment-1",
            codigo: "RES-001",
            fecha: "2026-08-08T15:30:00.000Z",
            estado: "CONFIRMADO",
            descripcion: "Adelanto YAPE",
            importe: 50,
            cliente: "María Quispe",
            responsable: "Ana Torres",
            sucursal: "Principal",
            datos: {
                numeroOperacion: "OP-ABC-123",
                adelantoRequerido: 50
            },
            productos: [
                {
                    id: "detail-1",
                    nombre: "Pachamanca",
                    cantidad: 2,
                    precioUnitario: 25,
                    subtotal: 50
                }
            ],
            pagos: [
                {
                    id: "payment-1",
                    metodoPago: "YAPE",
                    monto: 50,
                    numeroOperacion: "OP-ABC-123"
                }
            ]
        }
    ],
    pagination: {
        page: 1,
        limit: 20,
        total: 21,
        totalPages: 2
    }
};

describe("ReportDetailsDialog", () => {
    it("muestra la trazabilidad completa del adelanto", () => {
        render(
            <ReportDetailsDialog
                config={{ title: "Adelantos recibidos" }}
                data={data}
                error=""
                isLoading={false}
                onClose={vi.fn()}
                onPageChange={vi.fn()}
            />
        );

        expect(
            screen.getByRole("heading", {
                name: "Adelantos recibidos"
            })
        ).toBeInTheDocument();
        expect(screen.getByText("María Quispe")).toBeInTheDocument();
        expect(screen.getByText("Ana Torres")).toBeInTheDocument();
        expect(screen.getByText("Pachamanca")).toBeInTheDocument();
        expect(screen.getAllByText(/OP-ABC-123/)).toHaveLength(2);
    });

    it("permite navegar y cerrar el detalle", () => {
        const onClose = vi.fn();
        const onPageChange = vi.fn();

        render(
            <ReportDetailsDialog
                config={{ title: "Adelantos recibidos" }}
                data={data}
                error=""
                isLoading={false}
                onClose={onClose}
                onPageChange={onPageChange}
            />
        );

        fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
        fireEvent.click(screen.getByRole("button", { name: "Cerrar detalle del reporte" }));

        expect(onPageChange).toHaveBeenCalledWith(2);
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
