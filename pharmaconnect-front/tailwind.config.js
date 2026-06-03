/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#0f2d4a', hover: '#1a3f63' },
        accent:  { DEFAULT: '#1e6fd9', light: '#e8f0fe' },
        medical: {
          success:      '#0d6e4f',
          'success-bg': '#e6f4ee',
          danger:       '#b91c1c',
          'danger-bg':  '#fef2f2',
          warning:      '#b45309',
          'warning-bg': '#fffbeb',
        },
        page:             '#f0f4f8',
        card:             '#ffffff',
        border:           '#dde3ec',
        'text-primary':   '#0f1e2e',
        'text-secondary': '#5a6a7e',
        'text-muted':     '#8fa0b3',
      },
      fontFamily: { sans: ['Inter', 'sans-serif'] },
      boxShadow: {
        card:         '0 1px 3px rgba(15,29,74,0.06), 0 1px 2px rgba(15,29,74,0.04)',
        'card-hover': '0 4px 12px rgba(15,29,74,0.10)',
      },
      borderRadius: { card: '10px' },
    },
  },
  plugins: [],
};
