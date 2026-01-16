<template>
  <div
    data-map-overlay="right"
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
        <div class="flex-1 min-w-0">
          <h3 class="font-semibold text-white truncate">{{ selectedPin ? selectedPin.title : 'Select a Target' }}</h3>
          <!-- Show RF detection indicator for sensors - more visible alert -->
          <div v-if="selectedPin?.type === 'sensor' && selectedPin.data?.hasRFDetections" class="flex items-center space-x-2 mt-2 px-2 py-1.5 rounded-md bg-orange-500/20 border border-orange-500/40">
            <div class="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse shadow-lg shadow-orange-500/50"></div>
            <p class="text-xs text-orange-400 font-semibold">
              {{ detections.length > 0 ? `${detections.length} active RF detection${detections.length === 1 ? '' : 's'}` : 'RF detections present' }}
            </p>
          </div>
        </div>

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

        <!-- Sensor-specific fields -->
        <div v-if="selectedPin.type === 'sensor' && selectedPin.data?.system_id" class="flex items-start space-x-3">
          <PhGear :size="16" class="text-primary-50 mt-0.5" />
          <div class="flex-1">
            <p class="text-xs text-primary-200 uppercase tracking-wide">System ID</p>
            <p class="text-sm text-white">{{ selectedPin.data.system_id }}</p>
          </div>
        </div>

        <div v-if="selectedPin.type === 'sensor' && selectedPin.data?.unit_id" class="flex items-start space-x-3">
          <PhCube :size="16" class="text-primary-50 mt-0.5" />
          <div class="flex-1">
            <p class="text-xs text-primary-200 uppercase tracking-wide">Unit ID</p>
            <p class="text-sm text-white">{{ selectedPin.data.unit_id }}</p>
          </div>
        </div>

        <div v-if="selectedPin.type === 'sensor' && selectedPin.data?.detection_range_km" class="flex items-start space-x-3">
          <PhMapTrifold :size="16" class="text-primary-50 mt-0.5" />
          <div class="flex-1">
            <p class="text-xs text-primary-200 uppercase tracking-wide">Detection Range</p>
            <p class="text-sm text-white">{{ selectedPin.data.detection_range_km }} km</p>
          </div>
        </div>

        <div v-if="selectedPin.type === 'sensor' && selectedPin.data?.status" class="flex items-start space-x-3">
          <PhWarning :size="16" class="text-primary-50 mt-0.5" />
          <div class="flex-1">
            <p class="text-xs text-primary-200 uppercase tracking-wide">Sensor Status</p>
            <p class="text-sm" :class="selectedPin.data.status === 'active' ? 'text-green-400' : 'text-yellow-400'">
              {{ selectedPin.data.status }}
            </p>
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

        <!-- RF Detections integrated into sensor panel -->
        <!-- Always show detections when sensor is selected, even if RF Detections filter is disabled -->
        <!-- The filter controls map visibility, not panel data -->
        <div v-if="selectedPin.type === 'sensor'" class="mt-4 pt-4 border-t border-white/10 space-y-3">
          <div class="flex items-start space-x-3">
            <PhWifiHigh :size="16" class="text-primary-50 mt-0.5" />
            <div class="flex-1">
              <p class="text-xs text-primary-200 uppercase tracking-wide">RF Detections</p>
              <p class="text-sm text-white">
                {{ detections.length > 0 
                  ? `${detections.length} active detection${detections.length === 1 ? '' : 's'}` 
                  : 'No active detections' }}
              </p>
              <!-- Show note if RF Detections filter is disabled -->
              <p v-if="!mapStore.isMarkerTypeVisible('target') && detections.length > 0" class="text-xs text-neutral-400 mt-1">
                (RF Detections filter is disabled - detections hidden on map)
              </p>
            </div>
          </div>

          <!-- Show detections if any -->
          <div v-if="detections.length > 0" class="space-y-3">

          <div class="space-y-3 max-h-64 overflow-y-auto pr-1">
            <div
              v-for="(detection, index) in detections"
              :key="`${detection.timestamp}-${detection.systemId}-${index}`"
              :class="[
                'bg-white/5 rounded-lg p-3 border border-yellow-400/30 space-y-3 transition-colors',
                focusModeActive && isDetectionFocused(detection) ? 'bg-primary-500/20 border-primary-400/60' : 'hover:bg-white/10'
              ]"
            >
              <div class="flex items-center justify-between text-xs text-neutral-200 mb-2">
                <div class="flex items-center space-x-2">
                  <div class="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></div>
                  <span class="font-semibold text-white">RF Detection #{{ detection.id }}</span>
                </div>
                <span>{{ formatDateTime(detection.timestamp) }}</span>
              </div>

              <div class="grid grid-cols-2 gap-3 text-xs text-neutral-200">
                <div class="space-y-0.5">
                  <p class="text-primary-200 uppercase tracking-wide">Drone ID</p>
                  <p class="text-sm text-white">{{ detection.droneId ?? 'Unknown' }}</p>
                </div>
                <div class="space-y-0.5">
                  <p class="text-primary-200 uppercase tracking-wide">Detector (System ID)</p>
                  <p class="text-sm text-white">{{ detection.systemId ?? 'Unknown' }}</p>
                </div>
                <div class="space-y-0.5">
                  <p class="text-primary-200 uppercase tracking-wide">Status</p>
                  <p class="text-sm" :class="detection.status ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'">
                    {{ detection.status ? 'Active' : 'Inactive' }}
                  </p>
                </div>
                <div class="space-y-0.5">
                  <p class="text-primary-200 uppercase tracking-wide">Timestamp</p>
                  <p class="text-sm text-white">{{ formatDateTime(detection.timestamp) }}</p>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
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
            </div>
          </div>
          </div>
        </div>

        <!-- Detection Details (when clicking a detection marker or checkpoint) - for non-sensor pins -->
        <div v-if="(focusedDetection || (selectedPin?.type === 'target' && selectedPin.data)) && selectedPin?.type !== 'sensor'" class="bg-primary-500/20 border-2 border-primary-400/60 rounded-xl p-4 space-y-3 mb-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <PhWifiHigh :size="20" class="text-yellow-400" />
              <div>
                <h4 class="text-sm font-semibold text-white">Selected Detection</h4>
                <p class="text-xs text-primary-200">
                  Detection #{{ focusedDetection?.id || 'N/A' }}
                  <span v-if="selectedPin?.data?._aggregate_count && selectedPin.data._aggregate_count > 1" class="text-yellow-400">
                    ({{ selectedPin.data._aggregate_count }} merged)
                  </span>
                </p>
              </div>
            </div>
            <button
              @click="clearFocusedDetection"
              class="p-1 rounded hover:bg-white/10 transition-colors"
              title="Clear selection"
            >
              <PhX :size="16" class="text-white" />
            </button>
          </div>

          <div v-if="focusedDetection" class="grid grid-cols-2 gap-3 text-xs">
            <div class="space-y-0.5">
              <p class="text-primary-200 uppercase tracking-wide">Timestamp</p>
              <p class="text-sm text-white">{{ formatDateTime(focusedDetection.timestamp) }}</p>
            </div>
            <div class="space-y-0.5">
              <p class="text-primary-200 uppercase tracking-wide">Status</p>
              <p class="text-sm" :class="focusedDetection.status ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'">
                {{ focusedDetection.status ? 'Active' : 'Inactive' }}
              </p>
            </div>
            <div v-if="focusedDetection.droneId" class="space-y-0.5">
              <p class="text-primary-200 uppercase tracking-wide">Drone ID</p>
              <p class="text-sm text-white">{{ focusedDetection.droneId }}</p>
            </div>
            <div v-if="focusedDetection.systemId" class="space-y-0.5">
              <p class="text-primary-200 uppercase tracking-wide">Detector (System ID)</p>
              <p class="text-sm text-white">{{ focusedDetection.systemId }}</p>
            </div>
            <div v-if="focusedDetection.frequency !== null" class="space-y-0.5">
              <p class="text-primary-200 uppercase tracking-wide">Frequency</p>
              <p class="text-sm font-semibold text-yellow-400">{{ formatFrequency(focusedDetection.frequency) }}</p>
            </div>
            <div v-if="focusedDetection.signalStrength !== null" class="space-y-0.5">
              <p class="text-primary-200 uppercase tracking-wide">Signal Strength</p>
              <p class="text-sm font-semibold" :class="getSignalStrengthColor(focusedDetection.signalStrength)">
                {{ formatSignalStrength(focusedDetection.signalStrength) }}
              </p>
            </div>
          </div>
        </div>

        <div v-if="detectorSightings.length" class="space-y-3">
          <div class="flex items-start space-x-3">
            <PhMapTrifold :size="16" class="text-primary-50 mt-0.5" />
            <div class="flex-1">
              <p class="text-xs text-primary-200 uppercase tracking-wide">Detectors That Sighted This Aircraft</p>
              <p class="text-sm text-white">{{ detectorSightings.length }} detector{{ detectorSightings.length === 1 ? '' : 's' }}</p>
            </div>
          </div>

          <ul class="space-y-3 max-h-64 overflow-y-auto pr-1">
            <li
              v-for="detector in detectorSightings"
              :key="detector.systemId"
              class="bg-white/5 rounded-lg p-3 border border-white/10 space-y-3"
            >
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-semibold text-white">{{ detector.name }}</p>
                  <p class="text-xs text-neutral-300">System ID {{ detector.systemId }}</p>
                </div>
                <span class="text-xs font-semibold text-primary-200">
                  {{ detector.detectionCount }} detection{{ detector.detectionCount === 1 ? '' : 's' }}
                </span>
              </div>

              <div class="grid grid-cols-2 gap-3 text-xs text-neutral-200">
                <div class="space-y-0.5">
                  <p class="text-primary-200 uppercase tracking-wide">Unit ID</p>
                  <p class="text-sm text-white">{{ detector.unitId ?? 'Unknown' }}</p>
                </div>
                <div class="space-y-0.5">
                  <p class="text-primary-200 uppercase tracking-wide">Status</p>
                  <p class="text-sm font-semibold" :class="detector.status === 'active' ? 'text-green-400' : 'text-yellow-300'">
                    {{ detector.status ?? 'Unknown' }}
                  </p>
                </div>
                <div class="space-y-0.5">
                  <p class="text-primary-200 uppercase tracking-wide">Detection Range</p>
                  <p class="text-sm text-white">{{ formatRange(detector.rangeKm) }}</p>
                </div>
                <div class="space-y-0.5">
                  <p class="text-primary-200 uppercase tracking-wide">Last Detection</p>
                  <p class="text-sm text-white">{{ formatDateTime(detector.lastSeen) }}</p>
                </div>
                <div class="space-y-0.5 col-span-2">
                  <p class="text-primary-200 uppercase tracking-wide">Coordinates</p>
                  <p class="text-sm text-white">
                    {{ formatCoordinate(detector.lat) }}, {{ formatCoordinate(detector.lng) }}
                  </p>
                </div>
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
import { PhX, PhPaperPlaneTilt, PhCube, PhGauge, PhIdentificationCard, PhWifiHigh, PhMapTrifold, PhMapPin, PhWarning, PhGear } from '@phosphor-icons/vue'
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

// Get active/current RF detections from sensor pin
// Group by unique timestamp+system_id combinations
// Get active/current RF detections from sensor pin
// Filter to only active detections within the time window and group by unique timestamp+system_id combinations
const detections = computed<DetectionCheckpoint[]>(() => {
  const rawDetections = props.selectedPin?.data?.detections

  console.log('[InfoPanel] Raw detections check:', {
    hasSelectedPin: !!props.selectedPin,
    pinType: props.selectedPin?.type,
    hasDetectionsData: !!props.selectedPin?.data?.detections,
    isArray: Array.isArray(rawDetections),
    detectionsLength: Array.isArray(rawDetections) ? rawDetections.length : 0,
    rawDetections: rawDetections,
    hasRFDetections: props.selectedPin?.data?.hasRFDetections
  })

  if (!Array.isArray(rawDetections) || rawDetections.length === 0) {
    console.log('[InfoPanel] No raw detections found, returning empty array')
    return []
  }

  // Get detection window (same logic as useMapPins)
  const isTestMode = import.meta.env.VITE_TEST_MODE === 'true'
  const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000
  
  let detectionWindowMs: number
  const userWindow = mapStore.getTimeWindow()
  if (userWindow !== null && userWindow > 0) {
    detectionWindowMs = userWindow
  } else if (isTestMode) {
    detectionWindowMs = ONE_YEAR_MS
  } else {
    const envValue = import.meta.env.VITE_DETECTION_WINDOW_MS
    detectionWindowMs = envValue ? parseInt(envValue, 10) : 60 * 60 * 1000 // Default: 1 hour
  }
  
  const cutoffTime = Date.now() - detectionWindowMs
  const now = Date.now()

  // Log filtering details
  console.log('[InfoPanel] Filtering detections for sensor:', {
    sensorId: props.selectedPin?.id,
    systemId: props.selectedPin?.data?.system_id,
    totalRawDetections: rawDetections.length,
    windowMs: detectionWindowMs,
    windowHours: (detectionWindowMs / (60 * 60 * 1000)).toFixed(2),
    cutoffTime: new Date(cutoffTime).toISOString(),
    now: new Date(now).toISOString(),
    rawDetections: rawDetections.map((d: DetectionCheckpoint) => ({
      id: d.id,
      timestamp: d.timestamp,
      timestampISO: d.timestamp ? new Date(d.timestamp).toISOString() : null,
      timestampMs: d.timestamp ? new Date(d.timestamp).getTime() : null,
      ageMs: d.timestamp ? (now - new Date(d.timestamp).getTime()) : null,
      ageHours: d.timestamp ? ((now - new Date(d.timestamp).getTime()) / (60 * 60 * 1000)).toFixed(2) : null,
      status: d.status,
      isRecent: d.timestamp ? new Date(d.timestamp).getTime() >= cutoffTime : false,
      passesStatusFilter: d.status === true || d.status === 1,
      passesTimeFilter: d.timestamp ? new Date(d.timestamp).getTime() >= cutoffTime : false,
      passesBothFilters: (d.status === true || d.status === 1) && d.timestamp ? new Date(d.timestamp).getTime() >= cutoffTime : false
    }))
  })

  // Filter to only active detections within the time window
  // Note: status can be boolean true or number 1 (both mean active)
  const activeDetections = rawDetections.filter((d: DetectionCheckpoint) => {
    // Handle both boolean true and number 1 as active status
    const statusCheck = d.status === true || d.status === 1
    const hasTimestamp = !!d.timestamp
    let timeCheck = false
    if (hasTimestamp) {
      const detectionTime = new Date(d.timestamp).getTime()
      timeCheck = detectionTime >= cutoffTime
    }
    const passes = statusCheck && hasTimestamp && timeCheck
    
    console.log(`[InfoPanel] Detection ${d.id} filter check:`, {
      id: d.id,
      status: d.status,
      statusType: typeof d.status,
      statusCheck,
      timestamp: d.timestamp,
      hasTimestamp,
      detectionTime: d.timestamp ? new Date(d.timestamp).getTime() : null,
      cutoffTime,
      timeCheck,
      passes
    })
    
    return passes
  })
  
  console.log('[InfoPanel] Filtered detections result:', {
    totalRaw: rawDetections.length,
    activeAfterFilter: activeDetections.length,
    filteredOut: rawDetections.length - activeDetections.length,
    activeDetections: activeDetections.map(d => ({
      id: d.id,
      timestamp: d.timestamp,
      status: d.status
    }))
  })

  if (activeDetections.length === 0) {
    return []
  }

  // Group by unique timestamp+system_id combinations
  // If multiple detections have the same timestamp and system_id, show only one
  const uniqueDetections = new Map<string, DetectionCheckpoint>()
  
  activeDetections.forEach((detection: DetectionCheckpoint) => {
    const key = `${detection.timestamp}-${detection.systemId ?? 'unknown'}`
    // Keep the most recent one if there are duplicates
    if (!uniqueDetections.has(key)) {
      uniqueDetections.set(key, detection)
    } else {
      const existing = uniqueDetections.get(key)!
      // If this detection is newer, replace it
      const existingTime = new Date(existing.timestamp).getTime()
      const currentTime = new Date(detection.timestamp).getTime()
      if (currentTime > existingTime) {
        uniqueDetections.set(key, detection)
      }
    }
  })

  // Sort by timestamp (newest first)
  return Array.from(uniqueDetections.values()).sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime()
    const timeB = new Date(b.timestamp).getTime()
    return timeB - timeA
  })
})

const focusedDetection = computed<DetectionCheckpoint | null>(() => {
  const focusedId = mapStore.focusedDetectionId
  console.log('[InfoPanel] focusedDetection computed:', {
    focusedId,
    selectedPinType: props.selectedPin?.type,
    selectedPinId: props.selectedPin?.id,
    detectionsCount: detections.value.length
  })
  
  // If a detection pin is directly selected, use its data
  if (props.selectedPin?.type === 'target' && props.selectedPin.data) {
    const data = props.selectedPin.data
    
    // Extract detection ID - check multiple sources
    let detectionId: number = 0
    if (typeof data.id === 'number') {
      detectionId = data.id
    } else if (Array.isArray(data._ids) && data._ids.length > 0) {
      const firstId = data._ids[0]
      detectionId = typeof firstId === 'number' ? firstId : Number(firstId) || 0
    } else {
      detectionId = Number(String(props.selectedPin.id).replace('rf-detection-', '')) || 0
    }
    
    console.log('[InfoPanel] Using detection pin data, detectionId:', detectionId)
    return {
      id: detectionId,
      timestamp: data.time || data.timestamp || props.selectedPin.timestamp || '',
      status: data.detection_status !== undefined ? Boolean(data.detection_status) : null,
      droneId: data.drone_id !== undefined ? String(data.drone_id) : null,
      systemId: data.system_id || null,
      frequency: data.frequency !== undefined && data.frequency !== null ? Number(data.frequency) : null,
      signalStrength: data.signal_strength !== undefined && data.signal_strength !== null ? Number(data.signal_strength) : null
    } as DetectionCheckpoint
  }
  
  // Otherwise, search by focusedDetectionId
  if (!focusedId) {
    console.log('[InfoPanel] No focusedDetectionId')
    return null
  }
  
  // Search in current detections list
  const found = detections.value.find(d => d.id === focusedId)
  if (found) {
    console.log('[InfoPanel] Found detection in detections list:', found.id)
    return found
  }
  
  // If not found, search all pins
  for (const pin of mapStore.pins) {
    if (pin.type === 'drone' && Array.isArray(pin.data?.detections)) {
      const detection = (pin.data.detections as DetectionCheckpoint[]).find(d => d.id === focusedId)
      if (detection) {
        console.log('[InfoPanel] Found detection in drone pin:', pin.id, 'detection:', detection.id)
        return detection
      }
    }
  }
  
  console.log('[InfoPanel] Detection not found for focusedId:', focusedId)
  return null
})

const clearFocusedDetection = () => {
  mapStore.setFocusedDetectionId(null)
  // If the selected pin is a detection marker, deselect it
  if (props.selectedPin?.type === 'target') {
    mapStore.selectPin(null)
  }
}

const trajectoryPoints = computed<DroneTrajectoryPoint[]>(() => {
  const rawTrajectory = props.selectedPin?.data?.trajectory
  if (!Array.isArray(rawTrajectory)) return []
  return rawTrajectory as DroneTrajectoryPoint[]
})

const sensorPins = computed(() => mapStore.pins.filter(pin => pin.type === 'sensor'))

const detectorSightings = computed(() => {
  const grouped = new Map<string, DetectionCheckpoint[]>()
  detections.value.forEach(detection => {
    if (!detection.systemId) return
    const key = String(detection.systemId)
    const current = grouped.get(key) ?? []
    current.push(detection)
    grouped.set(key, current)
  })

  return Array.from(grouped.entries()).map(([systemId, detectionList]) => {
    const sensorPin = sensorPins.value.find(pin => {
      const ids: string[] = []
      const system = pin.data?.system_id
      const unit = pin.data?.unit_id
      if (system !== null && system !== undefined) ids.push(String(system))
      if (unit !== null && unit !== undefined) ids.push(String(unit))
      return ids.includes(systemId)
    })

    const sortedDetections = detectionList.slice().sort((a, b) => {
      return toTimeValue(b.timestamp) - toTimeValue(a.timestamp)
    })
    const latestDetection = sortedDetections[0] ?? null

    return {
      systemId,
      unitId: sensorPin?.data?.unit_id ?? null,
      name: sensorPin?.title ?? `Detector ${systemId}`,
      status: sensorPin?.data?.status ?? 'unknown',
      rangeKm: typeof sensorPin?.data?.detection_range_km === 'number' ? sensorPin.data.detection_range_km : null,
      lastSeen: sensorPin?.data?.timestamp ?? latestDetection?.timestamp ?? null,
      lat: sensorPin?.lat ?? null,
      lng: sensorPin?.lng ?? null,
      detectionCount: detectionList.length
    }
  }).sort((a, b) => b.detectionCount - a.detectionCount)
})

const toTimeValue = (value?: string | null) => value ? new Date(value).getTime() : 0

const formatDateTime = (timestamp?: string | null) => {
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

const formatCoordinate = (value?: number | null) => {
  return value !== null && value !== undefined && Number.isFinite(value) ? value.toFixed(5) : 'N/A'
}

const formatRange = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(value)) return '1.5 km'
  return `${value.toFixed(1)} km`
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
