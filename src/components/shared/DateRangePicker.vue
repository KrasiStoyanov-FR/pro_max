<template>
  <div class="relative">
    <VueDatePicker
      ref="pickerRef"
      v-model="dateRange"
      range
      :enable-time-picker="true"
      :dark="true"
      :clearable="true"
      :format="'yyyy-MM-dd HH:mm'"
      :placeholder="'Select date range'"
      :max-date="maxDate"
      @update:model-value="handleDateChange"
      class="custom-datepicker w-full"
      :teleport="true"
      :auto-apply="false"
      :close-on-auto-apply="false"
    />
    <div v-if="showError" class="mt-1 text-xs text-red-400">
      End date must be on or after start date
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { VueDatePicker } from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'

interface Props {
  modelValue?: { start: string; end: string } | null
}

interface Emits {
  (e: 'update:modelValue', value: { start: string; end: string } | null): void
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null
})

const emit = defineEmits<Emits>()

// Maximum date is today (prevent future dates)
const maxDate = computed(() => new Date())

// Error state for invalid date ranges
const showError = ref(false)
const pickerRef = ref<any>(null)

// Convert our format to VueDatePicker format
const dateRange = ref<[Date, Date] | null>(() => {
  if (props.modelValue?.start && props.modelValue?.end) {
    return [
      new Date(props.modelValue.start),
      new Date(props.modelValue.end)
    ]
  }
  return null
})

// Watch for external changes
watch(() => props.modelValue, (newValue) => {
  if (newValue?.start && newValue?.end) {
    // When receiving external updates, preserve the dates but normalize times for display
    const start = new Date(newValue.start)
    const end = new Date(newValue.end)
    dateRange.value = [start, end]
  } else {
    dateRange.value = null
  }
}, { deep: true })

const handleDateChange = (dates: [Date, Date] | null) => {
  // Only emit when both dates are selected (range is complete)
  // This prevents premature updates when user is still selecting
  if (dates && dates[0] && dates[1]) {
    // Normalize dates to compare only the date part (ignore time)
    const startDate = new Date(dates[0])
    startDate.setHours(0, 0, 0, 0)
    const endDate = new Date(dates[1])
    endDate.setHours(0, 0, 0, 0)
    
    const startDateOnly = startDate.getTime()
    const endDateOnly = endDate.getTime()
    
    if (endDateOnly >= startDateOnly) {
      // End date is after or equal to start date - valid range
      // If same day is selected, it will show data from 00:00 to 23:59 of that day
      showError.value = false
      
      // Set start time to 00:00:00.000 and end time to 23:59:59.999
      // This gives us a full day range for better historical viewing
      const normalizedStart = new Date(dates[0])
      normalizedStart.setHours(0, 0, 0, 0)
      
      const normalizedEnd = new Date(dates[1])
      normalizedEnd.setHours(23, 59, 59, 999)
      
      emit('update:modelValue', {
        start: normalizedStart.toISOString(),
        end: normalizedEnd.toISOString()
      })
    } else {
      // End date is before start date - invalid, show error and reset
      showError.value = true
      // Reset to allow user to select again
      setTimeout(() => {
        dateRange.value = [dates[0], null] as any
        if (pickerRef.value) {
          const picker = pickerRef.value as any
          if (picker.openMenu) {
            picker.openMenu()
          }
        }
      }, 0)
      // Don't emit - prevent filter from being applied
    }
  } else if (dates === null) {
    // Only emit null when explicitly cleared
    showError.value = false
    emit('update:modelValue', null)
  } else {
    // Partial selection - clear error
    showError.value = false
  }
  // Don't emit anything if only one date is selected (user is still selecting range)
}
</script>

<style scoped>
/* Custom styling for the date picker to match our dark theme */
:deep(.dp__input_wrap) {
  @apply bg-neutral-800/50 border border-neutral-700/30 rounded px-2 py-1 text-xs text-white;
}

:deep(.dp__input) {
  @apply text-white placeholder-neutral-500;
}

:deep(.dp__input:focus) {
  @apply outline-none ring-2 ring-primary-500 border-primary-500;
}

:deep(.dp__menu) {
  @apply bg-neutral-900 border border-neutral-700/50 shadow-lg;
}

:deep(.dp__calendar_header_item) {
  @apply text-neutral-300;
}

:deep(.dp__calendar_header_item:hover) {
  @apply bg-neutral-800 text-white;
}

:deep(.dp__cell_inner) {
  @apply text-neutral-300;
}

:deep(.dp__cell_inner:hover) {
  @apply bg-neutral-800 text-white;
}

:deep(.dp__active_date) {
  @apply bg-primary-500 text-white;
}

:deep(.dp__range_start),
:deep(.dp__range_end) {
  @apply bg-primary-600 text-white;
}

:deep(.dp__range_between) {
  @apply bg-primary-500/20 text-white;
}

:deep(.dp__arrow_top) {
  @apply border-b-neutral-700/50;
}

:deep(.dp__arrow_bottom) {
  @apply border-t-neutral-700/50;
}

:deep(.dp__time_input) {
  @apply bg-neutral-800 text-white border-neutral-700;
}

:deep(.dp__time_input:focus) {
  @apply ring-2 ring-primary-500 border-primary-500;
}

:deep(.dp__time_display) {
  @apply text-white;
}

:deep(.dp__btn) {
  @apply text-neutral-300 hover:text-white hover:bg-neutral-800;
}

:deep(.dp__clear_icon) {
  @apply text-neutral-400 hover:text-white;
}
</style>
