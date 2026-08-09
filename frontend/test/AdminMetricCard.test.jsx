import {
    render,
    screen
} from "@testing-library/react";
import {
    FaCheck
} from "react-icons/fa";
import {
    describe,
    expect,
    it
} from "vitest";

import AdminMetricCard from "../src/components/adminMetricCard/AdminMetricCard";

describe("AdminMetricCard", () => {
    it("muestra la métrica y su contexto", () => {
        render(
            <AdminMetricCard
                icon={FaCheck}
                label="Confirmadas"
                value={7}
                detail="En esta página"
                tone="success"
            />
        );

        expect(
            screen.getByText("Confirmadas")
        ).toBeInTheDocument();
        expect(
            screen.getByText("7")
        ).toBeInTheDocument();
        expect(
            screen.getByText("En esta página")
        ).toBeInTheDocument();
    });

    it("comunica el estado de carga sin mostrar datos anteriores", () => {
        const {
            container
        } = render(
            <AdminMetricCard
                icon={FaCheck}
                label="Pendientes"
                value={4}
                isLoading
            />
        );

        expect(
            container.querySelector("article")
        ).toHaveAttribute(
            "aria-busy",
            "true"
        );
        expect(
            screen.getByText("—")
        ).toBeInTheDocument();
        expect(
            screen.queryByText("4")
        ).not.toBeInTheDocument();
    });
});
