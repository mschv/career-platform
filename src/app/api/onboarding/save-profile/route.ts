import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractProfileFromText } from '@/lib/ai/groq';
import { computeCompleteness } from '@/lib/profile';

// Called right after the user lands back from the magic link, with the
// onboarding transcript recovered from localStorage. Requires an
// authenticated session (established via the cookie the magic-link
// redirect just set) — the upsert relies on RLS (`auth.uid() = user_id`),
// not a service-role key.
export async function POST(req: NextRequest) {
  try {
    const { transcript } = await req.json();

    if (!transcript || typeof transcript !== 'string') {
      return NextResponse.json({ error: 'Falta la conversación a guardar.' }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'No hay una sesión activa.' }, { status: 401 });
    }

    const extracted = await extractProfileFromText(transcript);
    const fields = {
      experiencia: Array.isArray(extracted.experiencia) ? extracted.experiencia : [],
      educacion: Array.isArray(extracted.educacion) ? extracted.educacion : [],
      habilidades: Array.isArray(extracted.habilidades) ? extracted.habilidades : [],
      intereses: Array.isArray(extracted.intereses) ? extracted.intereses : [],
      suggested_roles: Array.isArray(extracted.suggested_roles) ? extracted.suggested_roles : [],
      upskilling_suggestions: Array.isArray(extracted.upskilling_suggestions)
        ? extracted.upskilling_suggestions
        : [],
    };

    const { data, error } = await supabase
      .from('profiles')
      .upsert(
        {
          user_id: user.id,
          ...fields,
          completeness: computeCompleteness(fields),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single();

    if (error) {
      console.error(error);
      return NextResponse.json({ error: 'No pudimos guardar tu perfil. Intenta de nuevo.' }, { status: 500 });
    }

    return NextResponse.json({ profile: data });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'No pudimos guardar tu perfil. Intenta de nuevo.' }, { status: 500 });
  }
}
