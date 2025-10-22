<template>
  <nav class="px-4 py-3 bg-neutral-900 shadow-sm">
    <div class="flex items-center justify-end">
      <div class="flex-1 max-w-[480px] input-field-with-dropdown input-field-with-icon-right">
        <input type="text" name="address" id="address" placeholder="Search address" />

        <div class="input-icon">
          <PhMagnifyingGlass aria-hidden="true" weight="bold" />
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { PhCaretDown, PhMagnifyingGlass, PhMapPin, PhUser, PhSignOut } from '@phosphor-icons/vue'

// State
const selectedCountry = ref('')
</script>
