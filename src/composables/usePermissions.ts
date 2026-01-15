import { computed } from 'vue'
import { useAuth } from './useAuth'
import type { UserRole } from '@/types/auth'

export type Permission = 
  | 'devices.create'
  | 'devices.edit'
  | 'devices.delete'
  | 'devices.view'
  | 'sensors.create'
  | 'sensors.edit'
  | 'sensors.delete'
  | 'sensors.view'
  | 'drones.create'
  | 'drones.edit'
  | 'drones.delete'
  | 'drones.view'
  | 'detections.view'
  | 'detections.manage'
  | 'users.manage'
  | 'system.manage'

/**
 * Permission matrix: defines which roles have which permissions
 */
const PERMISSION_MATRIX: Record<UserRole, Permission[]> = {
  master_admin: [
    'devices.create',
    'devices.edit',
    'devices.delete',
    'devices.view',
    'sensors.create',
    'sensors.edit',
    'sensors.delete',
    'sensors.view',
    'drones.create',
    'drones.edit',
    'drones.delete',
    'drones.view',
    'detections.view',
    'detections.manage',
    'users.manage',
    'system.manage'
  ],
  admin: [
    'devices.create',
    'devices.edit',
    'devices.delete',
    'devices.view',
    'sensors.create',
    'sensors.edit',
    'sensors.delete',
    'sensors.view',
    'drones.create',
    'drones.edit',
    'drones.delete',
    'drones.view',
    'detections.view',
    'detections.manage'
  ],
  user: [
    'devices.view',
    'sensors.view',
    'drones.view',
    'detections.view'
  ]
}

/**
 * Composable for checking user permissions
 */
export function usePermissions() {
  const { userRole } = useAuth()

  /**
   * Check if the current user has a specific permission
   */
  const hasPermission = (permission: Permission): boolean => {
    if (!userRole.value) return false
    const rolePermissions = PERMISSION_MATRIX[userRole.value]
    return rolePermissions?.includes(permission) ?? false
  }

  /**
   * Check if the current user has any of the specified permissions
   */
  const hasAnyPermission = (permissions: Permission[]): boolean => {
    return permissions.some(permission => hasPermission(permission))
  }

  /**
   * Check if the current user has all of the specified permissions
   */
  const hasAllPermissions = (permissions: Permission[]): boolean => {
    return permissions.every(permission => hasPermission(permission))
  }

  /**
   * Check if the current user is a master admin
   */
  const isMasterAdmin = computed(() => userRole.value === 'master_admin')

  /**
   * Check if the current user is an admin (or master admin)
   */
  const isAdmin = computed(() => 
    userRole.value === 'admin' || userRole.value === 'master_admin'
  )

  /**
   * Check if the current user is a regular user
   */
  const isRegularUser = computed(() => userRole.value === 'user')

  /**
   * Check if the current user can manage devices (create, edit, delete)
   */
  const canManageDevices = computed(() => 
    hasPermission('devices.create') || 
    hasPermission('devices.edit') || 
    hasPermission('devices.delete')
  )

  /**
   * Check if the current user can manage sensors (create, edit, delete)
   */
  const canManageSensors = computed(() => 
    hasPermission('sensors.create') || 
    hasPermission('sensors.edit') || 
    hasPermission('sensors.delete')
  )

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isMasterAdmin,
    isAdmin,
    isRegularUser,
    canManageDevices,
    canManageSensors
  }
}
