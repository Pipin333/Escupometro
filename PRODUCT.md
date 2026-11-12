# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Ciudadanos chilenos interesados en fiscalización política, periodismo de datos y sátira documental, además del editor del proyecto que recopila, verifica y publica nuevas contradicciones.

## Product Purpose

Llevar un conteo diario de días transcurridos sin una contradicción documentada entre las declaraciones pasadas de José Antonio Kast (tweets como candidato/diputado, debates, programas) y las acciones o decisiones reales de su gobierno y sector político, respaldado por un flujo automatizado confiable de recolección y análisis.

## Positioning

Combina un marcador público de coherencia con un pipeline de ingesta automatizada (workers y scrapers de prensa chilena y archivo de declaraciones) más un motor de detección de contradicciones que cruza hechos actuales con promesas pasadas antes de pasar a publicación editorial.

## Operating Context

1. Lectura pública: visitantes que revisan el contador actual, exploran el último incidente, filtran el archivo histórico por tema y verifican las fuentes directas (enlaces exactos a prensa y archivo de citas).
2. Mesa de redacción / pipeline: ejecución de workers que leen feeds de medios chilenos y archivo de citas, motor que puntúa el choque entre lo dicho y lo hecho, y revisión editorial antes de incorporar casos confirmados.

## Capabilities and Constraints

- Datos estructurados y validados en JSON (`escupos.json`, `candidatos.json`, `archivo-dichos.json`).
- Cada incidente publicado debe distinguir claramente la cita pasada (fecha, rol, medio, fuente) del hecho actual (fecha, medio de prensa, URL exacta, consecuencia).
- Motor de contradicción ejecutable tanto en CLI (worker automatizado) como evaluable en vivo en la mesa de redacción web, con lógica determinista auditable y soporte opcional para modelos LLM.
- No fabricar estadísticas, usuarios ni fuentes falsas; cada enlace de prensa debe apuntar a cobertura real verificable.

## Brand Commitments

- Estética visual: editorial claro tipo periódico y expediente de archivo (papel hueso, tinta negra, tipografía serif editorial + datos tabulares, aire limpio, sin ornamentos de neón ni franjas industriales).

## Evidence on Hand

- Registro histórico curado en `src/data/escupos.json` con incidentes de 2017–2026 (Mara Sedini en Segegob, rebaja de condenas en Justicia, gira europea 2026, bencinazo, Caso Convenios Mauricio Ojeda, sueldo USS Marcela Cubillos, tarjetas de bencina Urruticoechea, zanja fronteriza, cambio constitucional, Ministerio de la Mujer, sociedades en Panamá).

## Product Principles

- **Verificabilidad sobre ruido**: cada contradicción se sostiene en la comparación directa de dos fuentes fechadas y comprobables.
- **Automatización con criterio editorial**: los workers y el motor proponen cruces puntuados; el editor revisa y publica con contexto claro.
- **Lectura serena y contundente**: la ironía surge de la frialdad documental con que se confronta el archivo contra el presente.

## Accessibility & Inclusion

- Cumplimiento WCAG 2.2 AA en contraste de tinta sobre papel claro, navegación completa por teclado, etiquetas explícitas en formularios y respeto por `prefers-reduced-motion`.
