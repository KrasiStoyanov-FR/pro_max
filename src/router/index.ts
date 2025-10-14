import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/store/auth'

// Lazy-loaded route components for code-splitting
const Login = () => import('@/pages/Login.vue')
const Map = () => import('@/pages/Map.vue')

// TODO: Create these page components
// const Dashboard = () => import('@/pages/Dashboard.vue')
// const Account = () => import('@/pages/Account.vue')
// const Receivers = () => import('@/pages/Receivers.vue')
// const Controls = () => import('@/pages/Controls.vue')

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/map'
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
      path: '/map',
      name: 'Map',
      component: Map,
      meta: {
        requiresAuth: true,
        title: 'Map - Defense Radar Dashboard'
      }
    },
    // TODO: Uncomment when page components are created
    // {
    //   path: '/dashboard',
    //   name: 'Dashboard',
    //   component: Dashboard,
    //   meta: {
    //     requiresAuth: true,
    //     title: 'Dashboard - Defense Radar Dashboard'
    //   }
    // },
    // {
    //   path: '/account',
    //   name: 'Account',
    //   component: Account,
    //   meta: {
    //     requiresAuth: true,
    //     title: 'Account - Defense Radar Dashboard'
    //   }
    // },
    // {
    //   path: '/receivers',
    //   name: 'Receivers',
    //   component: Receivers,
    //   meta: {
    //     requiresAuth: true,
    //     title: 'Receivers - Defense Radar Dashboard'
    //   }
    // },
    // {
    //   path: '/controls',
    //   name: 'Controls',
    //   component: Controls,
    //   meta: {
    //     requiresAuth: true,
    //     title: 'Controls - Defense Radar Dashboard'
    //   }
    // },
    {
      path: '/:pathMatch(.*)*',
      name: 'NotFound',
      redirect: '/map'
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
        // Redirect to map if user doesn't have required role
        next('/map')
        return
      }
    }
  }
  
  // Redirect authenticated users away from login page
  if (to.path === '/login' && authStore.isAuthenticated) {
    const redirectPath = (to.query.redirect as string) || '/map'
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


