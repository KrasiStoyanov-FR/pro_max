<template>
  <nav class="min-h-16 bg-neutral-900 shadow-sm border-b border-neutral-600 px-6 py-3">
    <div class="flex items-center justify-between">
      <!-- Left side - Logo and title -->
      <div class="flex items-center space-x-4">
        <div class="mt-2">
          <div
            class="flex rounded-lg rounded-md bg-neutral-900 outline-1 -outline-offset-1 outline-neutral-300 has-[input:focus-within]:outline-2 has-[input:focus-within]:-outline-offset-2 has-[input:focus-within]:outline-primary-600 dark:bg-white/5 dark:outline-white/10 dark:has-[input:focus-within]:outline-primary-500">
            <div class="grid shrink-0 grid-cols-1 focus-within:relative">
              <select id="country" name="country" autocomplete="country" aria-label="Country"
                class="col-start-1 row-start-1 w-full appearance-none rounded-md bg-neutral-900 py-1.5 pr-7 pl-3 text-base text-neutral-500 placeholder:text-neutral-400 focus:outline-2 focus:-outline-offset-2 focus:outline-primary-600 sm:text-sm/6 dark:bg-transparent dark:text-neutral-400 dark:*:bg-neutral-800 dark:placeholder:text-neutral-500 dark:focus:outline-primary-500">
                <option>US</option>
                <option>CA</option>
                <option>EU</option>
              </select>
              <PhCaretDown
                class="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-neutral-500 sm:size-4 dark:text-neutral-400"
                aria-hidden="true" />
            </div>
            <input type="text" name="phone-number" id="phone-number"
              class="block min-w-0 grow bg-neutral-900 py-1.5 pr-3 pl-1 text-base text-neutral-900 placeholder:text-neutral-400 focus:outline-none sm:text-sm/6 dark:bg-transparent dark:text-white dark:placeholder:text-neutral-500"
              placeholder="123-456-7890" />
          </div>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { PhCaretDown } from '@phosphor-icons/vue';

// DTS Top Navigation component
// Simplified for the drone tracking system interface
</script>
