<template>
  <div class="relative inline-block" @mouseenter="showTooltip = true" @mouseleave="showTooltip = false" @focusin="showTooltip = true" @focusout="showTooltip = false">
    <slot />
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="showTooltip && content"
        :class="[
          'absolute z-50 px-3 py-2 text-xs font-medium text-white bg-neutral-900 rounded-lg shadow-lg border border-neutral-700',
          'pointer-events-none',
          position === 'top' ? 'bottom-full left-1/2 -translate-x-1/2 mb-2' : '',
          position === 'bottom' ? 'top-full left-1/2 -translate-x-1/2 mt-2' : '',
          position === 'left' ? 'right-full top-1/2 -translate-y-1/2 mr-2' : '',
          position === 'right' ? 'left-full top-1/2 -translate-y-1/2 ml-2' : ''
        ]"
        role="tooltip"
        :aria-label="content"
      >
        <div v-html="content"></div>
        <!-- Arrow -->
        <div
          :class="[
            'absolute w-2 h-2 bg-neutral-900 border-neutral-700 transform rotate-45',
            position === 'top' ? 'top-full left-1/2 -translate-x-1/2 -translate-y-1/2 border-r border-b' : '',
            position === 'bottom' ? 'bottom-full left-1/2 -translate-x-1/2 translate-y-1/2 border-l border-t' : '',
            position === 'left' ? 'left-full top-1/2 -translate-y-1/2 -translate-x-1/2 border-r border-t' : '',
            position === 'right' ? 'right-full top-1/2 -translate-y-1/2 translate-x-1/2 border-l border-b' : ''
          ]"
        ></div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  content?: string
  position?: 'top' | 'bottom' | 'left' | 'right'
}

const props = withDefaults(defineProps<Props>(), {
  content: '',
  position: 'top'
})

const showTooltip = ref(false)
</script>

