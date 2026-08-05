import type { Metadata } from 'next';
import ThemeRegistry from '@/components/ThemeRegistry';

export const metadata: Metadata = {
  title: 'Impulsa — tu perfil profesional, siempre listo',
  description:
    'Construye tu perfil una vez, genera CVs y cartas de presentación a la medida de cada oportunidad.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ThemeRegistry>{children}</ThemeRegistry>
      </body>
    </html>
  );
}
