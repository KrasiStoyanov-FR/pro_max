<template>
  <nav class="px-4 py-3 bg-neutral-900 shadow-sm">
    <div class="flex items-center justify-end">
      <div class="flex-1 max-w-[480px] input-field">
        <input type="text" name="address" id="address" placeholder="Search address" />

        <div class="input-field__icon input-field__icon--right">
          <PhMagnifyingGlass aria-hidden="true" weight="bold" class="icon" />
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { PhMagnifyingGlass } from '@phosphor-icons/vue'
</script>
