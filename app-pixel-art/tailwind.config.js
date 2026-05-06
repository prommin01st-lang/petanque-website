/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg': '#0D0E15',
        'surface': '#1A1B26',
        'surface-dim': '#11121A',
        'text': '#E0E6F1',
        'text-dim': '#565F89',
        'accent-cyan': '#7EE0FF',
        'accent-magenta': '#FF7EDB',
        'accent-gold': '#FFD93D',
        'border-pixel': '#2A2B3D',
        'shadow-pixel': '#08090F',
        'shadow-deep': '#05060A',
      },
      fontFamily: {
        pixel: ['"Press Start 2P"', 'monospace'],
        label: ['VT323', 'monospace'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'pixel': '0px',
        'pixel-soft': '4px',
      },
      boxShadow: {
        'pixel': '4px 4px 0px 0px #08090F',
        'pixel-sm': '2px 2px 0px 0px #08090F',
        'pixel-lg': '4px 4px 0px 0px #08090F, 8px 8px 0px 0px #05060A',
        'pixel-inset': 'inset 2px 2px 0px 0px #08090F',
        'pixel-focus': 'inset 2px 2px 0px 0px #08090F, 0px 0px 0px 2px #7EE0FF',
      },
      spacing: {
        'px-1': '4px',
        'px-2': '8px',
        'px-3': '16px',
        'px-4': '24px',
        'px-5': '32px',
        'px-6': '48px',
        'px-8': '64px',
      },
    },
  },
  plugins: [],
}
