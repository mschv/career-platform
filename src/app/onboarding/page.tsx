'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Box,
  Container,
  Paper,
  Stack,
  TextField,
  IconButton,
  Typography,
  Avatar,
  Button,
  LinearProgress,
  Tooltip,
} from '@mui/material';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import AttachFileRoundedIcon from '@mui/icons-material/AttachFileRounded';
import MicRoundedIcon from '@mui/icons-material/MicRounded';
import { tokens } from '@/lib/theme';

// display: what renders in the bubble. content: what actually gets sent to
// the model. They differ for file uploads — nobody wants to read 6000
// characters of raw CV text in a chat bubble.
type Msg = { role: 'user' | 'assistant'; content: string; display?: string };

const INTRO: Msg = {
  role: 'assistant',
  content:
    'Hola 👋 Soy el asistente de Impulsa. Cuéntame de tu experiencia — puede ser un trabajo, una práctica, un proyecto de la universidad, o hasta un voluntariado. También puedes adjuntar tu CV (PDF o DOCX) o dictarlo con el micrófono.',
};

export default function OnboardingPage() {
  const [messages, setMessages] = useState<Msg[]>([INTRO]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Voice dictation (Web Speech API — client-side, no backend needed) ---
  const recognitionRef = useRef<any>(null);
  const [recording, setRecording] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-ES'; // works across most es-* dialects in practice
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      // Only append finalized segments — otherwise interim results duplicate
      // as the recognizer revises its guess mid-utterance.
      let finalChunk = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalChunk += event.results[i][0].transcript;
      }
      if (finalChunk.trim()) {
        setInput((prev) => (prev ? `${prev} ${finalChunk.trim()}` : finalChunk.trim()));
      }
    };

    recognition.onerror = () => setRecording(false);
    recognition.onend = () => setRecording(false);

    recognitionRef.current = recognition;
    return () => recognition.stop();
  }, []);

  function toggleRecording() {
    if (!voiceSupported || !recognitionRef.current) return;
    if (recording) {
      recognitionRef.current.stop();
      setRecording(false);
    } else {
      recognitionRef.current.start();
      setRecording(true);
    }
  }

  // --- Chat ---
  async function sendMessage(content: string, display?: string) {
    if (!content.trim()) return;
    const next: Msg[] = [...messages, { role: 'user', content, display }];
    setMessages(next);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Send content (not display) — the model needs the full text.
        body: JSON.stringify({ messages: next.map(({ role, content }) => ({ role, content })) }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: 'assistant', content: data.reply ?? data.error }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: 'Tuvimos un problema de conexión. ¿Puedes intentar de nuevo?' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  // --- File upload with real extraction ---
  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // allow re-selecting the same file later

    setExtracting(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/onboarding/extract', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) {
        setMessages((m) => [...m, { role: 'assistant', content: data.error }]);
        return;
      }

      await sendMessage(
        `Aquí está el contenido de mi archivo (${file.name}):\n\n${data.text}`,
        `📎 ${file.name}`
      );
    } catch {
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: 'No pudimos leer ese archivo. ¿Puedes intentar de nuevo?' },
      ]);
    } finally {
      setExtracting(false);
    }
  }

  const completeness = Math.min(90, messages.filter((m) => m.role === 'user').length * 18);

  return (
    <Box sx={{ bgcolor: tokens.color.bg, minHeight: '100vh' }}>
      <Container maxWidth="sm" sx={{ pt: 4, pb: 4 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography
            component={Link}
            href="/"
            sx={{ fontFamily: tokens.font.display, fontWeight: 600, fontSize: 20, color: 'primary.main', textDecoration: 'none' }}
          >
            Impulsa
          </Typography>
          <Button component={Link} href="/profile" size="small" sx={{ color: 'text.secondary' }}>
            Prefiero un formulario →
          </Button>
        </Stack>

        <Box sx={{ mb: 3 }}>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              Progreso del perfil
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {completeness}%
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={completeness}
            sx={{
              height: 8,
              borderRadius: 4,
              bgcolor: tokens.color.surfaceMuted,
              '& .MuiLinearProgress-bar': { bgcolor: tokens.color.accent, borderRadius: 4 },
            }}
          />
        </Box>

        <Paper
          variant="outlined"
          sx={{ p: 2, height: 440, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}
        >
          {messages.map((m, i) => (
            <Stack
              key={i}
              direction="row"
              spacing={1.5}
              sx={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}
            >
              {m.role === 'assistant' && (
                <Avatar sx={{ bgcolor: 'primary.main', width: 30, height: 30, fontSize: 14 }}>IA</Avatar>
              )}
              <Box
                sx={{
                  bgcolor: m.role === 'user' ? 'primary.main' : tokens.color.surfaceMuted,
                  color: m.role === 'user' ? '#fff' : 'text.primary',
                  px: 2,
                  py: 1.2,
                  borderRadius: `${tokens.radius.md}px`,
                  borderTopRightRadius: m.role === 'user' ? 4 : undefined,
                  borderTopLeftRadius: m.role === 'assistant' ? 4 : undefined,
                }}
              >
                <Typography variant="body2">{m.display ?? m.content}</Typography>
              </Box>
            </Stack>
          ))}
          {extracting && (
            <Typography variant="caption" color="text.secondary" sx={{ pl: 5 }}>
              Leyendo tu archivo…
            </Typography>
          )}
          {loading && (
            <Typography variant="caption" color="text.secondary" sx={{ pl: 5 }}>
              Escribiendo…
            </Typography>
          )}
        </Paper>

        {recording && (
          <Typography variant="caption" sx={{ color: tokens.color.danger, mb: 1, display: 'block' }}>
            ● Escuchando… habla con calma, toca el micrófono de nuevo para terminar.
          </Typography>
        )}

        <Stack direction="row" spacing={1} alignItems="flex-end">
          <Tooltip title="Adjuntar CV (PDF o DOCX)">
            <IconButton onClick={() => fileInputRef.current?.click()} sx={{ border: `1px solid ${tokens.color.border}` }}>
              <AttachFileRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <input ref={fileInputRef} type="file" hidden onChange={handleFileSelect} accept=".pdf,.docx,.md,.txt" />

          <Tooltip title={voiceSupported ? 'Dictar por voz' : 'Tu navegador no soporta dictado — prueba en Chrome'}>
            <span>
              <IconButton
                onClick={toggleRecording}
                disabled={!voiceSupported}
                sx={{
                  border: `1px solid ${recording ? tokens.color.danger : tokens.color.border}`,
                  color: recording ? tokens.color.danger : 'inherit',
                }}
              >
                <MicRoundedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>

          <TextField
            fullWidth
            placeholder="Escribe tu respuesta…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
            multiline
            maxRows={4}
          />
          <IconButton
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            sx={{ bgcolor: 'primary.main', color: '#fff', '&:hover': { bgcolor: 'primary.light' }, '&.Mui-disabled': { bgcolor: tokens.color.surfaceMuted } }}
          >
            <SendRoundedIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Container>
    </Box>
  );
}
