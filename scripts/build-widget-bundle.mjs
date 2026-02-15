/**
 * Build Hugo Widget React micro-bundle
 * 
 * Produces: public/hugo-widgets.js + public/hugo-widgets.css
 * Contains: React + ReactDOM + all widget components + Tailwind CSS
 * 
 * Usage: node scripts/build-widget-bundle.mjs
 */
import { build } from 'esbuild';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

async function buildBundle() {
  console.log('[Widget Bundle] Building...');

  await build({
    entryPoints: [resolve(root, 'src/widget-bundle/entry.tsx')],
    bundle: true,
    outfile: resolve(root, 'public/hugo-widgets.js'),
    format: 'iife',
    globalName: 'HugoWidgetReactBundle',
    platform: 'browser',
    target: ['es2020'],
    minify: true,
    sourcemap: false,
    jsx: 'automatic',
    // Resolve path aliases
    alias: {
      '@': resolve(root, 'src'),
    },
    // Define for React
    define: {
      'process.env.NODE_ENV': '"production"',
    },
    // Inject Tailwind as CSS
    loader: {
      '.css': 'css',
    },
  });

  console.log('[Widget Bundle] Done! Output: public/hugo-widgets.js');
}

buildBundle().catch((err) => {
  console.error('[Widget Bundle] Build failed:', err);
  process.exit(1);
});
