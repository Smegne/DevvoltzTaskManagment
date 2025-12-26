import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Download, Smartphone, Monitor, CheckCircle, Globe, Shield } from 'lucide-react'
import Link from 'next/link'

export default function DownloadPage() {
  const features = [
    {
      icon: <Monitor className="h-6 w-6" />,
      title: "Desktop Application",
      description: "Native experience for Windows, Mac, and Linux"
    },
    {
      icon: <Smartphone className="h-6 w-6" />,
      title: "Mobile App",
      description: "Install as PWA on Android/iOS or download APK"
    },
    {
      icon: <Globe className="h-6 w-6" />,
      title: "Web Version",
      description: "Access from any browser, any device"
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Secure & Private",
      description: "Your data stays on your device"
    },
    {
      icon: <CheckCircle className="h-6 w-6" />,
      title: "Offline Mode",
      description: "Work without internet connection"
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Get <span className="text-primary">DevVoltz Task Manager</span>
            </h1>
            <p className="text-xl text-muted-foreground">
              Available on all your devices. Install once, sync everywhere.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {features.map((feature, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="p-3 bg-primary/10 rounded-lg w-fit mb-4">
                    <div className="text-primary">
                      {feature.icon}
                    </div>
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Download Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Web App */}
            <Card className="border-2">
              <CardContent className="p-8">
                <div className="text-center mb-6">
                  <div className="inline-flex p-4 bg-blue-100 dark:bg-blue-900 rounded-full mb-4">
                    <Globe className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Web App</h3>
                  <p className="text-muted-foreground mb-6">
                    Use directly in your browser
                  </p>
                </div>
                <div className="space-y-4">
                  <Button className="w-full" size="lg" asChild>
                    <Link href="/">
                      Open Web App
                    </Link>
                  </Button>
                  <p className="text-sm text-muted-foreground text-center">
                    No installation required
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Desktop App */}
            <Card className="border-2 border-primary">
              <CardContent className="p-8">
                <div className="text-center mb-6">
                  <div className="inline-flex p-4 bg-primary/10 rounded-full mb-4">
                    <Download className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Desktop App</h3>
                  <p className="text-muted-foreground mb-6">
                    Native experience for your OS
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    <Button variant="outline" className="w-full" asChild>
                      <a href="/downloads/DevVoltz-Task-Manager-Windows.exe" download>
                        Windows
                      </a>
                    </Button>
                    <Button variant="outline" className="w-full" asChild>
                      <a href="/downloads/DevVoltz-Task-Manager-Mac.dmg" download>
                        macOS
                      </a>
                    </Button>
                    <Button variant="outline" className="w-full" asChild>
                      <a href="/downloads/DevVoltz-Task-Manager-Linux.AppImage" download>
                        Linux
                      </a>
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground text-center">
                    Version 1.0.0 • 50MB
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Mobile Instructions */}
          <Card className="mt-8">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold mb-6 text-center">Mobile Installation</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <Smartphone className="h-5 w-5 text-green-600" />
                    Android APK
                  </h4>
                  <ol className="space-y-3 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="font-bold">1.</span>
                      <span>Download the APK file below</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold">2.</span>
                      <span>Enable "Install from unknown sources" in settings</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold">3.</span>
                      <span>Open the downloaded APK file</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold">4.</span>
                      <span>Follow installation prompts</span>
                    </li>
                  </ol>
                  <Button className="w-full mt-6" size="lg" asChild>
                    <a href="/downloads/devvoltz-task-app.apk" download>
                      Download APK (Android)
                    </a>
                  </Button>
                </div>
                <div>
                  <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <Smartphone className="h-5 w-5 text-blue-600" />
                    iOS PWA
                  </h4>
                  <ol className="space-y-3 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="font-bold">1.</span>
                      <span>Open Safari browser</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold">2.</span>
                      <span>Navigate to our web app</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold">3.</span>
                      <span>Tap the Share button</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold">4.</span>
                      <span>Select "Add to Home Screen"</span>
                    </li>
                  </ol>
                  <Button className="w-full mt-6" size="lg" asChild>
                    <Link href="/">
                      Open in Safari
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center mt-12 text-muted-foreground">
            <p>Need help? <Link href="/support" className="text-primary hover:underline">Contact Support</Link></p>
            <p className="text-sm mt-2">Version 1.0.0 • Built with Next.js & Electron</p>
          </div>
        </div>
      </div>
    </div>
  )
}