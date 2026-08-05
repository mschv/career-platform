import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Creates a new application in status='borrador'. Requires an authenticated
// session — relies on RLS (`auth.uid() = user_id`), not a service-role key.
export async function POST(req: NextRequest) {
  try {
    const { company, role, job_description } = await req.json();

    if (!company || typeof company !== 'string' || !company.trim()) {
      return NextResponse.json({ error: 'Falta el nombre de la empresa.' }, { status: 400 });
    }
    if (!role || typeof role !== 'string' || !role.trim()) {
      return NextResponse.json({ error: 'Falta el puesto.' }, { status: 400 });
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
      .insert({
        user_id: user.id,
        company: company.trim(),
        role: role.trim(),
        job_description: typeof job_description === 'string' && job_description.trim() ? job_description.trim() : null,
        status: 'borrador',
      })
      .select()
      .single();

    if (error) {
      console.error(error);
      return NextResponse.json({ error: 'No pudimos crear la aplicación.' }, { status: 500 });
    }

    return NextResponse.json({ application: data });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'No pudimos crear la aplicación.' }, { status: 500 });
  }
}
