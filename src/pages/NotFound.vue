<template>
  <LayoutWrapper>
    <template #content>
      <div class="flex h-full items-center justify-center">
        <div class="text-center">
          <h1 class="text-4xl font-bold text-white mb-4">404</h1>
          <p class="text-xl text-neutral-400 mb-8">Page Not Found</p>
          <router-link
            to="/map"
            class="inline-flex items-center gap-2 rounded-lg border border-primary-500/50 bg-primary-500/20 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-500/30"
          >
            Go to Map
          </router-link>
        </div>
      </div>
    </template>
  </LayoutWrapper>
</template>

<script setup lang="ts">
import LayoutWrapper from '@/components/layout/LayoutWrapper.vue'
</script>
