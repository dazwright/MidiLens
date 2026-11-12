import { build } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const outDir = path.resolve(rootDir, 'juce_source/WebUI');
const tempOutDir = path.resolve(rootDir, 'juce_source/.webui_tmp');

async function buildJuceWebUI() {
  console.log('[MidiLens] Building self-contained JUCE 8 WebUI bundle...');

  fs.rmSync(tempOutDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  await build({
    root: rootDir,
    configFile: false,
    plugins: [react(), tailwindcss()],
    base: '/',
    publicDir: false,
    build: {
      outDir: tempOutDir,
      emptyOutDir: true,
      sourcemap: false,
      minify: 'esbuild',
      cssCodeSplit: false,
      assetsInlineLimit: 100000,
      rollupOptions: {
        input: path.resolve(rootDir, 'src/pluginMain.tsx'),
        output: {
          entryFileNames: 'app.js',
          chunkFileNames: 'app-[name].js',
          assetFileNames: (assetInfo) => {
            if (assetInfo.name && assetInfo.name.endsWith('.css')) {
              return 'app.css';
            }
            return 'assets/[name][extname]';
          },
          inlineDynamicImports: true,
        },
      },
    },
  });

  // Locate compiled JS & CSS in tempOutDir
  const files = fs.readdirSync(tempOutDir);
  const jsFile = files.find((f) => f.endsWith('.js'));
  const cssFile = files.find((f) => f.endsWith('.css'));

  if (!jsFile) {
    throw new Error('Failed to generate app.js for JUCE WebUI');
  }

  const jsContent = fs.readFileSync(path.join(tempOutDir, jsFile), 'utf8');
  const cssContent = cssFile ? fs.readFileSync(path.join(tempOutDir, cssFile), 'utf8') : '';

  fs.writeFileSync(path.join(outDir, 'app.js'), jsContent, 'utf8');
  fs.writeFileSync(path.join(outDir, 'app.css'), cssContent, 'utf8');

  // Copy icon.svg from public/icon.svg
  const iconSrc = path.resolve(rootDir, 'public/icon.svg');
  if (fs.existsSync(iconSrc)) {
    fs.copyFileSync(iconSrc, path.join(outDir, 'icon.svg'));
  }

  // Generate 100% offline, sandbox-proof index.html (ZERO external CDNs or Google Fonts)
  // Inlines compiled Tailwind v4 CSS directly in <style> AND links /app.css for complete resilience
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>MidiLens</title>
    <style>
      :root {
        --font-sans: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        --font-mono: "SF Mono", ui-monospace, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
        color-scheme: dark;
      }
      html, body, #root {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        background-color: #141618;
        color: #e5e5e5;
        overflow: hidden;
        -webkit-user-select: none;
        user-select: none;
      }
    </style>
    <style id="midilens-compiled-tailwind">
${cssContent}
    </style>
    <link rel="stylesheet" href="/app.css" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/app.js"></script>
  </body>
</html>
`;

  fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');
  fs.rmSync(tempOutDir, { recursive: true, force: true });

  console.log(
    `[MidiLens] JUCE WebUI bundle ready in juce_source/WebUI/ (app.js: ${(jsContent.length / 1024).toFixed(1)} KB, app.css: ${(cssContent.length / 1024).toFixed(1)} KB)`
  );
}

buildJuceWebUI().catch((err) => {
  console.error('[MidiLens] WebUI build failed:', err);
  process.exit(1);
});
