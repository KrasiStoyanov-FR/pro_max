<template>
  <div
    v-if="visible"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    @click.self="handleClose"
  >
    <div class="w-full max-w-4xl rounded-2xl border border-white/10 bg-neutral-900 text-white shadow-2xl">
      <header class="border-b border-white/10 px-6 py-4">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-xl font-semibold">Generate Report</h2>
            <p class="text-sm text-neutral-400">
              {{ selectedDroneIds.length }} drone{{ selectedDroneIds.length !== 1 ? 's' : '' }} selected
            </p>
          </div>
          <button
            type="button"
            class="rounded-full p-1 text-neutral-400 transition hover:text-white"
            @click="handleClose"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>
      </header>

      <div class="px-6 py-4">
        <div class="space-y-6">
          <!-- Time Period Selection -->
          <div>
            <h3 class="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-400">
              Select Time Period
            </h3>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-2">
                  Start Date
                </label>
                <input
                  v-model="period.startDate"
                  type="datetime-local"
                  class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-primary-400 focus:outline-none"
                  :max="period.endDate"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-2">
                  End Date
                </label>
                <input
                  v-model="period.endDate"
                  type="datetime-local"
                  class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-primary-400 focus:outline-none"
                  :min="period.startDate"
                />
              </div>
            </div>
            <div class="mt-4 flex gap-2">
              <button
                v-for="preset in timePresets"
                :key="preset.label"
                type="button"
                class="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/10"
                @click="applyPreset(preset)"
              >
                {{ preset.label }}
              </button>
            </div>
          </div>

          <!-- Loading State -->
          <div v-if="isGenerating" class="rounded-lg border border-primary-500/40 bg-primary-500/10 p-4">
            <div class="flex items-center gap-3">
              <span class="h-5 w-5 animate-spin rounded-full border-2 border-primary-400 border-t-transparent" />
              <p class="text-sm text-primary-200">Generating report...</p>
            </div>
          </div>

          <!-- Error State -->
          <div
            v-if="error"
            class="rounded-lg border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-100"
          >
            <p class="font-medium text-rose-50">Failed to generate report</p>
            <p class="text-rose-200/80">{{ error }}</p>
          </div>

          <!-- Report Preview -->
          <div v-if="reportData && reportData.length > 0" class="space-y-4">
            <h3 class="text-sm font-semibold uppercase tracking-wide text-neutral-400">
              Report Preview
            </h3>
            <div class="max-h-96 overflow-auto rounded-lg border border-white/10 bg-black/20">
              <table class="min-w-full text-left text-sm">
                <thead class="sticky top-0 bg-neutral-900/80 text-xs uppercase text-neutral-400">
                  <tr>
                    <th class="px-4 py-2">Device</th>
                    <th class="px-4 py-2">Status</th>
                    <th class="px-4 py-2">Detections</th>
                    <th class="px-4 py-2">Period</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="report in reportData"
                    :key="report.deviceId"
                    class="border-t border-white/5"
                  >
                    <td class="px-4 py-2">{{ report.deviceName }}</td>
                    <td class="px-4 py-2">
                      <span
                        :class="[
                          'inline-flex rounded-full px-2 py-1 text-xs font-semibold',
                          report.status.connected
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-neutral-500/20 text-neutral-300'
                        ]"
                      >
                        {{ report.status.connected ? 'Connected' : 'Not Connected' }}
                      </span>
                    </td>
                    <td class="px-4 py-2">{{ report.detections.length }}</td>
                    <td class="px-4 py-2 text-xs text-neutral-400">
                      {{ formatDate(report.period.startDate) }} - {{ formatDate(report.period.endDate) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <footer class="border-t border-white/10 px-6 py-4">
        <div class="flex items-center justify-end gap-3">
          <button
            type="button"
            class="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
            @click="handleClose"
            :disabled="isGenerating"
          >
            Cancel
          </button>
          <button
            type="button"
            class="rounded-lg border border-primary-500/50 bg-primary-500/20 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-500/30 disabled:cursor-not-allowed disabled:opacity-60"
            @click="handleGenerate"
            :disabled="isGenerating || !isPeriodValid"
          >
            Generate Report
          </button>
          <button
            v-if="reportData && reportData.length > 0"
            type="button"
            class="rounded-lg border border-emerald-500/50 bg-emerald-500/20 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500/30"
            @click="handleExportCSV"
          >
            Export CSV
          </button>
          <button
            v-if="reportData && reportData.length > 0"
            type="button"
            class="rounded-lg border border-emerald-500/50 bg-emerald-500/20 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500/30"
            @click="handleExportPDF"
          >
            Export PDF
          </button>
        </div>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { generateReportDataFrontend, exportToCSV, exportToPDF } from '@/services/reportService'
import type { ReportData, TimePeriod } from '@/types/drones'

const props = defineProps<{
  selectedDroneIds: number[]
  visible?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'report-generated', data: ReportData[]): void
}>()

const visible = computed(() => {
  // If visible prop is not provided, default to true
  return props.visible !== undefined ? props.visible : true
})

const period = ref<TimePeriod>({
  startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
  endDate: new Date().toISOString().slice(0, 16)
})

const isGenerating = ref(false)
const error = ref<string | null>(null)
const reportData = ref<ReportData[] | null>(null)

const isPeriodValid = computed(() => {
  if (!period.value.startDate || !period.value.endDate) return false
  const start = new Date(period.value.startDate)
  const end = new Date(period.value.endDate)
  return start < end
})

const timePresets = [
  {
    label: 'Last 24 hours',
    getPeriod: () => ({
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      endDate: new Date().toISOString().slice(0, 16)
    })
  },
  {
    label: 'Last 7 days',
    getPeriod: () => ({
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      endDate: new Date().toISOString().slice(0, 16)
    })
  },
  {
    label: 'Last 30 days',
    getPeriod: () => ({
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      endDate: new Date().toISOString().slice(0, 16)
    })
  },
  {
    label: 'Last 90 days',
    getPeriod: () => ({
      startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      endDate: new Date().toISOString().slice(0, 16)
    })
  }
]

const applyPreset = (preset: typeof timePresets[0]) => {
  period.value = preset.getPeriod()
}

const handleGenerate = async () => {
  if (!isPeriodValid.value || props.selectedDroneIds.length === 0) return

  isGenerating.value = true
  error.value = null
  reportData.value = null

  try {
    // Convert datetime-local format to ISO string
    const startDate = new Date(period.value.startDate).toISOString()
    const endDate = new Date(period.value.endDate).toISOString()

    const data = await generateReportDataFrontend(props.selectedDroneIds, {
      startDate,
      endDate
    })

    reportData.value = data
    emit('report-generated', data)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to generate report'
  } finally {
    isGenerating.value = false
  }
}

const handleExportCSV = () => {
  if (reportData.value) {
    exportToCSV(reportData.value)
  }
}

const handleExportPDF = () => {
  if (reportData.value) {
    exportToPDF(reportData.value)
  }
}

const handleClose = () => {
  emit('close')
}

const formatDate = (value: string): string => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

// Reset when modal opens
watch(visible, (isVisible) => {
  if (isVisible) {
    error.value = null
    reportData.value = null
    isGenerating.value = false
  }
})
</script>

