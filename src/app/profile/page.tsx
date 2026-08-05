'use client';

import { useState } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Chip,
  Stack,
  Fab,
  IconButton,
  Divider,
  Button,
} from '@mui/material';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import ChatBubbleRoundedIcon from '@mui/icons-material/ChatBubbleRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import AppNav from '@/components/AppNav';
import GrowthRing from '@/components/GrowthRing';
import { tokens } from '@/lib/theme';

// MVP: mock data shown so the UI is demoable without a configured backend.
// Replace with a Supabase fetch of the `profiles` row for the signed-in
// user (see supabase/schema.sql) once auth is wired end-to-end.
const mockProfile = {
  completeness: 72,
  experiencia: [
    { puesto: 'Practicante de UX', empresa: 'Estudio Coral', descripcion: 'Investigación de usuarios y prototipos para app móvil.' },
    { puesto: 'Proyecto de tesis', empresa: 'Universidad', descripcion: 'Diseño e implementación de plataforma web con IA.' },
  ],
  habilidades: ['Figma', 'Investigación de usuarios', 'React', 'Next.js', 'Comunicación'],
  suggestedRoles: [
    { role: 'UX Researcher Jr.', why: 'Tu práctica en Estudio Coral y tu tesis muestran experiencia directa investigando usuarios.' },
    { role: 'Product Designer Jr.', why: 'Combinas diseño (Figma) con código (React) — perfil poco común y valorado en equipos pequeños.' },
    { role: 'Analista de producto', why: 'Un camino que quizá no has considerado: tu trabajo de tesis analiza comportamiento de usuarios, base sólida para esta ruta.' },
  ],
  upskilling: ['Investigación cuantitativa (encuestas, analítica)', 'Fundamentos de accesibilidad web (WCAG)'],
};

export default function ProfilePage() {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <Box sx={{ minHeight: '100vh' }}>
      <AppNav />
      <Container maxWidth="md" sx={{ py: 5 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={4} alignItems={{ sm: 'center' }} sx={{ mb: 5 }}>
          <GrowthRing value={mockProfile.completeness} size={110} label="perfil" sublabel="completo" />
          <Box>
            <Typography variant="h3" sx={{ fontSize: 30, mb: 0.5 }}>
              Tu perfil
            </Typography>
            <Typography color="text.secondary">
              Mientras más completo, mejores documentos y sugerencias generamos para ti.
            </Typography>
          </Box>
        </Stack>

        <Grid container spacing={3}>
          <Grid item xs={12} md={7}>
            <SectionCard title="Experiencia">
              <Stack spacing={2}>
                {mockProfile.experiencia.map((e, i) => (
                  <Box key={i}>
                    <Typography fontWeight={600}>{e.puesto}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {e.empresa}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      {e.descripcion}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </SectionCard>

            <SectionCard title="Habilidades">
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                {mockProfile.habilidades.map((h) => (
                  <Chip key={h} label={h} sx={{ bgcolor: tokens.color.surfaceMuted }} />
                ))}
                <Chip icon={<AddRoundedIcon />} label="Agregar" variant="outlined" />
              </Stack>
            </SectionCard>

            <SectionCard title="Ideas para seguir creciendo">
              <Stack spacing={1}>
                {mockProfile.upskilling.map((u) => (
                  <Typography key={u} variant="body2">
                    • {u}
                  </Typography>
                ))}
              </Stack>
            </SectionCard>
          </Grid>

          <Grid item xs={12} md={5}>
            <Paper variant="outlined" sx={{ p: 3, position: 'sticky', top: 90 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Roles que podrían quedarte bien
              </Typography>
              <Stack spacing={2.5} divider={<Divider />}>
                {mockProfile.suggestedRoles.map((r) => (
                  <Box key={r.role}>
                    <Typography fontWeight={600} sx={{ mb: 0.5 }}>
                      {r.role}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {r.why}
                    </Typography>
                  </Box>
                ))}
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
                Son sugerencias, no destinos — tú decides qué camino explorar.
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Container>

      {/* Floating chatbot entry point, as specced: small button, not intrusive */}
      <Fab
        color="primary"
        onClick={() => setChatOpen((v) => !v)}
        sx={{ position: 'fixed', bottom: 24, right: 24, bgcolor: 'primary.main' }}
      >
        <ChatBubbleRoundedIcon />
      </Fab>

      {chatOpen && (
        <Paper
          variant="outlined"
          sx={{
            position: 'fixed',
            bottom: 90,
            right: 24,
            width: 320,
            p: 2.5,
            borderRadius: `${tokens.radius.lg}px`,
          }}
        >
          <Typography fontWeight={600} sx={{ mb: 1 }}>
            Editar con el asistente
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Dime qué quieres cambiar de tu perfil y lo actualizo por ti.
            {/* MVP note: reuse the /api/chat route + extractProfileFromText
                from lib/ai/groq.ts to parse the reply into profile fields. */}
          </Typography>
          <Button fullWidth variant="contained" size="small" onClick={() => setChatOpen(false)}>
            Entendido
          </Button>
        </Paper>
      )}
    </Box>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h6">{title}</Typography>
        <IconButton size="small">
          <EditRoundedIcon fontSize="small" />
        </IconButton>
      </Stack>
      {children}
    </Paper>
  );
}
