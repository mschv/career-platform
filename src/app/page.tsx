import Link from 'next/link';
import { Box, Button, Container, Stack, Typography, Chip, Grid } from '@mui/material';
import GrowthRing from '@/components/GrowthRing';
import { tokens } from '@/lib/theme';

export default function LandingPage() {
  return (
    <Box>
      {/* Hero */}
      <Container maxWidth="lg" sx={{ pt: { xs: 8, md: 12 }, pb: { xs: 8, md: 10 } }}>
        <Grid container spacing={6} alignItems="center">
          <Grid item xs={12} md={7}>
            <Chip
              label="Hecho para quienes egresan ahora"
              sx={{
                bgcolor: tokens.color.surfaceMuted,
                color: 'primary.main',
                fontWeight: 600,
                mb: 3,
              }}
            />
            <Typography
              variant="h1"
              sx={{ fontSize: { xs: 40, md: 58 }, lineHeight: 1.05, mb: 3 }}
            >
              Cuenta tu historia una vez.
              <br />
              Úsala en cada postulación.
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400, mb: 5, maxWidth: 520 }}>
              Cuéntanos tu experiencia hablando, escribiendo o subiendo tu CV actual.
              Impulsa arma tu perfil, te sugiere hacia dónde ir, y genera cada CV y
              carta de presentación a la medida — sin empezar de cero cada vez.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Button
                component={Link}
                href="/onboarding"
                variant="contained"
                size="large"
                sx={{ bgcolor: 'primary.main', px: 4, py: 1.5, fontSize: 16 }}
              >
                Crear mi perfil gratis
              </Button>
              <Button
                component={Link}
                href="/login"
                variant="text"
                size="large"
                sx={{ color: 'text.primary', fontSize: 16 }}
              >
                Ya tengo cuenta →
              </Button>
            </Stack>
          </Grid>

          <Grid item xs={12} md={5}>
            <Box
              sx={{
                bgcolor: 'background.paper',
                border: `1px solid ${tokens.color.border}`,
                borderRadius: `${tokens.radius.lg}px`,
                p: 4,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <GrowthRing value={72} size={140} label="perfil" sublabel="completo" />
              <Typography variant="body2" color="text.secondary" textAlign="center">
                Así de simple ves tu progreso — mientras más cuentas, mejores
                sugerencias y documentos recibes.
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Container>

      {/* How it works — a real 3-step sequence, so numbering is earned here */}
      <Box sx={{ bgcolor: tokens.color.surfaceMuted, py: { xs: 8, md: 10 } }}>
        <Container maxWidth="lg">
          <Typography variant="h3" sx={{ mb: 6, fontSize: { xs: 28, md: 34 } }}>
            Cómo funciona
          </Typography>
          <Grid container spacing={4}>
            {[
              {
                n: '01',
                title: 'Cuéntanos quién eres',
                body: 'Habla, escribe, o sube tu CV, certificados o proyectos. Un chatbot te guía con preguntas si prefieres ir paso a paso.',
              },
              {
                n: '02',
                title: 'Descubre tus caminos',
                body: 'Recibe sugerencias de roles y habilidades a desarrollar, con la razón detrás de cada una — no solo una lista.',
              },
              {
                n: '03',
                title: 'Genera y postula',
                body: 'Da la descripción del puesto y genera tu CV y carta a la medida. Edita con el chat o directamente en el documento.',
              },
            ].map((step) => (
              <Grid item xs={12} md={4} key={step.n}>
                <Typography
                  sx={{ fontFamily: tokens.font.display, fontSize: 15, color: 'primary.main', fontWeight: 600, mb: 1 }}
                >
                  {step.n}
                </Typography>
                <Typography variant="h5" sx={{ mb: 1.5 }}>
                  {step.title}
                </Typography>
                <Typography color="text.secondary">{step.body}</Typography>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 10 }, textAlign: 'center' }}>
        <Typography variant="h3" sx={{ mb: 2, fontSize: { xs: 26, md: 32 } }}>
          Tu primer perfil no tiene que ser perfecto para empezar
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 4, maxWidth: 520, mx: 'auto' }}>
          Puedes editar, corregir o completar todo después. Lo único que necesitas
          hoy es contarnos algo — nosotros ordenamos el resto.
        </Typography>
        <Button component={Link} href="/onboarding" variant="contained" size="large" sx={{ px: 4, py: 1.5 }}>
          Empezar ahora
        </Button>
      </Container>
    </Box>
  );
}
