"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const success = await login(email, password)

      if (success) {
        router.push("/dashboard")
        router.refresh() // Refresh to update auth state
      } else {
        setError("Invalid email or password. Please try again.")
      }
    } catch (error: any) {
      console.error("Login error:", error)
      setError("Login failed. Please check your connection and try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Test credentials for quick testing
  const useTestCredentials = (testEmail: string, testPassword: string) => {
    setEmail(testEmail)
    setPassword(testPassword)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Devvoltz Task Manager</CardTitle>
          <CardDescription className="text-center">
            Sign in to your account to continue
            <br />
            <span className="text-xs text-muted-foreground">
              Using real database authentication
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <span className="animate-spin mr-2">⟳</span>
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>

            <div className="text-center text-sm">
              <p className="text-muted-foreground">
                Don't have an account?{" "}
                <Link 
                  href="/register" 
                  className="text-primary hover:underline font-medium"
                >
                  Register here
                </Link>
              </p>
            </div>

            {/* Quick test buttons for development */}
            {process.env.NODE_ENV === "development" && (
              <div className="mt-4 p-3 bg-muted rounded-lg space-y-2 text-sm">
                <p className="font-semibold">Quick Test (Dev Only):</p>
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => useTestCredentials("test@example.com", "password123")}
                    disabled={isLoading}
                  >
                    Use Test User
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => useTestCredentials("admin@example.com", "admin123")}
                    disabled={isLoading}
                  >
                    Use Admin User
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Note: Register these users first via API
                </p>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}