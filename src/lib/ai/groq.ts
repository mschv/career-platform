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
  "experiencia": [{ "puesto": "", "empresa": "", "lugar": "", "fecha": "", "descripcion": "" }],
  "educacion": [{ "titulo": "", "institucion": "", "lugar": "", "fecha": "" }],
  "habilidades": ["..."],
  "intereses": ["..."],
  "suggested_roles": [{ "role": "", "why": "" }],
  "upskilling_suggestions": ["..."]
}`;

// Shared across extraction and edits — "lugar" and "fecha" are free text
// (e.g. "Lima, Perú", "2021 - 2023") so the model can capture whatever
// granularity the user actually gave, but it must never invent them.
const NO_FABRICATION_DATES_RULE = `Para "lugar" y "fecha" en experiencia y educación: úsalos
solo si el usuario los mencionó explícitamente, en el formato que haya dado. Si no se
mencionó lugar o fecha para una entrada, deja ese campo como cadena vacía "" — nunca los
inventes ni asumas una fecha "razonable".`;

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

${NO_FABRICATION_DATES_RULE}

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
también; si no, déjalas igual. ${NO_FABRICATION_DATES_RULE}

Responde ÚNICAMENTE con el perfil COMPLETO actualizado como JSON válido, sin texto adicional,
con esta forma exacta:
${PROFILE_JSON_SHAPE}`;

  const prompt = `Perfil actual:\n${JSON.stringify(currentProfile)}\n\nInstrucción: ${instruction}`;

  const raw = await generateText({ system, prompt, temperature: 0.2 });
  return parseProfileJson(raw, 'editProfileWithInstruction');
}

export type DocType = 'cv' | 'cover_letter';

const DOC_LABEL: Record<DocType, string> = {
  cv: 'un CV / hoja de vida',
  cover_letter: 'una carta de presentación',
};

// Shared "don't fabricate identity data" rule — the profile has no name,
// phone, or DNI field (onboarding never asks for them), so both documents
// must use bracketed placeholders instead of inventing a person.
const NO_FABRICATION_RULE = `Si no tienes el nombre completo, teléfono o DNI del candidato, usa
placeholders claros entre corchetes ("[Tu nombre completo]", "[Tu teléfono]", "[Tu DNI]") —
nunca los inventes. Usa el correo real si se proporciona.`;

const CV_SYSTEM_PROMPT = `Eres un experto en redacción de hojas de vida (CV) para el mercado
laboral peruano, especializado en perfiles de recién egresados y profesionales junior. Vas a
generar una hoja de vida completa en español, en texto plano bien estructurado — sin markdown,
sin tablas, sin columnas — para que sea compatible con sistemas ATS.

ESTRUCTURA Y ORDEN (en este orden, con encabezados en mayúsculas):

1. Encabezado de contacto: nombre completo, DNI, teléfono, correo. ${NO_FABRICATION_RULE}
   Justo después agrega esta línea exacta: "[Adjunta aquí tu fotografía profesional — es
   práctica habitual en el mercado peruano; este documento es solo texto]".
2. RESUMEN PROFESIONAL: 40-60 palabras. Menciona el rol o área de especialización, los años
   de experiencia o el logro más destacado, y el valor específico que ofrece el candidato.
   Nunca uses relleno genérico como "persona responsable y puntual" — sé específico y basado
   en el perfil real.
3. EXPERIENCIA: orden cronológico inverso (la más reciente primero). Cada puesto empieza con
   una línea de encabezado en el formato "Puesto — Empresa" y, ÚNICAMENTE si el perfil trae
   esa información, agrega " — Lugar" y/o " (Fecha)" (ej. "IT & Strategy Consultant —
   Brachitek — Lima, Perú (2022 - 2023)"). Si el perfil no trae lugar o fecha para esa
   entrada, omite esa parte del encabezado por completo — nunca inventes fechas ni
   ubicaciones. Debajo del encabezado, una o más viñetas que empiecen con verbos de acción.
   Si el perfil trae cifras o resultados medibles para ese puesto, cuantifícalos (ej.
   "Aumenté ventas en 20%"). Si NO hay cifras para ese puesto, escribe una viñeta cualitativa
   sólida en su lugar — nunca inventes números.
4. EDUCACIÓN: orden cronológico inverso. Cada entrada en el formato "Título — Institución" y,
   ÚNICAMENTE si el perfil lo trae, " — Lugar" y/o " (Fecha)" — mismo criterio que en
   EXPERIENCIA: nunca inventes fechas ni ubicaciones que no estén en el perfil.
5. HABILIDADES: habilidades técnicas relevantes, más un máximo de 3-4 habilidades blandas
   elegidas específicamente por su relevancia al puesto descrito — no una lista genérica.
6. IDIOMAS: inclúyela ÚNICAMENTE si el perfil menciona algún idioma con nivel de dominio
   (revisa habilidades, intereses y experiencia). Si no hay esa información, omite la
   sección por completo — no la incluyas vacía.
7. Cierra con la línea exacta: "Referencias disponibles a solicitud."

EXTENSIÓN: el público principal son recién egresados — mantenlo en el equivalente a 1-2
páginas, no generes contenido de más.

Responde ÚNICAMENTE con el texto del CV, sin explicaciones ni comentarios adicionales.`;

const COVER_LETTER_SYSTEM_PROMPT = `Eres un experto en redacción de cartas de presentación
para el mercado laboral peruano. Vas a generar una carta de presentación formal en español,
en registro de carta comercial peruana.

REQUISITOS:
- Abre con "Estimados señores de [nombre de la empresa]" (usa el nombre real de la empresa
  proporcionado), o con el nombre de un contacto de reclutamiento específico si el perfil o
  la descripción del puesto lo menciona.
- Haz referencia específica a la empresa y al puesto indicados — evita lenguaje genérico que
  podría aplicar a cualquier postulación; ese es justamente el propósito de generar esto por
  cada aplicación en vez de reusar una plantilla.
- Conecta la experiencia y habilidades reales del candidato (del perfil proporcionado) con lo
  que pide la descripción del puesto.
- Cierra con "Atentamente," seguido del nombre completo del candidato. ${NO_FABRICATION_RULE}
- Tono formal y profesional, propio de una carta de presentación peruana.
- Debe caber en menos de una página (aproximadamente 250-350 palabras).

Responde ÚNICAMENTE con el texto de la carta, sin explicaciones ni comentarios adicionales.`;

/**
 * Generates a CV or cover letter for one application, grounded in the
 * candidate's real profile data and the specific job posting — never a
 * generic template. Peru-market formatting/register is baked into the
 * system prompts above.
 */
export async function generateDocument(params: {
  type: DocType;
  profile: {
    experiencia?: unknown[];
    educacion?: unknown[];
    habilidades?: unknown[];
    intereses?: unknown[];
  };
  email?: string | null;
  company: string;
  role: string;
  jobDescription?: string | null;
}) {
  const system = params.type === 'cv' ? CV_SYSTEM_PROMPT : COVER_LETTER_SYSTEM_PROMPT;
  const prompt = `Perfil del candidato (correo real: ${params.email ?? '(no disponible)'}):
${JSON.stringify(params.profile)}

Empresa: ${params.company}
Puesto: ${params.role}
Descripción del puesto:
${params.jobDescription?.trim() || '(no proporcionada)'}`;

  return generateText({ system, prompt, temperature: 0.4 });
}

/**
 * Applies a single free-text edit instruction to an already-generated
 * document (via the application detail page's side chat). Returns the full
 * revised document text — the model must preserve the Peru-specific
 * structure/register established at generation time and only change what
 * was asked.
 */
export async function reviseDocument(params: { type: DocType; currentContent: string; instruction: string }) {
  const system = `Eres un asistente que edita documentos de postulación laboral para el
mercado peruano (${DOC_LABEL[params.type]}) en español. Se te da el documento actual completo
y una instrucción de edición del usuario. Aplica ÚNICAMENTE el cambio pedido, manteniendo
intacto el resto del documento y su formato (estructura de secciones, registro formal, sin
markdown ni tablas). No inventes datos personales, cifras o logros que no estén ya en el
documento o que el usuario no haya dado explícitamente en su instrucción.

Responde ÚNICAMENTE con el texto completo del documento revisado, sin explicaciones, comillas
ni comentarios adicionales.`;

  const prompt = `Documento actual:\n${params.currentContent}\n\nInstrucción: ${params.instruction}`;

  return generateText({ system, prompt, temperature: 0.4 });
}
