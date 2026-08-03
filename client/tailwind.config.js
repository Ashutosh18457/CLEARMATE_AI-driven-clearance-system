/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#F7F8FA',
        surface: '#FFFFFF',
        'border-subtle': '#E4E7EC',
        'ink-primary': '#101828',
        'ink-secondary': '#475467',
        'ink-muted': '#98A2B3',
        brand: {
          DEFAULT: '#2547D0',
          hover: '#1E3AA8',
          50: '#EEF1FB',
          100: '#D4DBFA',
        },
        status: {
          success: '#12B76A',
          pending: '#F79009',
          rejected: '#F04438',
          info: '#2547D0',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
      },
      borderRadius: {
        DEFAULT: '6px',
        'md': '6px',
        'lg': '8px',
      },
      boxShadow: {
        'sm': '0 1px 2px rgba(16, 24, 40, 0.05)',
        'md': '0 2px 4px rgba(16, 24, 40, 0.08)',
      },
      transitionDuration: {
        DEFAULT: '150ms',
      },
    },
  },
  plugins: [],
};
