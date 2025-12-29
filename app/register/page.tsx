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
import { Loader2, Mail, Lock, User, CheckCircle, Sparkles, Users, ArrowRight, Shield } from "lucide-react"

export default function RegisterPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [activeInput, setActiveInput] = useState<string | null>(null)
  const [passwordStrength, setPasswordStrength] = useState(0)
  const [passwordCriteria, setPasswordCriteria] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
  })
  const router = useRouter()
  const { register } = useAuth()

  const checkPasswordStrength = (pass: string) => {
    const criteria = {
      length: pass.length >= 6,
      uppercase: /[A-Z]/.test(pass),
      lowercase: /[a-z]/.test(pass),
      number: /[0-9]/.test(pass),
    }
    
    setPasswordCriteria(criteria)
    const strength = Object.values(criteria).filter(Boolean).length
    setPasswordStrength(strength)
  }

  useEffect(() => {
    if (password) {
      checkPasswordStrength(password)
    }
  }, [password])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    // Validation
    if (password !== confirmPassword) {
      setError("Passwords do not match")
      document.querySelector('.form-container')?.classList.add('animate-shake')
      setTimeout(() => {
        document.querySelector('.form-container')?.classList.remove('animate-shake')
      }, 500)
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    setIsLoading(true)

    try {
      const success = await register(name, email, password)

      if (success) {
        // Success animation
        document.querySelector('.success-animation')?.classList.add('animate-success')
        setSuccess("Registration successful! Redirecting to dashboard...")
        setTimeout(() => {
          router.push("/dashboard")
          router.refresh()
        }, 2000)
      } else {
        setError("Registration failed. Please try again.")
        document.querySelector('.form-container')?.classList.add('animate-shake')
        setTimeout(() => {
          document.querySelector('.form-container')?.classList.remove('animate-shake')
        }, 500)
      }
    } catch (error: any) {
      console.error("Registration error:", error)
      setError("Registration failed. Please check your connection and try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Animated background particles
  useEffect(() => {
    const particles = document.querySelector('.particles-container')
    if (particles) {
      for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div')
        particle.className = 'particle'
        particle.style.left = `${Math.random() * 100}%`
        particle.style.top = `${Math.random() * 100}%`
        particle.style.animationDelay = `${Math.random() * 3}s`
        particles.appendChild(particle)
      }
    }
  }, [])

  const getStrengthColor = () => {
    if (passwordStrength === 0) return "bg-gray-600"
    if (passwordStrength === 1) return "bg-red-500"
    if (passwordStrength === 2) return "bg-orange-500"
    if (passwordStrength === 3) return "bg-yellow-500"
    return "bg-green-500"
  }

  const getStrengthText = () => {
    if (passwordStrength === 0) return "Too weak"
    if (passwordStrength === 1) return "Weak"
    if (passwordStrength === 2) return "Fair"
    if (passwordStrength === 3) return "Good"
    return "Strong"
  }

return (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-purple-900/30 p-4 overflow-hidden relative">
    {/* Enhanced background elements */}
    <div className="fixed inset-0 overflow-hidden -z-10">
      {/* Main gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-purple-900/50"></div>
      
      {/* Background particles */}
      <div className="particles-container absolute inset-0 w-full h-full z-0">
        {/* This will be populated by the useEffect particles */}
      </div>
      
      {/* Animated gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-cyan-500/10 animate-gradient-x"></div>
      
      {/* Floating gradient orbs */}
      <div className="absolute top-1/3 left-1/5 w-72 h-72 bg-gradient-to-br from-purple-500/15 via-pink-500/10 to-transparent rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-1/3 right-1/5 w-80 h-80 bg-gradient-to-br from-pink-500/10 via-purple-500/5 to-transparent rounded-full blur-3xl animate-pulse delay-700"></div>
      
      {/* Subtle grid texture */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f12_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f12_1px,transparent_1px)] bg-[size:14px_24px] opacity-30"></div>
      
      {/* Glowing particles */}
      <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-purple-400 rounded-full animate-ping"></div>
      <div className="absolute top-1/2 right-1/3 w-1 h-1 bg-pink-300 rounded-full animate-ping delay-300"></div>
      <div className="absolute bottom-1/4 left-1/3 w-1 h-1 bg-cyan-300 rounded-full animate-ping delay-600"></div>
    </div>
    
    <div className="relative z-10 w-full max-w-xl form-container">
      {/* Success animation */}
      <div className="success-animation absolute -top-20 left-1/2 transform -translate-x-1/2 opacity-0">
        <div className="relative">
          <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-400 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30 animate-pulse">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-yellow-400 animate-spin" />
        </div>
      </div>

      <Card className="w-full bg-gradient-to-br from-gray-900/90 via-black/90 to-purple-900/40 backdrop-blur-xl border-white/20 shadow-2xl shadow-purple-500/20 hover:shadow-purple-500/40 transition-all duration-500 transform hover:-translate-y-1 relative overflow-hidden">
        {/* Card gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-pink-500/5 to-cyan-500/5"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-500/10 via-transparent to-transparent"></div>
        
        <div className="relative z-10">
          <CardHeader className="space-y-1 pb-6">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30 relative overflow-hidden">
                  {/* Icon background gradient */}
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-purple-500 to-pink-500"></div>
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent"></div>
                  <Users className="w-8 h-8 text-white relative z-10" />
                </div>
                <Sparkles className="absolute -top-2 -right-2 w-5 h-5 text-yellow-400 animate-pulse" />
              </div>
            </div>
            
            <CardTitle className="text-3xl font-bold text-center bg-gradient-to-r from-purple-300 via-pink-300 to-purple-400 bg-clip-text text-transparent">
              Join Devvoltz
            </CardTitle>
            <CardDescription className="text-center text-gray-300/80 pt-2">
              Create your account and start managing tasks efficiently
              <br />
              <span className="text-xs text-gray-400/70 mt-1 inline-block">
                Secure registration with enterprise-grade encryption
              </span>
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid md:grid-cols-2 gap-5">
                {/* Name Input */}
                <div 
                  className={`space-y-2 transition-all duration-300 ${activeInput === 'name' ? 'scale-[1.02]' : ''}`}
                  onFocus={() => setActiveInput('name')}
                  onBlur={() => setActiveInput(null)}
                >
                  <Label htmlFor="name" className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Full Name
                  </Label>
                  <div className="relative">
                    <Input
                      id="name"
                      type="text"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      disabled={isLoading}
                      className="bg-gradient-to-r from-gray-900/60 to-black/60 backdrop-blur-sm border-gray-700/50 focus:border-purple-400/50 focus:ring-2 focus:ring-purple-400/30 pl-10 py-6 text-white placeholder:text-gray-400 transition-all duration-300 hover:from-gray-800/60 hover:to-black/60"
                    />
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                </div>

                {/* Email Input */}
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
                      className="bg-gradient-to-r from-gray-900/60 to-black/60 backdrop-blur-sm border-gray-700/50 focus:border-purple-400/50 focus:ring-2 focus:ring-purple-400/30 pl-10 py-6 text-white placeholder:text-gray-400 transition-all duration-300 hover:from-gray-800/60 hover:to-black/60"
                    />
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                </div>
              </div>

              {/* Password Section */}
              <div className="space-y-4">
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
                      placeholder="Create a strong password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value)
                        checkPasswordStrength(e.target.value)
                      }}
                      required
                      disabled={isLoading}
                      className="bg-gradient-to-r from-gray-900/60 to-black/60 backdrop-blur-sm border-gray-700/50 focus:border-purple-400/50 focus:ring-2 focus:ring-purple-400/30 pl-10 py-6 text-white placeholder:text-gray-400 transition-all duration-300 hover:from-gray-800/60 hover:to-black/60"
                    />
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                  
                  {/* Password Strength Indicator */}
                  {password && (
                    <div className="space-y-2 animate-fade-in">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">Password strength:</span>
                        <span className={`font-semibold ${
                          passwordStrength === 0 ? 'text-gray-400' :
                          passwordStrength === 1 ? 'text-red-400' :
                          passwordStrength === 2 ? 'text-orange-400' :
                          passwordStrength === 3 ? 'text-yellow-400' :
                          'text-green-400'
                        }`}>
                          {getStrengthText()}
                        </span>
                      </div>
                      <div className="h-2 bg-gray-800/50 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${getStrengthColor()} transition-all duration-500 ease-out`}
                          style={{ width: `${(passwordStrength / 4) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Password Criteria */}
                {password && (
                  <div className="grid grid-cols-2 gap-2 text-sm animate-fade-in">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${passwordCriteria.length ? 'bg-green-500' : 'bg-gray-600'}`}></div>
                      <span className={`${passwordCriteria.length ? 'text-green-400' : 'text-gray-400'}`}>
                        At least 6 characters
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${passwordCriteria.uppercase ? 'bg-green-500' : 'bg-gray-600'}`}></div>
                      <span className={`${passwordCriteria.uppercase ? 'text-green-400' : 'text-gray-400'}`}>
                        Uppercase letter
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${passwordCriteria.lowercase ? 'bg-green-500' : 'bg-gray-600'}`}></div>
                      <span className={`${passwordCriteria.lowercase ? 'text-green-400' : 'text-gray-400'}`}>
                        Lowercase letter
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${passwordCriteria.number ? 'bg-green-500' : 'bg-gray-600'}`}></div>
                      <span className={`${passwordCriteria.number ? 'text-green-400' : 'text-gray-400'}`}>
                        Number
                      </span>
                    </div>
                  </div>
                )}

                {/* Confirm Password */}
                <div 
                  className={`space-y-2 transition-all duration-300 ${activeInput === 'confirmPassword' ? 'scale-[1.02]' : ''}`}
                  onFocus={() => setActiveInput('confirmPassword')}
                  onBlur={() => setActiveInput(null)}
                >
                  <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      className={`bg-gradient-to-r from-gray-900/60 to-black/60 backdrop-blur-sm border-gray-700/50 focus:border-purple-400/50 focus:ring-2 focus:ring-purple-400/30 pl-10 py-6 text-white placeholder:text-gray-400 transition-all duration-300 hover:from-gray-800/60 hover:to-black/60 ${
                        confirmPassword && password && confirmPassword !== password ? 'border-red-400/50' : ''
                      }`}
                    />
                    <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    {confirmPassword && password && confirmPassword === password && (
                      <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-green-400 animate-pulse" />
                    )}
                  </div>
                </div>
              </div>

              {/* Alerts */}
              {error && (
                <Alert 
                  variant="destructive"
                  className="bg-gradient-to-r from-red-900/20 to-red-900/10 backdrop-blur-sm border-red-700/30 animate-fade-in"
                >
                  <AlertDescription className="flex items-center gap-2 text-red-300">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert 
                  className="bg-gradient-to-r from-green-900/20 to-emerald-900/10 backdrop-blur-sm border-green-700/30 animate-fade-in"
                >
                  <AlertDescription className="flex items-center gap-2 text-green-300">
                    <CheckCircle className="w-4 h-4" />
                    {success}
                  </AlertDescription>
                </Alert>
              )}

              {/* Submit Button */}
              <Button 
                type="submit" 
                className="w-full py-6 bg-gradient-to-r from-purple-600 via-purple-500 to-pink-500 hover:from-purple-700 hover:via-purple-600 hover:to-pink-600 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] mt-6 relative overflow-hidden group"
                disabled={isLoading}
              >
                {/* Button gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-pink-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2 relative z-10">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Creating your account...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 relative z-10">
                    <span>Create Account</span>
                    <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
                  </div>
                )}
              </Button>

              {/* Login Link */}
              <div className="text-center text-sm pt-4 border-t border-gray-800/50">
                <p className="text-gray-400">
                  Already have an account?{" "}
                  <Link 
                    href="/login" 
                    className="text-cyan-300 hover:text-cyan-200 font-semibold hover:underline inline-flex items-center gap-1 transition-all duration-300 group"
                  >
                    <ArrowRight className="w-4 h-4 rotate-180 group-hover:scale-110 transition-transform" />
                    Sign in instead
                  </Link>
                </p>
              </div>

              {/* Benefits Section */}
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-400 pt-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <CheckCircle className="w-3 h-3 text-purple-400" />
                  </div>
                  <span>Unlimited tasks</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-pink-500/20 flex items-center justify-center">
                    <CheckCircle className="w-3 h-3 text-pink-400" />
                  </div>
                  <span>Team collaboration</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center">
                    <CheckCircle className="w-3 h-3 text-cyan-400" />
                  </div>
                  <span>Real-time updates</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                    <CheckCircle className="w-3 h-3 text-green-400" />
                  </div>
                  <span>Advanced analytics</span>
                </div>
              </div>
            </form>
          </CardContent>
        </div>
      </Card>
    </div>
  </div>
)
}