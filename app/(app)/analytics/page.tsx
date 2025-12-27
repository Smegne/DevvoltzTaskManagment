"use client"

import { useMemo, useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { useData } from "@/lib/data-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { BarChart3, TrendingUp, Clock, CheckCircle2, AlertCircle, Target, Users, Zap, ArrowUpRight, ArrowDownRight, Filter, Calendar, PieChart as PieChartIcon, BarChart as BarChartIcon, Download, RefreshCw, Sparkles, Activity, Target as TargetIcon, Loader2 } from "lucide-react"
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Legend,
  Area,
  AreaChart,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

export default function AnalyticsPage() {
  const { user } = useAuth()
  const { projects, tasks, timeEntries } = useData()
  const [timeRange, setTimeRange] = useState("30days")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")
  const [isLoading, setIsLoading] = useState(true)

  // Simulate loading state
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000)
    return () => clearTimeout(timer)
  }, [])

  const isCEO = user?.role === "ceo"

  // Normalize user id to string to avoid type issues when comparing/includes with arrays
  const userIdStr = String(user?.id ?? "")

  // Filter data based on role
  const visibleTasks = isCEO ? tasks : tasks.filter((t) => t.assignedTo.includes(userIdStr))
  const visibleProjects = isCEO ? projects : projects.filter((p) => p.teamMembers.includes(userIdStr))
  const visibleTimeEntries = isCEO ? timeEntries : timeEntries.filter((e) => String(e.userId) === userIdStr)

  // Calculate analytics with enhanced metrics
  const analytics = useMemo(() => {
    if (!user || isLoading) {
      return {
        completionRate: 0,
        statusDistribution: [],
        priorityDistribution: [],
        avgProjectProgress: 0,
        totalHours: 0,
        recentHours: 0,
        topTasks: [],
        weeklyHours: [],
        efficiencyScore: 0,
        productivityTrend: 0,
        teamPerformance: [],
        overdueTasks: 0,
        predictedCompletion: 0,
        taskComplexity: [],
        projectTimeline: [],
      }
    }

    // Task completion rate
    const completedTasks = visibleTasks.filter((t) => t.status === "completed").length
    const completionRate = visibleTasks.length > 0 ? (completedTasks / visibleTasks.length) * 100 : 0

    // Task status distribution
    const statusDistribution = [
      { name: "To Do", value: visibleTasks.filter((t) => t.status === "todo").length, color: "#8b5cf6" },
      {
        name: "In Progress",
        value: visibleTasks.filter((t) => t.status === "in-progress").length,
        color: "#3b82f6",
      },
      { name: "Review", value: visibleTasks.filter((t) => t.status === "review").length, color: "#f59e0b" },
      {
        name: "Completed",
        value: visibleTasks.filter((t) => t.status === "completed").length,
        color: "#10b981",
      },
      { name: "Paused", value: visibleTasks.filter((t) => t.status === "paused").length, color: "#ec4899" },
    ]

    // Priority distribution with colors
    const priorityDistribution = [
      {
        name: "Low",
        count: visibleTasks.filter((t) => t.priority === "low" && t.status !== "completed").length,
        color: "#10b981",
        fill: "rgba(16, 185, 129, 0.2)",
      },
      {
        name: "Medium",
        count: visibleTasks.filter((t) => t.priority === "medium" && t.status !== "completed").length,
        color: "#f59e0b",
        fill: "rgba(245, 158, 11, 0.2)",
      },
      {
        name: "High",
        count: visibleTasks.filter((t) => t.priority === "high" && t.status !== "completed").length,
        color: "#ef4444",
        fill: "rgba(239, 68, 68, 0.2)",
      },
      {
        name: "Urgent",
        count: visibleTasks.filter((t) => t.priority === "urgent" && t.status !== "completed").length,
        color: "#dc2626",
        fill: "rgba(220, 38, 38, 0.2)",
      },
    ]

    // Project progress
    const avgProjectProgress =
      visibleProjects.length > 0 ? visibleProjects.reduce((sum, p) => sum + p.progress, 0) / visibleProjects.length : 0

    // Time tracking
    const totalHours = visibleTimeEntries.reduce((sum, e) => sum + e.hours, 0)
    
    // Calculate hours based on time range
    const getHoursForRange = (days: number) => {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - days)
      return visibleTimeEntries
        .filter((e) => new Date(e.date) >= cutoffDate)
        .reduce((sum, e) => sum + e.hours, 0)
    }

    const recentHours = getHoursForRange(30)

    // Efficiency score (hours per completed task)
    const efficiencyScore = completedTasks > 0 ? (recentHours / completedTasks).toFixed(1) : "0"

    // Productivity trend (compare current vs previous period)
    const currentHours = getHoursForRange(30)
    const previousHours = getHoursForRange(60) - currentHours
    const productivityTrend = previousHours > 0 ? ((currentHours - previousHours) / previousHours) * 100 : 0

    // Overdue tasks
    const overdueTasks = visibleTasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "completed"
    ).length

    // Predicted completion based on current rate
    const tasksRemaining = visibleTasks.length - completedTasks
    const predictedCompletion = tasksRemaining > 0 ? (tasksRemaining / (completedTasks / 30)) : 0

    // Hours by task (top 5) with gradient colors
    const hoursByTask: { [key: string]: number } = {}
    visibleTimeEntries.forEach((entry) => {
      hoursByTask[entry.taskId] = (hoursByTask[entry.taskId] || 0) + entry.hours
    })
    const topTasks = Object.entries(hoursByTask)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([taskId, hours], index) => ({
        name: tasks.find((t) => t.id === taskId)?.title.substring(0, 20) || "Unknown",
        hours: Math.round(hours * 10) / 10,
        color: `hsl(${index * 70}, 70%, 60%)`,
      }))

    // Weekly hours trend (last 8 weeks)
    const weeklyHours = []
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - i * 7)
      weekStart.setHours(0, 0, 0, 0)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      weekEnd.setHours(23, 59, 59, 999)

      const hours = visibleTimeEntries
        .filter((e) => {
          const date = new Date(e.date)
          return date >= weekStart && date <= weekEnd
        })
        .reduce((sum, e) => sum + e.hours, 0)

      weeklyHours.push({
        week: `W${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
        hours: Math.round(hours * 10) / 10,
        target: 40, // Target hours per week
      })
    }

    // Team performance (if CEO)
    const teamPerformance = isCEO ? [
      { name: "Efficiency", value: 85, fullMark: 100 },
      { name: "Quality", value: 90, fullMark: 100 },
      { name: "Timeliness", value: 78, fullMark: 100 },
      { name: "Collaboration", value: 92, fullMark: 100 },
      { name: "Innovation", value: 80, fullMark: 100 },
    ] : []

    // Task complexity distribution
    const taskComplexity = [
      { name: "Simple", value: visibleTasks.filter(t => t.priority === "low").length, color: "#10b981" },
      { name: "Moderate", value: visibleTasks.filter(t => t.priority === "medium").length, color: "#f59e0b" },
      { name: "Complex", value: visibleTasks.filter(t => t.priority === "high").length, color: "#ef4444" },
      { name: "Critical", value: visibleTasks.filter(t => t.priority === "urgent").length, color: "#dc2626" },
    ]

    // Project timeline data
    const projectTimeline = visibleProjects.slice(0, 5).map(p => ({
      name: p.name,
      progress: p.progress,
      deadline: p.deadline ? new Date(p.deadline).toLocaleDateString() : "No deadline",
      status: p.status,
    }))

    return {
      completionRate,
      statusDistribution,
      priorityDistribution,
      avgProjectProgress,
      totalHours,
      recentHours,
      topTasks,
      weeklyHours,
      efficiencyScore,
      productivityTrend,
      teamPerformance,
      overdueTasks,
      predictedCompletion,
      taskComplexity,
      projectTimeline,
      visibleTasksCount: visibleTasks.length,
      completedTasksCount: completedTasks,
      activeProjectsCount: visibleProjects.filter((p) => p.status === "active").length,
    }
  }, [user, visibleTasks, visibleProjects, visibleTimeEntries, tasks, isCEO, isLoading])

  // Handle refresh
  const handleRefresh = () => {
    setIsRefreshing(true)
    toast.success("Refreshing analytics data...")
    setTimeout(() => {
      setIsRefreshing(false)
      toast.success("Analytics updated successfully!")
    }, 1500)
  }

  // Export data
  const handleExport = () => {
    toast.success("Exporting analytics data...")
    // In a real app, this would trigger a download
  }

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-black">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/30 border-t-primary"></div>
            <div className="absolute inset-0 h-12 w-12 animate-ping rounded-full border-4 border-primary/10"></div>
          </div>
          <p className="text-gray-500 dark:text-gray-400 animate-pulse">Loading analytics dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-black p-4 md:p-6 space-y-6">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden -z-10">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
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
              <div className="p-2 rounded-xl bg-gradient-to-r from-blue-500/10 to-cyan-500/10">
                <Activity className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                  Performance Analytics
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                  Real-time insights and performance metrics for {user?.role === "ceo" ? "your organization" : "your work"}
                </p>
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="flex flex-wrap gap-3 mt-4">
              <div className="px-3 py-1.5 rounded-full bg-gradient-to-r bg-white/5 backdrop-blur-sm border border-white/10">
                <span className="text-sm font-medium">Viewing: </span>
                <span className="font-bold bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">
                  {isCEO ? "All Teams" : "Your Tasks"}
                </span>
              </div>
              <div className="px-3 py-1.5 rounded-full bg-gradient-to-r bg-white/5 backdrop-blur-sm border border-white/10">
                <span className="text-sm font-medium">Time Range: </span>
                <span className="font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                  {timeRange === "7days" ? "7 Days" : timeRange === "30days" ? "30 Days" : "90 Days"}
                </span>
              </div>
              <div className="px-3 py-1.5 rounded-full bg-gradient-to-r bg-white/5 backdrop-blur-sm border border-white/10">
                <span className="text-sm font-medium">Last Updated: </span>
                <span className="font-bold">Just now</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="glass-input border-white/20 w-[140px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent className="glass-morphism border-white/20 backdrop-blur-xl">
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="90days">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="glass-input border-white/20"
            >
              {isRefreshing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh
            </Button>

            <Button
              variant="outline"
              onClick={handleExport}
              className="glass-input border-white/20"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="glass-morphism rounded-xl p-1 backdrop-blur-xl border border-white/20"
      >
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4">
            <TabsTrigger value="overview" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500">
              <BarChart3 className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="performance" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500">
              <TrendingUp className="h-4 w-4 mr-2" />
              Performance
            </TabsTrigger>
            <TabsTrigger value="tasks" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Tasks
            </TabsTrigger>
            <TabsTrigger value="projects" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-amber-500">
              <Target className="h-4 w-4 mr-2" />
              Projects
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </motion.div>

      {/* Overview Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === "overview" && (
          <motion.div
            key="overview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            variants={containerVariants}
            className="space-y-6"
          >
            {/* Key Metrics Grid */}
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
            >
              {[
                {
                  title: "Task Completion",
                  value: `${analytics.completionRate.toFixed(1)}%`,
                  icon: <CheckCircle2 className="h-5 w-5" />,
                  color: "from-green-500 to-emerald-500",
                  trend: analytics.completionRate > 75 ? "positive" : analytics.completionRate > 50 ? "neutral" : "negative",
                  description: `${analytics.completedTasksCount} of ${analytics.visibleTasksCount} tasks`,
                  change: "+12%",
                },
                {
                  title: "Project Progress",
                  value: `${analytics.avgProjectProgress.toFixed(0)}%`,
                  icon: <Target className="h-5 w-5" />,
                  color: "from-blue-500 to-cyan-500",
                  trend: "positive",
                  description: `${analytics.activeProjectsCount} active projects`,
                  change: "+8%",
                },
                {
                  title: "Hours Logged",
                  value: `${analytics.recentHours.toFixed(1)}h`,
                  icon: <Clock className="h-5 w-5" />,
                  color: "from-purple-500 to-pink-500",
                  trend: analytics.recentHours > 160 ? "positive" : analytics.recentHours > 120 ? "neutral" : "negative",
                  description: "Last 30 days",
                  change: analytics.productivityTrend > 0 ? `+${Math.abs(analytics.productivityTrend).toFixed(1)}%` : `${Math.abs(analytics.productivityTrend).toFixed(1)}%`,
                },
                {
                  title: "Efficiency",
                  value: `${analytics.efficiencyScore}`,
                  icon: <Zap className="h-5 w-5" />,
                  color: "from-orange-500 to-amber-500",
                  trend: parseFloat(analytics.efficiencyScore) < 3 ? "positive" : "neutral",
                  description: "Hours per task",
                  change: "-5%",
                },
              ].map((metric, index) => (
                <motion.div key={index} variants={itemVariants}>
                  <Card className="glass-morphism hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border-white/20 overflow-hidden group">
                    <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${metric.color}`} />
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                          {metric.title}
                        </CardTitle>
                        <div className={`p-2 rounded-lg bg-gradient-to-r ${metric.color}/10 group-hover:scale-110 transition-transform duration-300`}>
                          {metric.icon}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold">{metric.value}</span>
                        <div className={`flex items-center gap-1 text-sm font-medium ${
                          metric.trend === "positive" ? "text-green-600" :
                          metric.trend === "negative" ? "text-red-600" : "text-yellow-600"
                        }`}>
                          {metric.trend === "positive" ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                          {metric.change}
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        {metric.description}
                      </p>
                      <div className="mt-3">
                        <Progress 
                          value={parseFloat(metric.value)} 
                          className="h-2 bg-gray-200/50 dark:bg-gray-700/50 overflow-hidden"
                        />
                        <div className={`h-full bg-gradient-to-r ${metric.color} transition-all duration-1000`} 
                          style={{ width: `${parseFloat(metric.value)}%` }} 
                        />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Task Status Distribution */}
              <motion.div
                variants={itemVariants}
              >
                <Card className="glass-morphism border-white/20 h-full">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <PieChartIcon className="h-5 w-5 text-blue-500" />
                          Task Status Distribution
                        </CardTitle>
                        <CardDescription>
                          Breakdown of all tasks by status
                        </CardDescription>
                      </div>
                      <Button variant="ghost" size="sm" className="glass-input border-white/20">
                        <Filter className="h-4 w-4 mr-2" />
                        Filter
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={analytics.statusDistribution}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => 
                              percent > 0.05 ? `${name}: ${(percent * 100).toFixed(0)}%` : ""
                            }
                            outerRadius={80}
                            innerRadius={40}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {analytics.statusDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={2} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ 
                              background: 'rgba(255, 255, 255, 0.1)',
                              backdropFilter: 'blur(10px)',
                              border: '1px solid rgba(255, 255, 255, 0.2)',
                              borderRadius: '8px'
                            }}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Weekly Hours Trend */}
              <motion.div
                variants={itemVariants}
              >
                <Card className="glass-morphism border-white/20 h-full">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <BarChartIcon className="h-5 w-5 text-green-500" />
                          Weekly Hours Trend
                        </CardTitle>
                        <CardDescription>
                          Hours logged over the last 8 weeks
                        </CardDescription>
                      </div>
                      <Select value="hours" onValueChange={() => {}}>
                        <SelectTrigger className="glass-input border-white/20 w-[100px]">
                          <SelectValue placeholder="Hours" />
                        </SelectTrigger>
                        <SelectContent className="glass-morphism border-white/20 backdrop-blur-xl">
                          <SelectItem value="hours">Hours</SelectItem>
                          <SelectItem value="tasks">Tasks</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={analytics.weeklyHours}>
                          <defs>
                            <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                          <XAxis dataKey="week" stroke="rgba(255, 255, 255, 0.5)" />
                          <YAxis stroke="rgba(255, 255, 255, 0.5)" />
                          <Tooltip 
                            contentStyle={{ 
                              background: 'rgba(255, 255, 255, 0.1)',
                              backdropFilter: 'blur(10px)',
                              border: '1px solid rgba(255, 255, 255, 0.2)',
                              borderRadius: '8px'
                            }}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="hours" 
                            stroke="#3b82f6" 
                            fillOpacity={1} 
                            fill="url(#colorHours)" 
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Priority Distribution & Top Tasks */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <motion.div
                variants={itemVariants}
              >
                <Card className="glass-morphism border-white/20 h-full">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-red-500" />
                      Active Tasks by Priority
                    </CardTitle>
                    <CardDescription>
                      Priority levels of incomplete tasks
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics.priorityDistribution}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                          <XAxis dataKey="name" stroke="rgba(255, 255, 255, 0.5)" />
                          <YAxis stroke="rgba(255, 255, 255, 0.5)" />
                          <Tooltip 
                            contentStyle={{ 
                              background: 'rgba(255, 255, 255, 0.1)',
                              backdropFilter: 'blur(10px)',
                              border: '1px solid rgba(255, 255, 255, 0.2)',
                              borderRadius: '8px'
                            }}
                          />
                          <Bar 
                            dataKey="count" 
                            radius={[8, 8, 0, 0]}
                            shape={(props: any) => {
                              const { x, y, width, height, fill } = props;
                              return (
                                <g>
                                  <rect
                                    x={x}
                                    y={y}
                                    width={width}
                                    height={height}
                                    fill={fill}
                                    rx={8}
                                    ry={8}
                                  />
                                  <linearGradient
                                    id="priorityGradient"
                                    x1="0"
                                    y1="0"
                                    x2="0"
                                    y2="1"
                                  >
                                    <stop offset="0%" stopColor={fill} stopOpacity={0.8} />
                                    <stop offset="100%" stopColor={fill} stopOpacity={0.2} />
                                  </linearGradient>
                                </g>
                              );
                            }}
                          >
                            {analytics.priorityDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                variants={itemVariants}
              >
                <Card className="glass-morphism border-white/20 h-full">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-yellow-500" />
                      Top Tasks by Hours
                    </CardTitle>
                    <CardDescription>
                      Most time-consuming tasks
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics.topTasks} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                          <XAxis type="number" stroke="rgba(255, 255, 255, 0.5)" />
                          <YAxis 
                            dataKey="name" 
                            type="category" 
                            width={100} 
                            stroke="rgba(255, 255, 255, 0.5)"
                            tick={{ fontSize: 12 }}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              background: 'rgba(255, 255, 255, 0.1)',
                              backdropFilter: 'blur(10px)',
                              border: '1px solid rgba(255, 255, 255, 0.2)',
                              borderRadius: '8px'
                            }}
                          />
                          <Bar 
                            dataKey="hours" 
                            radius={[0, 8, 8, 0]}
                            shape={(props: any) => {
                              const { x, y, width, height, fill } = props;
                              return (
                                <g>
                                  <rect
                                    x={x}
                                    y={y}
                                    width={width}
                                    height={height}
                                    fill={fill}
                                    rx={8}
                                    ry={8}
                                  />
                                </g>
                              );
                            }}
                          >
                            {analytics.topTasks.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Insights & Recommendations */}
            <motion.div
              variants={itemVariants}
            >
              <Card className="glass-morphism border-white/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-500" />
                    AI Insights & Recommendations
                  </CardTitle>
                  <CardDescription>
                    Personalized suggestions based on your performance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      {
                        icon: <TrendingUp className="h-5 w-5" />,
                        title: "Productivity Peak",
                        description: "Your most productive hours are between 10 AM - 2 PM",
                        color: "from-green-500 to-emerald-500",
                        status: "positive"
                      },
                      {
                        icon: <AlertCircle className="h-5 w-5" />,
                        title: `${analytics.overdueTasks} Overdue Tasks`,
                        description: "Focus on completing these tasks first",
                        color: "from-red-500 to-rose-500",
                        status: "warning"
                      },
                      {
                        icon: <Target className="h-5 w-5" />,
                        title: "Predicted Completion",
                        description: `Estimated ${Math.ceil(analytics.predictedCompletion)} days to clear backlog`,
                        color: "from-blue-500 to-cyan-500",
                        status: "info"
                      },
                    ].map((insight, index) => (
                      <div
                        key={index}
                        className={`p-4 rounded-xl bg-gradient-to-r ${insight.color}/10 border border-white/10 hover:scale-105 transition-transform duration-300`}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`p-2 rounded-lg bg-gradient-to-r ${insight.color}/20`}>
                            {insight.icon}
                          </div>
                          <h4 className="font-semibold">{insight.title}</h4>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{insight.description}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}

        {/* Performance Tab */}
        {activeTab === "performance" && (
          <motion.div
            key="performance"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Performance Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="glass-morphism border-white/20 lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-blue-500" />
                    Performance Overview
                  </CardTitle>
                  <CardDescription>
                    Weekly performance metrics and trends
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analytics.weeklyHours}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                        <XAxis dataKey="week" stroke="rgba(255, 255, 255, 0.5)" />
                        <YAxis stroke="rgba(255, 255, 255, 0.5)" />
                        <Tooltip 
                          contentStyle={{ 
                            background: 'rgba(255, 255, 255, 0.1)',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '8px'
                          }}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="hours" 
                          stroke="#3b82f6" 
                          strokeWidth={3}
                          dot={{ r: 5 }}
                          activeDot={{ r: 8 }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="target" 
                          stroke="#10b981" 
                          strokeWidth={2}
                          strokeDasharray="5 5"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Team Performance Radar */}
              <Card className="glass-morphism border-white/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-purple-500" />
                    Team Performance
                  </CardTitle>
                  <CardDescription>
                    {isCEO ? "Overall team metrics" : "Your performance metrics"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={analytics.teamPerformance}>
                        <PolarGrid stroke="rgba(255, 255, 255, 0.2)" />
                        <PolarAngleAxis dataKey="name" stroke="rgba(255, 255, 255, 0.5)" />
                        <PolarRadiusAxis stroke="rgba(255, 255, 255, 0.5)" />
                        <Radar
                          name="Performance"
                          dataKey="value"
                          stroke="#8b5cf6"
                          fill="#8b5cf6"
                          fillOpacity={0.6}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            background: 'rgba(255, 255, 255, 0.1)',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '8px'
                          }}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Efficiency Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  title: "Focus Time",
                  value: "68%",
                  description: "Time spent on priority tasks",
                  color: "from-blue-500 to-cyan-500",
                  trend: "+5%"
                },
                {
                  title: "Task Velocity",
                  value: "24",
                  description: "Tasks completed per week",
                  color: "from-green-500 to-emerald-500",
                  trend: "+12%"
                },
                {
                  title: "Review Time",
                  value: "2.4d",
                  description: "Average review duration",
                  color: "from-yellow-500 to-amber-500",
                  trend: "-8%"
                },
                {
                  title: "Collaboration",
                  value: "92%",
                  description: "Tasks with team interaction",
                  color: "from-purple-500 to-pink-500",
                  trend: "+3%"
                },
              ].map((metric, index) => (
                <Card key={index} className="glass-morphism border-white/20">
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className={`text-2xl font-bold bg-gradient-to-r ${metric.color} bg-clip-text text-transparent`}>
                          {metric.value}
                        </div>
                        <div className={`text-sm font-medium ${
                          metric.trend.startsWith('+') ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {metric.trend}
                        </div>
                      </div>
                      <h3 className="font-semibold">{metric.title}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{metric.description}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        )}

        {/* Tasks Tab */}
        {activeTab === "tasks" && (
          <motion.div
            key="tasks"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Task Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="glass-morphism border-white/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TargetIcon className="h-5 w-5 text-green-500" />
                    Task Complexity Distribution
                  </CardTitle>
                  <CardDescription>
                    Breakdown of tasks by complexity level
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.taskComplexity}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                        <XAxis dataKey="name" stroke="rgba(255, 255, 255, 0.5)" />
                        <YAxis stroke="rgba(255, 255, 255, 0.5)" />
                        <Tooltip 
                          contentStyle={{ 
                            background: 'rgba(255, 255, 255, 0.1)',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '8px'
                          }}
                        />
                        <Bar 
                          dataKey="value" 
                          radius={[8, 8, 0, 0]}
                          animationBegin={100}
                          animationDuration={1500}
                        >
                          {analytics.taskComplexity.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-morphism border-white/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-500" />
                    Task Completion Timeline
                  </CardTitle>
                  <CardDescription>
                    Daily task completion rate over time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={Array.from({ length: 30 }, (_, i) => ({
                        day: `Day ${i + 1}`,
                        completed: Math.floor(Math.random() * 10) + 5,
                        target: 8
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                        <XAxis dataKey="day" stroke="rgba(255, 255, 255, 0.5)" tick={{ fontSize: 12 }} />
                        <YAxis stroke="rgba(255, 255, 255, 0.5)" />
                        <Tooltip 
                          contentStyle={{ 
                            background: 'rgba(255, 255, 255, 0.1)',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '8px'
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="completed" 
                          stroke="#3b82f6" 
                          strokeWidth={2}
                          dot={{ r: 3 }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="target" 
                          stroke="#10b981" 
                          strokeWidth={2}
                          strokeDasharray="5 5"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Task Statistics */}
            <Card className="glass-morphism border-white/20">
              <CardHeader>
                <CardTitle>Task Performance Metrics</CardTitle>
                <CardDescription>
                  Detailed statistics on task execution and efficiency
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Avg Time per Task", value: "4.2h", change: "-0.5h" },
                    { label: "Tasks Created", value: analytics.visibleTasksCount.toString(), change: "+12" },
                    { label: "Completion Rate", value: `${analytics.completionRate.toFixed(1)}%`, change: "+2.3%" },
                    { label: "Quality Score", value: "94%", change: "+1.2%" },
                  ].map((stat, index) => (
                    <div key={index} className="text-center p-4 rounded-xl bg-white/5 border border-white/10">
                      <div className="text-2xl font-bold mb-1">{stat.value}</div>
                      <div className="text-sm text-gray-500 mb-2">{stat.label}</div>
                      <div className={`text-xs font-medium ${
                        stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {stat.change} this month
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Projects Tab */}
        {activeTab === "projects" && (
          <motion.div
            key="projects"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Project Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="glass-morphism border-white/20 lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart className="h-5 w-5 text-purple-500" />
                    Project Progress Overview
                  </CardTitle>
                  <CardDescription>
                    Progress comparison across active projects
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.projectTimeline}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                        <XAxis dataKey="name" stroke="rgba(255, 255, 255, 0.5)" angle={-45} textAnchor="end" height={80} />
                        <YAxis stroke="rgba(255, 255, 255, 0.5)" />
                        <Tooltip 
                          contentStyle={{ 
                            background: 'rgba(255, 255, 255, 0.1)',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '8px'
                          }}
                        />
                        <Bar 
                          dataKey="progress" 
                          radius={[8, 8, 0, 0]}
                          animationBegin={100}
                          animationDuration={1500}
                        >
                          {analytics.projectTimeline.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={
                                entry.status === "completed" ? "#10b981" :
                                entry.status === "active" ? "#3b82f6" :
                                "#f59e0b"
                              } 
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-morphism border-white/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-500" />
                    Project Health
                  </CardTitle>
                  <CardDescription>
                    Overall project status and health metrics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { label: "On Track", value: 65, color: "bg-green-500" },
                      { label: "At Risk", value: 20, color: "bg-yellow-500" },
                      { label: "Behind", value: 15, color: "bg-red-500" },
                    ].map((item, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{item.label}</span>
                          <span className="font-medium">{item.value}%</span>
                        </div>
                        <div className="h-2 bg-gray-200/50 dark:bg-gray-700/50 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${item.color} rounded-full transition-all duration-1000`}
                            style={{ width: `${item.value}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Project Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  title: "Resource Utilization",
                  value: "82%",
                  description: "Team capacity allocation",
                  color: "from-blue-500 to-cyan-500",
                  status: "optimal"
                },
                {
                  title: "Budget Adherence",
                  value: "94%",
                  description: "Within allocated budget",
                  color: "from-green-500 to-emerald-500",
                  status: "good"
                },
                {
                  title: "Timeline Adherence",
                  value: "78%",
                  description: "Projects on schedule",
                  color: "from-yellow-500 to-amber-500",
                  status: "warning"
                },
              ].map((metric, index) => (
                <Card key={index} className="glass-morphism border-white/20">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`h-12 w-12 rounded-lg bg-gradient-to-r ${metric.color} flex items-center justify-center`}>
                        <Target className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <div className={`text-2xl font-bold bg-gradient-to-r ${metric.color} bg-clip-text text-transparent`}>
                          {metric.value}
                        </div>
                        <h3 className="font-semibold">{metric.title}</h3>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{metric.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}