import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
        },
      },
      fontFamily: {
        sans: ['Pretendard', '-apple-system', 'Malgun Gothic', 'sans-serif'],
      },
      animation: {
        'shimmer': 'shimmer 1.5s linear infinite',
        'spin-slow': 'spin 1s linear',
        'gauge-fill': 'gauge-fill 1s ease-out forwards',
        'count-up': 'count-up 0.8s ease-out forwards',
        'fade-in': 'fade-in 0.15s ease-in-out',
        'slide-up': 'slide-up 0.2s ease-out',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'gauge-fill': {
          '0%': { strokeDashoffset: '339.292' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
