"use client"

import { useMemo } from "react"
import { useAuth } from "@/lib/auth-context"
import { useData } from "@/lib/data-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { BarChart3, TrendingUp, Clock, CheckCircle2, AlertCircle, Target } from "lucide-react"
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
} from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

export default function AnalyticsPage() {
  const { user } = useAuth()
  const { projects, tasks, timeEntries } = useData()

  const isCEO = user?.role === "ceo"

  // Filter data based on role
  const visibleTasks = isCEO ? tasks : tasks.filter((t) => t.assignedTo.includes(user?.id || ""))
  const visibleProjects = isCEO ? projects : projects.filter((p) => p.teamMembers.includes(user?.id || ""))
  const visibleTimeEntries = isCEO ? timeEntries : timeEntries.filter((e) => e.userId === user?.id)

  // Calculate analytics
  const analytics = useMemo(() => {
    // Task completion rate
    const completedTasks = visibleTasks.filter((t) => t.status === "completed").length
    const completionRate = visibleTasks.length > 0 ? (completedTasks / visibleTasks.length) * 100 : 0

    // Task status distribution
    const statusDistribution = [
      { name: "To Do", value: visibleTasks.filter((t) => t.status === "todo").length, fill: "hsl(var(--chart-1))" },
      {
        name: "In Progress",
        value: visibleTasks.filter((t) => t.status === "in-progress").length,
        fill: "hsl(var(--chart-2))",
      },
      { name: "Review", value: visibleTasks.filter((t) => t.status === "review").length, fill: "hsl(var(--chart-3))" },
      {
        name: "Completed",
        value: visibleTasks.filter((t) => t.status === "completed").length,
        fill: "hsl(var(--chart-4))",
      },
    ]

    // Priority distribution
    const priorityDistribution = [
      {
        name: "Low",
        count: visibleTasks.filter((t) => t.priority === "low" && t.status !== "completed").length,
      },
      {
        name: "Medium",
        count: visibleTasks.filter((t) => t.priority === "medium" && t.status !== "completed").length,
      },
      {
        name: "High",
        count: visibleTasks.filter((t) => t.priority === "high" && t.status !== "completed").length,
      },
      {
        name: "Urgent",
        count: visibleTasks.filter((t) => t.priority === "urgent" && t.status !== "completed").length,
      },
    ]

    // Project progress
    const avgProjectProgress =
      visibleProjects.length > 0 ? visibleProjects.reduce((sum, p) => sum + p.progress, 0) / visibleProjects.length : 0

    // Time tracking
    const totalHours = visibleTimeEntries.reduce((sum, e) => sum + e.hours, 0)
    const last30Days = new Date()
    last30Days.setDate(last30Days.getDate() - 30)
    const recentHours = visibleTimeEntries
      .filter((e) => new Date(e.date) >= last30Days)
      .reduce((sum, e) => sum + e.hours, 0)

    // Hours by task (top 5)
    const hoursByTask: { [key: string]: number } = {}
    visibleTimeEntries.forEach((entry) => {
      hoursByTask[entry.taskId] = (hoursByTask[entry.taskId] || 0) + entry.hours
    })
    const topTasks = Object.entries(hoursByTask)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([taskId, hours]) => ({
        name: tasks.find((t) => t.id === taskId)?.title.substring(0, 20) || "Unknown",
        hours: Math.round(hours * 10) / 10,
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
      })
    }

    return {
      completionRate,
      statusDistribution,
      priorityDistribution,
      avgProjectProgress,
      totalHours,
      recentHours,
      topTasks,
      weeklyHours,
    }
  }, [visibleTasks, visibleProjects, visibleTimeEntries, tasks])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Analytics</h2>
        <p className="text-muted-foreground">Insights and performance metrics</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Task Completion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="text-2xl font-bold">{analytics.completionRate.toFixed(1)}%</span>
              </div>
              <Progress value={analytics.completionRate} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Project Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-500" />
                <span className="text-2xl font-bold">{analytics.avgProjectProgress.toFixed(0)}%</span>
              </div>
              <Progress value={analytics.avgProjectProgress} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Hours Logged</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{analytics.totalHours.toFixed(1)}h</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">{analytics.recentHours.toFixed(1)}h in last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{visibleProjects.filter((p) => p.status === "active").length}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">of {visibleProjects.length} total</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Task Status Distribution</CardTitle>
            <CardDescription>Breakdown of all tasks by status</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                todo: { label: "To Do", color: "hsl(var(--chart-1))" },
                inProgress: { label: "In Progress", color: "hsl(var(--chart-2))" },
                review: { label: "Review", color: "hsl(var(--chart-3))" },
                completed: { label: "Completed", color: "hsl(var(--chart-4))" },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.statusDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => (value > 0 ? `${name}: ${value}` : "")}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {analytics.statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Priority Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Active Tasks by Priority</CardTitle>
            <CardDescription>Priority levels of incomplete tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                count: { label: "Tasks", color: "hsl(var(--chart-2))" },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.priorityDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="hsl(var(--chart-2))" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Weekly Hours Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Hours Trend</CardTitle>
            <CardDescription>Hours logged over the last 8 weeks</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                hours: { label: "Hours", color: "hsl(var(--chart-1))" },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.weeklyHours}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="hours" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Top Tasks by Hours */}
        <Card>
          <CardHeader>
            <CardTitle>Top Tasks by Hours</CardTitle>
            <CardDescription>Most time-consuming tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                hours: { label: "Hours", color: "hsl(var(--chart-3))" },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.topTasks} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="hours" fill="hsl(var(--chart-3))" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Additional Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Insights & Recommendations</CardTitle>
          <CardDescription>Based on your current work patterns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.completionRate < 50 && (
              <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-900 dark:text-yellow-100">Low task completion rate</p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    Consider focusing on completing existing tasks before taking on new ones.
                  </p>
                </div>
              </div>
            )}

            {analytics.priorityDistribution.find((p) => p.name === "Urgent")?.count > 0 && (
              <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-900 dark:text-red-100">
                    {analytics.priorityDistribution.find((p) => p.name === "Urgent")?.count} urgent task
                    {analytics.priorityDistribution.find((p) => p.name === "Urgent")?.count !== 1 ? "s" : ""} pending
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    Prioritize urgent tasks to avoid delays and meet deadlines.
                  </p>
                </div>
              </div>
            )}

            {analytics.completionRate >= 80 && (
              <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                <TrendingUp className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-green-900 dark:text-green-100">Excellent progress!</p>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    You're maintaining a high task completion rate. Keep up the great work!
                  </p>
                </div>
              </div>
            )}

            {analytics.recentHours === 0 && (
              <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                <Clock className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900 dark:text-blue-100">No time logged recently</p>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    Remember to track your time for accurate project reporting and planning.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
