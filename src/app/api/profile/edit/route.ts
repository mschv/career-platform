import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { editProfileWithInstruction } from '@/lib/ai/groq';
import { computeCompleteness } from '@/lib/profile';

// Backs the "Editar con el asistente" panel on /profile — takes one free-text
// instruction, applies it to the caller's existing profile via the model,
// and persists the result. Requires an authenticated session; the update
// relies on RLS (`auth.uid() = user_id`), not a service-role key.
export async function POST(req: NextRequest) {
  try {
    const { instruction } = await req.json();

    if (!instruction || typeof instruction !== 'string' || !instruction.trim()) {
      return NextResponse.json({ error: 'Escribe qué quieres cambiar de tu perfil.' }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'No hay una sesión activa.' }, { status: 401 });
    }

    const { data: existing, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'No encontramos tu perfil.' }, { status: 404 });
    }

    const updated = await editProfileWithInstruction(existing, instruction);
    const fields = {
      experiencia: Array.isArray(updated.experiencia) ? updated.experiencia : existing.experiencia,
      educacion: Array.isArray(updated.educacion) ? updated.educacion : existing.educacion,
      habilidades: Array.isArray(updated.habilidades) ? updated.habilidades : existing.habilidades,
      intereses: Array.isArray(updated.intereses) ? updated.intereses : existing.intereses,
      suggested_roles: Array.isArray(updated.suggested_roles) ? updated.suggested_roles : existing.suggested_roles,
      upskilling_suggestions: Array.isArray(updated.upskilling_suggestions)
        ? updated.upskilling_suggestions
        : existing.upskilling_suggestions,
    };

    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...fields,
        completeness: computeCompleteness(fields),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error(error);
      return NextResponse.json({ error: 'No pudimos actualizar tu perfil. Intenta de nuevo.' }, { status: 500 });
    }

    return NextResponse.json({ profile: data });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'No pudimos actualizar tu perfil. Intenta de nuevo.' }, { status: 500 });
  }
}
