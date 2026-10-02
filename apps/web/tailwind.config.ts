import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0B0D12',
        surface: {
          DEFAULT: '#12151C',
          elevated: '#181C25',
        },
        border: {
          DEFAULT: '#232834',
          strong: '#323846',
        },
        'text-primary': '#F3F4F6',
        'text-secondary': '#9CA3AF',
        'text-tertiary': '#6B7280',
        accent: {
          DEFAULT: '#7C5CFF',
          hover: '#6A49F2',
          muted: 'rgba(124, 92, 255, 0.12)',
        },
        status: {
          success: '#10B981',
          warning: '#F59E0B',
          error: '#EF4444',
        },
        monad: {
          purple: '#7C5CFF',
          dark: '#0B0D12',
          light: '#F5F5FA',
        },
      },
      borderRadius: {
        control: '8px',
        card: '12px',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', '"Liberation Mono"', '"Courier New"', 'monospace'],
      },
      boxShadow: {
        subtle: '0 1px 2px 0 rgba(0, 0, 0, 0.25)',
        card: '0 4px 12px 0 rgba(0, 0, 0, 0.3)',
        elevated: '0 10px 30px -5px rgba(0, 0, 0, 0.5)',
      },
    },
  },
  plugins: [],
};

export default config;
