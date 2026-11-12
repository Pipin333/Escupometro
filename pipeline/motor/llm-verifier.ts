import type { CandidatoContradiccion } from '../../src/types/escupo';

interface RespuestaLLM {
  esContradiccionReal: boolean;
  scoreAjustado: number;
  explicacion: string;
}

/**
 * Refina candidatos detectados por el motor heurístico consultando un modelo compatible con OpenAI Chat Completions
 * (OpenAI, OpenCode Desktop local, Ollama o proxy compatible) cuando `LLM_API_BASE` o `OPENAI_API_KEY` está definido.
 * Si no hay configuración LLM, devuelve el candidato determinista intacto.
 */
export async function verificarConLLM(
  candidato: CandidatoContradiccion
): Promise<CandidatoContradiccion> {
  const apiKey = process.env.OPENAI_API_KEY || process.env.LLM_API_KEY;
  const apiBase = process.env.LLM_API_BASE || 'https://api.openai.com/v1';
  const modelo = process.env.LLM_MODEL || 'gpt-4o-mini';

  // Permite usar endpoints locales sin key (ej. Ollama / OpenCode) si se especifica LLM_API_BASE explícitamente
  if (!apiKey && !process.env.LLM_API_BASE) {
    return candidato;
  }

  const prompt = [
    'Eres un verificador de hechos (fact-checker) riguroso.',
    'Evalúa si existe una contradicción verificable entre la declaración pasada y la noticia actual.',
    `DECLARACIÓN PASADA (${candidato.dicho.fecha} - ${candidato.dicho.rol}): "${candidato.dicho.cita}"`,
    `NOTICIA ACTUAL (${candidato.noticia.fecha} - ${candidato.noticia.medio}): "${candidato.noticia.titulo}". Resumen: ${candidato.noticia.bajada}`,
    'Responde únicamente en JSON estricto con esta estructura:',
    '{"esContradiccionReal": boolean, "scoreAjustado": number, "explicacion": "string conciso"}',
  ].join('\n');

  try {
    const resp = await fetch(`${apiBase.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: modelo,
        temperature: 0.1,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!resp.ok) return candidato;

    const data = (await resp.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const contenido = data.choices?.[0]?.message?.content;
    if (!contenido) return candidato;

    const jsonMatch = contenido.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return candidato;

    const parsed = JSON.parse(jsonMatch[0]) as RespuestaLLM;
    if (typeof parsed.scoreAjustado !== 'number' || typeof parsed.explicacion !== 'string') {
      return candidato;
    }

    return {
      ...candidato,
      scoreContradiccion: parsed.esContradiccionReal
        ? Math.min(99, Math.max(0, Math.round(parsed.scoreAjustado)))
        : Math.min(35, Math.round(parsed.scoreAjustado)),
      explicacionMotor: parsed.explicacion,
      metodoAnalisis: 'motor-llm',
    };
  } catch {
    return candidato;
  }
}
