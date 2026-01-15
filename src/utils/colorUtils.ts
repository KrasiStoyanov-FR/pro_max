/**
 * Color utility functions for converting between color formats
 */

/**
 * Converts RGB values (space-separated string or array) to HEX format
 * @param rgb - RGB values as "R G B" string or [R, G, B] array
 * @returns HEX color string (e.g., "#E6FCF8")
 */
export function rgbToHex(rgb: string | [number, number, number]): string {
  let r: number, g: number, b: number

  if (typeof rgb === 'string') {
    // Handle space-separated RGB values like "230 252 248"
    const parts = rgb.trim().split(/\s+/)
    if (parts.length !== 3) {
      throw new Error(`Invalid RGB string format: ${rgb}. Expected "R G B" format.`)
    }
    r = parseInt(parts[0], 10)
    g = parseInt(parts[1], 10)
    b = parseInt(parts[2], 10)
  } else {
    // Handle array format [R, G, B]
    ;[r, g, b] = rgb
  }

  // Validate RGB values
  if (
    isNaN(r) ||
    isNaN(g) ||
    isNaN(b) ||
    r < 0 ||
    r > 255 ||
    g < 0 ||
    g > 255 ||
    b < 0 ||
    b > 255
  ) {
    throw new Error(`Invalid RGB values: R=${r}, G=${g}, B=${b}. Values must be between 0-255.`)
  }

  // Convert to HEX
  const toHex = (value: number): string => {
    const hex = value.toString(16).toUpperCase()
    return hex.length === 1 ? `0${hex}` : hex
  }

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

/**
 * Converts HEX color to RGB values
 * @param hex - HEX color string (e.g., "#E6FCF8" or "E6FCF8")
 * @returns RGB values as [R, G, B] array
 */
export function hexToRgb(hex: string): [number, number, number] {
  // Remove # if present
  const cleanHex = hex.replace('#', '')

  // Validate hex format
  if (!/^[0-9A-Fa-f]{6}$/.test(cleanHex)) {
    throw new Error(`Invalid HEX format: ${hex}. Expected format: "#RRGGBB" or "RRGGBB"`)
  }

  const r = parseInt(cleanHex.substring(0, 2), 16)
  const g = parseInt(cleanHex.substring(2, 4), 16)
  const b = parseInt(cleanHex.substring(4, 6), 16)

  return [r, g, b]
}

/**
 * Converts HEX color to RGB string format (space-separated)
 * Useful for CSS variables that need RGB format for opacity support
 * @param hex - HEX color string (e.g., "#E6FCF8")
 * @returns RGB string (e.g., "230 252 248")
 */
export function hexToRgbString(hex: string): string {
  const [r, g, b] = hexToRgb(hex)
  return `${r} ${g} ${b}`
}

/**
 * Gets HEX colors from CSS variables
 * This is useful when you need to read HEX values from CSS variables at runtime
 * @param cssVarName - CSS variable name (e.g., "primary-50")
 * @returns HEX color string
 */
export function getHexFromCssVar(cssVarName: string): string {
  if (typeof window === 'undefined') {
    throw new Error('getHexFromCssVar can only be used in browser environment')
  }

  const root = document.documentElement
  const value = getComputedStyle(root).getPropertyValue(`--${cssVarName}`).trim()

  if (!value) {
    throw new Error(`CSS variable --${cssVarName} not found`)
  }

  // If the value is already in HEX format, return it
  if (value.startsWith('#')) {
    return value
  }

  // If it's in RGB format (space-separated), convert to HEX
  if (/^\d+\s+\d+\s+\d+$/.test(value)) {
    return rgbToHex(value)
  }

  // If it's already a valid color, return as is
  return value
}

/**
 * Gets all primary color CSS variables as HEX values
 * Useful for programmatic access to brand colors
 * @returns Object with primary color keys and HEX values
 */
export function getPrimaryColorsAsHex(): Record<string, string> {
  if (typeof window === 'undefined') {
    throw new Error('getPrimaryColorsAsHex can only be used in browser environment')
  }

  const shades = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900']
  const colors: Record<string, string> = {}

  shades.forEach(shade => {
    try {
      colors[shade] = getHexFromCssVar(`primary-${shade}`)
    } catch (error) {
      console.warn(`Failed to get color for primary-${shade}:`, error)
    }
  })

  return colors
}
