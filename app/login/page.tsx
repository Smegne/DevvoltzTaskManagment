"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"
import { Loader2, Mail, Lock, Sparkles, UserPlus, Zap } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [activeInput, setActiveInput] = useState<string | null>(null)
  const { login } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const success = await login(email, password)

      if (success) {
        // Success animation before redirect
        document.querySelector('.success-animation')?.classList.add('animate-success')
        setTimeout(() => {
          router.push("/dashboard")
          router.refresh()
        }, 800)
      } else {
        setError("Invalid email or password. Please try again.")
        // Shake animation on error
        document.querySelector('.form-container')?.classList.add('animate-shake')
        setTimeout(() => {
          document.querySelector('.form-container')?.classList.remove('animate-shake')
        }, 500)
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
    // Add fill animation
    const emailInput = document.getElementById('email')
    const passwordInput = document.getElementById('password')
    if (emailInput) emailInput.classList.add('animate-fill')
    if (passwordInput) passwordInput.classList.add('animate-fill')
    setTimeout(() => {
      if (emailInput) emailInput.classList.remove('animate-fill')
      if (passwordInput) passwordInput.classList.remove('animate-fill')
    }, 600)
  }

  // Floating particles effect
  useEffect(() => {
    const particles = document.querySelector('.particles-container')
    if (particles) {
      for (let i = 0; i < 15; i++) {
        const particle = document.createElement('div')
        particle.className = 'particle'
        particle.style.left = `${Math.random() * 100}%`
        particle.style.top = `${Math.random() * 100}%`
        particle.style.animationDelay = `${Math.random() * 2}s`
        particles.appendChild(particle)
      }
    }
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-800 p-4 overflow-hidden relative">
      {/* Background particles */}
      <div className="particles-container absolute inset-0 w-full h-full z-0"></div>
      
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-cyan-500/10 animate-gradient-x"></div>
      
      {/* Floating elements */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      
      <div className="relative z-10 w-full max-w-lg form-container">
        {/* Animated success indicator */}
        <div className="success-animation absolute -top-20 left-1/2 transform -translate-x-1/2 opacity-0">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
        </div>

        <Card className="w-full glass-morphism backdrop-blur-lg border-white/20 shadow-2xl shadow-blue-500/10 hover:shadow-blue-500/20 transition-all duration-500 transform hover:-translate-y-1">
          <CardHeader className="space-y-1 pb-6">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <Sparkles className="absolute -top-2 -right-2 w-5 h-5 text-yellow-400 animate-pulse" />
              </div>
            </div>
            
            <CardTitle className="text-3xl font-bold text-center bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
              Devvoltz Task Manager
            </CardTitle>
            <CardDescription className="text-center text-gray-300/80 pt-2">
              Streamline your workflow with intelligent task management
              <br />
              <span className="text-xs text-gray-400/70 mt-1 inline-block">
                Secure authentication with real-time validation
              </span>
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div 
                  className={`space-y-2 transition-all duration-300 ${activeInput === 'email' ? 'scale-[1.02]' : ''}`}
                  onFocus={() => setActiveInput('email')}
                  onBlur={() => setActiveInput(null)}
                >
                  <Label htmlFor="email" className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email Address
                  </Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isLoading}
                      className="glass-input bg-white/5 border-gray-600/50 focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/30 pl-10 py-6 text-white placeholder:text-gray-400 transition-all duration-300"
                    />
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                </div>

                <div 
                  className={`space-y-2 transition-all duration-300 ${activeInput === 'password' ? 'scale-[1.02]' : ''}`}
                  onFocus={() => setActiveInput('password')}
                  onBlur={() => setActiveInput(null)}
                >
                  <Label htmlFor="password" className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      className="glass-input bg-white/5 border-gray-600/50 focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/30 pl-10 py-6 text-white placeholder:text-gray-400 transition-all duration-300"
                    />
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                </div>
              </div>

              {error && (
                <Alert 
                  variant="destructive"
                  className="glass-morphism bg-red-500/10 border-red-500/30 animate-fade-in"
                >
                  <AlertDescription className="flex items-center gap-2 text-red-300">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                className="w-full py-6 bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
                disabled={isLoading}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Signing in...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <span>Sign In</span>
                    <svg 
                      className={`w-5 h-5 transition-transform duration-300 ${isHovered ? 'translate-x-1' : ''}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
                    </svg>
                  </div>
                )}
              </Button>

              <div className="text-center text-sm pt-4 border-t border-gray-700/50">
                <p className="text-gray-400">
                  New to Devvoltz?{" "}
                  <Link 
                    href="/register" 
                    className="text-cyan-300 hover:text-cyan-200 font-semibold hover:underline inline-flex items-center gap-1 transition-all duration-300 group"
                  >
                    <UserPlus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    Create an account
                  </Link>
                </p>
              </div>

              {/* Quick test buttons for development */}
              {process.env.NODE_ENV === "development" && (
                <div className="mt-6 p-4 glass-morphism bg-white/5 rounded-xl space-y-3 text-sm border border-white/10">
                  <p className="font-semibold text-gray-300 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-yellow-400" />
                    Quick Test (Development)
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => useTestCredentials("test@example.com", "password123")}
                      disabled={isLoading}
                      className="glass-button border-gray-600/50 hover:border-blue-400/50 hover:bg-blue-500/10 text-gray-300 transition-all duration-300"
                    >
                      Test User
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => useTestCredentials("admin@example.com", "admin123")}
                      disabled={isLoading}
                      className="glass-button border-gray-600/50 hover:border-purple-400/50 hover:bg-purple-500/10 text-gray-300 transition-all duration-300"
                    >
                      Admin User
                    </Button>
                  </div>
                  <p className="text-xs text-gray-400/70 pt-2">
                    Note: These users must be registered first via API endpoint
                  </p>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}