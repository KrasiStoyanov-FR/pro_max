<template>
  <aside :class="[
    'flex-1 bg-neutral-900 transition-all duration-[400ms] ease-in-out',
    isCollapsed ? 'sidebar-collapsed max-w-16' : 'max-w-64'
  ]">
    <div class="h-full flex flex-col relative">
      <button @click="$emit('toggle')"
        class="w-8 h-8 flex items-center justify-center absolute top-4 -right-7 p-1 rounded-full bg-neutral-800 hover:bg-neutral-900 text-neutral-200 hover:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all ease-in-out"
        :class="{ 'rotate-180 -right-9': isCollapsed }">
        <PhCaretLeft :size="16" weight="bold" />
      </button>
      
      <!-- Sidebar header -->
      <div :class="isCollapsed ? 'px-4' : 'px-6'"
        class="py-4 transition-all duration-[400ms] ease-in-out">
        <div class="flex items-center justify-between overflow-hidden">
          <div class="flex items-center space-x-2">
            <!-- DTS Logo -->
            <div class="w-8 h-8 bg-neutral-800 rounded-full flex items-center justify-center">
              <!-- <span class="text-white font-bold text-xs">DTS</span> -->
              <img src="@/assets/images/logo.png" alt="Logo">
            </div>

            <!-- Right side - Title -->
            <div class="flex items-center truncate transition-all duration-[400ms] ease-in-out" :class="[isCollapsed ? 'opacity-0 invisible' : '']">
              <h1 class="text-white text-xxs font-medium">DRONE TRACKING SYSTEM</h1>
            </div>
          </div>
        </div>
      </div>

      <!-- Navigation items -->
      <div class="flex-1">
        <div class="relative">
          <nav class="flex flex-col flex-1 py-4 relative z-10">
            <router-link v-for="item in navigationItems" :key="item.name" :to="item.href" :class="[
              isCollapsed ? 'sidebar-item-collapsed' : '',
              $route.name === item.name ? 'sidebar-item-active' : 'sidebar-item-inactive'
            ]" class="sidebar-item col-span-1 row-span-1">
              <component :is="item.icon" :weight="$route.name === item.name ? 'fill' : 'bold'"
                :class="{ 'text-primary-500': $route.name === item.name && !isCollapsed }"
                class="icon w-5 h-5 flex-shrink-0 transition-colors duration-[400ms] ease-in-out" />
              <span class="label ml-1.5">{{ item.label }}</span>
            </router-link>
          </nav>

          <div :class="[isCollapsed ? 'w-full right-0 px-3' : 'w-2']"
            class="py-4 flex flex-col absolute top-0 bottom-0 left-0 transition-all duration-[400ms] ease-in-out z-0">
            <span class="h-10 transform translate-y-0.5 bg-primary-500 transition-all duration-[400ms] ease-in-out"
              :style="`
                margin-top: ${currentNavigationItemOffsetTop}rem;
                border-top-right-radius: ${isCollapsed ? '0.75rem' : '9999px'};
                border-bottom-right-radius: ${isCollapsed ? '0.75rem' : '9999px'};
                border-top-left-radius: ${isCollapsed ? '0.75rem' : '0'};
                border-bottom-left-radius: ${isCollapsed ? '0.75rem' : '0'};
              `"></span>
          </div>
        </div>
      </div>

      <div class="flex flex-col relative" ref="userMenuRef">
        <button @click="toggleUserMenu" :class="[
          isCollapsed ? 'sidebar-item-collapsed' : '',
        ]" class="sidebar-item sidebar-item-inactive col-span-1 row-span-1">
          <PhUser weight="bold" class="icon w-5 h-5 flex-shrink-0 transition-colors duration-[400ms] ease-in-out" />
          <span class="label ml-1.5">{{ user?.name || 'User' }}</span>
          <PhCaretDown :class="{ 'rotate-180': isUserMenuOpen }" class="w-3 h-3 flex-none transition-transform" />
        </button>

        <!-- Dropdown menu -->
        <div v-if="isUserMenuOpen"
          class="absolute left-full bottom-0 ml-1.5 w-48 bg-neutral-800 rounded-md shadow-lg border border-neutral-700 z-50">
          <div class="py-1">
            <!-- User info -->
            <div class="px-4 py-2 border-b border-neutral-700">
              <p class="text-sm font-medium text-white">{{ user?.name }}</p>
              <p class="text-xs text-neutral-400">{{ user?.email }}</p>
              <p class="text-xs text-primary-400 uppercase">{{ user?.role }}</p>
            </div>

            <!-- Menu items -->
            <button @click="handleLogout"
              class="w-full text-left px-4 py-2 text-sm text-neutral-300 hover:text-white hover:bg-neutral-700 transition-colors flex items-center space-x-2">
              <PhSignOut :size="16" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Sidebar footer -->
      <div :class="[isCollapsed ? 'px-3' : 'px-4']" class="py-4">
        <p class="pt-4 transform border-t text-xs text-neutral-500 truncate">v3.15.3</p>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { useAuth } from '@/composables/useAuth';
import { PhCompass, PhLayout, PhCaretLeft, PhUser, PhCaretDown } from '@phosphor-icons/vue'
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRoute } from 'vue-router'

// Props
interface Props {
  isCollapsed: boolean
}

defineProps<Props>()

// Emits
defineEmits<{
  toggle: []
}>()

// Composables
const { user, logout } = useAuth()

// State
const isUserMenuOpen = ref(false)
const userMenuRef = ref<HTMLElement | null>(null)

// Route
const route = useRoute()

// Navigation items
// NOTE: Routes for Dashboard, Account, Receivers, and Controls are not yet implemented
// Uncomment routes in router/index.ts and create corresponding page components
const navigationItems = [
  {
    name: 'Map',
    label: 'Map',
    href: '/map',
    icon: PhCompass
  },
  {
    name: 'Dashboard',
    label: 'Dashboard',
    href: '/dashboard',
    icon: PhLayout
  },
  {
    name: 'Account',
    label: 'Account',
    href: '/account',
    icon: PhLayout
  },
  {
    name: 'Receivers',
    label: 'Receivers',
    href: '/receivers',
    icon: PhLayout
  },
  {
    name: 'Controls',
    label: 'Controls',
    href: '/controls',
    icon: PhLayout
  },
]

const currentNavigationItemOffsetTop = computed(() => {
  let result = 0
  navigationItems.map((item, index) => {
    result = route.name === item.name ? index : result
  })

  return result * 2.75
})

// Methods
const toggleUserMenu = () => {
  isUserMenuOpen.value = !isUserMenuOpen.value
}

const handleLogout = async () => {
  try {
    await logout()
    isUserMenuOpen.value = false
  } catch (error) {
    console.error('Logout failed:', error)
  }
}

// Close menu when clicking outside
const handleClickOutside = (event: Event) => {
  if (userMenuRef.value && !userMenuRef.value.contains(event.target as Node)) {
    isUserMenuOpen.value = false
  }
}

// Lifecycle
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

</script>
