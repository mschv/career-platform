'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Box,
  Container,
  Typography,
  Grid,
  Paper,
  Stack,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import AppNav from '@/components/AppNav';
import { tokens } from '@/lib/theme';
import { createClient } from '@/lib/supabase/client';

const columns = [
  { status: 'borrador', label: 'Borrador' },
  { status: 'aplicado', label: 'Aplicado' },
  { status: 'entrevista', label: 'Entrevista' },
  { status: 'oferta', label: 'Oferta' },
] as const;

const statusColor: Record<string, string> = {
  borrador: tokens.color.textSecondary,
  aplicado: tokens.color.secondary,
  entrevista: tokens.color.accent,
  oferta: tokens.color.primary,
  rechazado: tokens.color.danger,
};

type Application = {
  id: string;
  company: string;
  role: string;
  status: string;
};

type Status = 'loading' | 'redirecting' | 'ready';

export default function ApplicationsPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>('loading');
  const [applications, setApplications] = useState<Application[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ company: '', role: '', job_description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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

      const { data } = await supabase
        .from('applications')
        .select('id, company, role, status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!cancelled) {
        setApplications(data ?? []);
        setStatus('ready');
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.company.trim() || !form.role.trim() || submitting) return;

    setSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error ?? 'No pudimos crear la aplicación.');
        return;
      }

      router.push(`/applications/${data.application.id}`);
    } catch {
      setFormError('Tuvimos un problema de conexión. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  }

  if (status !== 'ready') {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh' }}>
      <AppNav />
      <Container maxWidth="lg" sx={{ py: 5 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
          <Box>
            <Typography variant="h3" sx={{ fontSize: 30, mb: 0.5 }}>
              Mis aplicaciones
            </Typography>
            <Typography color="text.secondary">Da seguimiento a cada postulación en un solo lugar.</Typography>
          </Box>
          <Button variant="contained" startIcon={<AddRoundedIcon />} sx={{ px: 3 }} onClick={() => setDialogOpen(true)}>
            Nueva aplicación
          </Button>
        </Stack>

        <Grid container spacing={2}>
          {columns.map((col) => (
            <Grid item xs={12} sm={6} md={3} key={col.status}>
              <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 1 }}>
                {col.label}
              </Typography>
              <Stack spacing={1.5} sx={{ mt: 1 }}>
                {applications
                  .filter((a) => a.status === col.status)
                  .map((a) => (
                    <Paper
                      key={a.id}
                      component={Link}
                      href={`/applications/${a.id}`}
                      variant="outlined"
                      sx={{
                        p: 2,
                        display: 'block',
                        textDecoration: 'none',
                        color: 'inherit',
                        borderTop: `3px solid ${statusColor[a.status]}`,
                        '&:hover': { borderColor: tokens.color.primary },
                      }}
                    >
                      <Typography fontWeight={600}>{a.role}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {a.company}
                      </Typography>
                    </Paper>
                  ))}
                {applications.filter((a) => a.status === col.status).length === 0 && (
                  <Typography variant="caption" color="text.secondary" sx={{ px: 1 }}>
                    Sin aplicaciones aquí todavía.
                  </Typography>
                )}
              </Stack>
            </Grid>
          ))}
        </Grid>
      </Container>

      <Dialog open={dialogOpen} onClose={() => !submitting && setDialogOpen(false)} fullWidth maxWidth="sm">
        <Box component="form" onSubmit={handleCreate}>
          <DialogTitle>Nueva aplicación</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 0.5 }}>
              {formError && <Alert severity="error">{formError}</Alert>}
              <TextField
                label="Empresa"
                required
                fullWidth
                value={form.company}
                onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                disabled={submitting}
              />
              <TextField
                label="Puesto"
                required
                fullWidth
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                disabled={submitting}
              />
              <TextField
                label="Descripción del puesto"
                placeholder="Pega aquí la descripción de la vacante — la usamos para adaptar tu CV y carta de presentación."
                fullWidth
                multiline
                minRows={4}
                value={form.job_description}
                onChange={(e) => setForm((f) => ({ ...f, job_description: e.target.value }))}
                disabled={submitting}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={() => setDialogOpen(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" variant="contained" disabled={submitting || !form.company.trim() || !form.role.trim()}>
              {submitting ? 'Creando…' : 'Crear'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}
