import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '@/types/auth'

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref<User | null>(null)
  const token = ref<string | null>(null)
  const expiresAt = ref<number | null>(null)

  // Getters
  const isAuthenticated = computed(() => {
    if (!token.value || !expiresAt.value) return false
    return Date.now() < expiresAt.value
  })

  const userRole = computed(() => user.value?.role || null)

  // Actions
  const setToken = (newToken: string, expirationTime?: number, rememberMe: boolean = false) => {
    token.value = newToken
    expiresAt.value = expirationTime || Date.now() + (24 * 60 * 60 * 1000) // 24 hours default
    
    // Use localStorage if "Remember Me" is checked, otherwise use sessionStorage
    const storage = rememberMe ? localStorage : sessionStorage
    
    // Store in appropriate storage for persistence across page reloads
    // TODO: Replace with HttpOnly cookies in production
    storage.setItem('auth_token', newToken)
    storage.setItem('auth_expires', expiresAt.value.toString())
    
    // Also store the rememberMe preference
    storage.setItem('auth_rememberMe', rememberMe.toString())
  }

  const setUser = (userData: User, rememberMe: boolean = false) => {
    user.value = userData
    const storage = rememberMe ? localStorage : sessionStorage
    storage.setItem('auth_user', JSON.stringify(userData))
  }

  const login = async (credentials: { email: string; password: string; rememberMe?: boolean }) => {
    try {
      const rememberMe = credentials.rememberMe || false
      
      // TODO: Replace with real API call
      // Mock authentication for development
      
      // Master account for professional demos
      if (credentials.email === 'master@promax.com' && credentials.password === 'DroneTrackingSystem') {
        const mockUser: User = {
          id: 'master-001',
          name: 'Master Administrator',
          email: 'master@promax.com',
          role: 'admin'
        }
        
        const mockToken = 'mock-jwt-token-master-' + Date.now()
        
        // Store email in localStorage if rememberMe is checked
        if (rememberMe) {
          localStorage.setItem('remembered_email', credentials.email)
        } else {
          localStorage.removeItem('remembered_email')
        }
        
        setUser(mockUser, rememberMe)
        setToken(mockToken, undefined, rememberMe)
        
        return { success: true, user: mockUser }
      }
      
      // Demo account (kept for backward compatibility)
      if (credentials.email === 'admin@radar.com' && credentials.password === 'password') {
        const mockUser: User = {
          id: '1',
          name: 'Admin User',
          email: 'admin@radar.com',
          role: 'admin'
        }
        
        const mockToken = 'mock-jwt-token-' + Date.now()
        
        // Store email in localStorage if rememberMe is checked
        if (rememberMe) {
          localStorage.setItem('remembered_email', credentials.email)
        } else {
          localStorage.removeItem('remembered_email')
        }
        
        setUser(mockUser, rememberMe)
        setToken(mockToken, undefined, rememberMe)
        
        return { success: true, user: mockUser }
      } else {
        throw new Error('Invalid credentials')
      }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Login failed' }
    }
  }

  const logout = () => {
    user.value = null
    token.value = null
    expiresAt.value = null
    
    // Clear both sessionStorage and localStorage
    sessionStorage.removeItem('auth_token')
    sessionStorage.removeItem('auth_expires')
    sessionStorage.removeItem('auth_user')
    sessionStorage.removeItem('auth_rememberMe')
    
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_expires')
    localStorage.removeItem('auth_user')
    localStorage.removeItem('auth_rememberMe')
    // Note: We keep remembered_email in localStorage so user doesn't have to retype it
  }

  const refreshToken = async () => {
    // TODO: Implement token refresh logic when backend is available
    if (!token.value) return false
    
    try {
      // Check if we're using localStorage (rememberMe) or sessionStorage
      const rememberMe = localStorage.getItem('auth_token') !== null
      
      // Mock refresh - in production, call your refresh endpoint
      const newToken = 'refreshed-token-' + Date.now()
      setToken(newToken, undefined, rememberMe)
      return true
    } catch (error) {
      console.error('Token refresh failed:', error)
      logout()
      return false
    }
  }

  const initializeAuth = () => {
    // Restore auth state from localStorage or sessionStorage on app initialization
    // Check localStorage first (for "Remember Me" users), then sessionStorage
    let storedToken = localStorage.getItem('auth_token')
    let storedExpires = localStorage.getItem('auth_expires')
    let storedUser = localStorage.getItem('auth_user')
    let storageType = 'localStorage'

    // If not found in localStorage, check sessionStorage
    if (!storedToken || !storedExpires || !storedUser) {
      storedToken = sessionStorage.getItem('auth_token')
      storedExpires = sessionStorage.getItem('auth_expires')
      storedUser = sessionStorage.getItem('auth_user')
      storageType = 'sessionStorage'
    }

    if (storedToken && storedExpires && storedUser) {
      const expirationTime = parseInt(storedExpires)
      if (Date.now() < expirationTime) {
        token.value = storedToken
        expiresAt.value = expirationTime
        user.value = JSON.parse(storedUser)
      } else {
        // Token expired, clear storage
        logout()
      }
    }
  }
  
  const getRememberedEmail = (): string | null => {
    return localStorage.getItem('remembered_email')
  }

  return {
    // State
    user,
    token,
    expiresAt,
    
    // Getters
    isAuthenticated,
    userRole,
    
    // Actions
    login,
    logout,
    setToken,
    setUser,
    refreshToken,
    initializeAuth,
    getRememberedEmail
  }
})

