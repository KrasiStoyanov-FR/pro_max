<template>
  <div class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 hero-background">
    <div class="max-w-md w-full space-y-8 p-8 rounded-2xl bg-white/5 backdrop-blur-xl">
      <!-- Header -->
      <div class="text-center">
        <div class="flex items-center justify-center">
          <img src="@/assets/images/logo.png" srcset="@/assets/images/logo@0_25x.png 0.25x,
                    @/assets/images/logo@0_5x.png 0.5x,
                    @/assets/images/logo.png 1x,
                    @/assets/images/logo@2x.png 2x,
                    @/assets/images/logo@3x.png 3x" alt="DTS Logo" class="h-12 w-full object-contain" />
        </div>
        <h2 class="mt-6 text-3xl font-extrabold text-white">
          Welcome Back!
        </h2>
        <p class="mt-2 text-sm text-neutral-100">
          Sign in to access the radar monitoring system
        </p>
      </div>

      <!-- Login Form -->
      <form class="mt-8 space-y-6" @submit.prevent="handleLogin">
        <div class="space-y-4">
          <!-- Email field -->
          <div>
            <label for="email" class="block text-sm font-medium text-white">
              Email address
            </label>
            <input id="email" v-model="form.email" name="email" type="email" autocomplete="email" required
              class="mt-1 input-field" :class="{ 'error': errors.email }" placeholder="Enter your email" />
            <p v-if="errors.email" class="mt-1 text-sm text-red-600">{{ errors.email }}</p>
          </div>

          <!-- Password field -->
          <div>
            <label for="password" class="block text-sm font-medium text-white">
              Password
            </label>
            <input id="password" v-model="form.password" name="password" type="password" autocomplete="current-password"
              required class="mt-1 input-field" :class="{ 'error': errors.password }"
              placeholder="Enter your password" />
            <p v-if="errors.password" class="mt-1 text-sm text-red-600">{{ errors.password }}</p>
          </div>
        </div>

        <!-- Remember me -->
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            <input id="remember-me" v-model="form.rememberMe" name="remember-me" type="checkbox"
              class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-neutral-300 rounded" />
            <label for="remember-me" class="ml-2 block text-sm text-white">
              Remember me
            </label>
          </div>

          <div class="text-sm">
            <a href="#" class="font-medium text-blue-600 hover:text-blue-500">
              Forgot your password?
            </a>
          </div>
        </div>

        <!-- Submit button -->
        <div>
          <button type="submit" :disabled="isLoading"
            class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-in-out">
            <span v-if="isLoading" class="absolute left-0 inset-y-0 flex items-center pl-3">
              <svg class="animate-spin h-5 w-5 text-primary-500" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                </path>
              </svg>
            </span>
            {{ isLoading ? 'Signing in...' : 'Sign in' }}
          </button>
        </div>

        <!-- Error message -->
        <div v-if="errorMessage" class="rounded-md bg-red-50 p-4">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z">
                </path>
              </svg>
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-red-800">Sign in failed</h3>
              <div class="mt-2 text-sm text-red-700">
                <p>{{ errorMessage }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Demo credentials -->
        <div class="p-4 bg-blue-900/20 rounded-xl border border-blue-500/30 backdrop-blur-lg">
          <div class="flex">
            <div class="flex-shrink-0">
              <PhInfo :size="20" class="text-blue-500" weight="bold" />
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-white">Demo Credentials</h3>
              <div class="mt-2 text-sm text-neutral-100">
                <p><strong>Email:</strong> admin@radar.com</p>
                <p><strong>Password:</strong> password</p>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { PhInfo } from '@phosphor-icons/vue'

// Composables
const { login } = useAuth()

// State
const isLoading = ref(false)
const errorMessage = ref('')
const errors = reactive({
  email: '',
  password: ''
})

const form = reactive({
  email: '',
  password: '',
  rememberMe: false
})

// Methods
const validateForm = () => {
  errors.email = ''
  errors.password = ''

  if (!form.email) {
    errors.email = 'Email is required'
  } else if (!/\S+@\S+\.\S+/.test(form.email)) {
    errors.email = 'Email is invalid'
  }

  if (!form.password) {
    errors.password = 'Password is required'
  } else if (form.password.length < 6) {
    errors.password = 'Password must be at least 6 characters'
  }

  return !errors.email && !errors.password
}

const handleLogin = async () => {
  if (!validateForm()) return

  isLoading.value = true
  errorMessage.value = ''

  try {
    const result = await login({
      email: form.email,
      password: form.password
    })

    if (!result.success) {
      errorMessage.value = result.error || 'Login failed'
    }
  } catch (error) {
    console.error('Login error:', error)
    errorMessage.value = 'An unexpected error occurred'
  } finally {
    isLoading.value = false
  }
}
</script>

<style lang="scss" scoped>
// Image paths
$hero-bg-standard: '@/assets/images/hero_background.jpg';
$hero-bg-high: '@/assets/images/hero_background@2x.jpg';

.hero-background {
  // Default fallback for standard DPI displays
  background-image: url($hero-bg-standard);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;

  // High DPI displays (Retina, etc.)
  @media (min-resolution: 192dpi) {
    background-image: url($hero-bg-high);
  }

  // Ultra high DPI displays (3x and above) - fallback to 2x
  @media (min-resolution: 288dpi) {
    background-image: url($hero-bg-high);
  }
}
</style>
