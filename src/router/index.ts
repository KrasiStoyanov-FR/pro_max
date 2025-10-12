import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/store/auth'

// Lazy-loaded route components for code-splitting
const Login = () => import('@/pages/Login.vue')
const Dashboard = () => import('@/pages/Dashboard.vue')

// TODO: Add more routes as needed
// const Reports = () => import('@/pages/Reports.vue')
// const Settings = () => import('@/pages/Settings.vue')
// const Alerts = () => import('@/pages/Alerts.vue')

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/dashboard'
    },
    {
      path: '/login',
      name: 'Login',
      component: Login,
      meta: {
        requiresAuth: false,
        title: 'Login - Defense Radar Dashboard'
      }
    },
    {
      path: '/dashboard',
      name: 'Dashboard',
      component: Dashboard,
      meta: {
        requiresAuth: true,
        title: 'Dashboard - Defense Radar Dashboard'
      }
    },
    // TODO: Add more protected routes
    // {
    //   path: '/reports',
    //   name: 'Reports',
    //   component: Reports,
    //   meta: {
    //     requiresAuth: true,
    //     roles: ['admin', 'operator'],
    //     title: 'Reports - Defense Radar Dashboard'
    //   }
    // },
    // {
    //   path: '/settings',
    //   name: 'Settings',
    //   component: Settings,
    //   meta: {
    //     requiresAuth: true,
    //     roles: ['admin'],
    //     title: 'Settings - Defense Radar Dashboard'
    //   }
    // },
    // {
    //   path: '/alerts',
    //   name: 'Alerts',
    //   component: Alerts,
    //   meta: {
    //     requiresAuth: true,
    //     title: 'Alerts - Defense Radar Dashboard'
    //   }
    // },
    {
      path: '/:pathMatch(.*)*',
      name: 'NotFound',
      redirect: '/dashboard'
    }
  ]
})

// Navigation guard for authentication
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  
  // Initialize auth state if not already done
  if (!authStore.isAuthenticated && !to.meta.requiresAuth) {
    authStore.initializeAuth()
  }
  
  // Check if route requires authentication
  if (to.meta.requiresAuth) {
    if (!authStore.isAuthenticated) {
      // Redirect to login if not authenticated
      next({
        path: '/login',
        query: { redirect: to.fullPath }
      })
      return
    }
    
    // TODO: Implement role-based access control
    // Check if user has required role
    if (to.meta.roles && Array.isArray(to.meta.roles)) {
      const userRole = authStore.userRole
      if (!userRole || !to.meta.roles.includes(userRole)) {
        // Redirect to dashboard if user doesn't have required role
        next('/dashboard')
        return
      }
    }
  }
  
  // Redirect authenticated users away from login page
  if (to.path === '/login' && authStore.isAuthenticated) {
    const redirectPath = (to.query.redirect as string) || '/dashboard'
    next(redirectPath)
    return
  }
  
  // Set page title
  if (to.meta.title) {
    document.title = to.meta.title as string
  }
  
  next()
})

// Global error handler
router.onError((error) => {
  console.error('Router error:', error)
  // TODO: Show user-friendly error message
})

export default router


