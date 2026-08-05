import { NextRequest, NextResponse } from 'next/server';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

// Needs the Node.js runtime (not edge) — pdf-parse and mammoth both
// depend on Node APIs.
export const runtime = 'nodejs';

// Keeps prompt size (and Groq token cost) predictable. A CV rarely needs
// more than this; if you see real CVs getting cut off, raise it.
const MAX_CHARS = 8000;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No se recibió ningún archivo.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const name = file.name.toLowerCase();
    let text = '';

    if (name.endsWith('.pdf')) {
      const data = await pdfParse(buffer);
      text = data.text;
    } else if (name.endsWith('.docx')) {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else if (name.endsWith('.md') || name.endsWith('.txt')) {
      text = buffer.toString('utf-8');
    } else {
      // Images (fotos de certificados, etc.) need OCR, which is a separate
      // pipeline — out of scope for the MVP. Fail clearly instead of
      // silently doing nothing.
      return NextResponse.json(
        {
          error:
            'Por ahora soportamos PDF, DOCX, MD y TXT. Para imágenes, cuéntame el contenido por texto o voz mientras tanto.',
        },
        { status: 415 }
      );
    }

    text = text.trim().slice(0, MAX_CHARS);

    if (!text) {
      return NextResponse.json(
        { error: 'No pudimos leer texto de ese archivo — ¿puede ser una copia escaneada? Cuéntamelo por texto o voz.' },
        { status: 422 }
      );
    }

    return NextResponse.json({ text, truncated: text.length === MAX_CHARS });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'No pudimos procesar ese archivo. Intenta de nuevo.' }, { status: 500 });
  }
}
