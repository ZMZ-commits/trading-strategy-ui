import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#0f1117',
        panel: '#161b22',
        border: '#21262d',
      },
    },
  },
  plugins: [],
} satisfies Config
