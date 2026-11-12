# 🚨 Contador de Días sin que a Kast le caiga su propio escupo en la cara

> **Observatorio Ciudadano de Balística Retórica y Gravedad Política**  
> *"Todo lo que sube como tweet de campaña, baja por gravedad sobre su propio mandato."*

Plataforma satírica e interactiva de fiscalización política basada en hechos reales y fuentes públicas verificables. Presenta un marcador de seguridad industrial que contabiliza los días continuos transcurridos sin que ocurra una contradicción directa entre las promesas / tweets pasados de José Antonio Kast y los hechos, votaciones o acciones de su sector político.

---

## 🌟 Características

- **Tablero Industrial en Tiempo Real**: Letrero estilo seguridad en obra («XX DÍAS SIN ACCIDENTES») con display LED numérico gigante y cálculo dinámico de días.
- **Récord Histórico de Coherencia**: Registro del período más largo sin contradicciones documentadas.
- **Comparador Lado a Lado**:
  - **Lado A (El Escupo al cielo)**: Cita pasada o tweet verificado (fecha, rol de campaña/diputado, texto textual).
  - **Lado B (El Aterrizaje Forzoso)**: Hecho comprobable con fecha y enlace a prensa independiente (Ciper, La Tercera, El Mostrador, etc.).
  - **Veredicto Satírico**: Remate editorial de la ley de gravedad retórica.
- **Búsqueda y Filtros en Vivo**: Filtrado instantáneo por categorías (*Impuestos & Panamá*, *Pitutos & Operadores*, *Mano Dura & Indultos*, *Constitución*, *Gasto Fiscal*, *ONU*).
- **Sirena y Alarma Sintética**: Sonido de sirena industrial y confeti satírico generado directamente en el navegador con Web Audio API (cero dependencias de audio externas).
- **Votación de la Comunidad**: Reacciones interactivas por cada contradicción.
- **Denunciar Nueva Contradicción**: Modal accesible para que los usuarios sugieran nuevos incidentes documentados con fuentes.
- **Optimizado para Viralidad**: Meta tags Open Graph y Twitter Cards listos para compartir en X, WhatsApp y Facebook.

---

## 🚀 Requisitos Previos

- **Node.js**: v18.0.0 o superior (recomendado v20+ o v22+).
- **npm**: v9.0.0 o superior (o pnpm / bun).
- **Docker & Docker Compose** (opcional, para despliegue containerizado).

---

## 🛠️ Instalación y Uso Local

1. **Clonar el repositorio:**
   ```bash
   git clone <URL_DEL_REPOSITORIO>
   cd contadorKast
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Iniciar el servidor de desarrollo:**
   ```bash
   npm run dev
   ```
   Abre [http://localhost:5173](http://localhost:5173) en tu navegador.

4. **Compilar para producción:**
   ```bash
   npm run build
   ```

5. **Ejecutar tests unitarios:**
   ```bash
   npm test
   ```

---

## 🐳 Ejecución con Docker ("1-Click Run")

Para ejecutar la aplicación en cualquier sistema operativo (Linux, macOS, Windows) sin necesidad de instalar Node.js ni configurar el entorno local:

```bash
# 1. Copiar variables de entorno
cp .env.example .env

# 2. Levantar el contenedor
docker compose up --build
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

Para detener el servicio:
```bash
docker compose down
```

---

## 📂 Estructura del Proyecto

```text
contadorKast/
├── src/
│   ├── components/         # Componentes UI (Header, Tablero, Cards, Filtros, Modal)
│   ├── data/
│   │   └── escupos.json    # Base de datos JSON de incidentes y contradicciones
│   ├── lib/
│   │   ├── contador.ts     # Lógica pura de cálculo de días, récords y filtros
│   │   ├── contador.test.ts# Pruebas automatizadas con Vitest
│   │   └── sonido.ts       # Generador de sirena industrial con Web Audio API
│   ├── types/
│   │   └── escupo.ts       # Definición de tipos TypeScript del dominio
│   ├── App.tsx             # Orquestador principal de la vista
│   ├── index.css           # Estilos base con Tailwind CSS y texturas industriales
│   └── main.tsx            # Punto de montaje React 18
├── Dockerfile              # Construcción multi-stage optimizada con Nginx
├── docker-compose.yml      # Configuración de contenedor listo para producción
└── package.json            # Scripts y dependencias
```

---

## 📝 Cómo agregar una nueva contradicción

Edita el archivo `src/data/escupos.json` y añade un nuevo objeto con la siguiente estructura:

```json
{
  "id": "nuevo-incidente",
  "titulo": "Título descriptivo del contraste",
  "categoria": "impuestos", // impuestos | nepotismo | seguridad | constitucion | gasto-publico | libertades
  "fechaIncidente": "2024-11-12",
  "diasSinEscupoPrevios": 15,
  "gravedad": "critica", // leve | moderada | critica | termocéfala
  "pasado": {
    "fecha": "2021-08-10",
    "rol": "Candidato Presidencial",
    "tipoMedio": "tweet",
    "usuarioTweet": "@joseantoniokast",
    "cita": "Texto exacto dicho en el pasado.",
    "fuenteUrl": "https://..."
  },
  "presente": {
    "fecha": "2024-11-12",
    "titulo": "El hecho actual contradictorio",
    "descripcion": "Descripción del acontecimiento.",
    "impacto": "Consecuencia política o legal.",
    "fuenteUrl": "https://latercera.com/..."
  },
  "veredictoSatirico": "Remate con humor de la contradicción.",
  "votosComunidad": 100
}
```

---

## ⚖️ Descargo de Responsabilidad

Este sitio web es una obra de sátira política y ejercicio de fiscalización ciudadana. Todas las citas atribuidas corresponden a declaraciones emitidas en medios públicos, sesiones parlamentarias o redes sociales de acceso abierto. Los hechos actuales están referenciados mediante enlaces directos a medios de prensa reconocidos.
