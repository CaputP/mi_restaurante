const STRUCTURAL_RULES = [
  "sucursalId",
  "tipo",
  "visitasRequeridas",
  "montoRequerido",
  "tipoRecompensa",
  "productoPremioId",
  "cantidadPremio",
  "montoDescuento",
  "porcentajeDescuento",
  "descripcionBeneficio",
  "vigenciaDiasPremio",
  "automatico",
  "fechaInicio",
] as const;

type LoyaltyRuleKey =
  (typeof STRUCTURAL_RULES)[number];

type LoyaltyRules =
  Record<
    LoyaltyRuleKey,
    unknown
  >;

function comparableValue(
  value: unknown,
): string {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  if (value instanceof Date) {
    return value
      .toISOString();
  }

  return String(value);
}

/**
 * Las reglas económicas se convierten en una versión inmutable en cuanto el
 * programa tiene actividad. Cambiar nombre, descripción, fecha de cierre o
 * estado sigue permitido; una nueva meta/recompensa requiere otro programa.
 */
export function loyaltyStructuralRulesChanged(
  current: LoyaltyRules,
  next: LoyaltyRules,
): boolean {
  return STRUCTURAL_RULES
    .some(
      (rule) =>
        comparableValue(
          current[rule],
        ) !==
        comparableValue(
          next[rule],
        ),
    );
}
