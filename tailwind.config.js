/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {

    borderColor: theme => ({
      ...theme('colors'),
      DEFAULT: theme('colors.neutral.600', 'colors.current'),
    }),

    borderRadius: {
      none: '0px',
      sm: '0.125rem', // 2px
      md: '0.25rem', // 4px
      lg: '0.375rem', // 6px
      DEFAULT: '0.5rem', // 8px
      xl: '.625rem', // 12px
      '2xl': '1.25rem', // 16px
      '3xl': '1.875rem', // 24px
      '4xl': '2.5rem', // 40px
      full: '9999px',
    },
    
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      black: '#000000',
      white: '#FFFFFF',
      primary: {
        50: '#F2FFFA',
        100: '#dae8e3',
        200: '#b4d1c7',
        300: '#8fb9ac',
        400: '#69a290',
        500: '#448b74',
        600: '#366f5d',
        700: '#295346',
        800: '#1b382e',
        900: '#0e1c17',
      },
      neutral: {
        50: '#FAFAFA',
        100: '#dadbdd',
        200: '#b5b8bb',
        300: '#919498',
        400: '#6c7176',
        500: '#474D54',
        600: '#393e43',
        700: '#2b2e32',
        800: '#1c1f22',
        900: '#040008',
      },
      radar: {
        50: '#f0fdf4',
        100: '#dcfce7',
        200: '#bbf7d0',
        300: '#86efac',
        400: '#4ade80',
        500: '#22c55e',
        600: '#16a34a',
        700: '#15803d',
        800: '#166534',
        900: '#14532d',
      },
    },

    /* Based on 1.125 - Major Second type scale */
    fontSize: {
      'xxs': '0.625rem', // body xs
      'xs': '0.75rem', // body sm
      'sm': '0.875rem', // h6 / body md
      'base': '1rem', // h5 / body lg
      'lg': '1.125rem', // h4 / body xl
      'xl': '1.25rem', // h3
      '2xl': '1.4375rem', // h2
      '3xl': '1.625rem', // h1
      'inherit': 'inherit',
    },

    extend: {

      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },

      spacing: {
        4.5: '1.125rem',
      },

      width: {
        4.5: '1.125rem',
      },

      height: {
        4.5: '1.125rem',
      },

    },
  },
  
  plugins: [],
}
