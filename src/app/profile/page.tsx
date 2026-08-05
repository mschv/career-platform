'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
  Alert,
  CircularProgress,
  TextField,
} from '@mui/material';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import ChatBubbleRoundedIcon from '@mui/icons-material/ChatBubbleRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import AppNav from '@/components/AppNav';
import GrowthRing from '@/components/GrowthRing';
import { tokens } from '@/lib/theme';
import { createClient } from '@/lib/supabase/client';
import { computeCompleteness } from '@/lib/profile';

const PENDING_PROFILE_KEY = 'pending_profile';

type ProfileRow = {
  experiencia: { puesto?: string; empresa?: string; lugar?: string; fecha?: string; descripcion?: string }[];
  educacion: { titulo?: string; institucion?: string; lugar?: string; fecha?: string }[];
  habilidades: string[];
  intereses: string[];
  suggested_roles: { role: string; why: string }[];
  upskilling_suggestions: string[];
  completeness: number;
};

type Status = 'loading' | 'redirecting' | 'ready';

export default function ProfilePage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>('loading');
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [pendingSaveError, setPendingSaveError] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [editInput, setEditInput] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const pendingSaveStarted = useRef(false);

  async function handleEditProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!editInput.trim() || editLoading) return;

    setEditLoading(true);
    setEditError(null);

    try {
      const res = await fetch('/api/profile/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instruction: editInput }),
      });
      const data = await res.json();

      if (!res.ok) {
        setEditError(data.error ?? 'No pudimos actualizar tu perfil.');
        return;
      }

      setProfile(data.profile);
      setEditInput('');
      setChatOpen(false);
    } catch {
      setEditError('Tuvimos un problema de conexión. Intenta de nuevo.');
    } finally {
      setEditLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (!cancelled) setStatus('redirecting');
        router.replace('/login');
        return;
      }

      const pendingRaw = window.localStorage.getItem(PENDING_PROFILE_KEY);
      let resolvedProfile: ProfileRow | null = null;

      // Guard against React Strict Mode's dev-only double effect invocation
      // firing this twice — the extraction is non-deterministic, so two
      // concurrent calls could upsert two different results.
      if (pendingRaw && !pendingSaveStarted.current) {
        pendingSaveStarted.current = true;
        try {
          const pending = JSON.parse(pendingRaw);
          const res = await fetch('/api/onboarding/save-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transcript: pending.transcript }),
          });
          const data = await res.json();

          if (!res.ok) {
            // Keep the pending data in storage so the user doesn't lose
            // their onboarding conversation — they can retry by reloading.
            if (!cancelled) {
              setPendingSaveError(data.error ?? 'No pudimos guardar tu perfil recién creado.');
            }
          } else {
            window.localStorage.removeItem(PENDING_PROFILE_KEY);
            resolvedProfile = data.profile;
            if (!cancelled) setProfile(resolvedProfile);
          }
        } catch {
          if (!cancelled) setPendingSaveError('No pudimos guardar tu perfil recién creado. Intenta de nuevo.');
        }
      }

      if (!cancelled && !resolvedProfile) {
        const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle();
        if (!cancelled) setProfile(data);
      }

      if (!cancelled) setStatus('ready');
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status !== 'ready') {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (!profile) {
    return (
      <Box sx={{ minHeight: '100vh' }}>
        <AppNav />
        <Container maxWidth="sm" sx={{ py: 10, textAlign: 'center' }}>
          {pendingSaveError && (
            <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
              {pendingSaveError}
            </Alert>
          )}
          <Typography variant="h5" sx={{ mb: 1.5 }}>
            Aún no tienes un perfil guardado
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Cuéntanos tu experiencia en una conversación de unos minutos y armamos tu perfil por ti.
          </Typography>
          <Button component={Link} href="/onboarding" variant="contained" size="large">
            Crear mi perfil
          </Button>
        </Container>
      </Box>
    );
  }

  const completeness = computeCompleteness(profile);
  const experiencia = profile.experiencia ?? [];
  const habilidades = profile.habilidades ?? [];
  const suggestedRoles = profile.suggested_roles ?? [];
  const upskilling = profile.upskilling_suggestions ?? [];

  return (
    <Box sx={{ minHeight: '100vh' }}>
      <AppNav />
      <Container maxWidth="md" sx={{ py: 5 }}>
        {pendingSaveError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {pendingSaveError}
          </Alert>
        )}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={4} alignItems={{ sm: 'center' }} sx={{ mb: 5 }}>
          <GrowthRing value={completeness} size={110} label="perfil" sublabel="completo" />
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
              {experiencia.length > 0 ? (
                <Stack spacing={2}>
                  {experiencia.map((e, i) => (
                    <Box key={i}>
                      <Typography fontWeight={600}>{e.puesto}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {[e.empresa, e.lugar].filter(Boolean).join(' — ')}
                        {e.fecha ? ` · ${e.fecha}` : ''}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        {e.descripcion}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Aún no hay experiencia registrada.
                </Typography>
              )}
            </SectionCard>

            <SectionCard title="Habilidades">
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                {habilidades.map((h) => (
                  <Chip key={h} label={h} sx={{ bgcolor: tokens.color.surfaceMuted }} />
                ))}
                <Chip icon={<AddRoundedIcon />} label="Agregar" variant="outlined" />
              </Stack>
            </SectionCard>

            <SectionCard title="Ideas para seguir creciendo">
              {upskilling.length > 0 ? (
                <Stack spacing={1}>
                  {upskilling.map((u) => (
                    <Typography key={u} variant="body2">
                      • {u}
                    </Typography>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Aún no generado.
                </Typography>
              )}
            </SectionCard>
          </Grid>

          <Grid item xs={12} md={5}>
            <Paper variant="outlined" sx={{ p: 3, position: 'sticky', top: 90 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Roles que podrían quedarte bien
              </Typography>
              {suggestedRoles.length > 0 ? (
                <Stack spacing={2.5} divider={<Divider />}>
                  {suggestedRoles.map((r) => (
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
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Aún no generado.
                </Typography>
              )}
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
          component="form"
          onSubmit={handleEditProfile}
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
          </Typography>
          {editError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {editError}
            </Alert>
          )}
          <TextField
            fullWidth
            multiline
            maxRows={4}
            size="small"
            placeholder="Ej: agrega Python a mis habilidades"
            value={editInput}
            onChange={(e) => setEditInput(e.target.value)}
            disabled={editLoading}
            sx={{ mb: 1.5 }}
          />
          <Stack direction="row" spacing={1}>
            <Button
              fullWidth
              variant="outlined"
              size="small"
              onClick={() => setChatOpen(false)}
              disabled={editLoading}
            >
              Cerrar
            </Button>
            <Button
              fullWidth
              type="submit"
              variant="contained"
              size="small"
              disabled={editLoading || !editInput.trim()}
              startIcon={editLoading ? <CircularProgress size={14} color="inherit" /> : undefined}
            >
              {editLoading ? 'Enviando…' : 'Enviar'}
            </Button>
          </Stack>
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
