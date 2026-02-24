<template>
  <div class="h-screen flex bg-neutral-900">
    <!-- Sidebar -->
    <Sidebar :is-collapsed="isSidebarCollapsed" @toggle="isSidebarCollapsed = !isSidebarCollapsed" />

    <!-- Main Content -->
    <main class="flex flex-1 flex-col items-stretch relative">
      <div class="flex-1 flex overflow-hidden relative">
        <!-- Map/Content Area -->
        <div class="flex-1 overflow-hidden relative z-0">
          <slot name="content" />
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Sidebar from './Sidebar.vue'

// Props
interface Props {
  defaultSidebarCollapsed?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  defaultSidebarCollapsed: true, // False by design
})

// State
const isSidebarCollapsed = ref(props.defaultSidebarCollapsed)
</script>
