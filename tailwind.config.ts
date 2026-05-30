import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}', './lib/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#172033',
        paper: '#fffaf0',
        sage: '#5f8d6a',
      },
      boxShadow: {
        soft: '0 10px 30px rgba(23, 32, 51, 0.08)',
      },
    },
  },
  plugins: [],
};
export default config;
