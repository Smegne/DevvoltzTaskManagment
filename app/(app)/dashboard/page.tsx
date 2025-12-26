"use client"

import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Clock, AlertCircle, TrendingUp, Edit, Eye, FolderKanban, Users, Calendar, Plus, Play, PauseCircle, MoreVertical, Loader2 } from "lucide-react"
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

        // Fetch projects (if you have projects API)
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
          // Projects API might not be implemented yet, that's OK
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
        // Update task in local state
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

  // Function to render HTML description safely with rich text formatting
  const renderRichDescription = (html: string | null) => {
    if (!html) return (
      <p className="text-sm text-muted-foreground italic">No description</p>
    );
    
    // Create a safe HTML string with basic styling
    const safeHtml = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
      .replace(/on\w+="[^"]*"/g, '') // Remove event handlers
    
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

  // Status display mapping - updated for paused
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
    'todo': "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
    'in_progress': "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    'review': "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
    'done': "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    'paused': "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  }

  const priorityColors: Record<string, string> = {
    'low': "border-green-300 bg-green-50",
    'medium': "border-yellow-300 bg-yellow-50",
    'high': "border-red-300 bg-red-50",
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
            className="h-7 w-7 p-0"
            title="Change status"
          >
            {isUpdating ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <MoreVertical className="h-3 w-3" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          {statusOptions.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => handleStatusUpdate(task.id, option.value)}
              className="flex items-center gap-2 cursor-pointer text-xs"
            >
              {option.icon}
              <span>{option.label}</span>
              <Badge 
                variant="outline" 
                className={`ml-auto text-xs ${statusColors[option.value]}`}
              >
                {getStatusDisplay(option.value)}
              </Badge>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <div className="px-2 py-1.5 text-xs text-muted-foreground">
            Current: <Badge className={`text-xs ${statusColors[task.status]}`}>
              {getStatusDisplay(task.status)}
            </Badge>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  // Calculate completion percentage
  const completionPercentage = stats.total > 0 
    ? Math.round((stats.completed / stats.total) * 100)
    : 0

  // Calculate project progress (if projects have progress field, otherwise use active count)
  const projectProgress = stats.activeProjects > 0 
    ? Math.min(100, (stats.activeProjects / Math.max(projects.length, 1)) * 100)
    : 0

  // Show loading during SSR or auth loading
  if (!mounted || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-muted-foreground">Please login to view dashboard</p>
          <Link href="/login">
            <Button className="mt-4">Login</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6" suppressHydrationWarning>
      {/* Header */}
      <div>
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold">Welcome back, {user?.name}!</h2>
            <p className="text-muted-foreground">
              Role: <Badge variant="outline" className="ml-2 capitalize">{user?.role}</Badge>
              <span className="ml-4 text-sm">
                {isLoading ? "Loading..." : `Viewing ${stats.total} team tasks`}
              </span>
            </p>
          </div>
          {error && (
            <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
              {error}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          {user?.role === 'admin' 
            ? 'You have admin access to all tasks and projects' 
            : 'You can view all team tasks and edit your assigned tasks'}
        </p>
      </div>

      {/* Main Stats Grid - Updated for paused */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Team Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{stats.total}</span>
              <span className="text-sm text-muted-foreground">total</span>
            </div>
            <Progress value={completionPercentage} className="h-2 mt-2" />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{stats.completed} completed</span>
              <span>{stats.paused} paused</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              My Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{stats.myTasks}</span>
              <span className="text-sm text-muted-foreground">assigned</span>
            </div>
            <div className="mt-2 flex gap-1">
              <Badge variant="outline" className="text-green-600 border-green-200 text-xs">
                {stats.myCompleted} done
              </Badge>
              <Badge variant="outline" className="text-blue-600 border-blue-200 text-xs">
                {myTasks.filter(t => t.status === 'in_progress').length} active
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              Priority Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-red-600 font-medium">High: {stats.highPriority}</span>
                <span className="text-muted-foreground">Medium: {stats.mediumPriority}</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-red-500" 
                  style={{ width: `${(stats.highPriority / Math.max(stats.total, 1)) * 100}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.overdue} overdue tasks
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FolderKanban className="h-4 w-4 text-purple-500" />
              Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{stats.activeProjects}</span>
              <span className="text-sm text-muted-foreground">active</span>
            </div>
            <Progress value={projectProgress} className="h-2 mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {projects.length} total projects
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Team Tasks */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Team Tasks</CardTitle>
                <CardDescription>
                  Latest tasks from all team members
                </CardDescription>
              </div>
              <Link href="/tasks">
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : recentTasks.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No tasks created yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Be the first to create a task for your team!
                </p>
                <Link href="/tasks/new">
                  <Button className="mt-4">Create First Task</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentTasks.map((task) => {
                  const isAssignedToMe = task.assigned_to === user?.id
                  const isCreatedByMe = task.created_by === user?.id
                  const canEdit = task.canEdit || user?.role === 'admin' || isAssignedToMe || isCreatedByMe

                  return (
                    <div 
                      key={task.id} 
                      className={`p-3 rounded-lg border-l-4 transition-all duration-200 hover:shadow-md ${priorityColors[task.priority] || 'border-gray-300'}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="font-medium truncate text-gray-900 dark:text-gray-100">{task.title}</p>
                            {isAssignedToMe && (
                              <Badge variant="outline" className="text-xs">
                                Assigned to me
                              </Badge>
                            )}
                          </div>
                          
                          {/* Rich text description */}
                          <div className="mb-3 min-h-[40px] max-h-[60px] overflow-hidden">
                            {renderRichDescription(task.description)}
                          </div>
                          
                          {/* Task metadata */}
                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            {task.creator_name && (
                              <div className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                <span className="truncate max-w-[80px]">{task.creator_name}</span>
                              </div>
                            )}
                            {task.due_date && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span className={new Date(task.due_date) < new Date() && task.status !== 'done' ? 'text-red-600 font-medium' : ''}>
                                  Due: {new Date(task.due_date).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${priorityColors[task.priority].replace('bg-', 'border-')}`}
                            >
                              {priorityDisplay[task.priority]}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end gap-2">
                          <div className="flex items-center gap-1">
                            <Badge 
                              className={`${statusColors[task.status]} flex items-center gap-1`}
                            >
                              {getStatusIcon(task.status)}
                              {getStatusDisplay(task.status)}
                            </Badge>
                            {canEdit && renderTaskStatusDropdown(task)}
                          </div>
                          
                          <div className="flex gap-1">
                            {/* Edit button - only for users who can edit */}
                            {canEdit ? (
                              <Link href={`/tasks/edit/${task.id}`}>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="h-7 w-7 p-0"
                                  title="Edit task"
                                >
                         
                                </Button>
                              </Link>
                            ) : null}
                            
                            {/* View button - opens modal */}
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-7 w-7 p-0"
                              title="View task details"
                              onClick={() => setViewingTask(task)}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* My Tasks & Quick Stats */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>My Tasks Overview</CardTitle>
            <CardDescription>
              Tasks assigned to you
            </CardDescription>
          </CardHeader>
          <CardContent>
            {myTasks.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No tasks assigned to you</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Ask your team lead to assign you tasks
                </p>
                <Link href="/tasks">
                  <Button className="mt-4">Browse Available Tasks</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Task Status Breakdown */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <div className="text-2xl font-bold text-gray-700">{myTasks.filter(t => t.status === 'todo').length}</div>
                    <p className="text-sm text-gray-600">To Do</p>
                  </div>
                  <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                    <div className="text-2xl font-bold text-yellow-700">{myTasks.filter(t => t.status === 'in_progress').length}</div>
                    <p className="text-sm text-yellow-600">Active</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                    <div className="text-2xl font-bold text-green-700">{myTasks.filter(t => t.status === 'done').length}</div>
                    <p className="text-sm text-green-600">Done</p>
                  </div>
                </div>

                {/* My Tasks List with Rich Text */}
                <div>
                  <h4 className="font-medium mb-2">My Tasks</h4>
                  <div className="space-y-2">
                    {myTasks
                      .sort((a, b) => {
                        // Sort by priority first, then due date
                        const priorityOrder = { high: 0, medium: 1, low: 2 };
                        const priorityDiff = (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3);
                        if (priorityDiff !== 0) return priorityDiff;
                        
                        if (a.due_date && b.due_date) {
                          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
                        }
                        return 0;
                      })
                      .slice(0, 4)
                      .map(task => {
                        const isUpdating = isUpdatingStatus === task.id;
                        const statusOptions = getNextStatusOptions(task.status);
                        
                        return (
                          <div key={task.id} className="group p-3 hover:bg-accent rounded-lg border transition-all duration-200">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Button 
                                    variant="link" 
                                    className="text-sm font-medium truncate hover:text-primary transition-colors p-0 h-auto"
                                    onClick={() => setViewingTask(task)}
                                  >
                                    {task.title}
                                  </Button>
                                  {task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done' && (
                                    <Badge variant="outline" className="text-xs text-red-600">
                                      Overdue
                                    </Badge>
                                  )}
                                </div>
                                
                                {/* Rich text description preview */}
                                <div className="mb-2 max-h-[40px] overflow-hidden">
                                  {renderRichDescription(task.description)}
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  <Badge className={`text-xs ${statusColors[task.status]} flex items-center gap-1`}>
                                    {getStatusIcon(task.status)}
                                    {getStatusDisplay(task.status)}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-1">
                                {/* View button */}
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="View task details"
                                  onClick={() => setViewingTask(task)}
                                >
                                  <Eye className="h-3 w-3" />
                                </Button>
                                
                                {/* Status dropdown */}
                                {statusOptions.length > 0 && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        disabled={isUpdating}
                                        className="h-7 w-7 p-0"
                                      >
                                        {isUpdating ? (
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                          <MoreVertical className="h-3 w-3" />
                                        )}
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-40">
                                      {statusOptions.map((option) => (
                                        <DropdownMenuItem
                                          key={option.value}
                                          onClick={() => handleStatusUpdate(task.id, option.value)}
                                          className="flex items-center gap-2 cursor-pointer text-xs"
                                        >
                                          {option.icon}
                                          <span>{option.label}</span>
                                          <Badge 
                                            variant="outline" 
                                            className={`ml-auto text-xs ${statusColors[option.value]}`}
                                          >
                                            {getStatusDisplay(option.value)}
                                          </Badge>
                                        </DropdownMenuItem>
                                      ))}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </div>

                {/* Quick Actions */}
                <div>
                  <h4 className="font-medium mb-2">Quick Actions</h4>
                  <div className="flex flex-wrap gap-2">
                    <Link href="/tasks/new">
                      <Button size="sm">
                        <Plus className="h-3 w-3 mr-1" />
                        New Task
                      </Button>
                    </Link>
                    <Link href="/tasks">
                      <Button variant="outline" size="sm">
                        View All Tasks
                      </Button>
                    </Link>
                    {user?.role === 'admin' && (
                      <Link href="/projects">
                        <Button variant="outline" size="sm">
                          Manage Projects
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Database Info Footer */}
      <div className="text-center text-sm text-muted-foreground pt-4 border-t">
        <p>
        {tasks.length} tasks stored • {projects.length} projects • 
          Last updated: {new Date().toLocaleTimeString()}
        </p>
        <p className="text-xs mt-1">
          {stats.completed} completed • {stats.inProgress} in progress • {stats.paused} paused
        </p>
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