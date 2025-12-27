"use client"

import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Clock, AlertCircle, TrendingUp, Edit, Eye, FolderKanban, Users, Calendar, Plus, Play, PauseCircle, MoreVertical, Loader2, ChevronRight, Activity, Target, BarChart3, Filter, Zap, Star, Trophy, Bell, Search, Download, Share2 } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import TaskViewModal from "@/components/task-view-modal"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

interface DatabaseTask {
  id: number
  title: string
  description: string | null
  status: 'todo' | 'in_progress' | 'review' | 'done' | 'paused'
  priority: 'low' | 'medium' | 'high'
  due_date: string | null
  project_id: number | null
  assigned_to: number | null
  created_by: number | null
  created_at: string
  updated_at: string
  creator_name?: string
  assignee_name?: string
  project_name?: string
  canEdit?: boolean
}

interface Project {
  id: number
  name: string
  description: string | null
  status: 'active' | 'completed' | 'archived'
  user_id: number | null
  created_at: string
  updated_at: string
  user_name?: string
}

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [tasks, setTasks] = useState<DatabaseTask[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<number | null>(null)
  const [viewingTask, setViewingTask] = useState<DatabaseTask | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [activeTab, setActiveTab] = useState<"overview" | "tasks" | "projects">("overview")

  // Set mounted state to prevent SSR issues
  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch tasks and projects from API
  useEffect(() => {
    if (!mounted || !user || authLoading) return;

    const fetchData = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        const token = localStorage.getItem('auth_token')
        if (!token) {
          setTasks([])
          setProjects([])
          return
        }

        // Fetch tasks
        const tasksResponse = await fetch('/api/tasks', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (tasksResponse.ok) {
          const tasksData = await tasksResponse.json();
          if (tasksData.success && tasksData.data) {
            setTasks(tasksData.data.tasks || []);
          } else {
            throw new Error(tasksData.error || 'Failed to fetch tasks');
          }
        } else {
          throw new Error(`Tasks API returned ${tasksResponse.status}`);
        }

        // Fetch projects
        try {
          const projectsResponse = await fetch('/api/projects', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (projectsResponse.ok) {
            const projectsData = await projectsResponse.json();
            if (projectsData.success && projectsData.data) {
              setProjects(projectsData.data.projects || []);
            }
          }
        } catch (projectsError) {
          console.warn('Projects API not available yet:', projectsError);
        }

      } catch (error: any) {
        console.error("Failed to fetch data:", error);
        setError("Unable to load data. Check your connection.");
        toast.error("Failed to load dashboard data");
      } finally {
        setIsLoading(false)
      }
    };

    fetchData();
  }, [user, authLoading, mounted])

  // Filter tasks based on search and filter
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = searchQuery === "" || 
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesFilter = filterStatus === "all" || task.status === filterStatus
    
    return matchesSearch && matchesFilter
  })

  // Handle status update
  const handleStatusUpdate = async (taskId: number, newStatus: DatabaseTask['status']) => {
    console.log('🔄 [Dashboard] Status Update Called');
    console.log('🔄 Task ID:', taskId);
    console.log('🔄 New Status:', newStatus);
    
    // Validate the status value
    const validStatuses = ['todo', 'in_progress', 'review', 'done', 'paused'];
    if (!validStatuses.includes(newStatus)) {
      console.error('❌ Invalid status value:', newStatus);
      toast.error(`Invalid status: ${newStatus}. Must be one of: ${validStatuses.join(', ')}`);
      return;
    }
    
    try {
      setIsUpdatingStatus(taskId)
      const token = localStorage.getItem('auth_token')
      
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      })

      const data = await response.json()
      console.log('📥 Dashboard Status Update Response:', data);
      
      if (response.ok && data.success) {
        // Animate task update
        document.getElementById(`task-${taskId}`)?.classList.add('animate-update-pulse')
        setTimeout(() => {
          document.getElementById(`task-${taskId}`)?.classList.remove('animate-update-pulse')
        }, 1000)
        
        setTasks(prev => prev.map(task => 
          task.id === taskId ? { ...task, status: newStatus, updated_at: new Date().toISOString() } : task
        ))
        toast.success(`Task status updated to ${getStatusDisplay(newStatus)}`)
      } else {
        console.error('❌ Status update failed:', data);
        toast.error(data.error || 'Failed to update task status')
      }
    } catch (error: any) {
      console.error('🔴 Network error:', error)
      toast.error(error.message || 'Failed to update task status')
    } finally {
      setIsUpdatingStatus(null)
    }
  }

  // Function to render HTML description safely
  const renderRichDescription = (html: string | null) => {
    if (!html) return (
      <p className="text-sm text-gray-400 dark:text-gray-500 italic">No description</p>
    );
    
    const safeHtml = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+="[^"]*"/g, '')
    
    return (
      <div 
        className="prose prose-sm max-w-none dark:prose-invert line-clamp-2"
        dangerouslySetInnerHTML={{ __html: safeHtml }}
      />
    );
  }

  // Calculate stats - updated to include paused
  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'done').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    todo: tasks.filter(t => t.status === 'todo').length,
    review: tasks.filter(t => t.status === 'review').length,
    paused: tasks.filter(t => t.status === 'paused').length,
    highPriority: tasks.filter(t => t.priority === 'high').length,
    mediumPriority: tasks.filter(t => t.priority === 'medium').length,
    lowPriority: tasks.filter(t => t.priority === 'low').length,
    overdue: tasks.filter(t => 
      t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done'
    ).length,
    myTasks: tasks.filter(t => t.assigned_to === user?.id).length,
    myCompleted: tasks.filter(t => 
      t.assigned_to === user?.id && t.status === 'done'
    ).length,
    activeProjects: projects.filter(p => p.status === 'active').length,
  }

  // Get recent tasks
  const recentTasks = [...tasks]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)

  // Get my tasks
  const myTasks = tasks.filter(t => t.assigned_to === user?.id)

  // Status display mapping
  const getStatusDisplay = (status: string) => {
    const statusMap: Record<string, string> = {
      'todo': 'To Do',
      'in_progress': 'In Progress',
      'review': 'Review',
      'done': 'Completed',
      'paused': 'Paused'
    }
    return statusMap[status] || status
  }

  const statusColors: Record<string, string> = {
    'todo': "bg-gradient-to-r from-gray-500/20 to-gray-600/20 text-gray-700 dark:text-gray-300",
    'in_progress': "bg-gradient-to-r from-yellow-500/20 to-amber-600/20 text-yellow-700 dark:text-yellow-300",
    'review': "bg-gradient-to-r from-orange-500/20 to-orange-600/20 text-orange-700 dark:text-orange-300",
    'done': "bg-gradient-to-r from-green-500/20 to-emerald-600/20 text-green-700 dark:text-green-300",
    'paused': "bg-gradient-to-r from-purple-500/20 to-purple-600/20 text-purple-700 dark:text-purple-300",
  }

  const priorityColors: Record<string, string> = {
    'low': "from-green-500/10 to-emerald-500/10 border-green-500/20",
    'medium': "from-yellow-500/10 to-amber-500/10 border-yellow-500/20",
    'high': "from-red-500/10 to-rose-500/10 border-red-500/20",
  }

  const priorityDisplay: Record<string, string> = {
    'low': 'Low',
    'medium': 'Medium',
    'high': 'High'
  }

  // Get status icon for dashboard
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'in_progress':
        return <Play className="h-3 w-3" />
      case 'done':
        return <CheckCircle2 className="h-3 w-3" />
      case 'paused':
        return <PauseCircle className="h-3 w-3" />
      default:
        return null
    }
  }

  // Get next status options based on current status
  const getNextStatusOptions = (currentStatus: DatabaseTask['status']) => {
    const statusFlow: Record<string, { label: string; value: DatabaseTask['status']; icon: React.ReactNode }[]> = {
      'todo': [
        { label: 'Start', value: 'in_progress', icon: <Play className="h-3 w-3" /> },
        { label: 'Complete', value: 'done', icon: <CheckCircle2 className="h-3 w-3" /> },
      ],
      'in_progress': [
        { label: 'Pause', value: 'paused', icon: <PauseCircle className="h-3 w-3" /> },
        { label: 'Complete', value: 'done', icon: <CheckCircle2 className="h-3 w-3" /> },
        { label: 'Mark for Review', value: 'review', icon: <Edit className="h-3 w-3" /> },
      ],
      'review': [
        { label: 'Resume', value: 'in_progress', icon: <Play className="h-3 w-3" /> },
        { label: 'Complete', value: 'done', icon: <CheckCircle2 className="h-3 w-3" /> },
      ],
      'done': [
        { label: 'Reopen', value: 'in_progress', icon: <Play className="h-3 w-3" /> },
        { label: 'Mark as To Do', value: 'todo', icon: <Edit className="h-3 w-3" /> },
      ],
      'paused': [
        { label: 'Resume', value: 'in_progress', icon: <Play className="h-3 w-3" /> },
        { label: 'Complete', value: 'done', icon: <CheckCircle2 className="h-3 w-3" /> },
        { label: 'Mark as To Do', value: 'todo', icon: <Edit className="h-3 w-3" /> },
      ],
    }
    
    return statusFlow[currentStatus] || [];
  }

  // Render status dropdown for a task
  const renderTaskStatusDropdown = (task: DatabaseTask) => {
    const isUpdating = isUpdatingStatus === task.id
    const statusOptions = getNextStatusOptions(task.status)
    const canEdit = task.canEdit || user?.role === 'admin' || task.assigned_to === user?.id || task.created_by === user?.id

    if (!canEdit || statusOptions.length === 0) return null;

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            disabled={isUpdating}
            className="h-8 w-8 p-0 rounded-full hover:bg-white/10 transition-all duration-300"
            title="Change status"
          >
            {isUpdating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MoreVertical className="h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 glass-morphism border-white/20 backdrop-blur-xl">
          <div className="px-2 py-1.5 text-xs text-gray-400 font-medium">Change Status</div>
          {statusOptions.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => handleStatusUpdate(task.id, option.value)}
              className="flex items-center gap-3 cursor-pointer text-sm hover:bg-white/5 transition-all duration-200"
            >
              <div className="p-1.5 rounded-lg bg-white/5">
                {option.icon}
              </div>
              <span>{option.label}</span>
              <Badge 
                className={`ml-auto text-xs px-2 py-0.5 ${statusColors[option.value]}`}
              >
                {getStatusDisplay(option.value)}
              </Badge>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  // Calculate completion percentage
  const completionPercentage = stats.total > 0 
    ? Math.round((stats.completed / stats.total) * 100)
    : 0

  // Show loading during SSR or auth loading
  if (!mounted || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-black">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/30 border-t-primary"></div>
            <div className="absolute inset-0 h-12 w-12 animate-ping rounded-full border-4 border-primary/10"></div>
          </div>
          <p className="text-gray-500 dark:text-gray-400 animate-pulse">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-black">
        <div className="text-center">
          <div className="glass-morphism p-8 rounded-2xl backdrop-blur-xl border border-white/20 shadow-2xl">
            <h3 className="text-xl font-semibold mb-2">Session Expired</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Please login to view dashboard</p>
            <Link href="/login">
              <Button className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600">
                Return to Login
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
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
    show: { opacity: 1, y: 0, transition: { duration: 0.4 } }
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-gradient-to-r from-blue-500/10 to-cyan-500/10">
                <Activity className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                  Welcome back, {user?.name}!
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-gray-500 dark:text-gray-400">
                    {isLoading ? "Syncing data..." : `Managing ${stats.total} tasks across ${stats.activeProjects} projects`}
                  </span>
                  <Badge className="glass-morphism border-white/20 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 capitalize">
                    {user?.role}
                  </Badge>
                </div>
              </div>
            </div>
            {error && (
              <div className="flex items-center gap-2 mt-2 animate-fade-in">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <span className="text-sm text-amber-600 dark:text-amber-400">{error}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="glass-input pl-9 pr-4 py-2 rounded-xl border border-white/20 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 w-full md:w-64"
              />
            </div>
            
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {[
          {
            title: "Team Tasks",
            value: stats.total,
            icon: <Users className="h-5 w-5" />,
            color: "from-blue-500 to-cyan-500",
            progress: completionPercentage,
            label: `${stats.completed} completed • ${stats.paused} paused`
          },
          {
            title: "My Tasks",
            value: stats.myTasks,
            icon: <Target className="h-5 w-5" />,
            color: "from-purple-500 to-pink-500",
            progress: stats.myTasks > 0 ? Math.round((stats.myCompleted / stats.myTasks) * 100) : 0,
            label: `${stats.myCompleted} done • ${myTasks.filter(t => t.status === 'in_progress').length} active`
          },
          {
            title: "High Priority",
            value: stats.highPriority,
            icon: <AlertCircle className="h-5 w-5" />,
            color: "from-red-500 to-orange-500",
            progress: stats.highPriority > 0 ? Math.min(100, (stats.highPriority / stats.total) * 200) : 0,
            label: `${stats.overdue} overdue • ${stats.mediumPriority} medium`
          },
          {
            title: "Active Projects",
            value: stats.activeProjects,
            icon: <FolderKanban className="h-5 w-5" />,
            color: "from-green-500 to-emerald-500",
            progress: projects.length > 0 ? Math.min(100, (stats.activeProjects / projects.length) * 100) : 0,
            label: `${projects.length} total • ${projects.filter(p => p.status === 'completed').length} completed`
          }
        ].map((stat, index) => (
          <motion.div key={index} variants={itemVariants}>
            <Card className="glass-morphism hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border-white/20 overflow-hidden group">
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
                  <span className="text-sm text-gray-500 dark:text-gray-400">tasks</span>
                </div>
                <Progress 
                  value={stat.progress} 
                  className="h-2 mt-3 bg-gray-200/50 dark:bg-gray-700/50 overflow-hidden"
                />
                <div className={`h-full bg-gradient-to-r ${stat.color} transition-all duration-1000`} style={{ width: `${stat.progress}%` }} />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {stat.label}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Tasks - 2/3 width */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="lg:col-span-2 space-y-6"
        >
          {/* Tabs */}
          <div className="glass-morphism rounded-xl p-1 backdrop-blur-xl border border-white/20">
            <div className="flex space-x-1">
              {[
                { id: "overview", label: "Overview", icon: <BarChart3 className="h-4 w-4" /> },
                { id: "tasks", label: "All Tasks", icon: <CheckCircle2 className="h-4 w-4" /> },
                { id: "projects", label: "Projects", icon: <FolderKanban className="h-4 w-4" /> }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                    activeTab === tab.id
                      ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Recent Tasks Card */}
          <Card className="glass-morphism border-white/20 shadow-xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-500/5 to-cyan-500/5">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-blue-500" />
                    Recent Team Tasks
                  </CardTitle>
                  <CardDescription>
                    Latest updates from your team
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="glass-morphism border border-white/20">
                        <Filter className="h-4 w-4 mr-2" />
                        Filter
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="glass-morphism border-white/20 backdrop-blur-xl">
                      {["all", "todo", "in_progress", "review", "done", "paused"].map((status) => (
                        <DropdownMenuItem
                          key={status}
                          onClick={() => setFilterStatus(status)}
                          className="flex items-center gap-2"
                        >
                          <div className={`h-2 w-2 rounded-full ${
                            status === "all" ? "bg-gray-400" :
                            status === "todo" ? "bg-gray-500" :
                            status === "in_progress" ? "bg-yellow-500" :
                            status === "review" ? "bg-orange-500" :
                            status === "done" ? "bg-green-500" : "bg-purple-500"
                          }`} />
                          {getStatusDisplay(status)}
                          {filterStatus === status && <CheckCircle2 className="h-3 w-3 ml-auto" />}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Link href="/tasks">
                    <Button variant="ghost" size="sm" className="group">
                      View All
                      <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/30 border-t-primary"></div>
                    <p className="text-gray-500 dark:text-gray-400">Loading tasks...</p>
                  </div>
                </div>
              ) : recentTasks.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mx-auto h-16 w-16 rounded-full bg-gradient-to-r from-blue-500/10 to-cyan-500/10 flex items-center justify-center mb-4">
                    <CheckCircle2 className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No tasks yet</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
                    Be the first to create a task for your team!
                  </p>
                  <Link href="/tasks/new">
                    <Button className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600">
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Task
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-gray-200/50 dark:divide-gray-700/50">
                  <AnimatePresence>
                    {recentTasks.map((task) => {
                      const isAssignedToMe = task.assigned_to === user?.id
                      
                      return (
                        <motion.div
                          key={task.id}
                          id={`task-${task.id}`}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                          className={`p-4 hover:bg-gradient-to-r hover:from-blue-500/5 hover:to-cyan-500/5 transition-all duration-300 group ${priorityColors[task.priority]}`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start gap-3 mb-3">
                                <div className={`p-2 rounded-lg ${statusColors[task.status]} mt-1`}>
                                  {getStatusIcon(task.status)}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                      {task.title}
                                    </h4>
                                    {isAssignedToMe && (
                                      <Badge className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                                        Assigned to me
                                      </Badge>
                                    )}
                                  </div>
                                  {renderRichDescription(task.description)}
                                  <div className="flex flex-wrap items-center gap-3 mt-3">
                                    {task.creator_name && (
                                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                        <div className="h-6 w-6 rounded-full bg-gradient-to-r from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
                                          <Users className="h-3 w-3" />
                                        </div>
                                        <span>{task.creator_name}</span>
                                      </div>
                                    )}
                                    {task.due_date && (
                                      <div className={`flex items-center gap-2 text-sm ${
                                        new Date(task.due_date) < new Date() && task.status !== 'done' 
                                          ? 'text-red-500 font-medium' 
                                          : 'text-gray-500 dark:text-gray-400'
                                      }`}>
                                        <Calendar className="h-4 w-4" />
                                        <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
                                      </div>
                                    )}
                                    <Badge 
                                      className={`bg-gradient-to-r ${priorityColors[task.priority]} border-none`}
                                    >
                                      {priorityDisplay[task.priority]}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex flex-col items-end gap-2">
                              <Badge className={cn("flex items-center gap-1.5", statusColors[task.status])}>
                                {getStatusDisplay(task.status)}
                              </Badge>
                              
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  className="h-8 w-8 p-0 rounded-full hover:bg-white/10"
                                  title="View task details"
                                  onClick={() => setViewingTask(task)}
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                                {renderTaskStatusDropdown(task)}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Right Sidebar - My Tasks & Quick Stats */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="space-y-6"
        >
          {/* My Tasks Card */}
          <Card className="glass-morphism border-white/20 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-purple-500/5 to-pink-500/5">
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-purple-500" />
                My Tasks
              </CardTitle>
              <CardDescription>
                Your assigned tasks
              </CardDescription>
            </CardHeader>
            <CardContent>
              {myTasks.length === 0 ? (
                <div className="text-center py-8">
                  <div className="mx-auto h-12 w-12 rounded-full bg-gradient-to-r from-purple-500/10 to-pink-500/10 flex items-center justify-center mb-4">
                    <Users className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">No tasks assigned yet</p>
                  <Link href="/tasks">
                    <Button variant="outline" className="w-full border-white/20">
                      Browse Available Tasks
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Stats Overview */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "To Do", value: myTasks.filter(t => t.status === 'todo').length, color: "from-gray-500 to-gray-600" },
                      { label: "Active", value: myTasks.filter(t => t.status === 'in_progress').length, color: "from-yellow-500 to-amber-600" },
                      { label: "Done", value: myTasks.filter(t => t.status === 'done').length, color: "from-green-500 to-emerald-600" },
                    ].map((stat, index) => (
                      <div 
                        key={index}
                        className="text-center p-3 rounded-xl bg-gradient-to-br from-white/10 to-transparent backdrop-blur-sm border border-white/10 hover:scale-105 transition-transform duration-300"
                      >
                        <div className={`text-2xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                          {stat.value}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {stat.label}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* My Tasks List */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm text-gray-600 dark:text-gray-400">Pending Actions</h4>
                    {myTasks.slice(0, 3).map((task) => (
                      <div 
                        key={task.id}
                        className="group p-3 rounded-lg bg-gradient-to-r from-white/5 to-transparent hover:from-white/10 border border-white/10 transition-all duration-300"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <button 
                                onClick={() => setViewingTask(task)}
                                className="text-sm font-medium text-left hover:text-blue-500 transition-colors"
                              >
                                {task.title}
                              </button>
                              {task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done' && (
                                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                              )}
                            </div>
                            <div className="flex items-center justify-between">
                              <Badge className={cn("text-xs", statusColors[task.status])}>
                                {getStatusDisplay(task.status)}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No date'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Quick Actions */}
                  <div className="pt-4 border-t border-white/10">
                    <h4 className="font-semibold text-sm text-gray-600 dark:text-gray-400 mb-3">Quick Actions</h4>
                    <div className="grid grid-cols-2 gap-2">
                     
                      <Link href="/tasks">
                        <Button variant="outline" className="w-full border-white/20">
                          View All
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Performance Card */}
          <Card className="glass-morphism border-white/20 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Completion Rate</span>
                  <span className="text-lg font-bold bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">
                    {completionPercentage}%
                  </span>
                </div>
                <Progress value={completionPercentage} className="h-2 bg-gray-200/50 dark:bg-gray-700/50" />
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">On-time Delivery</span>
                  <span className="text-lg font-bold bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">
                    {stats.overdue === 0 ? '100%' : `${Math.max(0, 100 - (stats.overdue / stats.total) * 100)}%`}
                  </span>
                </div>
                <Progress 
                  value={Math.max(0, 100 - (stats.overdue / stats.total) * 100)} 
                  className="h-2 bg-gray-200/50 dark:bg-gray-700/50" 
                />
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="glass-morphism border-white/20 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-orange-500" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentTasks.slice(0, 3).map((task, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full animate-pulse ${
                      task.status === 'done' ? 'bg-green-500' :
                      task.status === 'in_progress' ? 'bg-yellow-500' :
                      task.status === 'review' ? 'bg-orange-500' : 'bg-gray-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                      <p className="text-xs text-gray-500 truncate">
                        Updated {new Date(task.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge className={statusColors[task.status]}>
                      {getStatusDisplay(task.status)}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Task View Modal */}
      <TaskViewModal 
        task={viewingTask}
        open={!!viewingTask}
        onOpenChange={(open) => !open && setViewingTask(null)}
        user={user}
      />
    </div>
  )
}