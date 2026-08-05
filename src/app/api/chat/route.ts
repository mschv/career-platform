import { NextRequest, NextResponse } from 'next/server';
import { chat } from '@/lib/ai/groq';

const SYSTEM_PROMPT = `Eres el asistente de onboarding de Impulsa, una plataforma que ayuda a
recién egresados a armar su perfil profesional. Haz una pregunta a la vez, en
español, tono cercano y motivador (nunca condescendiente). Pregunta por
experiencia (proyectos, prácticas, trabajos, voluntariados), habilidades, y qué
tipo de rol está buscando. Si el usuario ya dio suficiente información, dile
que puede pasar a revisar su perfil.`;

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
