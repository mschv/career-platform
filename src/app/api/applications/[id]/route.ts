import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const VALID_STATUSES = ['borrador', 'aplicado', 'entrevista', 'oferta', 'rechazado'];

// Updates an application's status (column tracker moves / manual status
// change on the detail page). Scoped to the caller's own row both via RLS
// and an explicit user_id filter.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { status } = await req.json();

    if (typeof status !== 'string' || !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Estado inválido.' }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'No hay una sesión activa.' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('applications')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error(error);
      return NextResponse.json({ error: 'No pudimos actualizar el estado.' }, { status: 500 });
    }

    return NextResponse.json({ application: data });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'No pudimos actualizar el estado.' }, { status: 500 });
  }
}
