# Design System

## Aesthetic Direction

Editorial claro tipo periódico de investigación y expediente documental público. Prioriza legibilidad serena, contraste alto y veracidad visual por encima de ornamentos o disfraces satíricos.

## Color Tokens

- Paper background (`--paper`): `#f7f5f0`
- Surface (`--surface`): `#ffffff`
- Surface subtle (`--surface-subtle`): `#efeae0`
- Primary ink (`--ink`): `#141413`
- Secondary ink (`--ink-muted`): `#4a4843`
- Hairline rule (`--rule`): `#dcd7cc`
- Editorial alert accent (`--accent`): `#b91c1c` (sobre `#fef2f2` con borde `#fecaca`)
- Verified / Published (`--verified`): `#166534`

## Typography

- **Editorial / Titulares y Citas**: `Source Serif 4` (`font-editorial`, tracking `-0.02em` en titulares)
- **UI y Cuerpo**: `Public Sans` (`font-ui`, cuerpo limitado a `65ch`)
- **Datos Tabulares y Fechas**: `JetBrains Mono` (`font-tabular`, `font-variant-numeric: tabular-nums`)

## Layout & Components

- Grillas comparativas de dos columnas separadas por líneas verticales de `1px` (`border-[#dcd7cc]`), sin tarjetas anidadas ni barras laterales gruesas.
- Navegación en cabecera mediante control segmentado entre **Expediente** (lectura pública) y **Mesa de Redacción** (motor de detección y cola del worker).
