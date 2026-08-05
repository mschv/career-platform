'use client';

import { useState } from 'react';
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
  Chip,
  Avatar,
} from '@mui/material';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import AppNav from '@/components/AppNav';
import { tokens } from '@/lib/theme';

type DocType = 'cv' | 'cover_letter';

const mockDocs: Record<DocType, string> = {
  cv: `MARÍA GONZÁLEZ
UX Researcher Jr.

EXPERIENCIA
Practicante de UX — Estudio Coral
Investigación de usuarios y prototipos para app móvil de 20K+ usuarios activos.

Proyecto de tesis — Universidad Nacional
Diseño e implementación de plataforma web con IA para orientación de carrera.

HABILIDADES
Figma, investigación de usuarios, React, Next.js, comunicación`,
  cover_letter: `Estimado equipo de contratación,

Me entusiasma postular a la posición de UX Researcher Jr. en su equipo...`,
};

// MVP note: this page is UI-complete but uses local state for the document
// text. Wire it to `application_documents` (see supabase/schema.sql) and to
// /api/chat (extended with a "rewrite this document section" system prompt)
// to make edits persist and the chat actually modify the doc.
export default function ApplicationDetailPage() {
  const [docType, setDocType] = useState<DocType>('cv');
  const [content, setContent] = useState(mockDocs.cv);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Generé un primer borrador de tu CV para este puesto. Dime qué quieres ajustar.' },
  ]);

  function switchDoc(_: React.SyntheticEvent, value: DocType) {
    setDocType(value);
    setContent(mockDocs[value]);
  }

  function sendEditRequest() {
    if (!chatInput.trim()) return;
    setMessages((m) => [
      ...m,
      { role: 'user', content: chatInput },
      { role: 'assistant', content: 'Hecho — ajusté el documento. Revísalo a la derecha y dime si quieres algo más.' },
    ]);
    setChatInput('');
  }

  return (
    <Box sx={{ minHeight: '100vh' }}>
      <AppNav />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
          <Box>
            <Typography variant="h4" sx={{ fontSize: 26 }}>
              UX Researcher Jr.
            </Typography>
            <Typography color="text.secondary">Estudio Coral</Typography>
          </Box>
          <Chip label="Aplicado" sx={{ bgcolor: tokens.color.surfaceMuted, fontWeight: 600 }} />
        </Stack>

        <Tabs value={docType} onChange={switchDoc} sx={{ my: 2, borderBottom: `1px solid ${tokens.color.border}` }}>
          <Tab value="cv" label="CV" />
          <Tab value="cover_letter" label="Carta de presentación" />
        </Tabs>

        <Grid container spacing={3}>
          {/* Side chat */}
          <Grid item xs={12} md={4}>
            <Paper variant="outlined" sx={{ p: 2, height: 520, display: 'flex', flexDirection: 'column' }}>
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
              </Box>
              <Stack direction="row" spacing={1}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Ej: hazlo más conciso…"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendEditRequest()}
                />
                <IconButton onClick={sendEditRequest} sx={{ bgcolor: 'primary.main', color: '#fff' }}>
                  <SendRoundedIcon fontSize="small" />
                </IconButton>
              </Stack>
            </Paper>
          </Grid>

          {/* Document editor */}
          <Grid item xs={12} md={8}>
            <Paper variant="outlined" sx={{ p: 0, height: 520, display: 'flex', flexDirection: 'column' }}>
              <Stack direction="row" justifyContent="flex-end" sx={{ p: 1.5, borderBottom: `1px solid ${tokens.color.border}` }}>
                <Button size="small" startIcon={<DownloadRoundedIcon />}>
                  Descargar .docx
                </Button>
              </Stack>
              <TextField
                multiline
                fullWidth
                value={content}
                onChange={(e) => setContent(e.target.value)}
                sx={{
                  flex: 1,
                  '& .MuiInputBase-root': { height: '100%', alignItems: 'flex-start', p: 3 },
                  '& textarea': { fontFamily: tokens.font.body, fontSize: 14, lineHeight: 1.7 },
                }}
              />
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
