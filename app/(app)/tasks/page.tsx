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
  MoreVertical
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
    color: "bg-red-500",
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
    color: "bg-blue-500",
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
    color: "bg-green-500",
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
    color: "bg-purple-500",
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
    color: "bg-orange-500",
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

    setFilteredTasks(result)
  }, [tasks, searchQuery, statusFilter, priorityFilter, moduleFilter])

  // Sort tasks by priority and due date
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    const priorityDiff = (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3)
    if (priorityDiff !== 0) return priorityDiff

    if (a.due_date && b.due_date) {
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    }
    return 0
  })

  // Group tasks by module name
  const groupedTasks = () => {
    const groups: TaskGroup[] = []
    const tasksByModule: { [key: string]: DatabaseTask[] } = {}
    
    // Group tasks by module name
    sortedTasks.forEach(task => {
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
        // Remove task from local state
        setTasks(prev => prev.filter(task => task.id !== id))
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
        status: newStatus  // Only send the status field
      })
    })

    const data = await response.json()
    
    if (response.ok && data.success) {
      // Update task in local state
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
          // Add new task to local state
          setTasks(prev => [data.data.task, ...prev])
          toast.success('Task created successfully')
        } else {
          // Update task in local state
          setTasks(prev => prev.map(task => 
            task.id === taskData.id ? data.data.task : task
          ))
          toast.success('Task updated successfully')
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

  // Calculate task counts for tabs - updated to include paused
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

  // Map database status to display status - updated for paused
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
      default:
        return null
    }
  }

  // Get card background color based on status
  const getCardBgColor = (status: string) => {
    switch (status) {
      case 'done':
        return 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800'
      case 'in_progress':
        return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800'
      case 'review':
        return 'bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800'
      case 'paused':
        return 'bg-purple-50 border-purple-200 dark:bg-purple-950/20 dark:border-purple-800'
      case 'todo':
      default:
        return 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800'
    }
  }

  // Get priority indicator color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500'
      case 'medium':
        return 'bg-yellow-500'
      case 'low':
        return 'bg-green-500'
      default:
        return 'bg-gray-500'
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
    return module?.color || 'bg-gray-500'
  }

  // Status badge colors - updated for paused
  const statusColors: Record<string, string> = {
    'todo': "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
    'in_progress': "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    'review': "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
    'done': "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    'paused': "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  }

  // Function to render HTML description safely
  const renderDescription = (html: string | null) => {
    if (!html) return "No description"
    
    // Create a safe HTML string with basic styling
    const safeHtml = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
      .replace(/on\w+="[^"]*"/g, '') // Remove event handlers
    
    return (
      <div 
        className="prose prose-sm max-w-none dark:prose-invert"
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
        {/* Edit Button */}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => handleEdit(task)}
          disabled={isDeleting || isUpdating}
          className="h-8 w-8 p-0"
          title="Edit task"
        >
          <Edit className="h-4 w-4" />
        </Button>

        {/* Status Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              disabled={isDeleting || isUpdating || statusOptions.length === 0}
              className="h-8 w-8 p-0"
              title="Change status"
            >
              {isUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MoreVertical className="h-4 w-4" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {statusOptions.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => handleStatusUpdate(task.id, option.value)}
                className="flex items-center gap-2 cursor-pointer"
              >
                {option.icon}
                <span>{option.label}</span>
                <Badge 
                  variant="outline" 
                  className={`ml-auto ${statusColors[option.value]}`}
                >
                  {getStatusDisplay(option.value)}
                </Badge>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              Current: <Badge className={statusColors[task.status]}>
                {getStatusDisplay(task.status)}
              </Badge>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Delete Button */}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => handleDelete(task.id)}
          disabled={isDeleting || isUpdating}
          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/30"
          title="Delete task"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  // Render a single task card (used in both grouped and standalone views)
  const renderTaskCard = (task: DatabaseTask, isAssignedToMe: boolean, isCreatedByMe: boolean, canEdit: boolean, showModuleBadge: boolean = true) => {
    const cardBgColor = getCardBgColor(task.status)
    
    return (
      <Card key={task.id} className={`overflow-hidden hover:shadow-lg transition-shadow duration-200 ${cardBgColor}`}>
        {/* Priority Indicator */}
        <div className={`h-2 ${getPriorityColor(task.priority)}`} />
        
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start gap-2 mb-2">
            {showModuleBadge && task.module_name && (
                <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${getModuleColor(task.module_name)}`} />
                <Badge variant="outline" className="text-xs">
                  {task.module_name}
                </Badge>
              </div>
            )}
            
            {/* Status Badge with Icon */}
            <Badge className={`${statusColors[task.status]} whitespace-nowrap flex items-center gap-1`}>
              {getStatusIcon(task.status)}
              {getStatusDisplay(task.status)}
            </Badge>
          </div>
          
          <CardTitle className="text-lg font-semibold line-clamp-2">
            {task.title}
          </CardTitle>
          
          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {task.tags.slice(0, 3).map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
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
          <div className="text-sm text-muted-foreground line-clamp-3 max-h-[60px] overflow-hidden">
            {renderDescription(task.description)}
          </div>

          {/* Task metadata */}
          <div className="space-y-2 text-sm border-t pt-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Assigned:</span>
                <span className="font-medium truncate max-w-[100px]">
                  {task.assignee_name || "Unassigned"}
                </span>
                {isAssignedToMe && (
                  <Badge variant="outline" className="text-xs">
                    You
                  </Badge>
                )}
              </div>
              
              {task.estimated_hours && (
                <Badge variant="outline" className="text-xs">
                  {task.estimated_hours}h
                </Badge>
              )}
            </div>

            {task.due_date && (
              <div className="flex items-center gap-2">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Due:</span>
                <span className={`font-medium ${new Date(task.due_date) < new Date() ? 'text-red-600' : ''}`}>
                  {new Date(task.due_date).toLocaleDateString()}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Priority:</span>
                <Badge 
                  variant="outline" 
                  className={`border-2 ${getPriorityColor(task.priority).replace('bg-', 'border-')}`}
                >
                  {getPriorityDisplay(task.priority)}
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground">
                Created {new Date(task.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-3 border-t">
            <div className="flex-1">
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
            <span className="text-xs text-muted-foreground ml-2">
              Updated {new Date(task.updated_at).toLocaleDateString()}
            </span>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Render task groups for grid view
  const renderGridGroups = () => {
    const groups = groupedTasks()
    
    return groups.map((group) => {
      // If group has only one task and module is not set, render as standalone
      if (group.tasks.length === 1 && (!group.moduleName || group.moduleName === "Uncategorized")) {
        const task = group.tasks[0]
        const isAssignedToMe = task.assigned_to === user?.id
        const isCreatedByMe = task.created_by === user?.id
        const canEdit = task.canEdit || user?.role === 'admin' || isAssignedToMe || isCreatedByMe
        
        return renderTaskCard(task, isAssignedToMe, isCreatedByMe, canEdit)
      }
      
      // Render group container for multiple tasks
      return (
        <Card key={group.moduleName} className="overflow-hidden border-2 border-green-200 dark:border-green-800">
          {/* Group Header */}
          <CardHeader className="pb-3 bg-green-50 dark:bg-green-950/30">
            <div className="flex items-center justify-between">
              <div 
                className="flex items-center gap-3 cursor-pointer flex-1"
                onClick={() => toggleGroupCollapse(group.moduleName)}
              >
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <div>
                  <CardTitle className="font-bold text-green-700 dark:text-green-300 text-lg">
                    {group.moduleName}
                  </CardTitle>
                  <CardDescription className="text-green-600 dark:text-green-400">
                    {group.tasks.length} {group.tasks.length === 1 ? 'task' : 'tasks'}
                  </CardDescription>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0"
                onClick={() => toggleGroupCollapse(group.moduleName)}
              >
                {group.isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
          
          {/* Group Content - Collapsible */}
          {!group.isCollapsed && (
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.tasks.map((task) => {
                  const isAssignedToMe = task.assigned_to === user?.id
                  const isCreatedByMe = task.created_by === user?.id
                  const canEdit = task.canEdit || user?.role === 'admin' || isAssignedToMe || isCreatedByMe
                  
                  return renderTaskCard(task, isAssignedToMe, isCreatedByMe, canEdit, false)
                })}
              </div>
            </CardContent>
          )}
        </Card>
      )
    })
  }

  // Render task groups for list view
  const renderListGroups = () => {
    const groups = groupedTasks()
    
    return (
      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {groups.map((group) => {
              // If group has only one task and module is not set, render as standalone
              if (group.tasks.length === 1 && (!group.moduleName || group.moduleName === "Uncategorized")) {
                const task = group.tasks[0]
                const isAssignedToMe = task.assigned_to === user?.id
                const isCreatedByMe = task.created_by === user?.id
                const canEdit = task.canEdit || user?.role === 'admin' || isAssignedToMe || isCreatedByMe
                
                return (
                  <div 
                    key={task.id} 
                    className={`p-4 transition-colors ${getCardBgColor(task.status).replace('border-', 'border-l-4 ')}`}
                  >
                    {/* Render standalone list item */}
                    <div className="flex items-start gap-4">
                      <div className={`w-3 h-3 rounded-full mt-2 ${
                        task.status === 'done' ? 'bg-green-500' :
                        task.status === 'in_progress' ? 'bg-yellow-500' :
                        task.status === 'review' ? 'bg-orange-500' :
                        task.status === 'paused' ? 'bg-purple-500' : 'bg-gray-500'
                      }`} />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {task.module_name && (
                            <Badge variant="outline" size="sm" className="text-xs">
                              {task.module_name}
                            </Badge>
                          )}
                          <h3 className="font-semibold truncate">{task.title}</h3>
                          {isAssignedToMe && (
                            <Badge variant="outline" className="text-xs">
                              Assigned to me
                            </Badge>
                          )}
                        </div>
                        
                        <div className="text-sm text-muted-foreground mb-2 line-clamp-2">
                          {renderDescription(task.description)}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {task.assignee_name || "Unassigned"}
                          </div>
                          {task.due_date && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Due: {new Date(task.due_date).toLocaleDateString()}
                            </div>
                          )}
                          <Badge 
                            variant="outline" 
                            className={`text-xs border-2 ${getPriorityColor(task.priority).replace('bg-', 'border-')}`}
                          >
                            {getPriorityDisplay(task.priority)}
                          </Badge>
                          {task.estimated_hours && (
                            <span>• {task.estimated_hours}h</span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2">
                          <Badge className={`${statusColors[task.status]} flex items-center gap-1`}>
                            {getStatusIcon(task.status)}
                            {getStatusDisplay(task.status)}
                          </Badge>
                          {canEdit && renderTaskActions(task, canEdit)}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              }
              
              // Render group for multiple tasks
              return (
                <div key={group.moduleName} className="border-b last:border-b-0">
                  {/* Group Header */}
                  <div className="p-4 bg-green-50 dark:bg-green-950/30 border-b">
                    <div className="flex items-center justify-between">
                      <div 
                        className="flex items-center gap-3 cursor-pointer flex-1"
                        onClick={() => toggleGroupCollapse(group.moduleName)}
                      >
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        <div>
                          <h3 className="font-bold text-green-700 dark:text-green-300">
                            {group.moduleName}
                          </h3>
                          <p className="text-sm text-green-600 dark:text-green-400">
                            {group.tasks.length} {group.tasks.length === 1 ? 'task' : 'tasks'}
                          </p>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0"
                        onClick={() => toggleGroupCollapse(group.moduleName)}
                      >
                        {group.isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  
                  {/* Group Content - Collapsible */}
                  {!group.isCollapsed && (
                    <div className="divide-y">
                      {group.tasks.map((task) => {
                        const isAssignedToMe = task.assigned_to === user?.id
                        const isCreatedByMe = task.created_by === user?.id
                        const canEdit = task.canEdit || user?.role === 'admin' || isAssignedToMe || isCreatedByMe
                        
                        return (
                          <div 
                            key={task.id} 
                            className={`p-4 transition-colors ${getCardBgColor(task.status).replace('border-', 'border-l-4 ')}`}
                          >
                            <div className="flex items-start gap-4">
                              <div className={`w-3 h-3 rounded-full mt-2 ${
                                task.status === 'done' ? 'bg-green-500' :
                                task.status === 'in_progress' ? 'bg-yellow-500' :
                                task.status === 'review' ? 'bg-orange-500' :
                                task.status === 'paused' ? 'bg-purple-500' : 'bg-gray-500'
                              }`} />

                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold truncate">{task.title}</h3>
                                {isAssignedToMe && (
                                  <Badge variant="outline" className="text-xs mt-1">
                                    Assigned to me
                                  </Badge>
                                )}
                                
                                <div className="text-sm text-muted-foreground my-2 line-clamp-2">
                                  {renderDescription(task.description)}
                                </div>

                                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    {task.assignee_name || "Unassigned"}
                                  </div>
                                  {task.due_date && (
                                    <div className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      Due: {new Date(task.due_date).toLocaleDateString()}
                                    </div>
                                  )}
                                  <Badge 
                                    variant="outline" 
                                    className={`text-xs border-2 ${getPriorityColor(task.priority).replace('bg-', 'border-')}`}
                                  >
                                    {getPriorityDisplay(task.priority)}
                                  </Badge>
                                  {task.estimated_hours && (
                                    <span>• {task.estimated_hours}h</span>
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-col items-end gap-2">
                                <div className="flex items-center gap-2">
                                  <Badge className={`${statusColors[task.status]} flex items-center gap-1`}>
                                    {getStatusIcon(task.status)}
                                    {getStatusDisplay(task.status)}
                                  </Badge>
                                  {canEdit && renderTaskActions(task, canEdit)}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Please login to view tasks</p>
          <Link href="/login">
            <Button className="mt-4">Login</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Tasks</h2>
          <p className="text-muted-foreground">
            Manage team tasks with module-based organization and rich content
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={handleCreateNew} disabled={isLoading}>
            <Plus className="h-4 w-4 mr-2" />
            New Task
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks by title, description, or module..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                disabled={isLoading}
              />
            </div>

            {/* Filter Row */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Select 
                value={statusFilter} 
                onValueChange={(v) => setStatusFilter(v as TaskStatus)}
                disabled={isLoading}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="done">Completed</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                </SelectContent>
              </Select>

              <Select 
                value={priorityFilter} 
                onValueChange={(v) => setPriorityFilter(v as Priority)}
                disabled={isLoading}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>

              <Select 
                value={moduleFilter} 
                onValueChange={setModuleFilter}
                disabled={isLoading}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Module" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modules</SelectItem>
                  {uniqueModules.map((module) => (
                    <SelectItem key={module} value={module}>
                      {module}
                    </SelectItem>
                  ))}
                  <SelectItem value="no-module">No Module</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" className="w-full sm:w-auto" disabled={isLoading}>
                <Filter className="h-4 w-4 mr-2" />
                More Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {MODULES.map((module) => (
          <Card key={module.id}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${module.color}`} />
                <div>
                  <div className="text-lg font-bold">
                    {tasks.filter(t => t.module_name === module.name).length}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{module.name}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {/* Paused tasks card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-purple-500" />
              <div>
                <div className="text-lg font-bold">
                  {taskCounts.paused}
                </div>
                <p className="text-xs text-muted-foreground truncate">Paused Tasks</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

    

      {/* Loading State */}
      {isLoading ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Loading tasks from database...</p>
            </div>
          </CardContent>
        </Card>
      ) : sortedTasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' || moduleFilter !== 'all'
                  ? "No tasks match your filters" 
                  : "No tasks found"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery ? "Try adjusting your search terms" : 
                 "Get started by creating your first task"}
              </p>
              {searchQuery === "" && statusFilter === "all" && priorityFilter === "all" && moduleFilter === "all" && (
                <Button onClick={handleCreateNew} size="lg">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Task
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        // Grid View with Grouping
        <div className="grid grid-cols-1 gap-4">
          {renderGridGroups()}
        </div>
      ) : (
        // List View with Grouping
        renderListGroups()
      )}

      {/* Enhanced Task Dialog with Rich Text Editor */}
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