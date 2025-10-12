import { computed, ref } from 'vue'
import { useAuthStore } from '@/store/auth'
import { useRouter } from 'vue-router'
import type { LoginCredentials } from '@/types/auth'

export function useAuth() {
  const authStore = useAuthStore()
  const router = useRouter()

  // Computed properties
  const isAuthenticated = computed(() => authStore.isAuthenticated)
  const user = computed(() => authStore.user)
  const userRole = computed(() => authStore.userRole)
  const isLoading = ref(false)

  // Actions
  const login = async (credentials: LoginCredentials) => {
    isLoading.value = true
    try {
      const result = await authStore.login(credentials)
      
      if (result.success) {
        // Redirect to dashboard or intended route
        const redirectPath = router.currentRoute.value.query.redirect as string || '/dashboard'
        await router.push(redirectPath)
        return { success: true }
      } else {
        return { success: false, error: result.error }
      }
    } catch (error) {
      console.error('Login error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Login failed' 
      }
    } finally {
      isLoading.value = false
    }
  }

  const logout = async () => {
    try {
      authStore.logout()
      await router.push('/login')
      return { success: true }
    } catch (error) {
      console.error('Logout error:', error)
      return { success: false, error: 'Logout failed' }
    }
  }

  const refreshToken = async () => {
    try {
      const success = await authStore.refreshToken()
      return { success }
    } catch (error) {
      console.error('Token refresh error:', error)
      return { success: false, error: 'Token refresh failed' }
    }
  }

  const checkAuth = () => {
    authStore.initializeAuth()
  }

  const hasRole = (role: string) => {
    return userRole.value === role
  }

  const hasAnyRole = (roles: string[]) => {
    return userRole.value ? roles.includes(userRole.value) : false
  }

  return {
    // State
    isAuthenticated,
    user,
    userRole,
    isLoading,
    
    // Actions
    login,
    logout,
    refreshToken,
    checkAuth,
    hasRole,
    hasAnyRole
  }
}
