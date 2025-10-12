<template>
  <nav class="bg-gray-800 shadow-sm border-b border-gray-700 px-6 py-4">
    <div class="flex items-center justify-between">
      <!-- Left side - Logo and title -->
      <div class="flex items-center space-x-4">
        <div class="flex items-center space-x-3">
          <!-- DTS Logo -->
          <div class="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center">
            <span class="text-white font-bold text-sm">DTS</span>
          </div>
          
          <!-- Separator -->
          <div class="w-px h-6 bg-gray-600"></div>
          
          <!-- Navigation Links -->
          <div class="flex items-center space-x-6">
            <router-link 
              to="/dashboard" 
              class="text-white text-sm hover:text-primary-400 transition-colors"
              :class="{ 'text-primary-400 border-b border-primary-400': $route.name === 'Dashboard' }"
            >
              Home
            </router-link>
            <router-link 
              to="/receivers" 
              class="text-primary-400 text-sm border-b border-primary-400"
            >
              Receivers
            </router-link>
            <router-link 
              to="/alerts" 
              class="text-white text-sm hover:text-primary-400 transition-colors"
            >
              Alerts
            </router-link>
            <router-link 
              to="/settings" 
              class="text-white text-sm hover:text-primary-400 transition-colors"
            >
              Settings
            </router-link>
          </div>
        </div>
      </div>

      <!-- Right side - Title -->
      <div class="flex items-center">
        <h1 class="text-white text-lg font-medium">DRONE TRACKING SYSTEM</h1>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
// DTS Top Navigation component
// Simplified for the drone tracking system interface
</script>
