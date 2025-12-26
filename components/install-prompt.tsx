"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { X, Download, Smartphone, Monitor } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

declare global {
  interface Window {
    deferredPrompt: any;
  }
}

export function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // Check if running as standalone PWA
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches)

    // Check if iOS
    const userAgent = window.navigator.userAgent.toLowerCase()
    setIsIOS(/iphone|ipad|ipod/.test(userAgent))

    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      window.deferredPrompt = e
      
      // Show prompt after 5 seconds
      setTimeout(() => {
        const hasSeenPrompt = localStorage.getItem('hasSeenInstallPrompt')
        if (!hasSeenPrompt && !isStandalone) {
          setShowPrompt(true)
        }
      }, 5000)
    })

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowPrompt(false)
    }
  }, [])

  const handleInstall = async () => {
    if (window.deferredPrompt) {
      window.deferredPrompt.prompt()
      const { outcome } = await window.deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        localStorage.setItem('hasSeenInstallPrompt', 'true')
      }
      
      window.deferredPrompt = null
      setShowPrompt(false)
    }
  }

  const handleDismiss = () => {
    localStorage.setItem('hasSeenInstallPrompt', 'true')
    setShowPrompt(false)
  }

  if (!showPrompt || isStandalone) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5 duration-300">
      <Card className="w-80 shadow-2xl border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Download className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Install DevVoltz Task App</h3>
                <p className="text-sm text-muted-foreground">
                  {isIOS ? 'Add to Home Screen' : 'Install as app'}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-sm">
              <Monitor className="h-4 w-4 text-muted-foreground" />
              <span>Works offline</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Smartphone className="h-4 w-4 text-muted-foreground" />
              <span>Fast & responsive</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Download className="h-4 w-4 text-muted-foreground" />
              <span>Automatic updates</span>
            </div>
          </div>

          {isIOS ? (
            <div className="text-xs text-muted-foreground mb-3">
              Tap <span className="font-semibold">Share</span> →{' '}
              <span className="font-semibold">Add to Home Screen</span>
            </div>
          ) : (
            <Button onClick={handleInstall} className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Install Now
            </Button>
          )}

          <div className="text-xs text-muted-foreground mt-3 text-center">
            Available for Windows, Mac, Linux & Android
          </div>
        </CardContent>
      </Card>
    </div>
  )
}