import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateDocument, type DocType } from '@/lib/ai/groq';

const VALID_TYPES: DocType[] = ['cv', 'cover_letter'];

// `application_documents` has no unique constraint on (application_id,
// type), so upserts are done manually: look up the existing row, then
// update-by-id or insert.
async function upsertDocument(
  supabase: Awaited<ReturnType<typeof createClient>>,
  applicationId: string,
  type: DocType,
  content: string
) {
  const { data: existing } = await supabase
    .from('application_documents')
    .select('id')
    .eq('application_id', applicationId)
    .eq('type', type)
    .maybeSingle();

  const query = existing
    ? supabase
        .from('application_documents')
        .update({ content, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
    : supabase.from('application_documents').insert({ application_id: applicationId, type, content });

  return query.select().single();
}

// Generates a document (only if missing, or when `regenerate` is set) for
// one application + type, grounded in the caller's real profile data.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: applicationId } = await params;
    const { type, regenerate } = await req.json();

    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: 'Tipo de documento inválido.' }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'No hay una sesión activa.' }, { status: 401 });
    }

    const { data: application, error: appError } = await supabase
      .from('applications')
      .select('*')
      .eq('id', applicationId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (appError || !application) {
      return NextResponse.json({ error: 'No encontramos esa aplicación.' }, { status: 404 });
    }

    if (!regenerate) {
      const { data: existingDoc } = await supabase
        .from('application_documents')
        .select('*')
        .eq('application_id', applicationId)
        .eq('type', type)
        .maybeSingle();

      if (existingDoc) {
        return NextResponse.json({ document: existingDoc });
      }
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Necesitas completar tu perfil antes de generar documentos.' },
        { status: 400 }
      );
    }

    const content = await generateDocument({
      type,
      profile,
      email: user.email,
      company: application.company,
      role: application.role,
      jobDescription: application.job_description,
    });

    const { data, error } = await upsertDocument(supabase, applicationId, type, content);

    if (error) {
      console.error(error);
      return NextResponse.json({ error: 'No pudimos generar el documento.' }, { status: 500 });
    }

    return NextResponse.json({ document: data });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'No pudimos generar el documento.' }, { status: 500 });
  }
}

// Manual edits from the document text field — saved on blur, not on every
// keystroke.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: applicationId } = await params;
    const { type, content } = await req.json();

    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: 'Tipo de documento inválido.' }, { status: 400 });
    }
    if (typeof content !== 'string') {
      return NextResponse.json({ error: 'Falta el contenido del documento.' }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'No hay una sesión activa.' }, { status: 401 });
    }

    const { data: application, error: appError } = await supabase
      .from('applications')
      .select('id')
      .eq('id', applicationId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (appError || !application) {
      return NextResponse.json({ error: 'No encontramos esa aplicación.' }, { status: 404 });
    }

    const { data, error } = await upsertDocument(supabase, applicationId, type, content);

    if (error) {
      console.error(error);
      return NextResponse.json({ error: 'No pudimos guardar el documento.' }, { status: 500 });
    }

    return NextResponse.json({ document: data });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'No pudimos guardar el documento.' }, { status: 500 });
  }
}
