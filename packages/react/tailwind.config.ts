import forms from '@tailwindcss/forms';
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Geist Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        'bg-emphasis': 'rgb(var(--bg-emphasis) / <alpha-value>)',
        'bg-default': 'rgb(var(--bg-default) / <alpha-value>)',
        'bg-subtle': 'rgb(var(--bg-subtle) / <alpha-value>)',
        'bg-muted': 'rgb(var(--bg-muted) / <alpha-value>)',
        'bg-inverted': 'rgb(var(--bg-inverted) / <alpha-value>)',

        'bg-info': 'rgb(var(--bg-info) / <alpha-value>)',
        'bg-success': 'rgb(var(--bg-success) / <alpha-value>)',
        'bg-attention': 'rgb(var(--bg-attention) / <alpha-value>)',
        'bg-warning': 'rgb(var(--bg-warning) / <alpha-value>)',
        'bg-error': 'rgb(var(--bg-error) / <alpha-value>)',

        'border-emphasis': 'rgb(var(--border-emphasis) / <alpha-value>)',
        'border-default': 'rgb(var(--border-default) / <alpha-value>)',
        'border-muted': 'rgb(var(--border-muted) / <alpha-value>)',
        'border-subtle': 'rgb(var(--border-subtle) / <alpha-value>)',

        'content-inverted': 'rgb(var(--content-inverted) / <alpha-value>)',
        'content-muted': 'rgb(var(--content-muted) / <alpha-value>)',
        'content-subtle': 'rgb(var(--content-subtle) / <alpha-value>)',
        'content-default': 'rgb(var(--content-default) / <alpha-value>)',
        'content-emphasis': 'rgb(var(--content-emphasis) / <alpha-value>)',

        'content-info': 'rgb(var(--content-info) / <alpha-value>)',
        'content-success': 'rgb(var(--content-success) / <alpha-value>)',
        'content-attention': 'rgb(var(--content-attention) / <alpha-value>)',
        'content-warning': 'rgb(var(--content-warning) / <alpha-value>)',
        'content-error': 'rgb(var(--content-error) / <alpha-value>)',
      },
      dropShadow: {
        'card-hover': ['0 2px 4px #222A350d'],
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in-fade': {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out forwards',
        'scale-in-fade': 'scale-in-fade 0.2s ease-out forwards',
      },
    },
  },
  plugins: [forms],
};

export default config;
