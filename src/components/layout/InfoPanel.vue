<template>
  <div
    class="h-full max-h-800 md:min-h-80 flex self-end rounded-2xl bg-neutral-900/70 backdrop-blur-3xl transition-all duration-300 ease-out pointer-events-auto overflow-hidden"
    :class="[
      // Size and visibility
      isOpen ? 'w-64 lg:w-80 opacity-100 visible translate-x-0 scale-100 pointer-events-auto' : 'w-0 opacity-0 -translate-x-full invisible scale-95 pointer-events-none',
      (!isOpen && hasClusterPanel) ? 'ml-0' : (isOpen && hasClusterPanel) ? 'ml-6' : '',
    ]" :style="{ transitionDelay: isOpen ? '50ms' : '0ms' }">

    <!-- Content wrapper with proper visibility control -->
    <div class="h-full min-w-0 flex flex-col flex-1 transition-opacity duration-200 ease-out"
      :class="[isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none']"
      :style="{ transitionDelay: isOpen ? '150ms' : '0ms' }">
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b border-white/10 space-x-3">
        <h3 class="font-semibold text-white truncate">{{ selectedPin ? selectedPin.title : 'Select a Target' }}</h3>

        <div class="flex items-center space-x-2">
          <button v-if="focusModeActive" @click="$emit('exit-focus')"
            class="px-2 py-1 text-xs font-medium rounded-md bg-primary-500/20 text-primary-200 hover:bg-primary-500/30 transition-colors">
            Exit focus
          </button>
          <button v-else-if="selectedPin?.type === 'drone'"
            @click="$emit('enter-focus')"
            class="px-2 py-1 text-xs font-medium rounded-md bg-primary-500/20 text-primary-200 hover:bg-primary-500/30 transition-colors">
            Enter focus
          </button>
          <button @click="$emit('close')"
            class="p-1 text-neutral-200 hover:text-white focus:outline-none focus:ring-2 focus:ring-neutral-500 rounded-md">
            <PhX :size="20" />
          </button>
        </div>
      </div>

      <!-- Panel Content -->
      <div v-if="selectedPin" class="flex flex-1 flex-col p-4 space-y-4 overflow-y-auto bg-neutral-900/30">
        <!-- Highlight summary -->
        <div v-if="highlightedMarkers.length" class="bg-white/5 rounded-xl border border-white/10 p-3 space-y-2">
          <div class="flex items-center justify-between text-xs text-primary-200 uppercase tracking-wide">
            <span>Currently Highlighted</span>
            <span>{{ highlightedMarkers.length }} item{{ highlightedMarkers.length === 1 ? '' : 's' }}</span>
          </div>
          <ul class="space-y-2">
            <li
              v-for="marker in highlightedMarkers"
              :key="marker.id"
              class="bg-neutral-900/60 rounded-lg px-3 py-2 border border-white/10 flex items-start justify-between space-x-3"
            >
              <div class="flex-1 min-w-0">
                <p class="text-sm text-white truncate">{{ marker.title }}</p>
                <p v-if="marker.subtitle" class="text-xs text-neutral-400 truncate">{{ marker.subtitle }}</p>
              </div>
              <span
                class="text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
                :class="marker.badgeClass"
              >
                {{ marker.typeLabel }}
              </span>
            </li>
          </ul>
        </div>

        <!-- Target Details -->
        <div v-if="selectedPin.data?.serialNumber" class="flex items-start space-x-3">
          <PhIdentificationCard :size="16" class="text-primary-50 mt-0.5" />
          <div class="flex-1">
            <p class="text-xs text-primary-200 uppercase tracking-wide">Serial Number</p>
            <p class="text-sm text-white">{{ selectedPin.data.serialNumber }}</p>
          </div>
        </div>

        <div v-if="selectedPin.data?.altitude" class="flex items-start space-x-3">
          <PhCube :size="16" class="text-primary-50 mt-0.5" />
          <div class="flex-1">
            <p class="text-xs text-primary-200 uppercase tracking-wide">Altitude</p>
            <p class="text-sm text-white">{{ selectedPin.data.altitude }}</p>
          </div>
        </div>

        <div v-if="selectedPin.data?.uasId" class="flex items-start space-x-3">
          <PhCube :size="16" class="text-primary-50 mt-0.5" />
          <div class="flex-1">
            <p class="text-xs text-primary-200 uppercase tracking-wide">UAS ID</p>
            <p class="text-sm text-white">{{ selectedPin.data.uasId }}</p>
          </div>
        </div>

        <div v-if="selectedPin.data?.speed" class="flex items-start space-x-3">
          <PhGauge :size="16" class="text-primary-50 mt-0.5" />
          <div class="flex-1">
            <p class="text-xs text-primary-200 uppercase tracking-wide">Speed</p>
            <p class="text-sm text-white">{{ selectedPin.data.speed }}</p>
          </div>
        </div>

        <div v-if="selectedPin.data?.signal" class="flex items-start space-x-3">
          <PhWifiHigh :size="16" class="text-primary-50 mt-0.5" />
          <div class="flex-1">
            <p class="text-xs text-primary-200 uppercase tracking-wide">Connection Signal</p>
            <p class="text-sm text-white">{{ selectedPin.data.signal }}</p>
          </div>
        </div>

        <div v-if="selectedPin.data?.missionId" class="flex items-start space-x-3">
          <PhMapTrifold :size="16" class="text-primary-50 mt-0.5" />
          <div class="flex-1">
            <p class="text-xs text-primary-200 uppercase tracking-wide">Mission ID</p>
            <p class="text-sm text-white">{{ selectedPin.data.missionId }}</p>
          </div>
        </div>

        <!-- Additional Data Fields -->
        <div v-if="selectedPin.data?.operator" class="flex items-start space-x-3">
          <PhIdentificationCard :size="16" class="text-primary-50 mt-0.5" />
          <div class="flex-1">
            <p class="text-xs text-primary-200 uppercase tracking-wide">Operator</p>
            <p class="text-sm text-white">{{ selectedPin.data.operator }}</p>
          </div>
        </div>

        <div v-if="selectedPin.data?.unit" class="flex items-start space-x-3">
          <PhCube :size="16" class="text-primary-50 mt-0.5" />
          <div class="flex-1">
            <p class="text-xs text-primary-200 uppercase tracking-wide">Unit</p>
            <p class="text-sm text-white">{{ selectedPin.data.unit }}</p>
          </div>
        </div>

        <div v-if="selectedPin.data?.mission" class="flex items-start space-x-3">
          <PhMapTrifold :size="16" class="text-primary-50 mt-0.5" />
          <div class="flex-1">
            <p class="text-xs text-primary-200 uppercase tracking-wide">Mission</p>
            <p class="text-sm text-white">{{ selectedPin.data.mission }}</p>
          </div>
        </div>

        <div v-if="selectedPin.data?.threatLevel" class="flex items-start space-x-3">
          <PhWarning :size="16" class="text-primary-50-400 mt-0.5" />
          <div class="flex-1">
            <p class="text-xs text-primary-200 uppercase tracking-wide">Threat Level</p>
            <p class="text-sm text-red-400 font-semibold">{{ selectedPin.data.threatLevel }}</p>
          </div>
        </div>

        <!-- Drone-specific fields -->
        <div v-if="selectedPin.data?.drone_id" class="flex items-start space-x-3">
          <PhCube :size="16" class="text-primary-50 mt-0.5" />
          <div class="flex-1">
            <p class="text-xs text-primary-200 uppercase tracking-wide">Drone ID</p>
            <p class="text-sm text-white">{{ selectedPin.data.drone_id }}</p>
          </div>
        </div>

        <div v-if="selectedPin.data?.model" class="flex items-start space-x-3">
          <PhCube :size="16" class="text-primary-50 mt-0.5" />
          <div class="flex-1">
            <p class="text-xs text-primary-200 uppercase tracking-wide">Drone Model</p>
            <p class="text-sm text-white">{{ selectedPin.data.model }}</p>
          </div>
        </div>

        <div v-if="selectedPin.data?.receiver_type" class="flex items-start space-x-3">
          <PhWifiHigh :size="16" class="text-primary-50 mt-0.5" />
          <div class="flex-1">
            <p class="text-xs text-primary-200 uppercase tracking-wide">Receiver Type</p>
            <p class="text-sm text-white">{{ selectedPin.data.receiver_type }}</p>
          </div>
        </div>

        <div v-if="selectedPin.data?.frequency" class="flex items-start space-x-3">
          <PhWifiHigh :size="16" class="text-primary-50 mt-0.5" />
          <div class="flex-1">
            <p class="text-xs text-primary-200 uppercase tracking-wide">Frequency</p>
            <p class="text-sm text-white">{{ selectedPin.data.frequency }} MHz</p>
          </div>
        </div>

        <div v-if="selectedPin.data?.signal_strength" class="flex items-start space-x-3">
          <PhWifiHigh :size="16" class="text-primary-50 mt-0.5" />
          <div class="flex-1">
            <p class="text-xs text-primary-200 uppercase tracking-wide">Signal Strength</p>
            <p class="text-sm text-white">{{ selectedPin.data.signal_strength }} dBm</p>
          </div>
        </div>

        <div v-if="selectedPin.data?.detection_status !== undefined" class="flex items-start space-x-3">
          <PhWarning :size="16" class="text-primary-50 mt-0.5" />
          <div class="flex-1">
            <p class="text-xs text-primary-200 uppercase tracking-wide">Detection Status</p>
            <p class="text-sm" :class="selectedPin.data.detection_status ? 'text-green-400' : 'text-red-400'">
              {{ selectedPin.data.detection_status ? 'Active' : 'Inactive' }}
            </p>
          </div>
        </div>

        <div v-if="selectedPin.data?.battery" class="flex items-start space-x-3">
          <PhGauge :size="16" class="text-primary-50 mt-0.5" />
          <div class="flex-1">
            <p class="text-xs text-primary-200 uppercase tracking-wide">Battery Level</p>
            <p class="text-sm text-white">{{ selectedPin.data.battery }}</p>
          </div>
        </div>

        <div v-if="selectedPin.data?.flightTime" class="flex items-start space-x-3">
          <PhGauge :size="16" class="text-primary-50 mt-0.5" />
          <div class="flex-1">
            <p class="text-xs text-primary-200 uppercase tracking-wide">Flight Time</p>
            <p class="text-sm text-white">{{ selectedPin.data.flightTime }}</p>
          </div>
        </div>

        <div v-if="selectedPin.data?.payload" class="flex items-start space-x-3">
          <PhCube :size="16" class="text-primary-50 mt-0.5" />
          <div class="flex-1">
            <p class="text-xs text-primary-200 uppercase tracking-wide">Payload</p>
            <p class="text-sm text-white">{{ selectedPin.data.payload }}</p>
          </div>
        </div>

        <div v-if="selectedPin.data?.pilot" class="flex items-start space-x-3">
          <PhIdentificationCard :size="16" class="text-primary-50 mt-0.5" />
          <div class="flex-1">
            <p class="text-xs text-primary-200 uppercase tracking-wide">Pilot</p>
            <p class="text-sm text-white">{{ selectedPin.data.pilot }}</p>
          </div>
        </div>

        <div v-if="selectedPin.data?.destination" class="flex items-start space-x-3">
          <PhMapTrifold :size="16" class="text-primary-50 mt-0.5" />
          <div class="flex-1">
            <p class="text-xs text-primary-200 uppercase tracking-wide">Destination</p>
            <p class="text-sm text-white">{{ selectedPin.data.destination }}</p>
          </div>
        </div>

        <div v-if="selectedPin.data?.zone" class="flex items-start space-x-3">
          <PhMapTrifold :size="16" class="text-primary-50 mt-0.5" />
          <div class="flex-1">
            <p class="text-xs text-primary-200 uppercase tracking-wide">Operating Zone</p>
            <p class="text-sm text-white">{{ selectedPin.data.zone }}</p>
          </div>
        </div>

        <div v-if="detectionCheckpoints.length" class="space-y-2">
          <div class="flex items-start space-x-3">
            <PhMapTrifold :size="16" class="text-primary-50 mt-0.5" />
            <div class="flex-1">
              <p class="text-xs text-primary-200 uppercase tracking-wide">Detections</p>
              <p class="text-sm text-white">{{ detectionCheckpoints.length }} checkpoints</p>
            </div>
          </div>

          <ul class="space-y-2 max-h-40 overflow-y-auto pr-1">
            <li
              v-for="detection in detectionCheckpoints"
              :key="detection.id"
              :class="[
                'bg-white/5 rounded-lg p-3 border border-white/10 space-y-1 cursor-pointer transition-colors',
                focusModeActive && isDetectionFocused(detection) ? 'bg-primary-500/20 border-primary-400/60' : 'hover:bg-white/10'
              ]"
              @click="handleDetectionClick(detection)"
            >
              <div class="flex items-center justify-between text-xs text-neutral-200 mb-2">
                <span class="font-semibold">Detection #{{ detection.id }}</span>
                <span>{{ formatDetectionTimestamp(detection.timestamp) }}</span>
              </div>
              
              <!-- Signal Information - Prominent Display -->
              <div v-if="detection.frequency !== null || detection.signalStrength !== null" class="grid grid-cols-2 gap-3 mb-2">
                <div v-if="detection.frequency !== null" class="bg-white/5 rounded-md p-2 border border-white/10">
                  <div class="flex items-center space-x-1.5 mb-1">
                    <PhWifiHigh :size="12" class="text-yellow-400" />
                    <span class="text-xs text-primary-200 uppercase tracking-wide">Frequency</span>
                  </div>
                  <p class="text-sm font-semibold text-yellow-400">{{ formatFrequency(detection.frequency) }}</p>
                </div>
                
                <div v-if="detection.signalStrength !== null" class="bg-white/5 rounded-md p-2 border border-white/10">
                  <div class="flex items-center space-x-1.5 mb-1">
                    <PhWifiHigh :size="12" :class="getSignalStrengthColor(detection.signalStrength)" />
                    <span class="text-xs text-primary-200 uppercase tracking-wide">Signal Strength</span>
                  </div>
                  <p class="text-sm font-semibold" :class="getSignalStrengthColor(detection.signalStrength)">
                    {{ formatSignalStrength(detection.signalStrength) }}
                  </p>
                </div>
              </div>
              
              <!-- Status -->
              <div class="flex items-center space-x-2 text-xs">
                <span class="text-primary-200">Status:</span>
                <span :class="detection.status ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'">
                  {{ detection.status ? 'Active' : 'Inactive' }}
                </span>
              </div>
            </li>
          </ul>
        </div>

        <div v-if="trajectoryPoints.length" class="space-y-2">
          <div class="flex items-start space-x-3">
            <PhMapTrifold :size="16" class="text-primary-50 mt-0.5" />
            <div class="flex-1">
              <p class="text-xs text-primary-200 uppercase tracking-wide">Trajectory</p>
              <p class="text-sm text-white">Last {{ Math.min(trajectoryPoints.length, 20) }} points</p>
            </div>
          </div>

          <ul class="space-y-2 max-h-480 overflow-y-auto pr-1">
            <li
              v-for="(point, index) in trajectoryPoints.slice(-20)"
              :key="`${point.timestamp}-${index}`"
              :class="[
                'bg-white/5 rounded-lg p-3 border border-white/10 space-y-1 cursor-pointer transition-colors',
                activeTrajectoryTimestamp === point.timestamp ? 'bg-primary-500/20 border-primary-400/60' : 'hover:bg-white/10'
              ]"
              @click="handleTrajectoryPointClick(point)"
            >
              <div class="flex items-center justify-between text-xs text-neutral-200">
                <span>{{ formatTrajectoryTimestamp(point.timestamp) }}</span>
                <span v-if="index === trajectoryPoints.slice(-20).length - 1"
                  class="text-primary-300 font-medium">Latest</span>
              </div>
              <div class="flex flex-wrap gap-3 text-xs text-white/80">
                <span>Lat: {{ formatCoordinate(point.lat) }}</span>
                <span>Lng: {{ formatCoordinate(point.lng) }}</span>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else class="flex-1 flex items-center justify-center p-4">
        <div class="text-center">
          <PhMapPin :size="48" class="text-primary-200 mx-auto mb-4" />
          <p class="text-white">Click on a marker to view details</p>
        </div>
      </div>

      <!-- Footer -->
      <div v-if="selectedPin" class="p-4 border-t border-white/10">
        <div class="flex items-center justify-between text-xs text-neutral-200">
          <span>{{ selectedPin.lat }}, {{ selectedPin.lng.toFixed(4) }}</span>
          <button @click="zoomToMapPin" class="text-primary-400 hover:text-primary-300 transition-colors">
            Zoom to pin
          </button>
        </div>
      </div>
    </div>
  </div>
</template>


<script setup lang="ts">
import { computed, watch } from 'vue'
import { PhX, PhPaperPlaneTilt, PhCube, PhGauge, PhIdentificationCard, PhWifiHigh, PhMapTrifold, PhMapPin, PhWarning } from '@phosphor-icons/vue'
import { useMapStore } from '@/store/map'
import type { MapPin, DetectionCheckpoint, DroneTrajectoryPoint } from '@/types/map'

// Props
interface Props {
  isOpen: boolean
  selectedPin: MapPin | null
  hasClusterPanel?: boolean
  focusModeActive?: boolean
}

const props = defineProps<Props>()

const mapStore = useMapStore()

// Emits
const emit = defineEmits<{
  'close': []
  'pin-deselected': []
  'zoom-to-map-pin': [selectedPin: MapPin]
  'exit-focus': []
  'enter-focus': []
  'focus-trajectory-point': [point: DroneTrajectoryPoint]
  'focus-detection': [detection: DetectionCheckpoint]
}>()

// Methods
const zoomToMapPin = () => {
  if (props.selectedPin) {
    emit('zoom-to-map-pin', props.selectedPin)
  }
}

const detectionCheckpoints = computed<DetectionCheckpoint[]>(() => {
  const rawDetections = props.selectedPin?.data?.detections
  if (!Array.isArray(rawDetections)) return []
  return rawDetections as DetectionCheckpoint[]
})

const trajectoryPoints = computed<DroneTrajectoryPoint[]>(() => {
  const rawTrajectory = props.selectedPin?.data?.trajectory
  if (!Array.isArray(rawTrajectory)) return []
  return rawTrajectory as DroneTrajectoryPoint[]
})

const highlightedMarkers = computed(() => {
  const highlights: Array<{ id: string; title: string; typeLabel: string; subtitle?: string; badgeClass: string }> = []
  const pins = mapStore.pins
  const addHighlight = (pin: MapPin | null | undefined, typeOverride?: string) => {
    if (!pin) return
    if (highlights.some(entry => entry.id === pin.id)) return
    highlights.push({
      id: pin.id,
      title: pin.title,
      typeLabel: typeOverride ?? getTypeLabel(pin.type),
      subtitle: pin.description,
      badgeClass: getBadgeClass(typeOverride ?? getTypeLabel(pin.type))
    })
  }

  const getSystemId = (pin: MapPin | null | undefined) => {
    const value = pin?.data?.system_id
    return value !== undefined && value !== null ? String(value) : null
  }

  const dronePins = pins.filter(pin => pin.type === 'drone')
  const operatorPins = pins.filter(pin => pin.type === 'friendly')

  if (mapStore.focusModeActive) {
    if (mapStore.focusModeType === 'sensor') {
      const detectorPin = props.selectedPin?.type === 'sensor'
        ? props.selectedPin
        : pins.find(pin => pin.id === mapStore.focusedDetectorPinId)
      addHighlight(detectorPin, 'Detector')

      const systemId = getSystemId(detectorPin)
      if (systemId) {
        operatorPins
          .filter(pin => String(pin.data?.system_id ?? '') === systemId)
          .forEach(operator => addHighlight(operator, 'Operator'))
      }

      if (detectorPin) {
        const detectionRangeKm = typeof detectorPin.data?.detection_range_km === 'number'
          ? detectorPin.data.detection_range_km
          : 1.5
        const rangeMeters = detectionRangeKm * 1000
        dronePins
          .filter(drone => isWithinRange(detectorPin, drone, rangeMeters))
          .forEach(drone => addHighlight(drone, 'Drone'))
      }
    } else {
      addHighlight(props.selectedPin)
      const detectorPin = pins.find(pin => pin.id === mapStore.focusedDetectorPinId)
      addHighlight(detectorPin, 'Detector')

      const systemId = mapStore.focusedDetectorPinId
        ? getSystemId(detectorPin)
        : getSystemId(props.selectedPin)
      if (systemId) {
        operatorPins
          .filter(pin => String(pin.data?.system_id ?? '') === systemId)
          .forEach(operator => addHighlight(operator, 'Operator'))
      }
    }
  } else {
    addHighlight(props.selectedPin)
  }

  return highlights
})

const getTypeLabel = (type: string) => {
  switch (type) {
    case 'drone': return 'Drone'
    case 'sensor': return 'Detector'
    case 'friendly': return 'Operator'
    case 'target': return 'Detection'
    default: return type.charAt(0).toUpperCase() + type.slice(1)
  }
}

const getBadgeClass = (label: string) => {
  switch (label) {
    case 'Drone': return 'bg-green-500/20 text-green-200 border border-green-400/30'
    case 'Detector': return 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/30'
    case 'Operator': return 'bg-blue-500/20 text-blue-200 border border-blue-400/30'
    case 'Detection': return 'bg-yellow-500/20 text-yellow-200 border border-yellow-400/30'
    default: return 'bg-white/10 text-white border border-white/20'
  }
}

const isWithinRange = (source: MapPin, target: MapPin, rangeMeters: number) => {
  const distance = calculateDistanceMeters(source.lat, source.lng, target.lat, target.lng)
  return distance <= rangeMeters
}

const calculateDistanceMeters = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const toRadians = (deg: number) => deg * (Math.PI / 180)
  const dLat = toRadians(lat2 - lat1)
  const dLng = toRadians(lng2 - lng1)
  const latRad1 = toRadians(lat1)
  const latRad2 = toRadians(lat2)
  const sinLat = Math.sin(dLat / 2)
  const sinLng = Math.sin(dLng / 2)
  const h = sinLat * sinLat + Math.cos(latRad1) * Math.cos(latRad2) * sinLng * sinLng
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
  return 6371000 * c
}

const formatDetectionTimestamp = (timestamp?: string) => {
  if (!timestamp) return 'Unknown'
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return 'Invalid'
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`
}

const formatTrajectoryTimestamp = (timestamp?: string) => {
  if (!timestamp) return 'Unknown'
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return 'Invalid'
  return date.toLocaleTimeString()
}

const formatCoordinate = (value: number) => {
  return Number.isFinite(value) ? value.toFixed(5) : 'N/A'
}

const formatFrequency = (frequency: number | null): string => {
  if (frequency === null || !Number.isFinite(frequency)) return 'N/A'
  // Format frequency: if >= 1000, show in GHz, otherwise MHz
  if (frequency >= 1000) {
    return `${(frequency / 1000).toFixed(2)} GHz`
  }
  return `${frequency.toFixed(1)} MHz`
}

const formatSignalStrength = (signalStrength: number | null): string => {
  if (signalStrength === null || !Number.isFinite(signalStrength)) return 'N/A'
  return `${signalStrength.toFixed(1)} dBm`
}

const getSignalStrengthColor = (signalStrength: number | null): string => {
  if (signalStrength === null || !Number.isFinite(signalStrength)) return 'text-neutral-400'
  // Signal strength color coding:
  // Excellent: > -50 dBm (green)
  // Good: -50 to -60 dBm (green-yellow)
  // Fair: -60 to -70 dBm (yellow)
  // Weak: -70 to -80 dBm (orange)
  // Very Weak: < -80 dBm (red)
  if (signalStrength > -50) return 'text-green-400'
  if (signalStrength > -60) return 'text-green-300'
  if (signalStrength > -70) return 'text-yellow-400'
  if (signalStrength > -80) return 'text-orange-400'
  return 'text-red-400'
}

const activeTrajectoryTimestamp = computed(() => mapStore.focusedTrajectoryTimestamp)

const handleTrajectoryPointClick = (point: DroneTrajectoryPoint) => {
  mapStore.setFocusedTrajectoryTimestamp(point.timestamp)
  emit('focus-trajectory-point', point)
}

const handleDetectionClick = (detection: DetectionCheckpoint) => {
  emit('enter-focus')
  emit('focus-detection', detection)
}

const isDetectionFocused = (detection: DetectionCheckpoint) => {
  return mapStore.focusedDetectionId === detection.id
}

watch(() => props.selectedPin?.data?.trajectory, () => {
  mapStore.setFocusedTrajectoryTimestamp(null)
  mapStore.setFocusedDetectionId(null)
})
</script>
