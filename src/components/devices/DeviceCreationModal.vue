<template>
  <div
    v-if="visible"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    @click.self="handleClose"
  >
    <div class="w-full max-w-2xl rounded-2xl border border-white/10 bg-neutral-900 text-white shadow-2xl">
      <header class="border-b border-white/10 px-6 py-4">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-xl font-semibold">{{ isEditMode ? 'Edit Device' : 'Add New Device' }}</h2>
            <p class="text-sm text-neutral-400">
              {{ isEditMode ? 'Update device information' : 'Create a new device and add it to the map' }}
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

      <form @submit.prevent="handleSubmit" class="px-6 py-4">
        <div class="space-y-6">
          <!-- Unit ID -->
          <div>
            <label for="unit-id" class="block text-sm font-medium text-white mb-2">
              Unit ID <span class="text-red-400">*</span>
            </label>
            <input
              id="unit-id"
              v-model="form.unitId"
              type="text"
              required
              class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-neutral-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
              placeholder="Enter unit ID"
              :disabled="isEditMode"
            />
            <p v-if="errors.unitId" class="mt-1 text-sm text-red-400">{{ errors.unitId }}</p>
            <p v-if="isEditMode" class="mt-1 text-xs text-neutral-400">Unit ID cannot be changed when editing</p>
          </div>

          <!-- Device Name -->
          <div>
            <label for="device-name" class="block text-sm font-medium text-white mb-2">
              Device Name <span class="text-red-400">*</span>
            </label>
            <input
              id="device-name"
              v-model="form.name"
              type="text"
              required
              class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-neutral-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
              placeholder="Enter device name"
            />
            <p v-if="errors.name" class="mt-1 text-sm text-red-400">{{ errors.name }}</p>
          </div>

          <!-- GPS Coordinates -->
          <div>
            <label class="block text-sm font-medium text-white mb-2">
              GPS Coordinates <span class="text-red-400">*</span>
            </label>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="latitude" class="block text-xs text-neutral-400 mb-1">Latitude</label>
                <input
                  id="latitude"
                  v-model="form.latitude"
                  type="number"
                  step="any"
                  required
                  min="-90"
                  max="90"
                  class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-neutral-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                  placeholder="e.g., 42.6977"
                />
                <p v-if="errors.latitude" class="mt-1 text-xs text-red-400">{{ errors.latitude }}</p>
              </div>
              <div>
                <label for="longitude" class="block text-xs text-neutral-400 mb-1">Longitude</label>
                <input
                  id="longitude"
                  v-model="form.longitude"
                  type="number"
                  step="any"
                  required
                  min="-180"
                  max="180"
                  class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-neutral-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                  placeholder="e.g., 23.3219"
                />
                <p v-if="errors.longitude" class="mt-1 text-xs text-red-400">{{ errors.longitude }}</p>
              </div>
            </div>
            <div class="mt-2">
              <button
                type="button"
                @click="getCurrentLocation"
                class="text-xs text-primary-400 hover:text-primary-300 transition-colors"
                :disabled="isGettingLocation"
              >
                {{ isGettingLocation ? 'Getting location...' : '📍 Use current location' }}
              </button>
            </div>
          </div>

          <!-- Error State -->
          <div
            v-if="error"
            class="rounded-lg border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-100"
          >
            <p class="font-medium text-rose-50">Failed to {{ isEditMode ? 'update' : 'create' }} device</p>
            <p class="text-rose-200/80">{{ error }}</p>
          </div>
        </div>

        <footer class="border-t border-white/10 mt-6 pt-4 flex items-center justify-end gap-3">
          <button
            type="button"
            class="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
            @click="handleClose"
            :disabled="isSubmitting"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="rounded-lg border border-primary-500/50 bg-primary-500/20 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-500/30 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="isSubmitting || !isFormValid"
          >
            {{ isSubmitting ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Device' : 'Create Device') }}
          </button>
        </footer>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { databaseApi } from '@/services/api'
import { useDataStore } from '@/store/data'
import { usePermissions } from '@/composables/usePermissions'
import type { GpsUnitPosition } from '@/types/database'

export interface DeviceFormData {
  unitId: string
  name: string
  latitude: string
  longitude: string
}

const props = defineProps<{
  visible?: boolean
  device?: GpsUnitPosition | null // Device to edit (null for create mode)
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'device-created', device: GpsUnitPosition): void
  (e: 'device-updated', device: GpsUnitPosition): void
}>()

const visible = computed(() => {
  return props.visible !== undefined ? props.visible : true
})

const dataStore = useDataStore()
const { hasPermission } = usePermissions()

const isEditMode = computed(() => !!props.device)

const form = reactive<DeviceFormData>({
  unitId: '',
  name: '',
  latitude: '',
  longitude: ''
})

const errors = reactive<Partial<Record<keyof DeviceFormData, string>>>({})
const isSubmitting = ref(false)
const error = ref<string | null>(null)
const isGettingLocation = ref(false)

// Extract coordinates from device (handles various column name formats)
const extractLatitude = (device: GpsUnitPosition | null): number | null => {
  if (!device) return null
  const lat = (device as any)?.gps_lat ?? device.latitude ?? (device as any)?.lat ?? (device as any)?.latitude_deg
  if (lat === null || lat === undefined) return null
  const num = typeof lat === 'string' ? parseFloat(lat) : lat
  return Number.isFinite(num) ? num : null
}

const extractLongitude = (device: GpsUnitPosition | null): number | null => {
  if (!device) return null
  const lng = (device as any)?.gps_lon ?? device.longitude ?? (device as any)?.lng ?? (device as any)?.longitude_deg
  if (lng === null || lng === undefined) return null
  const num = typeof lng === 'string' ? parseFloat(lng) : lng
  return Number.isFinite(num) ? num : null
}

// Extract device name (handles various column name formats)
const extractDeviceName = (device: GpsUnitPosition | null): string => {
  if (!device) return ''
  return (device as any)?.unit_name ?? device.name ?? ''
}

const isFormValid = computed(() => {
  // Convert to string first to handle both string and number inputs
  const latStr = String(form.latitude || '').trim()
  const lngStr = String(form.longitude || '').trim()
  const latNum = Number(latStr)
  const lngNum = Number(lngStr)
  
  return !!(
    form.name.trim() &&
    latStr &&
    lngStr &&
    !isNaN(latNum) &&
    !isNaN(lngNum) &&
    latNum >= -90 &&
    latNum <= 90 &&
    lngNum >= -180 &&
    lngNum <= 180
  )
})

const validateForm = (): boolean => {
  // Clear previous errors
  Object.keys(errors).forEach(key => {
    errors[key as keyof DeviceFormData] = ''
  })
  error.value = null

  let isValid = true

  // Unit ID is optional, no validation needed

  if (!form.name.trim()) {
    errors.name = 'Device name is required'
    isValid = false
  }

  // Convert to string first to handle both string and number inputs
  const latStr = String(form.latitude || '').trim()
  const lngStr = String(form.longitude || '').trim()
  
  if (!latStr) {
    errors.latitude = 'Latitude is required'
    isValid = false
  } else {
    const lat = Number(latStr)
    if (isNaN(lat) || lat < -90 || lat > 90) {
      errors.latitude = 'Latitude must be between -90 and 90'
      isValid = false
    }
  }

  if (!lngStr) {
    errors.longitude = 'Longitude is required'
    isValid = false
  } else {
    const lng = Number(lngStr)
    if (isNaN(lng) || lng < -180 || lng > 180) {
      errors.longitude = 'Longitude must be between -180 and 180'
      isValid = false
    }
  }

  return isValid
}

const getCurrentLocation = () => {
  if (!navigator.geolocation) {
    error.value = 'Geolocation is not supported by your browser'
    return
  }

  isGettingLocation.value = true
  error.value = null

  navigator.geolocation.getCurrentPosition(
    (position) => {
      form.latitude = position.coords.latitude.toFixed(6)
      form.longitude = position.coords.longitude.toFixed(6)
      isGettingLocation.value = false
    },
    (err) => {
      error.value = `Failed to get location: ${err.message}`
      isGettingLocation.value = false
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  )
}

const handleSubmit = async () => {
  // Check permission before submitting
  if (isEditMode.value) {
    if (!hasPermission('devices.edit')) {
      error.value = 'You do not have permission to edit devices.'
      return
    }
  } else {
    if (!hasPermission('devices.create')) {
      error.value = 'You do not have permission to create devices.'
      return
    }
  }

  if (!validateForm()) {
    return
  }

  isSubmitting.value = true
  error.value = null

  try {
    // Prepare device data
    const deviceData = {
      unitId: form.unitId.trim() || null,
      name: form.name.trim(),
      latitude: Number(form.latitude),
      longitude: Number(form.longitude)
    }

    if (isEditMode.value && props.device) {
      // Update existing device
      const response = await databaseApi.updateDevice(props.device, deviceData)
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to update device')
      }

      // Emit success event with updated device
      emit('device-updated', response.data)
    } else {
      // Create new device
      const response = await databaseApi.createDevice(deviceData)
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to create device')
      }

      // Emit success event with created device
      emit('device-created', response.data)
    }
    
    // Close modal on success
    handleClose()
  } catch (err) {
    error.value = err instanceof Error ? err.message : `Failed to ${isEditMode.value ? 'update' : 'create'} device`
    // Keep modal open so user can fix and retry
  } finally {
    isSubmitting.value = false
  }
}

const handleClose = () => {
  if (isSubmitting.value) return
  emit('close')
}

const resetForm = () => {
  form.unitId = ''
  form.name = ''
  form.latitude = ''
  form.longitude = ''
  Object.keys(errors).forEach(key => {
    errors[key as keyof DeviceFormData] = ''
  })
  error.value = null
}

const loadFormData = () => {
  if (props.device) {
    // Edit mode: prefill form with device data
    form.unitId = props.device.unit_id ? String(props.device.unit_id) : ''
    form.name = extractDeviceName(props.device)
    const lat = extractLatitude(props.device)
    const lng = extractLongitude(props.device)
    form.latitude = lat !== null ? String(lat) : ''
    form.longitude = lng !== null ? String(lng) : ''
  } else {
    // Create mode: reset form
    resetForm()
  }
}

// Watch for device changes and modal visibility
watch([() => props.device, visible], ([newDevice, isVisible]) => {
  if (isVisible) {
    loadFormData()
  } else {
    resetForm()
  }
}, { immediate: true })

// Load form data on mount if modal is already visible
onMounted(() => {
  if (visible.value) {
    loadFormData()
  }
})
</script>

