<template>
  <aside :class="[
    'bg-neutral-900 border-r border-neutral-600 transition-all ease-in-out',
    isCollapsed ? 'w-16' : 'w-64'
  ]">
    <div class="h-full flex flex-col">
      <!-- Sidebar header -->
      <div class="px-6 py-4 border-b border-neutral-600">
        <div class="flex items-center justify-between relative">
          <div class="flex items-center space-x-2">
            <!-- DTS Logo -->
            <div class="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
              <span class="text-white font-bold text-xs">DTS</span>
            </div>

            <!-- Right side - Title -->
            <div v-if="!isCollapsed" class="flex items-center truncate">
              <h1 class="text-white text-xxs font-medium">DRONE TRACKING SYSTEM</h1>
            </div>
          </div>

          <button @click="$emit('toggle')"
            class="w-8 h-8 flex items-center justify-center absolute top-0 -right-10 bottom-0 my-auto p-1 rounded-md bg-neutral-600 hover:bg-neutral-700 text-neutral-200 hover:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all ease-in-out"
            :class="{ 'rotate-180': isCollapsed }">
            <PhCaretLeft :size="16" weight="bold" />
          </button>
        </div>
      </div>

      <!-- Navigation items -->
      <nav class="flex-1 p-4 space-y-2">
        <router-link v-for="item in navigationItems" :key="item.name" :to="item.href" :class="[
          'sidebar-item',
          $route.name === item.name ? 'sidebar-item-active' : 'sidebar-item-inactive'
        ]">
          <component :is="item.icon" class="w-5 h-5 flex-shrink-0" />
          <span v-if="!isCollapsed" class="ml-3">{{ item.label }}</span>
        </router-link>
      </nav>

      <!-- Sidebar footer -->
      <div class="p-4 border-t border-neutral-600">
        <p v-if="!isCollapsed" class="text-xs text-neutral-500">v3.15.3</p>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { PhList, PhCompass, PhLayout, PhCaretLeft } from '@phosphor-icons/vue'
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

// Route
const route = useRoute()

// Navigation items
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
</script>
