import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Matches VS Code's "Default Dark Modern" theme (the IDE panel runs the
        // same theme) so the whole app reads as one consistent dark palette
        // instead of the IDE looking like a different, bluer app bolted on.
        surface: '#1e1e1e', // editor/page background
        panel: '#181818',   // sidebar/header/card chrome (one step darker)
        border: '#2b2b2b',  // panel/widget borders
      },
    },
  },
  plugins: [],
} satisfies Config
