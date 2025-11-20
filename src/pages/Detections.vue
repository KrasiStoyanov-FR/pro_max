<template>
  <LayoutWrapper>
    <template #content>
      <DetectionsPage />
    </template>
  </LayoutWrapper>
</template>

<script setup lang="ts">
import { useAuth } from '@/composables/useAuth'
import LayoutWrapper from '@/components/layout/LayoutWrapper.vue'
import DetectionsPage from '@/views/detections/DetectionsPage.vue'

useAuth()
</script>

