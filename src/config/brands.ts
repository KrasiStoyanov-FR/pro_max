/**
 * Brand Configuration Definitions
 * 
 * Defines all available brands and their specific configurations
 */

export type BrandId = 'original' | 'pakistan'

export interface BrandConfig {
  id: BrandId
  name: string
  displayName: string
  colors: {
    primary: {
      50: string
      100: string
      200: string
      300: string
      400: string
      500: string
      600: string
      700: string
      800: string
      900: string
    }
  }
  assets: {
    logo: {
      type: 'svg' | 'png'
      path: string
      variants?: string[]
    }
    flag?: {
      path: string
      showOnLogin: boolean
    }
  }
  ui: {
    sidebarCollapsedRadius: string
  }
  auth: {
    masterAccounts: Array<{
      email: string
      password: string
      name: string
    }>
  }
  features?: {
    [key: string]: boolean
  }
}

/**
 * Original brand configuration (Teal/Cyan theme)
 */
export const originalBrand: BrandConfig = {
  id: 'original',
  name: 'original',
  displayName: 'Original',
  colors: {
    primary: {
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
  },
  assets: {
    logo: {
      type: 'png',
      path: '/src/assets/images/logo.png',
      variants: [
        '/src/assets/images/logo@0_25x.png',
        '/src/assets/images/logo@0_5x.png',
        '/src/assets/images/logo.png',
        '/src/assets/images/logo@2x.png',
        '/src/assets/images/logo@3x.png',
      ],
    },
    flag: undefined,
  },
  ui: {
    sidebarCollapsedRadius: '0.75rem',
  },
  auth: {
    masterAccounts: [
      {
        email: 'master@promax.com',
        password: 'DroneTrackingSystem',
        name: 'Master Administrator',
      },
      {
        email: 'admin@radar.com',
        password: 'password',
        name: 'Admin User',
      },
    ],
  },
}

/**
 * Pakistan brand configuration (Blue theme)
 */
export const pakistanBrand: BrandConfig = {
  id: 'pakistan',
  name: 'pakistan',
  displayName: 'Pakistan',
  colors: {
    primary: {
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
  },
  assets: {
    logo: {
      type: 'svg',
      path: '/src/assets/brands/pakistan/logo.svg',
    },
    flag: {
      path: '/src/assets/brands/pakistan/pakistan_flag.svg',
      showOnLogin: true,
    },
  },
  ui: {
    sidebarCollapsedRadius: '0.25rem',
  },
  auth: {
    masterAccounts: [
      {
        email: 'master@promax.com',
        password: 'DroneTrackingSystem',
        name: 'Master Administrator',
      },
      {
        email: 'master@bluesurge.com',
        password: 'DroneTrakingSystem',
        name: 'BlueSurge Master Administrator',
      },
      {
        email: 'admin@radar.com',
        password: 'password',
        name: 'Admin User',
      },
    ],
  },
}

/**
 * All available brands
 */
export const brands: Record<BrandId, BrandConfig> = {
  original: originalBrand,
  pakistan: pakistanBrand,
}

/**
 * Default brand (fallback)
 */
export const defaultBrand: BrandId = 'original'

