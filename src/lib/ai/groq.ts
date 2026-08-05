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

const PROFILE_JSON_SHAPE = `{
  "experiencia": [{ "puesto": "", "empresa": "", "descripcion": "" }],
  "educacion": [{ "titulo": "", "institucion": "" }],
  "habilidades": ["..."],
  "intereses": ["..."],
  "suggested_roles": [{ "role": "", "why": "" }],
  "upskilling_suggestions": ["..."]
}`;

// Despite instructions, the model sometimes wraps JSON in a markdown code
// fence or adds a leading/trailing sentence. Try pulling out the first
// balanced-looking {...} block before giving up.
function parseProfileJson(raw: string, callerLabel: string) {
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        // fall through to the logged failure below
      }
    }
    console.error(`${callerLabel}: failed to parse model output as JSON`, raw);
    // MVP fallback: surface the raw text so the UI can still show something
    // and the user can correct it manually, instead of a hard failure.
    return { experiencia: [], educacion: [], habilidades: [], intereses: [], _raw: raw };
  }
}

/**
 * Extracts structured profile fields from free-form text (voice transcript,
 * pasted CV text, chat answers). Returns JSON — no validation library wired
 * in yet; add zod parsing here once the shape stabilizes from real testing.
 */
export async function extractProfileFromText(rawText: string) {
  const system = `Eres un asistente que extrae información de perfil profesional de texto en español.
Responde ÚNICAMENTE con JSON válido, sin texto adicional, con esta forma:
${PROFILE_JSON_SHAPE}

Para suggested_roles, sugiere 2-4 roles laborales que le podrían quedar bien
dada su experiencia, habilidades e intereses, cada uno con una razón breve
("why") en español. Para upskilling_suggestions, sugiere 2-4 habilidades o
áreas concretas que le convendría desarrollar para avanzar en esos roles. Si
la información es insuficiente para sugerir algo con confianza, devuelve un
array vacío en ese campo en vez de inventar contenido genérico.`;

  const raw = await generateText({ system, prompt: rawText, temperature: 0.2 });
  return parseProfileJson(raw, 'extractProfileFromText');
}

/**
 * Applies a single free-text edit instruction (e.g. "agrega Python a mis
 * habilidades") to an already-extracted profile. Returns the full updated
 * profile JSON — the model is instructed to change only what the
 * instruction asks for and leave everything else as-is.
 */
export async function editProfileWithInstruction(
  currentProfile: {
    experiencia?: unknown[];
    educacion?: unknown[];
    habilidades?: unknown[];
    intereses?: unknown[];
    suggested_roles?: unknown[];
    upskilling_suggestions?: unknown[];
  },
  instruction: string
) {
  const system = `Eres un asistente que edita un perfil profesional en español a partir de una
instrucción del usuario. Se te da el perfil actual en JSON y una instrucción de edición.
Aplica ÚNICAMENTE el cambio pedido y deja todo lo demás exactamente igual — no reescribas ni
"mejores" campos que no te pidieron cambiar. Si la instrucción implica que la lista de roles
sugeridos o de ideas para crecer ya no encaja con el perfil actualizado, puedes ajustarlas
también; si no, déjalas igual. Responde ÚNICAMENTE con el perfil COMPLETO actualizado como
JSON válido, sin texto adicional, con esta forma exacta:
${PROFILE_JSON_SHAPE}`;

  const prompt = `Perfil actual:\n${JSON.stringify(currentProfile)}\n\nInstrucción: ${instruction}`;

  const raw = await generateText({ system, prompt, temperature: 0.2 });
  return parseProfileJson(raw, 'editProfileWithInstruction');
}
