# El Contador del Escupo

Archivo documental de coherencia política que contrasta declaraciones pasadas de José Antonio Kast (tweets de campaña, debates e intervenciones parlamentarias) con hechos verificables de su gobierno y sector en la prensa chilena.

---

## Arquitectura del Sistema

El proyecto separa la **lectura documental pública** de un **pipeline automatizado de recolección y cruce semántico**:

1. **Ingesta Histórica (Tweets vía Wayback / X y Debates vía YouTube + Whisper)**:
   - Consolida citas históricas en `src/data/archivo-dichos.json` sin duplicados e infiere automáticamente rol según fecha, categoría temática (`impuestos`, `nepotismo`, `seguridad`, `constitucion`, `gasto-publico`, `libertades`), postura normativa (`prohibe`, `condena`, `promete`, `exige`) y conceptos clave.
   - **Tweets (`pipeline/ingesta-tweets.ts`, `pipeline/scrapers/wayback-tweets.ts`, `x-ingesta.ts`)**: soporta índice CDX y snapshots de **Wayback Machine** (`--wayback`, guardando enlace verificable en `archivoUrl`), exportaciones locales (`.json`, `tweets.js`, `.csv`) en `pipeline/imports/`, X API v2 (`X_BEARER_TOKEN`), SocialData API (`SOCIALDATA_API_KEY`) u oEmbed individual (`--url`).
   - **Debates y Entrevistas (`pipeline/ingesta-debates.ts`, `pipeline/scrapers/youtube-transcripciones.ts`)**: descarga subtítulos VTT de YouTube vía `yt-dlp` (sin transcribir APIs externas), agrupa en pasajes y enlaza cada segmento al segundo exacto (`https://youtu.be/<id>?t=<seg>`), con filtro opcional de tramos de intervención (`--tramos`) y respaldo local en Python con `faster-whisper` (`--whisper`).

2. **Scrapers de Prensa Chilena (`pipeline/scrapers/rss-prensa.ts`)**:
   - Consulta feeds RSS en vivo de Google Noticias Chile, CIPER Chile, The Clinic y El Ciudadano.
   - Normaliza titulares, fechas, medios y URLs exactas filtrando notas políticas relevantes.

3. **Motor de Detección de Contradicciones (`src/motor/detector.ts`)**:
   - Cruza noticias recientes contra toda la base histórica indexada en `src/data/archivo-dichos.json`.
   - Evalúa equivalencia temática (expansión léxica de dominio y raíces) más choque de polaridad/postura (`condena`, `prohibe`, `exige`, `promete` frente a hechos posteriores), asignando un puntaje de `0` a `99%` y clasificación del choque (*Doble estándar*, *Promesa incumplida*, *Inversión de postura*, *Bumerán retórico*).
   - Soporta verificación opcional con LLM compatible con OpenAI/Ollama (`pipeline/motor/llm-verifier.ts`) mediante variables de entorno, funcionando 100% gratis y determinista cuando no hay API key configurada.

4. **Vigilancia Continua RSS y Cron (`.github/workflows/worker-rss.yml`, `npm run worker:watch`)**:
   - Permite dejar el worker vigilando feeds RSS cada *N* minutos (`WORKER_INTERVAL_MINUTES`, por defecto 30) o correr automáticamente cada 2 horas en GitHub Actions comparando cada actualización de prensa contra todos los tweets almacenados.

5. **Mesa de Redacción Integrada (`src/components/MesaRedaccion.tsx`)**:
   - Vista privada/operativa dentro de la propia web para revisar los candidatos generados por el worker (`src/data/candidatos.json`), probar noticias en vivo contra el motor, editar el titular/veredicto y exportar `escupos.json` actualizado.

6. **Expediente Editorial (`src/components/MarcadorPortada.tsx`, `ExpedienteDestacado.tsx`, `HistorialEscupos.tsx`)**:
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

# 2. (Opcional) Ingestar tweets históricos desde `pipeline/imports/` o APIs configuradas en `.env`
npm run ingesta:tweets

# 3. Ejecutar el worker/scraper para actualizar noticias recientes y candidatos
npm run worker

# 4. Levantar la aplicación web en desarrollo
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173).

### Scripts Disponibles

| Comando | Descripción |
|---|---|
| `npm run dev` | Inicia el servidor de desarrollo Vite |
| `npm run build` | Compila TypeScript y genera el bundle de producción |
| `npm test` | Ejecuta la suite de pruebas unitarias con Vitest |
| `npm run ingesta:tweets` | Clasifica e incorpora tweets históricos en `src/data/archivo-dichos.json` desde `pipeline/imports/`, APIs, `--url` o `--wayback` |
| `npm run ingesta:wayback` | Descubre e hidrata tweets históricos desde Wayback Machine (`--desde`, `--hasta`, `--max`, `--dry-run`) |
| `npm run ingesta:debates` | Transcribe debates/entrevistas de YouTube con `yt-dlp` (o `--whisper` local) enlazando cada cita a `?t=<seg>` |
| `npm run worker` | Ejecuta el scraper RSS y el motor de contradicciones para actualizar `candidatos.json` y `noticias-recientes.json` |
| `npm run worker:watch` | Mantiene el monitoreo RSS continuo en intervalos configurables (`--interval <min>` o `WORKER_INTERVAL_MINUTES`) |
| `npm run preview` | Sirve localmente la build de producción |

---

## Despliegue en GitHub Pages

El proyecto queda listo para publicarse en **GitHub Pages** con cualquier nombre de repositorio o dominio personalizado:

1. Sube el código a GitHub (`git remote add origin ... && git push -u origin main`).
2. En GitHub abre **Settings → Pages → Build and deployment → Source** y selecciona **GitHub Actions**.
3. El workflow [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) detecta automáticamente la ruta base del repositorio (`configure-pages`), corre las pruebas (`npm test`), compila (`npm run build`) y publica en Pages tanto en cada push a `main` como después de cada corrida exitosa del cron RSS (`worker-rss.yml`).
4. En producción pública (`npm run build`), la **Mesa de Redacción** y los archivos privados del worker (`candidatos.json`, `archivo-dichos.json`) se excluyen completamente del bundle mediante compilación condicional (`import.meta.env.DEV`): solo operan en tu entorno local (`npm run dev`) y no existe ningún parámetro URL para abrirlos en producción. La encuesta de apoyo al gobierno funciona en modo cliente (`localStorage`).

### Despliegue en Vercel (con Noticias en Vivo `/api/rss`)

Para contar con refresco automático de prensa chilena cada 15 minutos sin rebuilds:

1. Importa el repositorio en **Vercel** (detecta Vite automáticamente mediante [`vercel.json`](vercel.json)).
2. La función serverless [`api/rss.ts`](api/rss.ts) expone `GET /api/rss`, reutiliza el scraper político (`scrapearPrensaChilena`) y responde con caché CDN en el edge (`s-maxage=900, stale-while-revalidate=300`).
3. Para activar la **encuesta global en tiempo real**, conecta una base gratuita de **Upstash Redis** desde el Marketplace de Vercel (esto inyecta `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN` o `KV_REST_API_*` para [`api/encuesta.ts`](api/encuesta.ts)). Si no está configurada, degrada automáticamente a modo local por navegador.
4. En hosts puramente estáticos (como GitHub Pages) donde `/api/rss` y `/api/encuesta` no existen, la pestaña **Noticias** usa `src/data/noticias-recientes.json` y la encuesta guarda votos localmente.

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
├── .github/workflows/
│   ├── deploy-pages.yml          # Build y despliegue automático en GitHub Pages
│   └── worker-rss.yml            # Cron automático RSS cada 2 horas
├── public/
│   ├── favicon.svg               # Ícono editorial de pestaña
│   └── og-cover.jpg              # Tarjeta de vista previa (Open Graph / X)
├── pipeline/
│   ├── imports/                  # Carpeta para exportaciones (.json, tweets.js, .csv)
│   ├── lib/
│   │   ├── archivo-dichos.ts     # Lectura y fusión deduplicada sobre `archivo-dichos.json`
│   │   └── env.ts                # Lector liviano de `.env` local
│   ├── motor/
│   │   └── llm-verifier.ts       # Verificador opcional con LLM (OpenAI / Ollama / local)
│   ├── scrapers/
│   │   ├── rss-prensa.ts         # Scraper RSS de prensa chilena
│   │   ├── wayback-tweets.ts     # Descubrimiento CDX e hidratación de tweets vía Wayback Machine
│   │   ├── x-ingesta.ts          # Adaptadores de ingesta histórica (local, X v2, SocialData, oEmbed)
│   │   └── youtube-transcripciones.ts # Parser VTT, segmentador y wrapper de `yt-dlp` / Whisper
│   ├── scripts/
│   │   └── transcribir_whisper.py # Transcripción local opcional con `faster-whisper`
│   ├── ingesta-debates.ts        # CLI de ingesta de debates/entrevistas en YouTube
│   ├── ingesta-tweets.ts         # CLI de ingesta y deduplicación de tweets históricos
│   └── run-worker.ts             # Orquestador CLI y modo `--watch` RSS
├── src/
│   ├── components/               # UI editorial (Expediente + Mesa de Redacción)
│   ├── data/
│   │   ├── archivo-dichos.json   # Base histórica de citas y posturas
│   │   ├── frases-bronce.json    # Archivo de frases destacadas para el bronce
│   │   ├── escupos.json          # Expedientes verificados y publicados
│   │   ├── candidatos.json       # Cruces generados por el worker
│   │   └── noticias-recientes.json
│   ├── lib/                      # Contador horario Chile, encuesta local y control editorial
│   ├── motor/
│   │   ├── clasificador-dichos.ts # Clasificador automático de categoría, postura y conceptos
│   │   └── detector.ts           # Motor determinista compartido (CLI y navegador)
│   └── types/
├── PRODUCT.md
├── DESIGN.md
├── Dockerfile
└── docker-compose.yml
```
