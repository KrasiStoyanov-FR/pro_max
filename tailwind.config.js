// Load environment variables from .env file
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import { existsSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load .env file (supports .env, .env.local, .env.production, etc.)
// Try .env.local first (higher priority), then .env
const envLocalPath = resolve(__dirname, '.env.local')
const envPath = resolve(__dirname, '.env')

if (existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath })
} else if (existsSync(envPath)) {
  dotenv.config({ path: envPath })
}

/**
 * Get brand colors in HEX format for Tailwind config
 * Reads from environment variable at build time
 * 
 * The brand is determined by:
 * 1. VITE_APP_BRAND environment variable (from .env file or cross-env)
 * 2. Falls back to 'original' if not set
 */
function getBrandColors() {
  // Get brand from environment variable
  // Check both process.env (for cross-env) and loaded dotenv values
  const brandId = (process.env.VITE_APP_BRAND || 'original').toLowerCase().trim()
  
  // Debug logging (can be removed in production)
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Tailwind Config] VITE_APP_BRAND:', process.env.VITE_APP_BRAND || 'undefined (using default: original)')
    console.log('[Tailwind Config] Selected brand:', brandId)
  }
  
  // Brand color definitions (HEX format)
  const brandColors = {
    original: {
      50: '#E6FCF8',
      100: '#CCF9F1',
      200: '#B3F6EA',
      300: '#99F3E3',
      400: '#66ECD4',
      500: '#33E6C6',
      600: '#00E0B8',
      700: '#00866E',
      800: '#004337',
      900: '#001612',
    },
    pakistan: {
      50: '#F5F8FF',
      100: '#DEE9FF',
      200: '#C7D9FF',
      300: '#ADC8FF',
      400: '#7AA6FF',
      500: '#4582FF',
      600: '#0C5AFA',
      700: '#083AA1',
      800: '#05215C',
      900: '#031130',
    },
  }

  // Return colors for the specified brand, fallback to original
  return brandColors[brandId] || brandColors.original
}

const primaryColors = getBrandColors()

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
      xl: '.75rem', // 12px
      '2xl': '1rem', // 16px
      '3xl': '1.5rem', // 24px
      '4xl': '2.5rem', // 40px
      full: '9999px',
    },
    
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      black: '#000000',
      white: '#FFFFFF',
      primary: {
        50: primaryColors[50],
        100: primaryColors[100],
        200: primaryColors[200],
        300: primaryColors[300],
        400: primaryColors[400],
        500: primaryColors[500],
        600: primaryColors[600],
        700: primaryColors[700],
        800: primaryColors[800],
        900: primaryColors[900],
      },
      neutral: {
        50: '#FAFAFA',
        100: '#dadbdd',
        200: '#b5b8bb',
        300: '#92979B',
        400: '#75797E',
        500: '#575C60',
        600: '#393E43',
        700: '#222528',
        800: '#111314',
        900: '#060607',
      },
      red: {
        50: '#FFEDED',
        100: '#FFDBDC',
        200: '#FFCACA',
        300: '#FFB8B9',
        400: '#FF9495',
        500: '#FF7172',
        600: '#FF4D4F',
        700: '#A72E2F',
        800: '#661718',
        900: '#3A0808',
      },
      yellow: {
        50: '#FFF9EC',
        100: '#FFF3D8',
        200: '#FFEEC5',
        300: '#FFE8B1',
        400: '#FFDC8B',
        500: '#FFD164',
        600: '#FFC53D',
        700: '#A17C25',
        800: '#5B4512',
        900: '#2C2006',
      },
      green: {
        50: '#E9F9EF',
        100: '#D3F3DF',
        200: '#BCEDCF',
        300: '#A6E7BF',
        400: '#7ADA9E',
        500: '#4DCE7E',
        600: '#21C25E',
        700: '#147438',
        800: '#0A3A1C',
        900: '#031309',
      },
      blue: {
        50: '#ECF5FF',
        100: '#D8ECFF',
        200: '#C5E2FF',
        300: '#B1D8FF',
        400: '#8BC5FF',
        500: '#64B1FF',
        600: '#3D9EFF',
        700: '#2563A1',
        800: '#12365B',
        900: '#06192C',
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
        22: '5.5rem',
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
