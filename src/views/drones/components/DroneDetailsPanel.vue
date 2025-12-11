<template>
  <aside
    v-if="visible"
    class="flex h-full flex-col overflow-hidden rounded-2xl border border-white/5 bg-neutral-900/60 p-4 text-white shadow-2xl shadow-black/40"
    aria-label="Drone details"
  >
    <header class="mb-4 flex items-start justify-between">
      <div>
        <p class="text-xs uppercase tracking-widest text-primary-300/70">Drone details</p>
        <h2 class="text-lg font-semibold leading-tight">
          {{ drone?.displayName ?? 'No selection' }}
        </h2>
        <p class="text-xs text-neutral-400" v-if="drone">
          ID: {{ drone.id }}
        </p>
      </div>
      <button
        type="button"
        class="rounded-full p-1 text-neutral-400 transition hover:text-white"
        @click="$emit('close')"
        aria-label="Close details panel"
      >
        ✕
      </button>
    </header>

    <section class="flex-1 space-y-6 overflow-y-auto pr-2">
      <div>
        <h3 class="text-sm font-semibold uppercase tracking-wide text-neutral-400">Identification</h3>
        <dl class="mt-3 grid grid-cols-2 gap-3 text-sm text-neutral-200">
          <div>
            <dt class="text-xs uppercase tracking-widest text-neutral-500">MAC Address</dt>
            <dd class="font-mono text-xs font-semibold text-white">{{ drone?.macAddress ?? '—' }}</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-widest text-neutral-500">Serial Number</dt>
            <dd class="font-semibold text-white">{{ drone?.serialNumber ?? '—' }}</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-widest text-neutral-500">UAS ID</dt>
            <dd class="font-semibold text-white">{{ drone?.uasId ?? '—' }}</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-widest text-neutral-500">System ID</dt>
            <dd class="font-semibold text-white">{{ drone?.systemId ?? '—' }}</dd>
          </div>
        </dl>
      </div>

      <div>
        <h3 class="text-sm font-semibold uppercase tracking-wide text-neutral-400">Status</h3>
        <dl class="mt-3 grid grid-cols-2 gap-3 text-sm text-neutral-200">
          <div>
            <dt class="text-xs uppercase tracking-widest text-neutral-500">Active</dt>
            <dd class="mt-1">
              <StatusBadge :status="drone?.isActive ? 'active' : 'inactive'" />
            </dd>
          </div>
        </dl>
      </div>

      <div>
        <h3 class="text-sm font-semibold uppercase tracking-wide text-neutral-400">Timestamps</h3>
        <dl class="mt-3 grid grid-cols-1 gap-2 text-sm text-neutral-200">
          <div class="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-3 py-2">
            <dt class="text-xs uppercase tracking-widest text-neutral-500">First Seen</dt>
            <dd class="font-semibold text-white">{{ formatDate(drone?.firstSeen) }}</dd>
          </div>
          <div class="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-3 py-2">
            <dt class="text-xs uppercase tracking-widest text-neutral-500">Last Seen</dt>
            <dd class="font-semibold text-white">{{ drone?.lastSeen ? formatDate(drone.lastSeen) : '—' }}</dd>
          </div>
        </dl>
      </div>
    </section>

    <footer class="mt-6 border-t border-white/5 pt-4">
      <button 
        type="button" 
        class="w-full btn-secondary"
        @click="handleGenerateReport"
      >
        Generate Report
      </button>
    </footer>
  </aside>
</template>

<script setup lang="ts">
import StatusBadge from '@/views/detections/components/StatusBadge.vue'
import type { DroneItem } from '@/types/drones'

const props = defineProps<{
  drone: DroneItem | null
  visible: boolean
}>()

defineEmits<{
  (e: 'close'): void
}>()

const formatDate = (value?: string): string => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

const handleGenerateReport = () => {
  // This will be handled by the parent component
  // For now, just emit an event or navigate
  console.log('Generate report for drone:', props.drone?.id)
}
</script>

<style scoped>
.btn-secondary {
  @apply rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-semibold uppercase tracking-wide text-xs text-white transition hover:bg-white/10;
}
</style>

