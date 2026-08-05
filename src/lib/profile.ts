// Shared between the onboarding save route (server) and the profile page
// (client) so both agree on what "complete" means.

export type ProfileFields = {
  experiencia?: unknown[] | null;
  educacion?: unknown[] | null;
  habilidades?: unknown[] | null;
  intereses?: unknown[] | null;
};

const FIELDS: (keyof ProfileFields)[] = ['experiencia', 'educacion', 'habilidades', 'intereses'];

export function computeCompleteness(profile: ProfileFields): number {
  const filled = FIELDS.filter((f) => Array.isArray(profile[f]) && (profile[f] as unknown[]).length > 0).length;
  return Math.round((filled / FIELDS.length) * 100);
}
