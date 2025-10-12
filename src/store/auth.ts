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
  const setToken = (newToken: string, expirationTime?: number) => {
    token.value = newToken
    expiresAt.value = expirationTime || Date.now() + (24 * 60 * 60 * 1000) // 24 hours default
    
    // Store in sessionStorage for persistence across page reloads
    // TODO: Replace with HttpOnly cookies in production
    sessionStorage.setItem('auth_token', newToken)
    sessionStorage.setItem('auth_expires', expiresAt.value.toString())
  }

  const setUser = (userData: User) => {
    user.value = userData
    sessionStorage.setItem('auth_user', JSON.stringify(userData))
  }

  const login = async (credentials: { email: string; password: string }) => {
    try {
      // TODO: Replace with real API call
      // Mock authentication for development
      if (credentials.email === 'admin@radar.com' && credentials.password === 'password') {
        const mockUser: User = {
          id: '1',
          name: 'Admin User',
          email: 'admin@radar.com',
          role: 'admin'
        }
        
        const mockToken = 'mock-jwt-token-' + Date.now()
        
        setUser(mockUser)
        setToken(mockToken)
        
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
    
    // Clear sessionStorage
    sessionStorage.removeItem('auth_token')
    sessionStorage.removeItem('auth_expires')
    sessionStorage.removeItem('auth_user')
  }

  const refreshToken = async () => {
    // TODO: Implement token refresh logic when backend is available
    if (!token.value) return false
    
    try {
      // Mock refresh - in production, call your refresh endpoint
      const newToken = 'refreshed-token-' + Date.now()
      setToken(newToken)
      return true
    } catch (error) {
      console.error('Token refresh failed:', error)
      logout()
      return false
    }
  }

  const initializeAuth = () => {
    // Restore auth state from sessionStorage on app initialization
    const storedToken = sessionStorage.getItem('auth_token')
    const storedExpires = sessionStorage.getItem('auth_expires')
    const storedUser = sessionStorage.getItem('auth_user')

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
    initializeAuth
  }
})

