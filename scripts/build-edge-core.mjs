// Bundles the shared, pure src/core into a single ESM module that Supabase Edge Functions
// (Deno) can import. The same battle-tested, unit-tested game logic runs on the server —
// no re-implementation, no drift between client and server scoring/validation.

import { build } from 'esbuild';

await build({
  entryPoints: ['src/core/index.ts'],
  outfile: 'supabase/functions/_shared/core.mjs',
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  target: 'es2022',
  // No Node/RN built-ins are used by core, so the bundle is portable to Deno as-is.
  logLevel: 'info',
});

console.log('Bundled src/core → supabase/functions/_shared/core.mjs');
