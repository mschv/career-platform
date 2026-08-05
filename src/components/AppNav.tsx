'use client';

import Link from 'next/link';
import { AppBar, Toolbar, Box, Typography, Button, Stack } from '@mui/material';
import { usePathname, useRouter } from 'next/navigation';
import { tokens } from '@/lib/theme';
import { createClient } from '@/lib/supabase/client';

const links = [
  { href: '/profile', label: 'Mi perfil' },
  { href: '/applications', label: 'Mis aplicaciones' },
];

export default function AppNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace('/login');
  }

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{ bgcolor: 'background.default', borderBottom: `1px solid ${tokens.color.border}` }}
    >
      <Toolbar sx={{ justifyContent: 'space-between', py: 1 }}>
        <Typography
          component={Link}
          href="/"
          sx={{
            fontFamily: tokens.font.display,
            fontWeight: 600,
            fontSize: 22,
            color: 'primary.main',
            textDecoration: 'none',
          }}
        >
          Impulsa
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          {links.map((l) => (
            <Button
              key={l.href}
              component={Link}
              href={l.href}
              sx={{
                color: pathname?.startsWith(l.href) ? 'primary.main' : 'text.secondary',
                fontWeight: pathname?.startsWith(l.href) ? 700 : 500,
              }}
            >
              {l.label}
            </Button>
          ))}
          <Box sx={{ width: 12 }} />
          <Button variant="outlined" size="small" onClick={handleLogout}>
            Salir
          </Button>
        </Stack>
      </Toolbar>
    </AppBar>
  );
}
