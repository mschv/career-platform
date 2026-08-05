'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Paper,
  Stack,
  TextField,
  Button,
  IconButton,
  Grid,
  Select,
  MenuItem,
  Avatar,
  Alert,
  CircularProgress,
} from '@mui/material';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import AutorenewRoundedIcon from '@mui/icons-material/AutorenewRounded';
import AppNav from '@/components/AppNav';
import { tokens } from '@/lib/theme';
import { createClient } from '@/lib/supabase/client';

type DocType = 'cv' | 'cover_letter';

type Application = {
  id: string;
  company: string;
  role: string;
  job_description: string | null;
  status: string;
};

type ChatMsg = { role: 'user' | 'assistant'; content: string };

type DocRow = {
  id: string;
  content: string;
  chat_history: ChatMsg[] | null;
};

type PageStatus = 'loading' | 'redirecting' | 'not-found' | 'ready';

const STATUS_OPTIONS = [
  { value: 'borrador', label: 'Borrador' },
  { value: 'aplicado', label: 'Aplicado' },
  { value: 'entrevista', label: 'Entrevista' },
  { value: 'oferta', label: 'Oferta' },
  { value: 'rechazado', label: 'Rechazado' },
];

const DOC_LABEL: Record<DocType, string> = { cv: 'tu CV', cover_letter: 'tu carta de presentación' };

function introMessage(type: DocType): ChatMsg {
  return {
    role: 'assistant',
    content: `Generé un primer borrador de ${DOC_LABEL[type]} para este puesto. Dime qué quieres ajustar.`,
  };
}

export default function ApplicationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const applicationId = params.id;

  const [pageStatus, setPageStatus] = useState<PageStatus>('loading');
  const [application, setApplication] = useState<Application | null>(null);
  const [docType, setDocType] = useState<DocType>('cv');
  const [docs, setDocs] = useState<Partial<Record<DocType, DocRow>>>({});
  const [content, setContent] = useState('');
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([introMessage('cv')]);
  const savedContentRef = useRef('');

  const loadDocument = useCallback(
    async (type: DocType, regenerate = false) => {
      setGenerating(true);
      setGenError(null);
      try {
        const res = await fetch(`/api/applications/${applicationId}/documents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, regenerate }),
        });
        const data = await res.json();

        if (!res.ok) {
          setGenError(data.error ?? 'No pudimos generar el documento.');
          return;
        }

        const doc: DocRow = data.document;
        setDocs((d) => ({ ...d, [type]: doc }));
        setContent(doc.content);
        savedContentRef.current = doc.content;
        setMessages(doc.chat_history && doc.chat_history.length > 0 ? doc.chat_history : [introMessage(type)]);
      } catch {
        setGenError('Tuvimos un problema de conexión. Intenta de nuevo.');
      } finally {
        setGenerating(false);
      }
    },
    [applicationId]
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (!cancelled) setPageStatus('redirecting');
        router.replace('/login');
        return;
      }

      const { data: app } = await supabase
        .from('applications')
        .select('id, company, role, job_description, status')
        .eq('id', applicationId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (cancelled) return;

      if (!app) {
        setPageStatus('not-found');
        return;
      }

      setApplication(app);
      setPageStatus('ready');
      loadDocument('cv');
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId, router]);

  function switchDoc(_: React.SyntheticEvent, value: DocType) {
    setDocType(value);
    const cached = docs[value];
    if (cached) {
      setContent(cached.content);
      savedContentRef.current = cached.content;
      setMessages(cached.chat_history && cached.chat_history.length > 0 ? cached.chat_history : [introMessage(value)]);
    } else {
      setContent('');
      loadDocument(value);
    }
  }

  async function saveManualEdit() {
    if (content === savedContentRef.current) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/applications/${applicationId}/documents`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: docType, content }),
      });
      const data = await res.json();
      if (res.ok) {
        savedContentRef.current = content;
        setDocs((d) => ({ ...d, [docType]: data.document }));
      }
    } finally {
      setSaving(false);
    }
  }

  async function sendEditRequest() {
    if (!chatInput.trim() || chatLoading) return;
    const instruction = chatInput;
    setMessages((m) => [...m, { role: 'user', content: instruction }]);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await fetch(`/api/applications/${applicationId}/documents/revise`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: docType, instruction }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessages((m) => [...m, { role: 'assistant', content: data.error ?? 'No pudimos aplicar ese cambio.' }]);
        return;
      }

      const doc: DocRow = data.document;
      setDocs((d) => ({ ...d, [docType]: doc }));
      setContent(doc.content);
      savedContentRef.current = doc.content;
      setMessages((m) => [...m, { role: 'assistant', content: data.reply }]);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: 'Tuvimos un problema de conexión. Intenta de nuevo.' }]);
    } finally {
      setChatLoading(false);
    }
  }

  async function handleStatusChange(newStatus: string) {
    if (!application) return;
    const previous = application.status;
    setApplication((a) => (a ? { ...a, status: newStatus } : a));
    setStatusSaving(true);
    try {
      const res = await fetch(`/api/applications/${applicationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        setApplication((a) => (a ? { ...a, status: previous } : a));
      }
    } catch {
      setApplication((a) => (a ? { ...a, status: previous } : a));
    } finally {
      setStatusSaving(false);
    }
  }

  async function downloadDocx() {
    const { Document, Packer, Paragraph, TextRun } = await import('docx');

    // Section headers are always these exact ALL-CAPS strings (baked into
    // the generation prompt in lib/ai/groq.ts); entry sub-headers ("Puesto
    // — Empresa — Lugar (Fecha)") always use an em dash "—", which plain
    // body text and bullet lines never contain — cheap, reliable hooks for
    // styling plain text into a properly formatted Word doc.
    const SECTION_HEADERS = new Set(['RESUMEN PROFESIONAL', 'EXPERIENCIA', 'EDUCACIÓN', 'HABILIDADES', 'IDIOMAS']);

    const lines = content.split('\n');
    const paragraphs = lines.map((line, i) => {
      const trimmed = line.trim();

      if (i === 0 && trimmed) {
        return new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: trimmed, bold: true, size: 32 })] });
      }
      if (SECTION_HEADERS.has(trimmed)) {
        return new Paragraph({
          spacing: { before: 240, after: 120 },
          children: [new TextRun({ text: trimmed, bold: true, size: 26 })],
        });
      }
      if (trimmed.startsWith('- ')) {
        return new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 60 },
          children: [new TextRun({ text: trimmed.slice(2), size: 22 })],
        });
      }
      if (!trimmed.startsWith('-') && trimmed.includes('—')) {
        return new Paragraph({ spacing: { before: 120 }, children: [new TextRun({ text: trimmed, bold: true, size: 22 })] });
      }
      if (!trimmed) {
        return new Paragraph({ text: '' });
      }
      return new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: trimmed, size: 22 })] });
    });

    const doc = new Document({ sections: [{ children: paragraphs }] });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${docType === 'cv' ? 'CV' : 'Carta de presentacion'} - ${application?.company ?? 'documento'}.docx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  if (pageStatus === 'loading' || pageStatus === 'redirecting') {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (pageStatus === 'not-found' || !application) {
    return (
      <Box sx={{ minHeight: '100vh' }}>
        <AppNav />
        <Container maxWidth="sm" sx={{ py: 10, textAlign: 'center' }}>
          <Typography variant="h5" sx={{ mb: 1.5 }}>
            No encontramos esa aplicación
          </Typography>
          <Button variant="contained" onClick={() => router.push('/applications')}>
            Volver a mis aplicaciones
          </Button>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh' }}>
      <AppNav />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
          <Box>
            <Typography variant="h4" sx={{ fontSize: 26 }}>
              {application.role}
            </Typography>
            <Typography color="text.secondary">{application.company}</Typography>
          </Box>
          <Select
            size="small"
            value={application.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={statusSaving}
            sx={{ bgcolor: tokens.color.surfaceMuted, fontWeight: 600, minWidth: 150 }}
          >
            {STATUS_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </Stack>

        <Tabs value={docType} onChange={switchDoc} sx={{ my: 2, borderBottom: `1px solid ${tokens.color.border}` }}>
          <Tab value="cv" label="CV" />
          <Tab value="cover_letter" label="Carta de presentación" />
        </Tabs>

        {genError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {genError}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Side chat */}
          <Grid item xs={12} md={4}>
            <Paper
              variant="outlined"
              sx={{ p: 2, height: 'calc(100vh - 300px)', minHeight: 420, display: 'flex', flexDirection: 'column' }}
            >
              <Box sx={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1.5, mb: 1 }}>
                {messages.map((m, i) => (
                  <Stack
                    key={i}
                    direction="row"
                    spacing={1}
                    sx={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '90%' }}
                  >
                    {m.role === 'assistant' && (
                      <Avatar sx={{ bgcolor: 'primary.main', width: 26, height: 26, fontSize: 12 }}>IA</Avatar>
                    )}
                    <Box
                      sx={{
                        bgcolor: m.role === 'user' ? 'primary.main' : tokens.color.surfaceMuted,
                        color: m.role === 'user' ? '#fff' : 'text.primary',
                        px: 1.5,
                        py: 1,
                        borderRadius: 2,
                      }}
                    >
                      <Typography variant="body2">{m.content}</Typography>
                    </Box>
                  </Stack>
                ))}
                {chatLoading && (
                  <Typography variant="caption" color="text.secondary" sx={{ pl: 4.5 }}>
                    Escribiendo…
                  </Typography>
                )}
              </Box>
              <Stack direction="row" spacing={1}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Ej: hazlo más conciso…"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendEditRequest()}
                  disabled={generating || chatLoading}
                />
                <IconButton
                  onClick={sendEditRequest}
                  disabled={generating || chatLoading || !chatInput.trim()}
                  sx={{ bgcolor: 'primary.main', color: '#fff' }}
                >
                  <SendRoundedIcon fontSize="small" />
                </IconButton>
              </Stack>
            </Paper>
          </Grid>

          {/* Document editor */}
          <Grid item xs={12} md={8}>
            <Paper
              variant="outlined"
              sx={{ p: 0, height: 'calc(100vh - 300px)', minHeight: 420, display: 'flex', flexDirection: 'column' }}
            >
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ p: 1.5, borderBottom: `1px solid ${tokens.color.border}` }}
              >
                <Typography variant="caption" color="text.secondary">
                  {saving ? 'Guardando…' : ''}
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    startIcon={<AutorenewRoundedIcon />}
                    onClick={() => loadDocument(docType, true)}
                    disabled={generating}
                  >
                    Regenerar
                  </Button>
                  <Button
                    size="small"
                    startIcon={<DownloadRoundedIcon />}
                    onClick={downloadDocx}
                    disabled={generating || !content.trim()}
                  >
                    Descargar .docx
                  </Button>
                </Stack>
              </Stack>
              {generating ? (
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Stack alignItems="center" spacing={1.5}>
                    <CircularProgress size={24} />
                    <Typography variant="body2" color="text.secondary">
                      Generando {DOC_LABEL[docType]}…
                    </Typography>
                  </Stack>
                </Box>
              ) : (
                // A plain scrollable textarea, not MUI's `multiline` TextField — that one
                // auto-grows to fit its content via react-textarea-autosize, which fights a
                // fixed-height flex parent and made content overflow the box instead of
                // scrolling inside it.
                <Box
                  component="textarea"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onBlur={saveManualEdit}
                  sx={{
                    flex: 1,
                    width: '100%',
                    minHeight: 0,
                    boxSizing: 'border-box',
                    p: 3,
                    border: 'none',
                    outline: 'none',
                    resize: 'none',
                    overflowY: 'auto',
                    bgcolor: 'transparent',
                    color: 'text.primary',
                    fontFamily: tokens.font.body,
                    fontSize: 14,
                    lineHeight: 1.7,
                  }}
                />
              )}
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
