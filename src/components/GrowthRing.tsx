'use client';

import { Box, Typography } from '@mui/material';
import { tokens } from '@/lib/theme';

/**
 * Signature visual element of the product: profile completeness and
 * application progress render as a growth ring rather than a linear
 * progress bar — a small, deliberate visual signature tied to the
 * "your profile grows" concept.
 */
export default function GrowthRing({
  value, // 0-100
  size = 120,
  label,
  sublabel,
}: {
  value: number;
  size?: number;
  label?: string;
  sublabel?: string;
}) {
  const stroke = size * 0.08;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <Box sx={{ position: 'relative', width: size, height: size, display: 'inline-flex' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={tokens.color.surfaceMuted}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={tokens.color.accent}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography sx={{ fontFamily: tokens.font.display, fontWeight: 600, fontSize: size * 0.22 }}>
          {clamped}%
        </Typography>
        {label && (
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: size * 0.09, lineHeight: 1.1 }}>
            {label}
          </Typography>
        )}
        {sublabel && (
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: size * 0.08 }}>
            {sublabel}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
