import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { reviseDocument, type DocType } from '@/lib/ai/groq';

const VALID_TYPES: DocType[] = ['cv', 'cover_letter'];

// Side-chat edit: applies one instruction to the existing document via the
// model and persists both the new content and the chat turn.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: applicationId } = await params;
    const { type, instruction } = await req.json();

    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: 'Tipo de documento inválido.' }, { status: 400 });
    }
    if (!instruction || typeof instruction !== 'string' || !instruction.trim()) {
      return NextResponse.json({ error: 'Escribe qué quieres cambiar del documento.' }, { status: 400 });
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

    const { data: existingDoc, error: docError } = await supabase
      .from('application_documents')
      .select('*')
      .eq('application_id', applicationId)
      .eq('type', type)
      .maybeSingle();

    if (docError || !existingDoc) {
      return NextResponse.json({ error: 'Genera el documento antes de editarlo con el asistente.' }, { status: 400 });
    }

    const revised = await reviseDocument({
      type,
      currentContent: existingDoc.content,
      instruction,
    });

    const chatHistory = Array.isArray(existingDoc.chat_history) ? existingDoc.chat_history : [];
    const reply = 'Hecho — ajusté el documento. Revísalo a la derecha y dime si quieres algo más.';
    const updatedChatHistory = [
      ...chatHistory,
      { role: 'user', content: instruction },
      { role: 'assistant', content: reply },
    ];

    const { data, error } = await supabase
      .from('application_documents')
      .update({ content: revised, chat_history: updatedChatHistory, updated_at: new Date().toISOString() })
      .eq('id', existingDoc.id)
      .select()
      .single();

    if (error) {
      console.error(error);
      return NextResponse.json({ error: 'No pudimos actualizar el documento.' }, { status: 500 });
    }

    return NextResponse.json({ document: data, reply });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'No pudimos actualizar el documento.' }, { status: 500 });
  }
}
