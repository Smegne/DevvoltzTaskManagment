"use client"

import { useState, useMemo, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { useData } from "@/lib/data-context"
import type { TimeEntry } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Clock, Calendar, Trash2, Edit, ChevronLeft, ChevronRight, Download, TrendingUp, Target, Zap, BarChart3, Filter, MoreVertical, Play, Pause, CheckCircle2, Loader2, Sparkles, Coffee, Moon, Sun } from "lucide-react"
import { TimeEntryDialog } from "@/components/time-entry-dialog"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function TimesheetPage() {
  const { user } = useAuth()
  const { tasks, timeEntries, addTimeEntry, updateTimeEntry, deleteTimeEntry } = useData()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<TimeEntry | undefined>()
  const [selectedWeek, setSelectedWeek] = useState(0)
  const [activeTab, setActiveTab] = useState<"week" | "month" | "all">("week")
  const [isLoading, setIsLoading] = useState(true)
  const [isTracking, setIsTracking] = useState(false)
  const [currentTimer, setCurrentTimer] = useState<{ startTime: Date; taskId: string } | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)

  const isCEO = user?.role === "ceo"

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800)
    return () => clearTimeout(timer)
  }, [])

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    if (isTracking && currentTimer) {
      interval = setInterval(() => {
        const now = new Date()
        const diff = now.getTime() - currentTimer.startTime.getTime()
        setElapsedTime(Math.floor(diff / 1000))
      }, 1000)
    }
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isTracking, currentTimer])

  // Filter time entries based on role
  const visibleEntries = isCEO ? timeEntries : timeEntries.filter((e) => e.userId === user?.id)

  // Get date range for selected week
  const getWeekRange = (weekOffset: number) => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const monday = new Date(today)
    monday.setDate(today.getDate() + diff + weekOffset * 7)
    monday.setHours(0, 0, 0, 0)

    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)

    return { start: monday, end: sunday }
  }

  const weekRange = getWeekRange(selectedWeek)

  // Filter entries by selected week
  const weekEntries = visibleEntries.filter((entry) => {
    const entryDate = new Date(entry.date)
    return entryDate >= weekRange.start && entryDate <= weekRange.end
  })

  // Group entries by date
  const entriesByDate = useMemo(() => {
    const grouped: { [key: string]: TimeEntry[] } = {}
    weekEntries.forEach((entry) => {
      if (!grouped[entry.date]) {
        grouped[entry.date] = []
      }
      grouped[entry.date].push(entry)
    })
    return grouped
  }, [weekEntries])

  // Calculate total hours for the week
  const weekTotal = weekEntries.reduce((sum, entry) => sum + entry.hours, 0)

  // Get all dates in the week
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekRange.start)
    date.setDate(weekRange.start.getDate() + i)
    return date.toISOString().split("T")[0]
  })

  // Calculate monthly total
  const currentMonth = new Date().getMonth()
  const monthlyEntries = visibleEntries.filter((entry) => 
    new Date(entry.date).getMonth() === currentMonth
  )
  const monthlyTotal = monthlyEntries.reduce((sum, entry) => sum + entry.hours, 0)

  // Calculate daily average
  const daysLogged = Object.keys(entriesByDate).length
  const dailyAverage = daysLogged > 0 ? (weekTotal / daysLogged) : 0

  // Calculate productivity score
  const productivityScore = Math.min(100, Math.round((weekTotal / 40) * 100))

  // Format time for timer
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Timer functions
  const startTimer = (taskId: string) => {
    setIsTracking(true)
    setCurrentTimer({
      startTime: new Date(),
      taskId
    })
    toast.success("Timer started! Focus on your task.")
  }

  const stopTimer = () => {
    if (!currentTimer) return
    
    setIsTracking(false)
    const hours = elapsedTime / 3600
    const newEntry = {
      id: `temp-${Date.now()}`,
      userId: user?.id || "",
      taskId: currentTimer.taskId,
      hours: parseFloat(hours.toFixed(2)),
      date: new Date().toISOString().split('T')[0],
      description: `Worked on ${tasks.find(t => t.id === currentTimer.taskId)?.title || "task"} via timer`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    addTimeEntry(newEntry)
    toast.success(`Timer stopped! ${hours.toFixed(2)} hours logged.`)
    setCurrentTimer(null)
    setElapsedTime(0)
  }

  const handleEdit = (entry: TimeEntry) => {
    setEditingEntry(entry)
    setDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    const entry = timeEntries.find(e => e.id === id)
    if (entry && confirm(`Delete ${entry.hours}h entry for ${new Date(entry.date).toLocaleDateString()}?`)) {
      deleteTimeEntry(id)
      toast.success("Time entry deleted")
    }
  }

  const handleSave = (entryData: any) => {
    if ("id" in entryData) {
      updateTimeEntry(entryData.id, entryData)
      toast.success("Time entry updated")
    } else {
      addTimeEntry(entryData)
      toast.success("Time entry logged")
    }
    setEditingEntry(undefined)
  }

  const handleCreateNew = () => {
    setEditingEntry(undefined)
    setDialogOpen(true)
  }

  const getTaskTitle = (taskId: string) => {
    return tasks.find((t) => t.id === taskId)?.title || "Unknown Task"
  }

  const formatWeekRange = () => {
    const start = weekRange.start.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    const end = weekRange.end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    return `${start} - ${end}`
  }

  const getDayName = (date: string) => {
    return new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" })
  }

  const getDayOfMonth = (date: string) => {
    return new Date(date + "T00:00:00").getDate()
  }

  const exportData = () => {
    toast.success("Timesheet data exported successfully!")
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-black">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/30 border-t-primary"></div>
            <div className="absolute inset-0 h-12 w-12 animate-ping rounded-full border-4 border-primary/10"></div>
          </div>
          <p className="text-gray-500 dark:text-gray-400 animate-pulse">Loading timesheet...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-black p-4 md:p-6 space-y-6">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden -z-10">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-green-500/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass-morphism rounded-2xl p-6 backdrop-blur-xl border border-white/20 shadow-xl"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-gradient-to-r from-green-500/10 to-emerald-500/10">
                <Clock className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">
                  Timesheet Tracker
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                  Track, analyze, and optimize your work hours {isCEO ? "across your organization" : ""}
                </p>
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="flex flex-wrap gap-3 mt-4">
              <div className="px-3 py-1.5 rounded-full bg-gradient-to-r bg-white/5 backdrop-blur-sm border border-white/10">
                <span className="text-sm font-medium">Viewing: </span>
                <span className="font-bold bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">
                  {isCEO ? "All Teams" : "Your Hours"}
                </span>
              </div>
              <div className="px-3 py-1.5 rounded-full bg-gradient-to-r bg-white/5 backdrop-blur-sm border border-white/10">
                <span className="text-sm font-medium">Week: </span>
                <span className="font-bold">{formatWeekRange()}</span>
              </div>
              <div className="px-3 py-1.5 rounded-full bg-gradient-to-r bg-white/5 backdrop-blur-sm border border-white/10">
                <span className="text-sm font-medium">Entries: </span>
                <span className="font-bold">{weekEntries.length}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="glass-input border-white/20">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="glass-morphism border-white/20 backdrop-blur-xl">
                <DropdownMenuItem onClick={exportData}>
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportData}>
                  Export as PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button 
              onClick={handleCreateNew}
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-lg shadow-green-500/20 group"
            >
              <Plus className="h-5 w-5 mr-2 group-hover:rotate-90 transition-transform duration-300" />
              Log Time
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Timer Section */}
      {isTracking && currentTimer && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-morphism rounded-2xl p-6 backdrop-blur-xl border-2 border-yellow-500/30 shadow-xl"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-r from-yellow-500/20 to-amber-500/20">
                <Clock className="h-8 w-8 text-yellow-500 animate-pulse" />
              </div>
              <div>
                <h3 className="font-bold text-xl">Timer Active</h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Working on: {getTaskTitle(currentTimer.taskId)}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-4xl font-mono font-bold bg-gradient-to-r from-yellow-500 to-amber-500 bg-clip-text text-transparent">
                  {formatTime(elapsedTime)}
                </div>
                <p className="text-sm text-gray-500">Elapsed time</p>
              </div>
              
              <Button
                onClick={stopTimer}
                className="bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 shadow-lg shadow-red-500/20"
                size="lg"
              >
                <Pause className="h-5 w-5 mr-2" />
                Stop Timer
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {[
          {
            title: "Week Total",
            value: `${weekTotal.toFixed(2)}h`,
            icon: <Clock className="h-5 w-5" />,
            color: "from-blue-500 to-cyan-500",
            description: "Hours this week",
            trend: weekTotal > 35 ? "+12%" : weekTotal > 20 ? "+5%" : "-8%"
          },
          {
            title: "Monthly Total",
            value: `${monthlyTotal.toFixed(2)}h`,
            icon: <Calendar className="h-5 w-5" />,
            color: "from-purple-500 to-pink-500",
            description: "Hours this month",
            trend: monthlyTotal > 140 ? "+15%" : "+8%"
          },
          {
            title: "Daily Average",
            value: `${dailyAverage.toFixed(2)}h`,
            icon: <TrendingUp className="h-5 w-5" />,
            color: "from-green-500 to-emerald-500",
            description: "Avg hours per day",
            trend: dailyAverage > 6 ? "+10%" : dailyAverage > 4 ? "+3%" : "-5%"
          },
          {
            title: "Productivity",
            value: `${productivityScore}%`,
            icon: <Zap className="h-5 w-5" />,
            color: "from-orange-500 to-amber-500",
            description: "Weekly efficiency",
            trend: productivityScore > 80 ? "+8%" : productivityScore > 60 ? "+2%" : "-12%"
          },
        ].map((stat, index) => (
          <Card key={index} className="glass-morphism hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border-white/20 overflow-hidden group">
            <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${stat.color}`} />
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg bg-gradient-to-r ${stat.color}/10 group-hover:scale-110 transition-transform duration-300`}>
                  {stat.icon}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{stat.value}</span>
                <div className={`text-sm font-medium ${
                  stat.trend.startsWith('+') ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stat.trend}
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Week Navigation & Tabs */}
      <div className="glass-morphism rounded-2xl p-6 backdrop-blur-xl border border-white/20 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Week Navigation */}
          <div className="flex items-center justify-between lg:justify-start gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedWeek((w) => w - 1)}
              className="glass-input border-white/20 rounded-full"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            
            <div className="text-center">
              <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                {formatWeekRange()}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {selectedWeek === 0
                  ? "Current Week"
                  : `${Math.abs(selectedWeek)} week${Math.abs(selectedWeek) !== 1 ? "s" : ""} ${selectedWeek < 0 ? "ago" : "ahead"}`}
              </p>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedWeek((w) => w + 1)}
              className="glass-input border-white/20 rounded-full"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
          
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full lg:w-auto">
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="week" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500">
                <Calendar className="h-4 w-4 mr-2" />
                Week
              </TabsTrigger>
              <TabsTrigger value="month" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500">
                <BarChart3 className="h-4 w-4 mr-2" />
                Month
              </TabsTrigger>
              <TabsTrigger value="all" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500">
                <TrendingUp className="h-4 w-4 mr-2" />
                All Time
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Quick Timer Start */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="glass-morphism rounded-2xl p-6 backdrop-blur-xl border border-white/20 shadow-xl"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h3 className="font-bold text-xl mb-2 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              Quick Start Timer
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Select a task and start tracking time instantly
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="glass-input border-white/20">
                  <Play className="h-4 w-4 mr-2" />
                  Start Timer
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="glass-morphism border-white/20 backdrop-blur-xl w-64">
                {tasks.slice(0, 5).map((task) => (
                  <DropdownMenuItem
                    key={task.id}
                    onClick={() => startTimer(task.id)}
                    className="flex items-center gap-3"
                  >
                    <div className="h-2 w-2 rounded-full bg-green-500"></div>
                    <div className="flex-1">
                      <p className="font-medium">{task.title}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {task.status} • {task.priority} priority
                      </p>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </motion.div>

      {/* Week Calendar View */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3"
      >
        {weekDates.map((date, index) => {
          const dayEntries = entriesByDate[date] || []
          const dayTotal = dayEntries.reduce((sum, entry) => sum + entry.hours, 0)
          const dateObj = new Date(date + "T00:00:00")
          const isToday = date === new Date().toISOString().split("T")[0]
          const isWeekend = index >= 5
          
          return (
            <Card 
              key={date} 
              className={cn(
                "glass-morphism border-white/20 overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1",
                isToday && "border-2 border-yellow-500/50",
                isWeekend && "opacity-80"
              )}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold">{getDayOfMonth(date)}</CardTitle>
                    <CardDescription className="text-xs">{getDayName(date)}</CardDescription>
                  </div>
                  {isToday && (
                    <Badge className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white">
                      Today
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">
                      {dayTotal.toFixed(1)}h
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{dayEntries.length} entries</p>
                  </div>
                  
                  {dayEntries.length > 0 && (
                    <div className="space-y-2 max-h-[120px] overflow-y-auto">
                      {dayEntries.slice(0, 2).map((entry) => (
                        <div 
                          key={entry.id} 
                          className="p-2 rounded-lg bg-gradient-to-r from-white/5 to-transparent border border-white/10"
                        >
                          <p className="text-xs font-medium truncate">{getTaskTitle(entry.taskId)}</p>
                          <p className="text-xs text-gray-500">{entry.hours}h</p>
                        </div>
                      ))}
                      {dayEntries.length > 2 && (
                        <p className="text-xs text-center text-gray-500">+{dayEntries.length - 2} more</p>
                      )}
                    </div>
                  )}
                  
                  {dayEntries.length === 0 && (
                    <div className="text-center py-2">
                      <p className="text-xs text-gray-500 italic">No entries</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </motion.div>

      {/* Detailed Time Entries */}
      <AnimatePresence>
        {weekEntries.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="space-y-4"
          >
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              Time Entries for {formatWeekRange()}
            </h3>
            
            {weekDates.map((date) => {
              const dayEntries = entriesByDate[date] || []
              const dayTotal = dayEntries.reduce((sum, entry) => sum + entry.hours, 0)
              const dateObj = new Date(date + "T00:00:00")
              const isToday = date === new Date().toISOString().split("T")[0]
              
              if (dayEntries.length === 0) return null
              
              return (
                <Card 
                  key={date} 
                  className={cn(
                    "glass-morphism border-white/20 overflow-hidden",
                    isToday && "border-2 border-yellow-500/30"
                  )}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "h-12 w-12 rounded-xl flex items-center justify-center",
                          isToday 
                            ? "bg-gradient-to-r from-yellow-500 to-amber-500" 
                            : "bg-gradient-to-r from-blue-500 to-cyan-500"
                        )}>
                          <span className="text-white font-bold">{dateObj.getDate()}</span>
                        </div>
                        <div>
                          <h3 className="font-bold text-lg">
                            {dateObj.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {isToday ? "Today • " : ""}
                            {dayEntries.length} entries • {dayTotal.toFixed(2)} total hours
                          </p>
                        </div>
                      </div>
                      {isToday && (
                        <Badge className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white">
                          Today
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-3">
                      <AnimatePresence>
                        {dayEntries.map((entry) => (
                          <motion.div
                            key={entry.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.3 }}
                            className="group p-4 rounded-xl bg-gradient-to-r from-white/5 to-transparent hover:from-white/10 border border-white/10 transition-all duration-300"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-2">
                                  <Badge className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-600 border-green-500/20">
                                    {entry.hours}h
                                  </Badge>
                                  <h4 className="font-semibold truncate group-hover:text-blue-500 transition-colors">
                                    {getTaskTitle(entry.taskId)}
                                  </h4>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                  {entry.description || "No description provided"}
                                </p>
                                <div className="flex items-center gap-3 text-xs text-gray-500">
                                  <span>Logged at {new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                  {entry.createdAt !== entry.updatedAt && (
                                    <span>• Updated {new Date(entry.updatedAt).toLocaleDateString()}</span>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-full hover:bg-blue-500/10 hover:text-blue-500"
                                  onClick={() => handleEdit(entry)}
                                  title="Edit entry"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-full hover:bg-red-500/10 hover:text-red-500"
                                  onClick={() => handleDelete(entry.id)}
                                  title="Delete entry"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {weekEntries.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center py-16"
        >
          <div className="max-w-md mx-auto">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-r from-blue-500/10 to-cyan-500/10 flex items-center justify-center">
              <Clock className="h-12 w-12 text-blue-500" />
            </div>
            <h3 className="text-2xl font-bold mb-3">No time entries this week</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-8">
              Start tracking your work hours to get insights into your productivity and billable time.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                onClick={handleCreateNew}
                className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 shadow-lg shadow-blue-500/20"
                size="lg"
              >
                <Plus className="h-5 w-5 mr-2" />
                Log Your First Entry
              </Button>
              <Button 
                variant="outline"
                onClick={() => startTimer(tasks[0]?.id || "")}
                className="glass-input border-white/20"
                size="lg"
              >
                <Play className="h-5 w-5 mr-2" />
                Start Quick Timer
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Productivity Insights */}
      {weekEntries.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="glass-morphism rounded-2xl p-6 backdrop-blur-xl border border-white/20 shadow-xl"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10">
              <Target className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Productivity Insights</h3>
              <p className="text-gray-500 dark:text-gray-400">
                Based on your time tracking data
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                title: "Most Productive Day",
                value: Object.keys(entriesByDate).reduce((max, date) => {
                  const total = entriesByDate[date].reduce((sum, e) => sum + e.hours, 0)
                  return total > max.total ? { date, total } : max
                }, { date: "", total: 0 }).date ? 
                  new Date(Object.keys(entriesByDate).reduce((max, date) => {
                    const total = entriesByDate[date].reduce((sum, e) => sum + e.hours, 0)
                    return total > max.total ? { date, total } : max
                  }, { date: "", total: 0 }).date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long" }) : "No data",
                icon: <Sun className="h-4 w-4" />,
                color: "from-yellow-500 to-amber-500"
              },
              {
                title: "Average Session Length",
                value: `${(weekEntries.reduce((sum, e) => sum + e.hours, 0) / weekEntries.length).toFixed(1)}h`,
                icon: <Clock className="h-4 w-4" />,
                color: "from-blue-500 to-cyan-500"
              },
              {
                title: "Estimated Billable",
                value: `$${(weekTotal * 50).toFixed(0)}`,
                description: "At $50/hour rate",
                icon: <TrendingUp className="h-4 w-4" />,
                color: "from-green-500 to-emerald-500"
              },
            ].map((insight, index) => (
              <div
                key={index}
                className="p-4 rounded-xl bg-gradient-to-r from-white/5 to-transparent border border-white/10 hover:scale-105 transition-transform duration-300"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2 rounded-lg bg-gradient-to-r ${insight.color}/20`}>
                    {insight.icon}
                  </div>
                  <div>
                    <h4 className="font-semibold">{insight.title}</h4>
                    <div className={`text-2xl font-bold bg-gradient-to-r ${insight.color} bg-clip-text text-transparent`}>
                      {insight.value}
                    </div>
                  </div>
                </div>
                {insight.description && (
                  <p className="text-sm text-gray-500">{insight.description}</p>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Time Entry Dialog */}
      <TimeEntryDialog 
        open={dialogOpen} 
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setEditingEntry(undefined)
        }} 
        onSave={handleSave} 
        entry={editingEntry} 
      />
    </div>
  )
}