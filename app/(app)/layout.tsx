"use client"

import type React from "react"

import { useAuth } from "@/lib/auth-context"
import { DataProvider } from "@/lib/data-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { AppHeader } from "@/components/app-header"
import { BottomNav } from "@/components/bottom-nav"

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, router])

  if (!isAuthenticated) {
    return null
  }

  return (
    <DataProvider>
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="pb-20 pt-4">
          <div className="max-w-7xl mx-auto px-4">{children}</div>
        </main>
        <BottomNav />
      </div>
    </DataProvider>
  )
}
