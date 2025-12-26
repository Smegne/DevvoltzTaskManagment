"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

// Updated User interface to match our database
export type UserRole = "user" | "admin"

export interface User {
  id: number
  email: string
  name: string
  role: UserRole
  created_at?: string
  updated_at?: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<boolean>
  register: (name: string, email: string, password: string) => Promise<boolean>
  logout: () => void
  checkAuth: () => Promise<void>
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  // Set mounted state on client only
  useEffect(() => {
    setMounted(true)
  }, [])

  // Load user from localStorage on initial load (client only)
  useEffect(() => {
    if (!mounted) return

    const checkStoredAuth = async () => {
      try {
        const storedToken = localStorage.getItem("auth_token")
        const storedUser = localStorage.getItem("auth_user")
        
        if (storedToken && storedUser) {
          setUser(JSON.parse(storedUser))
        }
      } catch (error) {
        console.error("Error loading stored auth:", error)
        // Don't clear localStorage here to avoid hydration issues
      } finally {
        setIsLoading(false)
      }
    }

    checkStoredAuth()
  }, [mounted])

  // Check auth status from server
  const checkAuth = async () => {
    if (!mounted) return

    try {
      setIsLoading(true)
      const token = localStorage.getItem("auth_token")
      
      if (!token) {
        setUser(null)
        return
      }

      // Verify token by calling profile endpoint
      const response = await fetch("/api/auth/profile", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.user) {
          setUser(data.user)
          localStorage.setItem("auth_user", JSON.stringify(data.user))
        } else {
          logout()
        }
      } else {
        logout()
      }
    } catch (error) {
      console.error("Auth check failed:", error)
      logout()
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (email: string, password: string): Promise<boolean> => {
    if (!mounted) return false

    try {
      setIsLoading(true)
      
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (data.success && data.user && data.token) {
        // Store token and user
        localStorage.setItem("auth_token", data.token)
        localStorage.setItem("auth_user", JSON.stringify(data.user))
        
        setUser(data.user)
        return true
      } else {
        console.error("Login failed:", data.error || data.message)
        return false
      }
    } catch (error: any) {
      console.error("Login error:", error)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (name: string, email: string, password: string): Promise<boolean> => {
    if (!mounted) return false

    try {
      setIsLoading(true)
      
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password }),
      })

      const data = await response.json()

      if (data.success && data.user && data.token) {
        // Store token and user
        localStorage.setItem("auth_token", data.token)
        localStorage.setItem("auth_user", JSON.stringify(data.user))
        
        setUser(data.user)
        return true
      } else {
        console.error("Registration failed:", data.error || data.message)
        return false
      }
    } catch (error: any) {
      console.error("Registration error:", error)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    if (!mounted) return
    
    // Clear all auth data
    localStorage.removeItem("auth_token")
    localStorage.removeItem("auth_user")
    setUser(null)
  }

  const value: AuthContextType = {
    user,
    isLoading: isLoading || !mounted, // Show loading until mounted
    login,
    register,
    logout,
    checkAuth,
    isAuthenticated: !!user && mounted,
  }

  // Show loading state during SSR
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}