# Impulsa — MVP scaffold

Plataforma de perfil profesional + generación de documentos con IA, en español,
para recién egresados. Este scaffold prioriza que se vea y se sienta bien en
una demo — la mayoría de las pantallas usan datos de ejemplo (mock) y están
marcadas con `// MVP note:` donde falta conectar el backend real.

## Cómo correrlo

```bash
npm install
cp .env.example .env.local   # llena las llaves (ver abajo)
npm run dev
```

Abre `http://localhost:3000`. Las páginas `/`, `/onboarding`, `/profile` y
`/applications` funcionan visualmente sin llaves configuradas — solo el chat
de onboarding y la generación real de documentos necesitan `GROQ_API_KEY`
para responder de verdad.

### Llaves necesarias

1. **Supabase**: crea un proyecto en supabase.com, corre `supabase/schema.sql`
   en el SQL editor, y copia `Project URL` + `anon public key` a `.env.local`.
2. **Groq**: crea una llave en console.groq.com/keys.

## Qué está realmente conectado vs. qué es mock

| Pantalla | Estado |
|---|---|
| `/` (landing) | Completo, sin backend |
| `/login` | Conectado a Supabase Auth (magic link) |
| `/onboarding` | Chat conectado a Groq vía `/api/chat`. Adjuntar CV (PDF/DOCX/MD/TXT) extrae el texto de verdad vía `/api/onboarding/extract` y lo manda al chat. Dictado por voz funciona con la Web Speech API del navegador (mejor soporte en Chrome) |
| `/profile` | UI completa, datos de ejemplo (mock). Falta conectar a la tabla `profiles` |
| `/applications` | UI completa, datos de ejemplo (mock). Falta conectar a la tabla `applications` |
| `/applications/[id]` | UI completa, edición local en memoria. Falta persistir en `application_documents` y conectar el chat a una edición real del documento |

## Advertencias sobre lo que SÍ está conectado (multimodal)

Estas dos son el corazón de la propuesta de valor, así que están implementadas
de verdad — no como stub. Aun así, ten esto en cuenta antes de tu demo:

- **Extracción de PDF/DOCX** (`/api/onboarding/extract`): funciona con texto
  real. Si el PDF es una imagen escaneada (sin capa de texto), no va a
  extraer nada — el endpoint devuelve un mensaje pidiendo que lo cuenten por
  texto o voz en ese caso. Pruébalo con 2-3 CVs reales de tu público objetivo
  antes del testing para confirmar que el formato es compatible.
- **Dictado por voz**: usa la Web Speech API del navegador — funciona bien en
  Chrome/Edge, soporte limitado o nulo en Firefox y Safari. Si vas a hacer
  testing presencial, asegúrate que los dispositivos de los testers usen
  Chrome, o avísales antes. Esto es una limitación del navegador, no de tu
  código — no hay forma de evitarla sin un backend de transcripción (ej.
  Whisper), que sería más robusto pero añade costo y latencia.

## Lo que dejamos fuera del MVP (y por qué)

Estas piezas añaden complejidad que no vale la pena para una demo de tesis de
1-2 meses. Si el testing va bien y quieres avanzar a producción, este es el
orden en que las agregaría:

1. **Historial de versiones de documentos** — el esquema SQL solo guarda la
   versión más reciente de cada documento. Guardar historial completo es una
   tabla más y lógica de diffing — no es necesario para probar si la gente
   paga por el producto.
2. **pgvector / búsqueda semántica** — útil si luego quieres "match" real
   entre perfil y ofertas de trabajo scrapeadas. No lo actives hasta que esa
   feature esté en el roadmap real.
3. **Streaming de respuestas de IA** — hoy el chat espera la respuesta
   completa antes de mostrarla. Para respuestas largas (carta completa) se
   siente más lento de lo que es. Si notas que los testers se quejan de
   lentitud, migra `chat()` en `lib/ai/groq.ts` a modo streaming — es un
   cambio contenido a un solo archivo gracias a la capa de abstracción.
4. **Middleware de refresco de sesión de Supabase** — el cliente de servidor
   ya está preparado para esto (ver comentarios en `lib/supabase/server.ts`)
   pero no agregué el middleware — para una demo corta, el usuario
   simplemente vuelve a entrar si la sesión expira. Agrégalo antes de un
   lanzamiento real.
5. **Multi-proveedor de IA** — `lib/ai/groq.ts` ya aísla todas las llamadas
   a Groq detrás de funciones (`generateText`, `chat`,
   `extractProfileFromText`). Si más adelante quieres comparar calidad con
   otro proveedor para documentos largos, ese es el único archivo que
   tocarías — no construí un sistema de fallback automático porque para una
   sola demo es sobre-ingeniería.
6. **OCR para imágenes** — si alguien sube una foto de un certificado o CV
   escaneado, hoy el endpoint rechaza el archivo con un mensaje claro en vez
   de fallar en silencio. OCR real (ej. Tesseract, o un modelo con visión) es
   una pieza más grande — solo la agregaría si el testing muestra que la
   gente realmente intenta subir imágenes con frecuencia.

## Estructura

```
src/
  app/
    page.tsx                  # landing
    login/page.tsx
    onboarding/page.tsx        # chat multimodal de creación de perfil
    profile/page.tsx
    applications/page.tsx      # tablero por status
    applications/[id]/page.tsx # documento + chat lateral
    api/chat/route.ts          # endpoint que llama a Groq
  components/
    ThemeRegistry.tsx          # wiring de MUI + Emotion (no tocar)
    AppNav.tsx
    GrowthRing.tsx             # elemento de marca — anillo de progreso
  lib/
    theme.ts                   # tokens de diseño
    ai/groq.ts                 # toda llamada a IA pasa por aquí
    supabase/client.ts         # cliente de navegador
    supabase/server.ts         # cliente de servidor
supabase/schema.sql            # esquema + políticas RLS
```

## Identidad visual

Paleta y tipografía están centralizadas en `src/lib/theme.ts` (`tokens`).
Verde bosque + dorado sobre fondo papel, Fraunces para títulos + Inter para
cuerpo. El anillo de progreso (`GrowthRing`) es el elemento de marca — úsalo
en cualquier lugar donde antes pondrías una barra de progreso genérica.
