<template>
  <nav class="px-4 py-3 bg-neutral-900 shadow-sm">
    <div class="flex items-center justify-between">
      <!-- Center - Search -->
      <div class="flex flex-1 items-center justify-center space-x-4">
        <div class="flex-1 max-w-[480px] input-field-with-dropdown input-field-with-icon-right">
          <div class="input-dropdown">
            <PhMapPin class="dropdown-icon" aria-hidden="true" weight="fill" />

            <!-- <select id="country" name="country" autocomplete="country" aria-label="Country" v-model="selectedCountry"
              class="dropdown-select">
              <option value="" disabled>Select Region</option>
              <option value="US">US</option>
              <option value="CA">CA</option>
              <option value="EU">EU</option>
            </select> -->

            <select id="country" name="country" autocomplete="country" aria-label="Country" class="col-start-1 row-start-1 w-full appearance-none rounded-md bg-neutral-900 py-2 pr-5 pl-3 text-base text-transparent placeholder:text-transparent focus:outline-2 focus:-outline-offset-2 focus:outline-primary-600 sm:text-sm/6 dark:bg-transparent dark:text-transparent dark:*:bg-neutral-900 dark:placeholder:text-transparent dark:focus:outline-primary-500 cursor-pointer" v-model="selectedCountry">
              <option value="US" class="text-neutral-400">US</option>
              <option value="CA" class="text-neutral-400">CA</option>
              <option value="EU" class="text-neutral-400">EU</option>
            </select>

            <PhCaretDown class="dropdown-arrow" aria-hidden="true" weight="bold" />
          </div>

          <input type="text" name="address" id="address" placeholder="Search address" />

          <div class="input-icon">
            <PhMagnifyingGlass aria-hidden="true" weight="bold" />
          </div>
        </div>
      </div>

      <!-- Right side - User menu -->
      <div class="flex items-center space-x-4">
        <!-- User dropdown menu -->
        <div class="relative" ref="userMenuRef">
          <button @click="toggleUserMenu"
            class="flex items-center space-x-2 px-3 py-2 text-sm text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-md transition-colors">
            <PhUser :size="20" />
            <span>{{ user?.name || 'User' }}</span>
            <PhCaretDown :size="12" :class="{ 'rotate-180': isUserMenuOpen }" class="transition-transform" />
          </button>

          <!-- Dropdown menu -->
          <div v-if="isUserMenuOpen"
            class="absolute right-0 mt-2 w-48 bg-neutral-800 rounded-md shadow-lg border border-neutral-700 z-50">
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
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { PhCaretDown, PhMagnifyingGlass, PhMapPin, PhUser, PhSignOut } from '@phosphor-icons/vue'
import { useAuth } from '@/composables/useAuth'

// Composables
const { user, logout } = useAuth()

// State
const isUserMenuOpen = ref(false)
const userMenuRef = ref<HTMLElement | null>(null)
const selectedCountry = ref('')

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
