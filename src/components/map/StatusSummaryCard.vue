<template>
  <div class="absolute top-4 left-4 z-20 bg-neutral-900 rounded-lg shadow-md p-4 w-64">
    <div class="space-y-3">
      <!-- Alarms -->
      <div class="flex items-center space-x-3">
        <div class="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
        <span class="text-white text-sm">12 Alarms</span>
      </div>
      
      <!-- Active receivers -->
      <div class="flex items-center space-x-3">
        <div class="w-3 h-3 bg-green-500 rounded-full"></div>
        <span class="text-white text-sm">24 Active receivers</span>
      </div>
      
      <!-- Inactive receivers -->
      <div class="flex items-center space-x-3">
        <div class="w-3 h-3 bg-blue-500 rounded-full"></div>
        <span class="text-white text-sm">52 Inactive receivers</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Status summary card component for the floating status display
// This replaces the old sidebar functionality
</script>
