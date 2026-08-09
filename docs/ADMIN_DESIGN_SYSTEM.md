# Sistema de diseño administrativo y operativo

Este documento define el patrón visual compartido por las áreas de administración y operación. Su objetivo es que cada módulo nuevo se comporte y se vea como parte del mismo producto, sin copiar estilos entre páginas.

## Fuente de verdad

Los tokens y patrones globales viven en `frontend/src/styles/adminDesignSystem.css`. El archivo se carga desde `AdminLayout` y `OperationalLayout`, por lo que los módulos reutilizados en ambas áreas conservan exactamente el mismo aspecto.

Los CSS de cada módulo solo deben describir su composición específica. Colores, tipografía, radios, sombras, espaciado general, estados y puntos de quiebre deben proceder del sistema global.

## Anatomía de una página

```jsx
<section className="module-admin admin-page">
    <header className="module-heading admin-page-header">
        <div>
            <span className="admin-eyebrow">Área</span>
            <h2>Título del módulo</h2>
            <p>Descripción breve de la tarea principal.</p>
        </div>

        <button type="button" className="admin-button primary">
            Acción principal
        </button>
    </header>

    <div className="admin-metric-grid">
        {/* métricas */}
    </div>

    <div className="admin-filter-bar">
        {/* búsqueda y filtros */}
    </div>

    <section className="admin-surface">
        {/* contenido */}
    </section>
</section>
```

## Patrones disponibles

- `admin-page`: ancho máximo, centrado y separación vertical de la página.
- `admin-page-header`: título, descripción y acción principal; se apila en pantallas pequeñas.
- `admin-eyebrow`: etiqueta contextual superior.
- `admin-surface`: superficie de contenido con borde, radio y sombra canónicos.
- `admin-metric-grid`: cuadrícula adaptable de métricas; use `columns-3` cuando el máximo sea tres.
- `admin-tabs` y `admin-tab`: navegación interna. Los tabs deben exponer `role="tablist"`, `role="tab"` y `aria-selected`, o usar enlaces con estado activo cuando representan rutas.
- `admin-filter-bar`: búsqueda, filtros y acciones secundarias.
- `admin-feedback success|error`: confirmaciones y errores. Use `role="status"` para éxito y `role="alert"` para errores.
- `admin-button primary|secondary|danger`: jerarquía de acciones.
- `admin-status-badge`: base común para estados; el módulo agrega el color semántico correspondiente.
- `admin-table-shell` y `admin-data-table`: tabla densa, desplazable y con encabezado fijo.
- `responsive-cards`: variante de tabla que se transforma en tarjetas. Cada celda debe tener `data-label`.
- `admin-pagination`: navegación de resultados consistente.
- `admin-empty-state`: estado vacío o de carga sin datos.
- `AdminMetricCard`: tarjeta reutilizable de indicadores.
- `AdminDialog`: diálogo accesible con bloqueo de scroll, cierre con Escape, trampa de foco y restauración del foco anterior.

## Variantes de tabla

La variante predeterminada conserva una tabla densa y permite desplazamiento horizontal. Es apropiada para inventario, auditoría, caja y reportes, donde comparar columnas es importante.

La variante `responsive-cards` se usa cuando cada fila representa una entidad que debe leerse y accionarse cómodamente desde un teléfono, como reservas. No debe activarse de forma indiscriminada: convertir tablas analíticas grandes en tarjetas aumenta el desplazamiento y dificulta comparar datos.

## Comportamiento adaptable

Solo se permiten tres puntos de quiebre:

- `1200px`: cuadrículas amplias pasan a dos columnas.
- `850px`: navegación lateral móvil, encabezados apilados y tablas convertibles.
- `600px`: una columna, paginación apilada y espaciado compacto.

El sistema respeta `prefers-reduced-motion` y desactiva animaciones no esenciales cuando el usuario así lo solicita.

## Accesibilidad mínima

- Todo control de icono necesita `aria-label`.
- Los formularios deben asociar cada `label` con su control.
- Los diálogos deben usar `AdminDialog`; no crear overlays manuales.
- Los estados seleccionados no pueden depender únicamente del color.
- Los mensajes asíncronos deben declarar `role="status"` o `role="alert"`.
- El foco visible no debe eliminarse.
- Las tablas convertibles necesitan `data-label` en todas sus celdas.

## Cómo agregar un módulo

1. Use la anatomía de página anterior y los patrones globales.
2. Reutilice los tokens `--admin-*`; no agregue colores hexadecimales, tamaños tipográficos sueltos ni puntos de quiebre nuevos.
3. Mantenga el CSS local limitado al layout y a estados propios del dominio.
4. Agregue pruebas de interacción para diálogos, navegación o reglas con riesgo de regresión.
5. Ejecute `npm run check` dentro de `frontend/`.

`npm run design:check` bloquea colores hexadecimales o RGB locales, tokens inexistentes, tamaños `rem` fuera de la escala, breakpoints no permitidos e imports CSS cuyo uso de mayúsculas no coincide con el archivo real. Esta última regla evita fallos de compilación al desplegar en Linux.
