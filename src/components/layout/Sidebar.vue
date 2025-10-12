<template>
  <aside :class="[
    'flex-1 bg-neutral-900 transition-all duration-[400ms] ease-in-out',
    isCollapsed ? 'max-w-16' : 'max-w-64'
  ]">
    <div class="h-full flex flex-col">
      <!-- Sidebar header -->
      <div :class="isCollapsed ? 'px-4' : 'px-6'" class="py-4 transition-all duration-[400ms] ease-in-out">
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
            :class="{ 'rotate-180 -right-12': isCollapsed }">
            <PhCaretLeft :size="16" weight="bold" />
          </button>
        </div>
      </div>

      <!-- Navigation items -->
      <div class="flex-1">
        <div class="relative">
          <nav class="grid grid-cols-1 flex-1 py-4 relative z-10">
            <router-link v-for="item in navigationItems" :key="item.name" :to="item.href" :class="[
              isCollapsed ? 'sidebar-item-collapsed' : '',
              $route.name === item.name ? 'sidebar-item-active' : 'sidebar-item-inactive'
            ]" class="sidebar-item col-span-1 row-span-1">
              <component :is="item.icon" :weight="$route.name === item.name ? 'fill' : 'bold'"
                :class="{ 'text-primary-500': $route.name === item.name && !isCollapsed }"
                class="w-5 h-5 flex-shrink-0 transition-colors duration-[400ms] ease-in-out" />
              <span v-if="!isCollapsed" class="ml-1.5">{{ item.label }}</span>
            </router-link>
          </nav>

          <div :class="[isCollapsed ? 'w-full right-0 px-3' : 'w-2']"
            class="py-4 flex flex-col absolute top-0 bottom-0 left-0 transition-all duration-[400ms] ease-in-out z-0">
            <!-- TODO: Fix the snappiness of the rounded corners on sidebar collapsing -->
            <span
              :class="[isCollapsed ? 'rounded-xl' : 'rounded-tr-full rounded-br-full']"
              class="h-10 transform translate-y-0.5 bg-primary-500 transition-all duration-[400ms] ease-in-out"
              :style="`margin-top: ${currentNavigationItemOffsetTop}rem;`"></span>
          </div>
        </div>
      </div>

      <!-- Sidebar footer -->
      <div :class="[isCollapsed ? 'px-3' : 'px-4']" class="pb-4">
        <p class="pt-4 transform border-t text-xs text-neutral-500 truncate">v3.15.3</p>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { PhCompass, PhLayout, PhCaretLeft } from '@phosphor-icons/vue'
import { computed } from 'vue';
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

const currentNavigationItemOffsetTop = computed(() => {
  let result = 0
  navigationItems.map((item, index) => {
    result = route.name === item.name ? index : result
  })

  return result * 2.75
})

</script>
