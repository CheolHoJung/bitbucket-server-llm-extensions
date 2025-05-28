import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import webExtension from 'vite-plugin-web-extension';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { resolve } from 'path';

// Helper function to resolve paths relative to the current file's directory
function resolvePath(relativePath: string) {
  return resolve(__dirname, relativePath);
}

export default defineConfig({
  plugins: [
    react(),
    webExtension({
      // Path to your manifest.json (source file)
      manifest: resolvePath("src/manifest.json"), //
      // Watch manifest.json for changes to trigger rebuilds
      watchFilePaths: [resolvePath("src/manifest.json")], //
      // We are not using disableAutoInputs, allowing the plugin
      // to process manifest entries like options.html, popup.html, and background.service_worker.
    }),
    viteStaticCopy({
      // Copies the _locales directory to the output (dist) directory
      targets: [
        {
          src: '_locales/**/*', // All content inside _locales at project root
          dest: '_locales'      // Copied to dist/_locales
        }
        // If you have icons in public/assets, Vite usually handles the public dir.
        // If icons are in src/assets, you might add another target here:
        // { src: 'src/assets/icons/**/*', dest: 'assets/icons' }
      ]
    })
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true, // Clean the output directory before each build
  },
});