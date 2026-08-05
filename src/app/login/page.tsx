'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Box, Button, Container, TextField, Typography, Alert, Stack } from '@mui/material';
import { tokens } from '@/lib/theme';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/profile` },
    });

    setLoading(false);
    if (error) {
      setError('No pudimos enviar el enlace. Revisa el correo e intenta de nuevo.');
      return;
    }
    setSent(true);
  }

  return (
    <Container maxWidth="xs" sx={{ pt: { xs: 10, md: 16 } }}>
      <Typography
        component={Link}
        href="/"
        sx={{ fontFamily: tokens.font.display, fontWeight: 600, fontSize: 22, color: 'primary.main', textDecoration: 'none' }}
      >
        Impulsa
      </Typography>
      <Typography variant="h4" sx={{ mt: 3, mb: 1 }}>
        Entra a tu cuenta
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 4 }}>
        Te mandamos un enlace de acceso, sin contraseña.
      </Typography>

      {sent ? (
        <Alert severity="success">Revisa tu correo — te enviamos un enlace para entrar.</Alert>
      ) : (
        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <TextField
              label="Correo electrónico"
              type="email"
              required
              fullWidth
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {error && <Alert severity="error">{error}</Alert>}
            <Button type="submit" variant="contained" size="large" disabled={loading} sx={{ py: 1.5 }}>
              {loading ? 'Enviando…' : 'Enviar enlace de acceso'}
            </Button>
          </Stack>
        </Box>
      )}
    </Container>
  );
}
