/* eslint-env node */
import daisyui from "daisyui";

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        'fade-in': 'fadeIn 0.6s ease-in',
        'slide-up': 'slideUp 0.8s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': {
            opacity: '0',
            transform: 'translateY(20px)'
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)'
          },
        },
      },
    },
  },
  plugins: [daisyui],
  daisyui: {
    themes: [
      {

        "flimo-light": {
          "primary": "#f59e0b",          // Amber-500 (Warm Yellow)
          "primary-content": "#FFFFFF",
          "secondary": "#71717a",        // Zinc-500 (Gray)
          "accent": "#f4f4f5",           // Zinc-100 (Light Gray)
          "neutral": "#27272a",          // Zinc-800
          "base-100": "#ffffff",         // White
          "base-200": "#fafafa",         // Zinc-50
          "base-300": "#e4e4e7",         // Zinc-200
          "base-content": "#18181b",     // Zinc-950
          "info": "#3ABFF8",
          "success": "#34D399",
          "warning": "#FBBD23",
          "error": "#F87171",
          "--rounded-box": "0.5rem",     // Reduced roundness for cleaner look
          "--rounded-btn": "0.25rem",
        },
      },
    ],
  },
}
