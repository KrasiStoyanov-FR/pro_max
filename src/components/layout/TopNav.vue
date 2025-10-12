<template>
  <nav class="px-4 py-3 bg-neutral-900 shadow-sm">
    <div class="flex items-center justify-between">
      <!-- Left side - Logo and title -->
      <div class="flex flex-1 items-center justify-end space-x-4">
        <div
          class="flex-1 max-w-[480px] flex rounded-lg  900 outline-1 -outline-offset-1 outline-neutral-300 has-[input:focus-within]:outline-2 has-[input:focus-within]:-outline-offset-2 has-[input:focus-within]:outline-primary-600 dark:bg-neutral-800 dark:outline-white/10 dark:has-[input:focus-within]:outline-primary-500 overflow-hidden">

          <div class="grid shrink-0 grid-cols-1 bg-primary-700 focus-within:relative">
            <PhMapPin
              class="pointer-events-none col-start-1 row-start-1 ml-2.5 size-5 self-center justify-self-start text-primary-300 sm:size-4 dark:text-primary-300"
              aria-hidden="true"
              weight="fill" />

            <select id="country" name="country" autocomplete="country" aria-label="Country"
              class="col-start-1 row-start-1 w-full appearance-none rounded-md bg-neutral-900 py-2 pr-5 pl-3 text-base text-transparent placeholder:text-transparent focus:outline-2 focus:-outline-offset-2 focus:outline-primary-600 sm:text-sm/6 dark:bg-transparent dark:text-transparent dark:*:bg-neutral-900 dark:placeholder:text-transparent dark:focus:outline-primary-500 cursor-pointer">
              <option class="text-neutral-400">US</option>
              <option class="text-neutral-400">CA</option>
              <option class="text-neutral-400">EU</option>
            </select>

            <PhCaretDown
              class="pointer-events-none col-start-1 row-start-1 mr-2 size-3 self-center justify-self-end text-primary-300 dark:text-primary-300"
              aria-hidden="true"
              weight="bold" />
          </div>

          <input type="text" name="address" id="address"
            class="block min-w-0 grow bg-neutral-900 py-2 px-4 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none sm:text-sm/6 dark:bg-transparent dark:text-white dark:placeholder:text-neutral-400"
            placeholder="Search address" />

          <div class="col-start-1 row-start-1 mr-3 pl-2 border-l self-center justify-self-end">
            <PhMagnifyingGlass
              class="pointer-events-none size-5 text-neutral-400 sm:size-4 dark:text-neutral-400"
              aria-hidden="true" weight="bold" />
          </div>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { PhCaretDown, PhMagnifyingGlass, PhMapPin, PhQuestion } from '@phosphor-icons/vue';

// DTS Top Navigation component
// Simplified for the drone tracking system interface
</script>
