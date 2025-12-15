<template>
  <form class="flex flex-col gap-4 lg:flex-row lg:items-end" @submit.prevent>
    <div class="flex-1">
      <label class="block text-xs font-semibold uppercase tracking-wide text-neutral-400" for="drones-search">
        Search
      </label>
      <div class="mt-1 input-field">
        <input
          id="drones-search"
          v-model="localSearch"
          type="search"
          name="search"
          placeholder="Search by ID, MAC address, serial number, UAS ID..."
          :disabled="isLoading"
          @input="emit('update:search', localSearch)"
        />
        <div class="input-field__icon input-field__icon--right">
          <PhMagnifyingGlass aria-hidden="true" weight="bold" class="icon" />
        </div>
      </div>
    </div>

    <div class="flex flex-col">
      <label class="text-xs font-semibold uppercase tracking-wide text-neutral-400" for="filter-status">
        Status
      </label>
      <select
        id="filter-status"
        class="mt-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-primary-400 focus:outline-none"
        :disabled="isLoading"
        :value="statusValue"
        @change="emit('update:status', ($event.target as HTMLSelectElement).value as 'all' | 'active' | 'inactive')"
      >
        <option class="text-neutral-900" value="all">All statuses</option>
        <option class="text-neutral-900" value="active">Active</option>
        <option class="text-neutral-900" value="inactive">Inactive</option>
      </select>
    </div>
  </form>
</template>

<script setup lang="ts">
import { computed, ref, watch, toValue } from 'vue'
import { PhMagnifyingGlass } from '@phosphor-icons/vue'

const props = defineProps({
  search: {
    type: [String, Object] as any,
    default: ''
  },
  status: {
    type: [String, Object] as any,
    default: 'all'
  },
  isLoading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits<{
  (e: 'update:search', value: string): void
  (e: 'update:status', value: 'all' | 'active' | 'inactive'): void
}>()

const localSearch = ref(toValue(props.search) ?? '')

watch(
  () => toValue(props.search),
  value => {
    if (value !== localSearch.value) {
      localSearch.value = value ?? ''
    }
  }
)

const statusValue = computed(() => (toValue(props.status) ?? 'all') as 'all' | 'active' | 'inactive')
</script>


