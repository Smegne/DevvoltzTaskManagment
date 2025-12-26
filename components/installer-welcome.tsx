"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, Download, Cloud, Database, Shield, Zap, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

export default function InstallerWelcome() {
  const [isElectron, setIsElectron] = useState(false)
  const [showInstall, setShowInstall] = useState(false)
  const [installProgress, setInstallProgress] = useState(0)
  const [isInstalling, setIsInstalling] = useState(false)

  useEffect(() => {
    // Check if running in Electron
    setIsElectron(!!(window as any).electron)
    
    // Check if already installed
    const isInstalled = localStorage.getItem('task-app-installed')
    if (!isInstalled) {
      setShowInstall(true)
    }
  }, [])

  const handleInstall = async () => {
    setIsInstalling(true)
    
    // Simulate installation progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 200))
      setInstallProgress(i)
    }
    
    // Mark as installed
    localStorage.setItem('task-app-installed', 'true')
    
    // Redirect to dashboard after installation
    setTimeout(() => {
      window.location.href = '/dashboard'
    }, 1000)
  }

  const handleSkip = () => {
    localStorage.setItem('task-app-installed', 'true')
    setShowInstall(false)
    window.location.href = '/dashboard'
  }

  if (!showInstall) return null

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl shadow-2xl border-0">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-between items-start mb-4">
            <Badge variant="outline" className="text-sm">
              DevVoltz
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                <div className="text-white text-4xl">📋</div>
              </div>
              <div className="absolute -top-2 -right-2">
                <Badge className="bg-green-500 hover:bg-green-600">
                  NEW
                </Badge>
              </div>
            </div>
          </div>
          
          <CardTitle className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Task Management App
          </CardTitle>
          <CardDescription className="text-lg mt-2">
            Boost your productivity with our modern task management solution
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-8">
          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center space-y-3 p-4 rounded-lg border bg-white dark:bg-gray-900">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900">
                <Zap className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold">Lightning Fast</h3>
              <p className="text-sm text-muted-foreground">
                Instant task updates and real-time sync
              </p>
            </div>
            
            <div className="text-center space-y-3 p-4 rounded-lg border bg-white dark:bg-gray-900">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900">
                <Shield className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="font-semibold">Secure & Private</h3>
              <p className="text-sm text-muted-foreground">
                Your data stays on your device, always private
              </p>
            </div>
            
            <div className="text-center space-y-3 p-4 rounded-lg border bg-white dark:bg-gray-900">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900">
                <Database className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="font-semibold">Offline Ready</h3>
              <p className="text-sm text-muted-foreground">
                Work without internet, sync when connected
              </p>
            </div>
          </div>

          {/* Installation Progress */}
          {isInstalling ? (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="font-semibold mb-2">Installing Application...</h3>
                <Progress value={installProgress} className="h-2" />
                <p className="text-sm text-muted-foreground mt-2">
                  {installProgress === 100 ? "Installation complete!" : "Setting up your workspace..."}
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className={`h-4 w-4 ${installProgress >= 20 ? 'text-green-500' : 'text-gray-300'}`} />
                  <span>Creating application files</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className={`h-4 w-4 ${installProgress >= 40 ? 'text-green-500' : 'text-gray-300'}`} />
                  <span>Setting up database</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className={`h-4 w-4 ${installProgress >= 60 ? 'text-green-500' : 'text-gray-300'}`} />
                  <span>Configuring preferences</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className={`h-4 w-4 ${installProgress >= 80 ? 'text-green-500' : 'text-gray-300'}`} />
                  <span>Installing dependencies</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className={`h-4 w-4 ${installProgress >= 100 ? 'text-green-500' : 'text-gray-300'}`} />
                  <span>Launching application</span>
                </div>
              </div>
            </div>
          ) : (
            /* Installation Options */
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-semibold mb-2">Choose Installation Method</h3>
                <p className="text-muted-foreground">
                  Install as a standalone desktop app for the best experience
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Desktop App */}
                <Card className="border-2 border-primary">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Download className="h-5 w-5" />
                      Desktop App
                    </CardTitle>
                    <CardDescription>
                      Recommended for daily use
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Works offline
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Faster performance
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Desktop notifications
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        System tray integration
                      </li>
                    </ul>
                    
                    {isElectron ? (
                      <Button className="w-full" onClick={handleInstall}>
                        Install Now
                      </Button>
                    ) : (
                      <div className="space-y-2">
                        <Button className="w-full" disabled>
                          Already Running in Desktop
                        </Button>
                        <p className="text-xs text-center text-muted-foreground">
                          You're already using the desktop version
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Web Version */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Cloud className="h-5 w-5" />
                      Web Version
                    </CardTitle>
                    <CardDescription>
                      Use in your browser
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        No installation needed
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Access from any device
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Always up to date
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Share with team members
                      </li>
                    </ul>
                    
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={handleSkip}
                    >
                      Continue in Browser
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* System Requirements */}
              <div className="text-center text-sm text-muted-foreground">
                <p>System Requirements: Windows 10+, macOS 10.14+, or Ubuntu 18.04+</p>
                <p className="mt-1">Disk Space: ~150MB • Memory: 512MB RAM</p>
              </div>
            </div>
          )}
          
          {/* Footer */}
          <div className="text-center text-xs text-muted-foreground pt-4 border-t">
            <p>By installing, you agree to our Terms of Service and Privacy Policy</p>
            <p className="mt-1">© 2025 DevVoltz. Task Management App v1.0.0</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}