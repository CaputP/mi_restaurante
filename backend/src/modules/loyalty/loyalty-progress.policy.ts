export type LoyaltyProgressInput = {
  tipo:
    | "VISITAS"
    | "MONTO_CONSUMIDO"
    | "AMBOS";

  visitasAcumuladas: number;
  montoAcumulado: number;
  ciclosCompletados: number;
  visitasRequeridas: number | null;
  montoRequerido: number | null;
};

export type LoyaltyProgressResult = {
  porcentaje: number;
  porcentajeVisitas: number | null;
  porcentajeMonto: number | null;
  visitasCicloActual: number;
  montoCicloActual: number;
};

function roundPercentage(
  value: number,
): number {
  return Number(
    value.toFixed(2),
  );
}

/**
 * Calcula el avance visible del cliente sin permitir porcentajes negativos
 * ni superiores al 100 %. Las metas que no aplican al tipo de programa se
 * representan como `null` para que el cliente no las confunda con una meta
 * pendiente.
 */
export function calculateLoyaltyProgress(
  input: LoyaltyProgressInput,
): LoyaltyProgressResult {
  const visits =
    Math.max(
      0,
      input.visitasAcumuladas,
    );

  const amount =
    Math.max(
      0,
      input.montoAcumulado,
    );

  const completedCycles =
    Math.max(
      0,
      Math.floor(
        input.ciclosCompletados,
      ),
    );

  const currentCycleVisits =
    input.visitasRequeridas !==
      null &&
    input.visitasRequeridas > 0
      ? Math.min(
          input.visitasRequeridas,
          Math.max(
            0,
            visits -
              completedCycles *
                input.visitasRequeridas,
          ),
        )
      : visits;

  const currentCycleAmount =
    input.montoRequerido !==
      null &&
    input.montoRequerido > 0
      ? Math.min(
          input.montoRequerido,
          Math.max(
            0,
            amount -
              completedCycles *
                input.montoRequerido,
          ),
        )
      : amount;

  const visitProgress =
    input.visitasRequeridas !==
      null &&
    input.visitasRequeridas > 0
      ? Math.min(
          100,
          (
            currentCycleVisits /
            input.visitasRequeridas
          ) * 100,
        )
      : null;

  const amountProgress =
    input.montoRequerido !==
      null &&
    input.montoRequerido > 0
      ? Math.min(
          100,
          (
            currentCycleAmount /
            input.montoRequerido
          ) * 100,
        )
      : null;

  let percentage = 0;

  switch (input.tipo) {
    case "VISITAS":
      percentage =
        visitProgress ?? 0;
      break;

    case "MONTO_CONSUMIDO":
      percentage =
        amountProgress ?? 0;
      break;

    case "AMBOS":
      percentage =
        Math.min(
          visitProgress ?? 0,
          amountProgress ?? 0,
        );
      break;
  }

  return {
    porcentaje:
      roundPercentage(
        percentage,
      ),

    porcentajeVisitas:
      visitProgress === null
        ? null
        : roundPercentage(
            visitProgress,
          ),

    porcentajeMonto:
      amountProgress === null
        ? null
        : roundPercentage(
            amountProgress,
          ),

    visitasCicloActual:
      currentCycleVisits,

    montoCicloActual:
      roundPercentage(
        currentCycleAmount,
      ),
  };
}
