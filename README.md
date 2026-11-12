# El Contador del Escupo

Archivo documental de coherencia política que contrasta declaraciones pasadas de José Antonio Kast (tweets de campaña, debates e intervenciones parlamentarias) con hechos verificables de su gobierno y sector en la prensa chilena.

---

## Arquitectura del Sistema

El proyecto separa la **lectura documental pública** de un **pipeline automatizado de recolección y cruce semántico**:

1. **Scrapers de Prensa Chilena (`pipeline/scrapers/rss-prensa.ts`)**:
   - Consulta feeds RSS en vivo de Google Noticias Chile, CIPER Chile, The Clinic y El Ciudadano.
   - Normaliza titulares, fechas, medios y URLs exactas filtrando notas políticas relevantes.

2. **Motor de Detección de Contradicciones (`src/motor/detector.ts`)**:
   - Cruza noticias recientes contra la base histórica indexada en `src/data/archivo-dichos.json`.
   - Evalúa equivalencia temática (expansión léxica de dominio y raíces) más choque de polaridad/postura (`condena`, `prohibe`, `exige`, `promete` frente a hechos posteriores), asignando un puntaje de `0` a `99%` y clasificación del choque (*Doble estándar*, *Promesa incumplida*, *Inversión de postura*, *Bumerán retórico*).
   - Soporta verificación opcional con LLM compatible con OpenAI/Ollama (`pipeline/motor/llm-verifier.ts`) mediante variables de entorno, funcionando 100% gratis y determinista cuando no hay API key configurada.

3. **Mesa de Redacción Integrada (`src/components/MesaRedaccion.tsx`)**:
   - Vista privada/operativa dentro de la propia web para revisar los candidatos generados por el worker (`src/data/candidatos.json`), probar noticias en vivo contra el motor, editar el titular/veredicto y exportar `escupos.json` actualizado.

4. **Expediente Editorial (`src/components/MarcadorPortada.tsx`, `ExpedienteDestacado.tsx`, `HistorialEscupos.tsx`)**:
   - Diseño claro tipo periódico y expediente de archivo público con tipografía auto-hospedada (`Source Serif 4`, `Public Sans`, `JetBrains Mono`).

---

## Requisitos Previos

- **Node.js** v18+ (recomendado v20 o v22)
- **npm** v9+

---

## Instalación y Uso Local

```bash
# 1. Instalar dependencias
npm install

# 2. Ejecutar el worker/scraper para actualizar noticias recientes y candidatos
npm run worker

# 3. Levantar la aplicación web en desarrollo
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173).

### Scripts Disponibles

| Comando | Descripción |
|---|---|
| `npm run dev` | Inicia el servidor de desarrollo Vite |
| `npm run build` | Compila TypeScript y genera el bundle de producción |
| `npm test` | Ejecuta la suite de pruebas unitarias con Vitest |
| `npm run worker` | Ejecuta el scraper RSS y el motor de contradicciones para actualizar `candidatos.json` y `noticias-recientes.json` |
| `npm run preview` | Sirve localmente la build de producción |

---

## 🐳 Ejecución con Docker

```bash
cp .env.example .env
docker compose up --build
```

Abre [http://localhost:3000](http://localhost:3000).

---

## Estructura de Archivos

```text
contadorKast/
├── pipeline/
│   ├── motor/
│   │   └── llm-verifier.ts       # Verificador opcional con LLM (OpenAI / Ollama / local)
│   ├── scrapers/
│   │   └── rss-prensa.ts         # Scraper RSS de prensa chilena
│   └── run-worker.ts             # Orquestador CLI del worker
├── src/
│   ├── components/               # UI editorial (Expediente + Mesa de Redacción)
│   ├── data/
│   │   ├── archivo-dichos.json   # Base histórica de citas y posturas
│   │   ├── escupos.json          # Expedientes verificados y publicados
│   │   ├── candidatos.json       # Cruces generados por el worker
│   │   └── noticias-recientes.json
│   ├── lib/                      # Lógica del contador y filtros
│   ├── motor/                    # Motor determinista compartido (CLI y navegador)
│   └── types/
├── PRODUCT.md
├── DESIGN.md
├── Dockerfile
└── docker-compose.yml
```
