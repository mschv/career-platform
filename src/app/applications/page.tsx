'use client';

import Link from 'next/link';
import { Box, Container, Typography, Grid, Paper, Stack, Chip, Button } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import AppNav from '@/components/AppNav';
import { tokens } from '@/lib/theme';

// MVP: mock data — replace with a Supabase select on `applications` for
// the signed-in user, grouped client-side by status.
const columns = [
  { status: 'borrador', label: 'Borrador' },
  { status: 'aplicado', label: 'Aplicado' },
  { status: 'entrevista', label: 'Entrevista' },
  { status: 'oferta', label: 'Oferta' },
] as const;

const mockApplications = [
  { id: '1', company: 'Estudio Coral', role: 'UX Researcher Jr.', status: 'aplicado' },
  { id: '2', company: 'Banco Andino', role: 'Analista de producto', status: 'borrador' },
  { id: '3', company: 'Nimbus Software', role: 'Product Designer Jr.', status: 'entrevista' },
];

const statusColor: Record<string, string> = {
  borrador: tokens.color.textSecondary,
  aplicado: tokens.color.secondary,
  entrevista: tokens.color.accent,
  oferta: tokens.color.primary,
  rechazado: tokens.color.danger,
};

export default function ApplicationsPage() {
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
          <Button variant="contained" startIcon={<AddRoundedIcon />} sx={{ px: 3 }}>
            Nueva aplicación
          </Button>
        </Stack>

        <Grid container spacing={2}>
          {columns.map((col) => (
            <Grid item xs={12} sm={6} md={3} key={col.status}>
              <Typography
                variant="overline"
                sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 1 }}
              >
                {col.label}
              </Typography>
              <Stack spacing={1.5} sx={{ mt: 1 }}>
                {mockApplications
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
                {mockApplications.filter((a) => a.status === col.status).length === 0 && (
                  <Typography variant="caption" color="text.secondary" sx={{ px: 1 }}>
                    Sin aplicaciones aquí todavía.
                  </Typography>
                )}
              </Stack>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
