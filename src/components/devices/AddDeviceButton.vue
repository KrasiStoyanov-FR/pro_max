<template>
  <button
    type="button"
    class="fixed z-30 flex items-center justify-center w-14 h-14 rounded-full bg-primary-500 hover:bg-primary-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-neutral-900"
    :class="positionClass"
    @click="handleClick"
    :aria-label="'Add new device'"
    :title="'Add new device'"
  >
    <PhPlus :size="24" weight="bold" />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { PhPlus } from '@phosphor-icons/vue'

export type ButtonPosition = 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right'

interface Props {
  position?: ButtonPosition
}

const props = withDefaults(defineProps<Props>(), {
  position: 'bottom-left'
})

const emit = defineEmits<{
  (e: 'click'): void
}>()

const positionClass = computed(() => {
  switch (props.position) {
    case 'bottom-right':
      return 'bottom-4 right-4 lg:bottom-6 lg:right-6'
    case 'top-left':
      return 'top-4 left-4 lg:top-6 lg:left-6'
    case 'top-right':
      return 'top-4 right-4 lg:top-6 lg:right-6'
    case 'bottom-left':
    default:
      return 'bottom-4 left-4 lg:bottom-6 lg:left-22'
  }
})

const handleClick = () => {
  emit('click')
}
</script>

<style scoped>
/* Ensure button stays on top of map controls */
button {
  z-index: 30;
}
</style>



