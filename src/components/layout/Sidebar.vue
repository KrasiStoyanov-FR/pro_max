<template>
  <aside 
    :class="[
      'bg-white border-r border-gray-200 transition-all duration-300 ease-in-out',
      isCollapsed ? 'w-16' : 'w-64'
    ]"
  >
    <div class="h-full flex flex-col">
      <!-- Sidebar header -->
      <div class="p-4 border-b border-gray-200">
        <div class="flex items-center justify-between">
          <div v-if="!isCollapsed" class="flex items-center space-x-2">
            <h2 class="text-lg font-semibold text-gray-900">Navigation</h2>
          </div>
          <button
            @click="$emit('toggle')"
            class="p-1 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-md"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
            </svg>
          </button>
        </div>
      </div>

      <!-- Navigation items -->
      <nav class="flex-1 p-4 space-y-2">
        <router-link
          v-for="item in navigationItems"
          :key="item.name"
          :to="item.href"
          :class="[
            'sidebar-item',
            $route.name === item.name ? 'sidebar-item-active' : 'sidebar-item-inactive'
          ]"
        >
          <component :is="item.icon" class="w-5 h-5 flex-shrink-0" />
          <span v-if="!isCollapsed" class="ml-3">{{ item.label }}</span>
        </router-link>
      </nav>

      <!-- Sidebar footer -->
      <div class="p-4 border-t border-gray-200">
        <div v-if="!isCollapsed" class="text-xs text-gray-500">
          <p>Version 1.0.0</p>
          <p>Last updated: {{ lastUpdated }}</p>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
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

// State
const lastUpdated = ref(new Date().toLocaleDateString())

// Navigation items
const navigationItems = [
  {
    name: 'Dashboard',
    label: 'Dashboard',
    href: '/dashboard',
    icon: 'svg' // TODO: Replace with actual icon component
  },
  // TODO: Add more navigation items when routes are created
  // {
  //   name: 'Reports',
  //   label: 'Reports',
  //   href: '/reports',
  //   icon: 'svg'
  // },
  // {
  //   name: 'Alerts',
  //   label: 'Alerts',
  //   href: '/alerts',
  //   icon: 'svg'
  // },
  // {
  //   name: 'Settings',
  //   label: 'Settings',
  //   href: '/settings',
  //   icon: 'svg'
  // }
]

// Simple SVG icon component for now
const svg = {
  template: `
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
    </svg>
  `
}
</script>


