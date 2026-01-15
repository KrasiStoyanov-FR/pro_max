/**
 * Brand Configuration Manager
 * 
 * Handles brand detection and provides access to current brand configuration
 */

import { brands, defaultBrand } from './brands'
import type { BrandId, BrandConfig } from './brands'

// Re-export types for convenience
export type { BrandId, BrandConfig } from './brands'

/**
 * Get the current brand ID from environment or detection logic
 */
export function getBrandId(): BrandId {
  // Priority 1: Environment variable (build-time configuration)
  const envBrand = import.meta.env.VITE_APP_BRAND as BrandId | undefined
  
  if (envBrand && (envBrand === 'original' || envBrand === 'pakistan')) {
    return envBrand
  }

  // Priority 2: URL/Subdomain detection (runtime configuration)
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname.toLowerCase()
    
    if (hostname.includes('pakistan') || hostname.includes('pk')) {
      return 'pakistan'
    }
    
    // Check for brand in pathname (e.g., /pakistan/login)
    const pathname = window.location.pathname.toLowerCase()
    if (pathname.startsWith('/pakistan')) {
      return 'pakistan'
    }
  }

  // Priority 3: LocalStorage (user preference)
  if (typeof window !== 'undefined') {
    const storedBrand = localStorage.getItem('app_brand') as BrandId | null
    if (storedBrand && (storedBrand === 'original' || storedBrand === 'pakistan')) {
      return storedBrand
    }
  }

  // Fallback to default
  return defaultBrand
}

/**
 * Get the current brand configuration
 */
export function getCurrentBrand(): BrandConfig {
  const brandId = getBrandId()
  return brands[brandId] || brands[defaultBrand]
}

/**
 * Set the brand (for runtime switching)
 */
export function setBrand(brandId: BrandId): void {
  if (brandId !== 'original' && brandId !== 'pakistan') {
    console.warn(`Invalid brand ID: ${brandId}. Using default.`)
    return
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem('app_brand', brandId)
    // Reload to apply changes (or use reactive system)
    window.location.reload()
  }
}

/**
 * Initialize brand configuration
 * Sets data attributes and CSS variables for the current brand
 * Colors are set in HEX format for use in Tailwind config
 */
export function initializeBrand(): void {
  if (typeof window === 'undefined') return

  const brand = getCurrentBrand()
  const root = document.documentElement

  // Set data attribute for CSS targeting
  root.setAttribute('data-brand', brand.id)

  // Set CSS custom properties for colors in HEX format
  // This allows Tailwind to use them directly with opacity modifiers
  Object.entries(brand.colors.primary).forEach(([key, value]) => {
    root.style.setProperty(`--primary-${key}`, value)
  })

  // Set other brand-specific CSS variables
  root.style.setProperty('--sidebar-collapsed-radius', brand.ui.sidebarCollapsedRadius)
}

/**
 * Get brand-specific asset path
 */
export function getBrandAsset(relativePath: string): string {
  const brand = getCurrentBrand()
  
  // If path starts with /, it's already absolute
  if (relativePath.startsWith('/')) {
    return relativePath
  }

  // Try brand-specific asset first
  const brandAssetPath = `/src/assets/brands/${brand.id}/${relativePath}`
  
  // Fallback to shared assets
  const sharedAssetPath = `/src/assets/images/${relativePath}`
  
  // In production, you might want to check if file exists
  // For now, return brand-specific path
  return brandAssetPath
}

// Auto-initialize on module load (browser only)
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeBrand)
  } else {
    initializeBrand()
  }
}

