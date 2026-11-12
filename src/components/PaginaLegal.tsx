import React from 'react';
import { ArrowLeft, Scale, ShieldCheck } from 'lucide-react';

interface PaginaLegalProps {
  onVolverArchivo: () => void;
}

/**
 * Vista documental con la Nota Legal, Términos de Uso y Política de Privacidad del sitio.
 */
export const PaginaLegal: React.FC<PaginaLegalProps> = ({ onVolverArchivo }) => {
  return (
    <article
      aria-labelledby="titulo-legal"
      className="py-10 space-y-8 max-w-3xl mx-auto"
    >
      <div className="space-y-4 border-b border-[#dcd7cc] pb-6">
        <button
          type="button"
          onClick={onVolverArchivo}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#4a4843] hover:text-[#141413] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141413] rounded px-1 py-0.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Volver al Expediente</span>
        </button>

        <div className="space-y-2">
          <p className="font-tabular text-xs uppercase tracking-[0.12em] text-[#b91c1c] font-semibold">
            Transparencia editorial · Actualizado 2026-11-12
          </p>
          <h2
            id="titulo-legal"
            className="font-editorial text-3xl sm:text-4xl font-bold text-[#141413] tracking-[-0.02em]"
          >
            Términos de Uso, Nota Legal y Privacidad
          </h2>
          <p className="text-sm text-[#4a4843] leading-relaxed">
            Criterios editoriales, alcance jurídico de la sátira política y tratamiento de datos locales en este sitio estático.
          </p>
        </div>
      </div>

      <section className="bg-[#ffffff] border border-[#dcd7cc] rounded-lg p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-2 text-[#141413]">
          <Scale className="w-5 h-5 text-[#b91c1c]" aria-hidden="true" />
          <h3 className="font-editorial text-xl font-bold">
            1. Nota Legal y Términos de Uso
          </h3>
        </div>

        <div className="space-y-4 text-sm text-[#2f2e2a] leading-relaxed">
          <div>
            <h4 className="font-semibold text-[#141413] mb-1">
              Naturaleza del proyecto
            </h4>
            <p>
              <strong>El Contador del Escupo</strong> es un proyecto independiente de archivo documental, fiscalización ciudadana y sátira política (en referencia al dicho popular <em>«escupir al cielo»</em>). No tiene afiliación con partidos políticos, comandos electorales, organismos públicos ni medios de comunicación institucionales.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-[#141413] mb-1">
              Libertad de expresión y derecho de cita
            </h4>
            <p>
              Los contenidos se limitan estrictamente a declaraciones públicas, intervenciones parlamentarias, debates y publicaciones en redes sociales vinculadas al ejercicio de cargos públicos, contrastadas con cobertura periodística verificable, en ejercicio de la libertad de opinión, crítica política y derecho de cita (Art. 19 N° 12 de la Constitución Política de la República y Ley N° 19.733).
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-[#141413] mb-1">
              Atribución de fuentes y rectificación
            </h4>
            <p>
              Cada ficha distingue las citas textuales de los hechos reportados por terceros y enlaza a su fuente original. La mención a investigaciones judiciales o administrativas refleja exclusivamente información publicada por medios de prensa y no constituye imputación personal de responsabilidad penal. Si detectas un error de fecha, cita o enlace, puedes solicitar su revisión y enmienda aportando la fuente verificable mediante un Issue en el repositorio del proyecto.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-[#141413] mb-1">
              Limitación de responsabilidad
            </h4>
            <p>
              La información se ofrece con fines documentales y satíricos de libre acceso; no constituye asesoría legal, electoral ni periodística oficial. Los enlaces externos pertenecen a sus respectivos medios y pueden variar según la disponibilidad de sus sitios de origen.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-[#ffffff] border border-[#dcd7cc] rounded-lg p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-2 text-[#141413]">
          <ShieldCheck className="w-5 h-5 text-[#b91c1c]" aria-hidden="true" />
          <h3 className="font-editorial text-xl font-bold">
            2. Política de Privacidad
          </h3>
        </div>

        <div className="space-y-4 text-sm text-[#2f2e2a] leading-relaxed">
          <div>
            <h4 className="font-semibold text-[#141413] mb-1">
              Cero rastreadores y cero recolección de datos personales
            </h4>
            <p>
              Este sitio no solicita registro, no utiliza formularios de captura de datos personales ni incorpora cookies publicitarias o servicios de analítica de terceros.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-[#141413] mb-1">
              Almacenamiento local de la encuesta (<code className="font-tabular text-xs bg-[#efeae0] px-1 py-0.5 rounded">localStorage</code>)
            </h4>
            <p>
              La sección <em>Encuesta de apoyo al gobierno</em> guarda tu selección únicamente en el almacenamiento local de tu propio navegador bajo la clave <code className="font-tabular text-xs bg-[#efeae0] px-1 py-0.5 rounded">contadorKast.encuesta.v1</code>. Esos datos no se envían a ningún servidor propio y puedes eliminarlos en cualquier instante pulsando <strong>Reiniciar encuesta</strong> o borrando los datos del sitio en tu navegador.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-[#141413] mb-1">
              Infraestructura de alojamiento
            </h4>
            <p>
              Cuando la aplicación se publica como sitio estático en GitHub Pages, la plataforma de alojamiento puede procesar registros técnicos mínimos de red (como dirección IP o encabezados HTTP) conforme a sus propias políticas de privacidad y seguridad.
            </p>
          </div>
        </div>
      </section>
    </article>
  );
};
