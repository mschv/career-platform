import Groq from 'groq-sdk';

// Thin wrapper so the rest of the app never imports "groq-sdk" directly.
// If you ever need to swap providers or add a fallback, this is the only
// file that changes — nothing in components/actions should know it's Groq.

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Fast + solid instruction-following model on Groq at time of writing.
// Confirm current model availability at console.groq.com/docs/models —
// Groq's fastest-available model changes over time.
const MODEL = 'llama-3.3-70b-versatile';

export async function generateText(params: { system?: string; prompt: string; temperature?: number }) {
  const completion = await client.chat.completions.create({
    model: MODEL,
    temperature: params.temperature ?? 0.6,
    messages: [
      ...(params.system ? [{ role: 'system' as const, content: params.system }] : []),
      { role: 'user' as const, content: params.prompt },
    ],
  });

  return completion.choices[0]?.message?.content ?? '';
}

export async function chat(messages: { role: 'system' | 'user' | 'assistant'; content: string }[]) {
  const completion = await client.chat.completions.create({
    model: MODEL,
    temperature: 0.6,
    messages,
  });

  return completion.choices[0]?.message?.content ?? '';
}

/**
 * Extracts structured profile fields from free-form text (voice transcript,
 * pasted CV text, chat answers). Returns JSON — no validation library wired
 * in yet; add zod parsing here once the shape stabilizes from real testing.
 */
export async function extractProfileFromText(rawText: string) {
  const system = `Eres un asistente que extrae información de perfil profesional de texto en español.
Responde ÚNICAMENTE con JSON válido, sin texto adicional, con esta forma:
{
  "experiencia": [{ "puesto": "", "empresa": "", "descripcion": "" }],
  "educacion": [{ "titulo": "", "institucion": "" }],
  "habilidades": ["..."],
  "intereses": ["..."]
}`;

  const raw = await generateText({ system, prompt: rawText, temperature: 0.2 });

  try {
    return JSON.parse(raw);
  } catch {
    // Despite instructions, the model sometimes wraps the JSON in a
    // markdown code fence or adds a leading/trailing sentence. Try
    // pulling out the first balanced-looking {...} block before giving up.
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        // fall through to the logged failure below
      }
    }
    console.error('extractProfileFromText: failed to parse model output as JSON', raw);
    // MVP fallback: surface the raw text so the UI can still show something
    // and the user can correct it manually, instead of a hard failure.
    return { experiencia: [], educacion: [], habilidades: [], intereses: [], _raw: raw };
  }
}
