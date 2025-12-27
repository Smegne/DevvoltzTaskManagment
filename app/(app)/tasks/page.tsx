"use client"

import { useState, useEffect } from "react"
import type { ReactNode } from "react"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Plus, 
  Search, 
  Filter, 
  Loader2, 
  Grid3x3, 
  List, 
  Calendar, 
  Users, 
  ChevronDown, 
  ChevronUp, 
  Edit, 
  Trash2, 
  Play, 
  CheckCircle, 
  PauseCircle,
  MoreVertical,
  Zap,
  BarChart3,
  FolderKanban,
  Clock,
  TrendingUp,
  X,
  Sparkles,
  Tag,
  Star,
  Target,
  AlertCircle,
  CheckCheck,
  Pause,
  RefreshCw,
  ArrowUpDown
} from "lucide-react"
import Link from "next/link"
import { TaskDialog } from "@/components/task-dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

// Interface matching database structure
interface DatabaseTask {
  id: number
  title: string
  description: string | null
  module_name?: string | null
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
  tags?: string[]
  estimated_hours?: number
}

type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done' | 'paused' | 'all'
type Priority = 'low' | 'medium' | 'high' | 'all'
type ViewMode = 'grid' | 'list'

// Predefined modules with weekly tasks
const MODULES = [
  {
    id: "auth",
    name: "Authentication Module",
    color: "from-red-500 to-rose-500",
    icon: "🔐",
    tasks: [
      "User Registration API",
      "Login & JWT Implementation",
      "Password Reset Flow",
      "Email Verification",
      "Social Login Integration",
      "Role-based Access Control",
      "Session Management"
    ]
  },
  {
    id: "dashboard",
    name: "Dashboard Module",
    color: "from-blue-500 to-cyan-500",
    icon: "📊",
    tasks: [
      "Dashboard Layout Design",
      "Statistics Widgets",
      "Recent Activity Feed",
      "Charts & Graphs Integration",
      "Quick Actions Panel",
      "Notifications Center",
      "Search & Filter System"
    ]
  },
  {
    id: "tasks",
    name: "Tasks Module",
    color: "from-green-500 to-emerald-500",
    icon: "✅",
    tasks: [
      "Task Creation Form",
      "Task List Display",
      "Task Filtering & Sorting",
      "Task Details View",
      "Task Comments System",
      "Task Attachments",
      "Task History & Audit"
    ]
  },
  {
    id: "projects",
    name: "Projects Module",
    color: "from-purple-500 to-pink-500",
    icon: "📁",
    tasks: [
      "Project Creation",
      "Project Board View",
      "Project Timeline",
      "Team Management",
      "Project Analytics",
      "Document Management",
      "Project Settings"
    ]
  },
  {
    id: "reports",
    name: "Reports Module",
    color: "from-orange-500 to-amber-500",
    icon: "📈",
    tasks: [
      "Report Generation",
      "Data Export (PDF/Excel)",
      "Report Templates",
      "Scheduled Reports",
      "Report Sharing",
      "Report Analytics",
      "Custom Report Builder"
    ]
  }
]

// Interface for grouped tasks
interface TaskGroup {
  moduleName: string
  tasks: DatabaseTask[]
  isCollapsed?: boolean
}

export default function TasksPage() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<DatabaseTask[]>([])
  const [filteredTasks, setFilteredTasks] = useState<DatabaseTask[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<TaskStatus>("all")
  const [priorityFilter, setPriorityFilter] = useState<Priority>("all")
  const [moduleFilter, setModuleFilter] = useState<string>("all")
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<DatabaseTask | undefined>()
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<number | null>(null)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<string>("all")
  const [sortBy, setSortBy] = useState<"due_date" | "priority" | "created_at">("due_date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  // Fetch tasks from API
  useEffect(() => {
    if (!user) return

    const fetchTasks = async () => {
      try {
        setIsLoading(true)
        const token = localStorage.getItem('auth_token')
        
        const response = await fetch('/api/tasks', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data) {
            setTasks(data.data.tasks || [])
          } else {
            toast.error(data.error || 'Failed to fetch tasks')
          }
        } else {
          toast.error(`API error: ${response.status}`)
        }
      } catch (error: any) {
        console.error('Failed to fetch tasks:', error)
        toast.error(error.message || 'Failed to fetch tasks')
      } finally {
        setIsLoading(false)
      }
    }

    fetchTasks()
  }, [user])

  // Apply filters whenever tasks or filter criteria change
  useEffect(() => {
    let result = tasks

    // Filter by search query
    if (searchQuery) {
      result = result.filter(task =>
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (task.module_name && task.module_name.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    // Filter by status
    if (statusFilter !== 'all') {
      result = result.filter(task => task.status === statusFilter)
    }

    // Filter by priority
    if (priorityFilter !== 'all') {
      result = result.filter(task => task.priority === priorityFilter)
    }

    // Filter by module
    if (moduleFilter !== 'all') {
      result = result.filter(task => task.module_name === moduleFilter)
    }

    // Apply sorting
    result = [...result].sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case "due_date":
          const dateA = a.due_date ? new Date(a.due_date).getTime() : Infinity
          const dateB = b.due_date ? new Date(b.due_date).getTime() : Infinity
          comparison = dateA - dateB
          break
          
        case "priority":
          const priorityOrder = { high: 0, medium: 1, low: 2 }
          comparison = (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3)
          break
          
        case "created_at":
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          break
      }
      
      return sortOrder === "asc" ? comparison : -comparison
    })

    setFilteredTasks(result)
  }, [tasks, searchQuery, statusFilter, priorityFilter, moduleFilter, sortBy, sortOrder])

  // Group tasks by module name
  const groupedTasks = () => {
    const groups: TaskGroup[] = []
    const tasksByModule: { [key: string]: DatabaseTask[] } = {}
    
    // Group tasks by module name
    filteredTasks.forEach(task => {
      const moduleName = task.module_name || "Uncategorized"
      if (!tasksByModule[moduleName]) {
        tasksByModule[moduleName] = []
      }
      tasksByModule[moduleName].push(task)
    })
    
    // Create group objects
    Object.entries(tasksByModule).forEach(([moduleName, tasks]) => {
      groups.push({
        moduleName,
        tasks,
        isCollapsed: collapsedGroups.has(moduleName)
      })
    })
    
    return groups
  }

  // Toggle group collapse state
  const toggleGroupCollapse = (moduleName: string) => {
    setCollapsedGroups(prev => {
      const newSet = new Set(prev)
      if (newSet.has(moduleName)) {
        newSet.delete(moduleName)
      } else {
        newSet.add(moduleName)
      }
      return newSet
    })
  }

  const handleEdit = (task: DatabaseTask) => {
    setEditingTask(task)
    setDialogOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this task? This action cannot be undone.")) return

    try {
      setIsDeleting(true)
      const token = localStorage.getItem('auth_token')
      
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      
      if (response.ok && data.success) {
        // Remove task from local state with animation
        const taskElement = document.getElementById(`task-${id}`)
        if (taskElement) {
          taskElement.classList.add('animate-fade-out')
          setTimeout(() => {
            setTasks(prev => prev.filter(task => task.id !== id))
          }, 300)
        }
        toast.success('Task deleted successfully')
      } else {
        toast.error(data.error || 'Failed to delete task')
      }
    } catch (error: any) {
      console.error('Delete error:', error)
      toast.error(error.message || 'Failed to delete task')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleStatusUpdate = async (taskId: number, newStatus: DatabaseTask['status']) => {
    try {
      setIsUpdatingStatus(taskId)
      const token = localStorage.getItem('auth_token')
      
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: newStatus
        })
      })

      const data = await response.json()
      
      if (response.ok && data.success) {
        // Animate status update
        const taskElement = document.getElementById(`task-${taskId}`)
        if (taskElement) {
          taskElement.classList.add('animate-update-pulse')
          setTimeout(() => {
            taskElement.classList.remove('animate-update-pulse')
          }, 1000)
        }
        
        setTasks(prev => prev.map(task => 
          task.id === taskId ? { ...task, status: newStatus, updated_at: new Date().toISOString() } : task
        ))
        toast.success(`Task status updated to ${getStatusDisplay(newStatus)}`)
      } else {
        toast.error(data.error || 'Failed to update task status')
      }
    } catch (error: any) {
      console.error('Status update error:', error)
      toast.error(error.message || 'Failed to update task status')
    } finally {
      setIsUpdatingStatus(null)
    }
  }

  const handleSave = async (taskData: any) => {
    setIsSubmitting(true)
    try {
      const token = localStorage.getItem('auth_token')
      let response: Response
      let method: string

      // Ensure status is always "todo" for new tasks
      if (!taskData.id) {
        taskData.status = 'todo'
      }

      if (taskData.id) {
        // Update existing task
        method = 'PUT'
        response = await fetch(`/api/tasks/${taskData.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(taskData)
        })
      } else {
        // Create new task
        method = 'POST'
        response = await fetch('/api/tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(taskData)
        })
      }

      const data = await response.json()
      
      if (response.ok && data.success) {
        if (method === 'POST') {
          // Add new task to local state with animation
          setTasks(prev => [data.data.task, ...prev])
          toast.success('Task created successfully', {
            icon: "🎉",
            description: `"${taskData.title}" has been added`
          })
        } else {
          // Update task in local state
          setTasks(prev => prev.map(task => 
            task.id === taskData.id ? data.data.task : task
          ))
          toast.success('Task updated successfully', {
            icon: "✨",
            description: `"${taskData.title}" has been updated`
          })
        }
        
        setDialogOpen(false)
        setEditingTask(undefined)
      } else {
        toast.error(data.error || `Failed to ${method === 'POST' ? 'create' : 'update'} task`)
      }
    } catch (error: any) {
      console.error('Save error:', error)
      toast.error(error.message || `Failed to ${taskData.id ? 'update' : 'create'} task`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateNew = () => {
    setEditingTask(undefined)
    setDialogOpen(true)
  }

  // Calculate task counts for tabs
  const taskCounts = {
    all: tasks.length,
    todo: tasks.filter(t => t.status === 'todo').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    review: tasks.filter(t => t.status === 'review').length,
    done: tasks.filter(t => t.status === 'done').length,
    paused: tasks.filter(t => t.status === 'paused').length,
  }

  // Get unique modules from tasks
  const uniqueModules = Array.from(new Set(tasks.map(t => t.module_name).filter(Boolean))) as string[]

  // Map database status to display status
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

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'in_progress':
        return <Play className="h-3 w-3" />
      case 'done':
        return <CheckCircle className="h-3 w-3" />
      case 'paused':
        return <PauseCircle className="h-3 w-3" />
      case 'review':
        return <Edit className="h-3 w-3" />
      default:
        return null
    }
  }

  // Get card background color based on status
  const getCardBgColor = (status: string) => {
    switch (status) {
      case 'done':
        return 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 dark:from-green-950/20 dark:to-emerald-950/20 dark:border-green-800'
      case 'in_progress':
        return 'bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200 dark:from-yellow-950/20 dark:to-amber-950/20 dark:border-yellow-800'
      case 'review':
        return 'bg-gradient-to-br from-orange-50 to-orange-50 border-orange-200 dark:from-orange-950/20 dark:to-orange-950/20 dark:border-orange-800'
      case 'paused':
        return 'bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200 dark:from-purple-950/20 dark:to-violet-950/20 dark:border-purple-800'
      case 'todo':
      default:
        return 'bg-gradient-to-br from-white to-gray-50 border-gray-200 dark:from-gray-900 dark:to-gray-800 dark:border-gray-800'
    }
  }

  // Get priority indicator color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-gradient-to-r from-red-500 to-rose-500'
      case 'medium':
        return 'bg-gradient-to-r from-yellow-500 to-amber-500'
      case 'low':
        return 'bg-gradient-to-r from-green-500 to-emerald-500'
      default:
        return 'bg-gradient-to-r from-gray-500 to-gray-600'
    }
  }

  // Get next status options based on current status
  const getNextStatusOptions = (currentStatus: DatabaseTask['status']) => {
    const statusFlow: Record<string, { label: string; value: DatabaseTask['status']; icon: ReactNode }[]> = {
      'todo': [
        { label: 'Start', value: 'in_progress', icon: <Play className="h-4 w-4" /> },
        { label: 'Complete', value: 'done', icon: <CheckCircle className="h-4 w-4" /> },
      ],
      'in_progress': [
        { label: 'Pause', value: 'paused', icon: <PauseCircle className="h-4 w-4" /> },
        { label: 'Complete', value: 'done', icon: <CheckCircle className="h-4 w-4" /> },
        { label: 'Mark for Review', value: 'review', icon: <Edit className="h-4 w-4" /> },
      ],
      'review': [
        { label: 'Resume', value: 'in_progress', icon: <Play className="h-4 w-4" /> },
        { label: 'Complete', value: 'done', icon: <CheckCircle className="h-4 w-4" /> },
      ],
      'done': [
        { label: 'Reopen', value: 'in_progress', icon: <Play className="h-4 w-4" /> },
        { label: 'Mark as To Do', value: 'todo', icon: <Edit className="h-4 w-4" /> },
      ],
      'paused': [
        { label: 'Resume', value: 'in_progress', icon: <Play className="h-4 w-4" /> },
        { label: 'Complete', value: 'done', icon: <CheckCircle className="h-4 w-4" /> },
        { label: 'Mark as To Do', value: 'todo', icon: <Edit className="h-4 w-4" /> },
      ],
    }
    return statusFlow[currentStatus] || []
  }

  // Map database priority to display priority
  const getPriorityDisplay = (priority: string) => {
    const priorityMap: Record<string, string> = {
      'low': 'Low',
      'medium': 'Medium',
      'high': 'High'
    }
    return priorityMap[priority] || priority
  }

  // Get module color
  const getModuleColor = (moduleName: string) => {
    const module = MODULES.find(m => m.name === moduleName)
    return module?.color || 'from-gray-500 to-gray-600'
  }

  // Get module icon
  const getModuleIcon = (moduleName: string) => {
    const module = MODULES.find(m => m.name === moduleName)
    return module?.icon || "📄"
  }

  // Status badge colors
  const statusColors: Record<string, string> = {
    'todo': "bg-gradient-to-r from-gray-500/20 to-gray-600/20 text-gray-700 dark:text-gray-300",
    'in_progress': "bg-gradient-to-r from-yellow-500/20 to-amber-600/20 text-yellow-700 dark:text-yellow-300",
    'review': "bg-gradient-to-r from-orange-500/20 to-orange-600/20 text-orange-700 dark:text-orange-300",
    'done': "bg-gradient-to-r from-green-500/20 to-emerald-600/20 text-green-700 dark:text-green-300",
    'paused': "bg-gradient-to-r from-purple-500/20 to-purple-600/20 text-purple-700 dark:text-purple-300",
  }

  // Function to render HTML description safely
  const renderDescription = (html: string | null) => {
    if (!html) return (
      <p className="text-sm text-gray-400 dark:text-gray-500 italic">No description</p>
    )
    
    const safeHtml = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+="[^"]*"/g, '')
    
    return (
      <div 
        className="prose prose-sm max-w-none dark:prose-invert line-clamp-2"
        dangerouslySetInnerHTML={{ __html: safeHtml }}
      />
    )
  }

  // Render action buttons for a task
  const renderTaskActions = (task: DatabaseTask, canEdit: boolean) => {
    const isUpdating = isUpdatingStatus === task.id
    const statusOptions = getNextStatusOptions(task.status)

    return (
      <div className="flex items-center gap-1">
        {/* Status Dropdown */}
        {statusOptions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                disabled={isDeleting || isUpdating || !canEdit}
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
        )}

        {/* Edit Button */}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => handleEdit(task)}
          disabled={isDeleting || isUpdating || !canEdit}
          className="h-8 w-8 p-0 rounded-full hover:bg-blue-500/10 hover:text-blue-500 transition-all duration-300"
          title="Edit task"
        >
          <Edit className="h-4 w-4" />
        </Button>

        {/* Delete Button */}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => handleDelete(task.id)}
          disabled={isDeleting || isUpdating}
          className="h-8 w-8 p-0 rounded-full hover:bg-red-500/10 hover:text-red-500 transition-all duration-300"
          title="Delete task"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  // Render a single task card
  const renderTaskCard = (task: DatabaseTask, isAssignedToMe: boolean, isCreatedByMe: boolean, canEdit: boolean, showModuleBadge: boolean = true) => {
    const cardBgColor = getCardBgColor(task.status)
    
    return (
      <motion.div
        id={`task-${task.id}`}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
      >
        <Card className={cn(
          "group overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border-white/20",
          cardBgColor
        )}>
          {/* Priority Gradient Border */}
          <div className={`h-1 ${getPriorityColor(task.priority)}`} />
          
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start gap-2 mb-2">
              {showModuleBadge && task.module_name && (
                <Badge className="glass-morphism backdrop-blur-sm border-white/20">
                  <span className="mr-1">{getModuleIcon(task.module_name)}</span>
                  {task.module_name}
                </Badge>
              )}
              
              {/* Status Badge with Icon */}
              <Badge className={cn(
                statusColors[task.status],
                "whitespace-nowrap flex items-center gap-1 backdrop-blur-sm"
              )}>
                {getStatusIcon(task.status)}
                {getStatusDisplay(task.status)}
              </Badge>
            </div>
            
            <CardTitle className="text-lg font-semibold line-clamp-2 group-hover:text-blue-600 transition-colors duration-300">
              {task.title}
            </CardTitle>
            
            {/* Tags */}
            {task.tags && task.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {task.tags.slice(0, 3).map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs glass-morphism border-white/20">
                    <Tag className="h-2.5 w-2.5 mr-1" />
                    {tag}
                  </Badge>
                ))}
                {task.tags.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{task.tags.length - 3}
                  </Badge>
                )}
              </div>
            )}
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Description Preview */}
            <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 min-h-[60px]">
              {renderDescription(task.description)}
            </div>

            {/* Task metadata */}
            <div className="space-y-3 border-t pt-3 border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
                    <Users className="h-3 w-3" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Assigned to</p>
                    <p className="text-sm font-medium truncate max-w-[100px]">
                      {task.assignee_name || "Unassigned"}
                    </p>
                  </div>
                </div>
                
                {isAssignedToMe && (
                  <Badge className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                    You
                  </Badge>
                )}
              </div>

              {task.due_date && (
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-r from-orange-500/20 to-orange-500/20 flex items-center justify-center">
                    <Calendar className="h-3 w-3" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Due date</p>
                    <p className={`text-sm font-medium ${new Date(task.due_date) < new Date() && task.status !== 'done' ? 'text-red-600' : ''}`}>
                      {new Date(task.due_date).toLocaleDateString()}
                    </p>
                  </div>
                  {new Date(task.due_date) < new Date() && task.status !== 'done' && (
                    <AlertCircle className="h-4 w-4 text-red-500 animate-pulse" />
                  )}
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-r from-gray-500/20 to-gray-600/20 flex items-center justify-center">
                    <Star className="h-3 w-3" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Priority</p>
                    <Badge className={cn(
                      "border-none",
                      task.priority === 'high' ? 'bg-gradient-to-r from-red-500/20 to-rose-500/20 text-red-600' :
                      task.priority === 'medium' ? 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 text-yellow-600' :
                      'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-600'
                    )}>
                      {getPriorityDisplay(task.priority)}
                    </Badge>
                  </div>
                </div>
                
                {task.estimated_hours && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3 text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">{task.estimated_hours}h</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-white/10">
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                {canEdit ? (
                  renderTaskActions(task, canEdit)
                ) : (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/tasks/view/${task.id}`}>
                      View Details
                    </Link>
                  </Button>
                )}
              </div>
              
              {/* Last updated indicator */}
              <span className="text-xs text-gray-500">
                Updated {new Date(task.updated_at).toLocaleDateString()}
              </span>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  // Render task groups for grid view
  const renderGridGroups = () => {
    const groups = groupedTasks()
    
    return (
      <AnimatePresence>
        {groups.map((group) => {
          // If group has only one task and module is not set, render as standalone
          if (group.tasks.length === 1 && (!group.moduleName || group.moduleName === "Uncategorized")) {
            const task = group.tasks[0]
            const isAssignedToMe = task.assigned_to === user?.id
            const isCreatedByMe = task.created_by === user?.id
            const canEdit = task.canEdit || user?.role === 'admin' || isAssignedToMe || isCreatedByMe
            
            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="col-span-1"
              >
                {renderTaskCard(task, isAssignedToMe, isCreatedByMe, canEdit)}
              </motion.div>
            )
          }
          
          // Render group container for multiple tasks
          return (
            <motion.div
              key={group.moduleName}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="col-span-full"
            >
              <Card className="glass-morphism border-white/20 overflow-hidden">
                {/* Group Header */}
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div 
                      className="flex items-center gap-3 cursor-pointer flex-1 group"
                      onClick={() => toggleGroupCollapse(group.moduleName)}
                    >
                      <div className={`h-10 w-10 rounded-lg bg-gradient-to-r ${getModuleColor(group.moduleName)} flex items-center justify-center`}>
                        <span className="text-lg">{getModuleIcon(group.moduleName)}</span>
                      </div>
                      <div>
                        <CardTitle className="font-bold text-lg group-hover:text-blue-600 transition-colors duration-300">
                          {group.moduleName}
                        </CardTitle>
                        <CardDescription className="text-sm">
                          {group.tasks.length} {group.tasks.length === 1 ? 'task' : 'tasks'} • 
                          <span className="ml-2 text-xs px-2 py-1 rounded-full bg-gradient-to-r from-green-500/10 to-emerald-500/10 text-green-600">
                            {((group.tasks.filter(t => t.status === 'done').length / group.tasks.length) * 100).toFixed(0)}% complete
                          </span>
                        </CardDescription>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 rounded-full"
                      onClick={() => toggleGroupCollapse(group.moduleName)}
                    >
                      {group.isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                    </Button>
                  </div>
                </CardHeader>
                
                {/* Group Content - Collapsible */}
                {!group.isCollapsed && (
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {group.tasks.map((task) => {
                        const isAssignedToMe = task.assigned_to === user?.id
                        const isCreatedByMe = task.created_by === user?.id
                        const canEdit = task.canEdit || user?.role === 'admin' || isAssignedToMe || isCreatedByMe
                        
                        return (
                          <motion.div
                            key={task.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                          >
                            {renderTaskCard(task, isAssignedToMe, isCreatedByMe, canEdit, false)}
                          </motion.div>
                        )
                      })}
                    </div>
                  </CardContent>
                )}
              </Card>
            </motion.div>
          )
        })}
      </AnimatePresence>
    )
  }

  // Toggle sort order
  const toggleSortOrder = () => {
    setSortOrder(prev => prev === "asc" ? "desc" : "asc")
  }

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("")
    setStatusFilter("all")
    setPriorityFilter("all")
    setModuleFilter("all")
    setSortBy("due_date")
    setSortOrder("desc")
    setShowAdvancedFilters(false)
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-black">
        <div className="text-center glass-morphism p-8 rounded-2xl backdrop-blur-xl border border-white/20">
          <h3 className="text-xl font-semibold mb-2">Session Expired</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">Please login to view tasks</p>
          <Link href="/login">
            <Button className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600">
              Return to Login
            </Button>
          </Link>
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
                <CheckCircle className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                  Task Management
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                  {isLoading ? "Loading tasks..." : `Managing ${tasks.length} tasks across ${uniqueModules.length} modules`}
                </p>
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="flex flex-wrap gap-3 mt-4">
              {[
                { label: "All Tasks", value: taskCounts.all, color: "from-gray-500 to-gray-600" },
                { label: "To Do", value: taskCounts.todo, color: "from-blue-500 to-cyan-500" },
                { label: "In Progress", value: taskCounts.in_progress, color: "from-yellow-500 to-amber-500" },
                { label: "Completed", value: taskCounts.done, color: "from-green-500 to-emerald-500" },
              ].map((stat, index) => (
                <div 
                  key={index}
                  className="px-3 py-1.5 rounded-full bg-gradient-to-r bg-white/5 backdrop-blur-sm border border-white/10"
                >
                  <span className="text-sm font-medium">{stat.label}: </span>
                  <span className={`font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                    {stat.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              onClick={handleCreateNew}
              className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 shadow-lg shadow-blue-500/20 group"
              size="lg"
            >
              <Plus className="h-5 w-5 mr-2 group-hover:rotate-90 transition-transform duration-300" />
              New Task
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Search and Filters Bar */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="glass-morphism rounded-2xl p-6 backdrop-blur-xl border border-white/20 shadow-xl"
      >
        <div className="flex flex-col gap-6">
          {/* Main Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks by title, description, or module..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="glass-input w-full pl-12 pr-10 py-3 rounded-xl border border-white/20 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="h-4 w-4 text-gray-400" />
              </button>
            )}
          </div>

          {/* Filters Row */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {/* Status Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                  <Sparkles className="h-3 w-3" />
                  Status
                </label>
                <Select 
                  value={statusFilter} 
                  onValueChange={(v) => setStatusFilter(v as TaskStatus)}
                  disabled={isLoading}
                >
                  <SelectTrigger className="glass-input border-white/20">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent className="glass-morphism border-white/20 backdrop-blur-xl">
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="done">Completed</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Priority Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                  <Star className="h-3 w-3" />
                  Priority
                </label>
                <Select 
                  value={priorityFilter} 
                  onValueChange={(v) => setPriorityFilter(v as Priority)}
                  disabled={isLoading}
                >
                  <SelectTrigger className="glass-input border-white/20">
                    <SelectValue placeholder="All Priorities" />
                  </SelectTrigger>
                  <SelectContent className="glass-morphism border-white/20 backdrop-blur-xl">
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Module Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                  <FolderKanban className="h-3 w-3" />
                  Module
                </label>
                <Select 
                  value={moduleFilter} 
                  onValueChange={setModuleFilter}
                  disabled={isLoading}
                >
                  <SelectTrigger className="glass-input border-white/20">
                    <SelectValue placeholder="All Modules" />
                  </SelectTrigger>
                  <SelectContent className="glass-morphism border-white/20 backdrop-blur-xl">
                    <SelectItem value="all">All Modules</SelectItem>
                    {uniqueModules.map((module) => (
                      <SelectItem key={module} value={module}>
                        {module}
                      </SelectItem>
                    ))}
                    <SelectItem value="no-module">No Module</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sort Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                  <ArrowUpDown className="h-3 w-3" />
                  Sort By
                </label>
                <div className="flex gap-2">
                  <Select 
                    value={sortBy} 
                    onValueChange={(v) => setSortBy(v as any)}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="glass-input border-white/20 flex-1">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent className="glass-morphism border-white/20 backdrop-blur-xl">
                      <SelectItem value="due_date">Due Date</SelectItem>
                      <SelectItem value="priority">Priority</SelectItem>
                      <SelectItem value="created_at">Created Date</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={toggleSortOrder}
                    className="glass-input border-white/20"
                  >
                    {sortOrder === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex items-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="glass-input border-white/20"
              >
                <Filter className="h-4 w-4 mr-2" />
                {showAdvancedFilters ? "Hide Filters" : "More Filters"}
              </Button>
              <Button
                variant="ghost"
                onClick={clearFilters}
                className="glass-input border-white/20"
              >
                Clear All
              </Button>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className={cn(
                  viewMode === 'grid' 
                    ? "bg-gradient-to-r from-blue-500 to-cyan-500" 
                    : "glass-input border-white/20"
                )}
              >
                <Grid3x3 className="h-4 w-4" />
                <span className="ml-2">Grid</span>
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
                className={cn(
                  viewMode === 'list' 
                    ? "bg-gradient-to-r from-blue-500 to-cyan-500" 
                    : "glass-input border-white/20"
                )}
              >
                <List className="h-4 w-4" />
                <span className="ml-2">List</span>
              </Button>
            </div>
            
            <div className="text-sm text-gray-500">
              Showing {filteredTasks.length} of {tasks.length} tasks
            </div>
          </div>
        </div>
      </motion.div>

      {/* Module Stats */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
      >
        {MODULES.map((module, index) => {
          const moduleTasks = tasks.filter(t => t.module_name === module.name)
          const completedTasks = moduleTasks.filter(t => t.status === 'done').length
          const completionRate = moduleTasks.length > 0 ? Math.round((completedTasks / moduleTasks.length) * 100) : 0
          
          return (
            <motion.div
              key={module.id}
              variants={{
                hidden: { opacity: 0, y: 20 },
                show: { opacity: 1, y: 0, transition: { delay: index * 0.1 } }
              }}
            >
              <Card className="glass-morphism hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border-white/20 overflow-hidden group">
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${module.color}`} />
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`h-10 w-10 rounded-lg bg-gradient-to-r ${module.color} flex items-center justify-center`}>
                          <span className="text-lg">{module.icon}</span>
                        </div>
                        <div>
                          <div className="text-2xl font-bold">{moduleTasks.length}</div>
                          <p className="text-xs text-gray-500 truncate">{module.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 bg-gray-200/50 dark:bg-gray-700/50 rounded-full overflow-hidden">
                          <div 
                            className={`h-full bg-gradient-to-r ${module.color} transition-all duration-1000`}
                            style={{ width: `${completionRate}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                          {completionRate}%
                        </span>
                      </div>
                    </div>
                    <Badge className={cn(
                      "text-xs",
                      moduleTasks.length === 0 ? "bg-gray-500/20 text-gray-600" :
                      completionRate >= 75 ? "bg-green-500/20 text-green-600" :
                      completionRate >= 50 ? "bg-yellow-500/20 text-yellow-600" :
                      "bg-red-500/20 text-red-600"
                    )}>
                      {moduleTasks.length === 0 ? "No tasks" :
                       completionRate >= 75 ? "On track" :
                       completionRate >= 50 ? "Progressing" : "Needs attention"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </motion.div>

      {/* Main Content */}
      <div className="space-y-6">
        {/* Loading State */}
        {isLoading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="glass-morphism border-white/20">
              <CardContent className="py-20">
                <div className="flex flex-col items-center justify-center">
                  <div className="relative mb-6">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/30 border-t-primary"></div>
                    <div className="absolute inset-0 h-12 w-12 animate-ping rounded-full border-4 border-primary/10"></div>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400">Loading tasks from database...</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">Fetching your latest updates</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : filteredTasks.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="glass-morphism border-white/20">
              <CardContent className="py-20 text-center">
                <div className="max-w-md mx-auto">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-blue-500/10 to-cyan-500/10 flex items-center justify-center">
                    <Search className="h-10 w-10 text-blue-500" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">
                    {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' || moduleFilter !== 'all'
                      ? "No matching tasks found" 
                      : "No tasks created yet"}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-8">
                    {searchQuery ? "Try adjusting your search terms or filters" : 
                     "Get started by creating your first task for your team"}
                  </p>
                  {searchQuery === "" && statusFilter === "all" && priorityFilter === "all" && moduleFilter === "all" && (
                    <Button 
                      onClick={handleCreateNew}
                      className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 shadow-lg shadow-blue-500/20"
                      size="lg"
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      Create Your First Task
                    </Button>
                  )}
                  {(searchQuery !== "" || statusFilter !== "all" || priorityFilter !== "all" || moduleFilter !== "all") && (
                    <Button 
                      onClick={clearFilters}
                      variant="outline"
                      className="glass-input border-white/20"
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : viewMode === 'grid' ? (
          // Grid View
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4"
          >
            {renderGridGroups()}
          </motion.div>
        ) : (
          // List View
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="glass-morphism border-white/20">
              <CardContent className="p-0">
                <div className="divide-y divide-white/10">
                  {groupedTasks().map((group) => (
                    <div key={group.moduleName} className="last:border-b-0">
                      {/* Group Header */}
                      <div 
                        className="p-6 cursor-pointer hover:bg-white/5 transition-colors duration-300 border-b border-white/10"
                        onClick={() => toggleGroupCollapse(group.moduleName)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`h-12 w-12 rounded-xl bg-gradient-to-r ${getModuleColor(group.moduleName)} flex items-center justify-center`}>
                              <span className="text-xl">{getModuleIcon(group.moduleName)}</span>
                            </div>
                            <div>
                              <h3 className="font-bold text-lg">{group.moduleName}</h3>
                              <p className="text-sm text-gray-500">
                                {group.tasks.length} tasks • 
                                <span className="ml-2">
                                  {group.tasks.filter(t => t.status === 'done').length} completed
                                </span>
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <Badge className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 text-blue-600">
                              {((group.tasks.filter(t => t.status === 'done').length / group.tasks.length) * 100).toFixed(0)}%
                            </Badge>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0 rounded-full"
                            >
                              {group.isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      {/* Group Content - Collapsible */}
                      {!group.isCollapsed && (
                        <div className="divide-y divide-white/10">
                          {group.tasks.map((task) => {
                            const isAssignedToMe = task.assigned_to === user?.id
                            const isCreatedByMe = task.created_by === user?.id
                            const canEdit = task.canEdit || user?.role === 'admin' || isAssignedToMe || isCreatedByMe
                            
                            return (
                              <div 
                                key={task.id}
                                className="p-6 hover:bg-white/5 transition-colors duration-300 group"
                              >
                                <div className="flex items-start gap-4">
                                  {/* Priority Indicator */}
                                  <div className={`w-2 h-full rounded-full ${getPriorityColor(task.priority)}`} />
                                  
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-2">
                                      <h4 className="font-semibold text-lg group-hover:text-blue-600 transition-colors">
                                        {task.title}
                                      </h4>
                                      {isAssignedToMe && (
                                        <Badge className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 text-blue-600 border-blue-500/20">
                                          Assigned to you
                                        </Badge>
                                      )}
                                    </div>
                                    
                                    <div className="mb-4 max-h-[48px] overflow-hidden">
                                      {renderDescription(task.description)}
                                    </div>
                                    
                                    <div className="flex flex-wrap items-center gap-4">
                                      <div className="flex items-center gap-2">
                                        <Users className="h-4 w-4 text-gray-400" />
                                        <span className="text-sm">{task.assignee_name || "Unassigned"}</span>
                                      </div>
                                      {task.due_date && (
                                        <div className="flex items-center gap-2">
                                          <Calendar className="h-4 w-4 text-gray-400" />
                                          <span className={`text-sm ${new Date(task.due_date) < new Date() ? 'text-red-600 font-medium' : ''}`}>
                                            Due: {new Date(task.due_date).toLocaleDateString()}
                                          </span>
                                        </div>
                                      )}
                                      <Badge className={statusColors[task.status]}>
                                        {getStatusIcon(task.status)}
                                        {getStatusDisplay(task.status)}
                                      </Badge>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    {renderTaskActions(task, canEdit)}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Enhanced Task Dialog */}
      <TaskDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen} 
        onSave={handleSave} 
        task={editingTask}
        isSubmitting={isSubmitting}
      />
    </div>
  )
}