import api from './api'
import type { ReportData, ReportRequest, TimePeriod } from '@/types/drones'
import type { RFDetection, DronePosition, OperatorPosition } from '@/types/database'

const DATABASE_NAME = import.meta.env.VITE_DB_NAME || 'drone_monitoring'

export interface ReportResponse {
  success: boolean
  data?: ReportData[]
  error?: string
}

/**
 * Fetch report data for selected drones and time period
 */
export async function fetchReportData(request: ReportRequest): Promise<ReportResponse> {
  try {
    const params = new URLSearchParams()
    params.append('database', DATABASE_NAME)
    params.append('droneIds', request.droneIds.join(','))
    params.append('startDate', request.period.startDate)
    params.append('endDate', request.period.endDate)

    const response = await api.get(`/reports/generate?${params.toString()}`)
    
    return {
      success: true,
      data: response.data.data as ReportData[]
    }
  } catch (error) {
    console.error('[ReportService] Failed to fetch report data:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Generate report data on the frontend by fetching all related data
 * This is a fallback if backend endpoint doesn't exist yet
 */
export async function generateReportDataFrontend(
  droneIds: number[],
  period: TimePeriod
): Promise<ReportData[]> {
  const reports: ReportData[] = []

  for (const droneId of droneIds) {
    try {
      // Fetch drone info
      const droneResponse = await api.get(`/table/drones?database=${DATABASE_NAME}&id=${droneId}`)
      const drones = droneResponse.data.data as any[]
      const drone = drones.find(d => d.id === droneId)
      
      if (!drone) continue

      const deviceName = drone.serial_number || drone.uas_id || drone.mac_address || `Drone #${droneId}`

      // Fetch detections for this drone in the period
      const detectionsParams = new URLSearchParams()
      detectionsParams.append('database', DATABASE_NAME)
      detectionsParams.append('droneId', droneId.toString())
      detectionsParams.append('startDate', period.startDate)
      detectionsParams.append('endDate', period.endDate)

      const detectionsResponse = await api.get(`/table/rf_detections?${detectionsParams.toString()}`)
      const detections = (detectionsResponse.data.data || []) as RFDetection[]

      // Fetch operator positions for this drone in the period
      const operatorParams = new URLSearchParams()
      operatorParams.append('database', DATABASE_NAME)
      operatorParams.append('droneId', droneId.toString())
      operatorParams.append('startDate', period.startDate)
      operatorParams.append('endDate', period.endDate)

      const operatorResponse = await api.get(`/table/operator_positions?${operatorParams.toString()}`)
      const operatorPositions = (operatorResponse.data.data || []) as OperatorPosition[]

      // Fetch drone positions for this drone in the period
      const positionParams = new URLSearchParams()
      positionParams.append('database', DATABASE_NAME)
      positionParams.append('droneId', droneId.toString())
      positionParams.append('startDate', period.startDate)
      positionParams.append('endDate', period.endDate)

      const positionResponse = await api.get(`/table/drone_positions?${positionParams.toString()}`)
      const dronePositions = (positionResponse.data.data || []) as DronePosition[]

      // Determine connection status periods
      const connectionPeriods = determineConnectionPeriods(
        detections,
        dronePositions,
        operatorPositions,
        period
      )

      // Map detections with operator and drone data
      const mappedDetections = detections.map(detection => {
        // Find related operator data
        const operatorData = operatorPositions
          .filter(op => {
            const opTime = new Date(op.time).getTime()
            const detTime = new Date(detection.time).getTime()
            // Operator data within 5 seconds of detection
            return Math.abs(opTime - detTime) < 5000
          })
          .map(op => ({
            time: op.time,
            latitude: op.latitude,
            longitude: op.longitude,
            system_id: op.system_id,
            ...op
          }))

        // Find related drone position data
        const droneData = dronePositions
          .filter(dp => {
            const dpTime = new Date(dp.time).getTime()
            const detTime = new Date(detection.time).getTime()
            // Drone position within 5 seconds of detection
            return Math.abs(dpTime - detTime) < 5000
          })
          .map(dp => ({
            time: dp.time,
            latitude: dp.latitude,
            longitude: dp.longitude,
            altitude: dp.altitude,
            speed: dp.speed,
            ...dp
          }))

        // Get all fields from detection dynamically
        const detectionData: Record<string, any> = {}
        Object.keys(detection).forEach(key => {
          detectionData[key] = (detection as any)[key]
        })

        return {
          id: detection.id,
          startTime: detection.time,
          endTime: detection.last_seen || detection.updated_at || detection.time,
          droneData: droneData.length > 0 ? droneData[0] : {},
          operatorData: operatorData.length > 0 ? operatorData[0] : {},
          ...detectionData
        }
      })

      reports.push({
        deviceName,
        deviceId: droneId,
        status: {
          deviceId: droneId,
          deviceName,
          // Device is connected if there's at least one ongoing period (end === null)
          // or if there are any periods within the report timeframe
          connected: connectionPeriods.length > 0 && connectionPeriods.some(cp => {
            // Consider connected if period is ongoing OR if period overlaps with report period
            
            // TODO: Ask what determines "ongoing" in this context - is it just end === null?
            if (cp.end === null) return true
            
            const periodStart = new Date(cp.start).getTime()
            const periodEnd = new Date(cp.end).getTime()
            const reportStart = new Date(period.startDate).getTime()
            const reportEnd = new Date(period.endDate).getTime()
            
            // Period overlaps with report period
            return periodStart <= reportEnd && periodEnd >= reportStart
          }),
          connectionPeriods
        },
        detections: mappedDetections,
        period
      })
    } catch (error) {
      console.error(`[ReportService] Failed to generate report for drone ${droneId}:`, error)
    }
  }

  return reports
}

/**
 * Determine connection periods based on detections and positions
 * A period with end: null is only considered "ongoing" if the last timestamp
 * is close to the end of the report period or current time
 */
function determineConnectionPeriods(
  detections: RFDetection[],
  dronePositions: DronePosition[],
  operatorPositions: OperatorPosition[],
  period: TimePeriod
): Array<{ start: string; end: string | null }> {
  const periods: Array<{ start: string; end: string | null }> = []
  
  // Collect all timestamps
  const timestamps = new Set<string>()
  detections.forEach(d => {
    if (d.time) timestamps.add(d.time)
    if (d.last_seen) timestamps.add(d.last_seen)
  })
  dronePositions.forEach(dp => {
    if (dp.time) timestamps.add(dp.time)
  })
  operatorPositions.forEach(op => {
    if (op.time) timestamps.add(op.time)
  })

  const sortedTimestamps = Array.from(timestamps)
    .map(t => new Date(t).getTime())
    .filter(t => !Number.isNaN(t))
    .sort((a, b) => a - b)

  if (sortedTimestamps.length === 0) {
    return []
  }

  // Group consecutive timestamps (within 5 minutes)
  const CONNECTION_GAP_MS = 5 * 60 * 1000
  // Consider a period "ongoing" if last timestamp is within 10 minutes of period end or current time
  const ONGOING_THRESHOLD_MS = 10 * 60 * 1000
  let currentPeriod: { start: string; end: string | null } | null = null

  const periodEndTime = new Date(period.endDate).getTime()
  const now = Date.now()
  // Use the later of period end or current time (if period extends to future)
  const effectiveEndTime = Math.max(periodEndTime, now)

  sortedTimestamps.forEach((timestamp, index) => {
    const timestampStr = new Date(timestamp).toISOString()
    
    if (!currentPeriod) {
      currentPeriod = { start: timestampStr, end: null }
    } else {
      const gap = timestamp - new Date(currentPeriod.start).getTime()
      if (gap <= CONNECTION_GAP_MS) {
        // Continue current period - update end time
        currentPeriod.end = timestampStr
      } else {
        // Start new period - check if previous period should be marked as ongoing
        const lastTimestampInPeriod = new Date(currentPeriod.end || currentPeriod.start).getTime()
        const timeSinceLastActivity = effectiveEndTime - lastTimestampInPeriod
        
        // Only mark as ongoing if last activity is recent relative to period end
        if (timeSinceLastActivity <= ONGOING_THRESHOLD_MS) {
          // Keep end as null to indicate ongoing
          currentPeriod.end = null
        } else {
          // Period ended - use the last timestamp as end
          // (end is already set to the last timestamp in the period)
        }
        
        periods.push(currentPeriod)
        currentPeriod = { start: timestampStr, end: null }
      }
    }
  })

  // Handle the last period
  if (currentPeriod) {
    const lastTimestampInPeriod = new Date(currentPeriod.end || currentPeriod.start).getTime()
    const timeSinceLastActivity = effectiveEndTime - lastTimestampInPeriod
    
    // Only mark as ongoing if last activity is recent relative to period end
    if (timeSinceLastActivity <= ONGOING_THRESHOLD_MS) {
      // Mark as ongoing
      currentPeriod.end = null
    } else {
      // Period ended - ensure we have an end time
      if (!currentPeriod.end) {
        // Use the last timestamp as end
        currentPeriod.end = new Date(lastTimestampInPeriod).toISOString()
      }
    }
    
    periods.push(currentPeriod)
  }

  return periods
}

/**
 * Export report data to CSV
 */
export function exportToCSV(reports: ReportData[]): void {
  if (reports.length === 0) {
    alert('No data to export')
    return
  }

  const rows: string[] = []
  
  // Header row
  const headers = [
    'Device Name',
    'Device ID',
    'Period Start',
    'Period End',
    'Connected',
    'Detection ID',
    'Detection Start',
    'Detection End',
    'Detection Fields',
    'Drone Data',
    'Operator Data'
  ]
  rows.push(headers.join(','))

  // Data rows
  reports.forEach(report => {
    if (report.detections.length === 0) {
      // No detections - still include device info
      const row = [
        escapeCSV(report.deviceName),
        report.deviceId.toString(),
        escapeCSV(report.period.startDate),
        escapeCSV(report.period.endDate),
        report.status.connected ? 'Yes' : 'No',
        '',
        '',
        '',
        '',
        '',
        ''
      ]
      rows.push(row.join(','))
    } else {
      report.detections.forEach(detection => {
        const detectionFields = Object.entries(detection)
          .filter(([key]) => !['id', 'startTime', 'endTime', 'droneData', 'operatorData'].includes(key))
          .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
          .join('; ')

        const row = [
          escapeCSV(report.deviceName),
          report.deviceId.toString(),
          escapeCSV(report.period.startDate),
          escapeCSV(report.period.endDate),
          report.status.connected ? 'Yes' : 'No',
          detection.id.toString(),
          escapeCSV(detection.startTime),
          escapeCSV(detection.endTime || ''),
          escapeCSV(detectionFields),
          escapeCSV(JSON.stringify(detection.droneData)),
          escapeCSV(JSON.stringify(detection.operatorData))
        ]
        rows.push(row.join(','))
      })
    }
  })

  // Create and download
  const csvContent = rows.join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `drone-report-${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Export report data to PDF (using browser print functionality)
 * For a more advanced PDF, you'd want to use a library like jsPDF
 */
export function exportToPDF(reports: ReportData[]): void {
  if (reports.length === 0) {
    alert('No data to export')
    return
  }

  // Create a printable HTML document
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    alert('Please allow popups to generate PDF')
    return
  }

  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Drone Report</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { color: #333; }
        h2 { color: #666; margin-top: 30px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .section { margin: 30px 0; }
      </style>
    </head>
    <body>
      <h1>Drone Report</h1>
      <p>Generated: ${new Date().toLocaleString()}</p>
  `

  reports.forEach(report => {
    html += `
      <div class="section">
        <h2>${escapeHtml(report.deviceName)} (ID: ${report.deviceId})</h2>
        <p><strong>Period:</strong> ${escapeHtml(report.period.startDate)} to ${escapeHtml(report.period.endDate)}</p>
        <p><strong>Status:</strong> ${report.status.connected ? 'Connected' : 'Not Connected'}</p>
        
        <h3>Connection Periods</h3>
        <table>
          <tr><th>Start</th><th>End</th></tr>
    `
    
    report.status.connectionPeriods.forEach(period => {
      html += `<tr><td>${escapeHtml(period.start)}</td><td>${escapeHtml(period.end || 'Ongoing')}</td></tr>`
    })
    
    html += `</table>`

    if (report.detections.length > 0) {
      html += `
        <h3>Detections (${report.detections.length})</h3>
        <table>
          <tr>
            <th>ID</th>
            <th>Start Time</th>
            <th>End Time</th>
            <th>Details</th>
          </tr>
      `
      
      report.detections.forEach(detection => {
        const details = Object.entries(detection)
          .filter(([key]) => !['id', 'startTime', 'endTime', 'droneData', 'operatorData'].includes(key))
          .map(([key, value]) => `<strong>${escapeHtml(key)}:</strong> ${escapeHtml(String(value))}`)
          .join('<br>')
        
        html += `
          <tr>
            <td>${detection.id}</td>
            <td>${escapeHtml(detection.startTime)}</td>
            <td>${escapeHtml(detection.endTime || '—')}</td>
            <td>${details}</td>
          </tr>
        `
      })
      
      html += `</table>`
    }
    
    html += `</div>`
  })

  html += `
    </body>
    </html>
  `

  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()
  
  // Wait a bit for content to load, then print
  setTimeout(() => {
    printWindow.print()
  }, 250)
}

function escapeCSV(value: any): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function escapeHtml(value: any): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

