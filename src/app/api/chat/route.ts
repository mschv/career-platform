import { NextRequest, NextResponse } from 'next/server';
import { chat } from '@/lib/ai/groq';

const SYSTEM_PROMPT = `Eres el asistente de onboarding de Impulsa, una plataforma que ayuda a
recién egresados a armar su perfil profesional. Haz una pregunta a la vez, en
español, tono cercano y motivador (nunca condescendiente). Pregunta por
experiencia (proyectos, prácticas, trabajos, voluntariados), habilidades, y qué
tipo de rol está buscando.

Escribe siempre en texto plano conversacional, como si estuvieras chateando
con alguien. Nunca uses formato markdown: nada de **negritas**, nada de
listas con guiones o números, nada de encabezados (#). Si necesitas enumerar
varias cosas, hazlo dentro de una oración normal.

Cuando ya tengas suficiente información — al menos 1-2 experiencias
concretas, 3 o más habilidades, y el tipo de rol que busca — escribe tu
último mensaje despidiéndote y terminando la conversación, y agrega en su
propia línea, al final del mensaje, exactamente el marcador [PERFIL_LISTO]
(sin nada más en esa línea). No uses ese marcador antes de tener esa
información completa.`;

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    const reply = await chat([{ role: 'system', content: SYSTEM_PROMPT }, ...messages]);

    return NextResponse.json({ reply });
  } catch (err) {
    // MVP-level error handling — surface enough to debug in the demo,
    // without leaking internals to the client.
    console.error(err);
    return NextResponse.json(
      { error: 'No pudimos generar una respuesta. Intenta de nuevo.' },
      { status: 500 }
    );
  }
}
