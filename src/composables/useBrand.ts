/**
 * Brand Composable
 * 
 * Provides reactive access to brand configuration in Vue components
 */

import { computed, ref, onMounted } from 'vue'
import {
  getCurrentBrand,
  getBrandId,
  setBrand,
} from '@/config/brandConfig'
import type { BrandId, BrandConfig } from '@/config/brandConfig'
import { initializeBrand } from '@/config/brandConfig'

/**
 * Composable for accessing brand configuration
 */
export function useBrand() {
  // Reactive brand state
  const currentBrandId = ref<BrandId>(getBrandId())
  const currentBrand = ref<BrandConfig>(getCurrentBrand())

  // Initialize brand on mount
  onMounted(() => {
    initializeBrand()
    // Update reactive state
    currentBrandId.value = getBrandId()
    currentBrand.value = getCurrentBrand()
  })

  // Computed properties
  const brandId = computed(() => currentBrandId.value)
  const brand = computed(() => currentBrand.value)
  const brandName = computed(() => currentBrand.value.displayName)
  const brandColors = computed(() => currentBrand.value.colors)
  const brandAssets = computed(() => currentBrand.value.assets)
  const brandUI = computed(() => currentBrand.value.ui)

  // Methods
  const switchBrand = (newBrandId: BrandId) => {
    setBrand(newBrandId)
    // State will update after reload, but we can update immediately for reactivity
    currentBrandId.value = newBrandId
    currentBrand.value = getCurrentBrand()
  }

  /**
   * Get brand-specific asset path
   */
  const getAsset = (relativePath: string): string => {
    const brand = currentBrand.value
    
    // If path starts with /, it's already absolute
    if (relativePath.startsWith('/')) {
      return relativePath
    }

    // Try brand-specific asset first
    const brandAssetPath = `/src/assets/brands/${brand.id}/${relativePath}`
    
    // Fallback to shared assets
    const sharedAssetPath = `/src/assets/images/${relativePath}`
    
    return brandAssetPath
  }

  /**
   * Check if a feature is enabled for current brand
   */
  const hasFeature = (featureName: string): boolean => {
    return currentBrand.value.features?.[featureName] ?? true
  }

  /**
   * Get logo path with variants if available
   */
  const getLogo = () => {
    const logo = currentBrand.value.assets.logo
    
    if (logo.type === 'png' && logo.variants) {
      // Return srcset string for PNG variants
      return {
        src: logo.path,
        srcset: logo.variants
          .map((variant: string, index: number) => {
            const multiplier = index === 0 ? '0.25x' : index === 1 ? '0.5x' : index === 2 ? '1x' : index === 3 ? '2x' : '3x'
            return `${variant} ${multiplier}`
          })
          .join(', '),
      }
    }
    
    // Return single path for SVG
    return {
      src: logo.path,
      srcset: undefined,
    }
  }

  /**
   * Check if flag should be shown
   */
  const shouldShowFlag = (): boolean => {
    return currentBrand.value.assets.flag?.showOnLogin ?? false
  }

  /**
   * Get flag path if available
   */
  const getFlag = (): string | undefined => {
    return currentBrand.value.assets.flag?.path
  }

  return {
    // State
    brandId,
    brand,
    brandName,
    brandColors,
    brandAssets,
    brandUI,
    
    // Methods
    switchBrand,
    getAsset,
    hasFeature,
    getLogo,
    shouldShowFlag,
    getFlag,
  }
}

