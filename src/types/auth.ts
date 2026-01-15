export type UserRole = 'master_admin' | 'admin' | 'user'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
}

export interface LoginCredentials {
  email: string
  password: string
  rememberMe?: boolean
}

export interface AuthResponse {
  success: boolean
  user?: User
  token?: string
  error?: string
}

