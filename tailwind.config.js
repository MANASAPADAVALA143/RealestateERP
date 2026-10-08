/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ivory: '#FAF7F0',
        navy: {
          DEFAULT: '#0B1D33',
          deep: '#0D1B2A',
        },
        gold: '#C79A2B',
        goldLight: '#D4AC4A',
        indigo: {
          metric: '#4F46E5',
        },
        amber: {
          alert: '#F59E0B',
        },
        slate: {
          label: '#64748B',
        },
        border: {
          DEFAULT: '#E2E8F0',
        },
        status: {
          active: '#2563EB',
          pending: '#F59E0B',
          overdue: '#7C3AED',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      },
    },
  },
  plugins: [],
};
