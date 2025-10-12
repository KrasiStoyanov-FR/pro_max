export interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'operator' | 'viewer'
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthResponse {
  success: boolean
  user?: User
  token?: string
  error?: string
}

