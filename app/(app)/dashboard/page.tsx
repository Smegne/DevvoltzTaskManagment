"use client"

import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Clock, AlertCircle, TrendingUp, Edit, Eye, FolderKanban, Users, Calendar, Plus, Play, PauseCircle, MoreVertical, Loader2, ChevronRight, Activity, Target, BarChart3, Filter, Zap, Star, Trophy, Bell, Search, Download, Share2, User, ChevronDown, MessageSquare, Briefcase, TrendingDown, Award, CheckCheck, XCircle, FileText, Clock4, FolderOpen, CheckSquare } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useEffect, useState, useMemo } from "react"
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
import { TaskDialog } from "@/components/task-dialog" // Import TaskDialog
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

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
  creator_email?: string
  assignee_name?: string
  assignee_email?: string
  project_name?: string
  canEdit?: boolean
  module_name?: string
  tags?: string[]
  estimated_hours?: number
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

interface TeamMember {
  id: number
  name: string
  email: string
  role: string
  taskCount?: number
  createdCount?: number
  assignedCount?: number
  completedCount?: number
  pendingCount?: number
  inProgressCount?: number
  overdueCount?: number
  lastActive?: string
}

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [tasks, setTasks] = useState<DatabaseTask[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<number | null>(null)
  
  const [viewingTask, setViewingTask] = useState<DatabaseTask | null>(null)
  const [editingTask, setEditingTask] = useState<DatabaseTask | null>(null) // Edit modal state
  const [isSubmittingTask, setIsSubmittingTask] = useState(false) // For TaskDialog submission
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterUser, setFilterUser] = useState<string>("all")
  const [filterPriority, setFilterPriority] = useState<string>("all")
  const [activeTab, setActiveTab] = useState<"overview" | "team" | "projects" | "performance">("overview")
  const [timeRange, setTimeRange] = useState<"today" | "week" | "month" | "all">("week")
  const [viewMode, setViewMode] = useState<"list" | "grid">("list")

  // Set mounted state to prevent SSR issues
  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch tasks, projects, and team members from API
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
          setTeamMembers([])
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

        // Fetch team members
        try {
          const usersResponse = await fetch('/api/tasks?type=users', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (usersResponse.ok) {
            const usersData = await usersResponse.json();
            if (usersData.success && usersData.data) {
              const members = usersData.data.users.map((u: any) => ({
                id: u.id,
                name: u.name,
                email: u.email,
                role: u.role
              }));
              setTeamMembers(members);
            }
          }
        } catch (usersError) {
          console.warn('Users API not available:', usersError);
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

  // Handle edit task request from modal
  const handleEditTask = (task: DatabaseTask) => {
    console.log("Edit task requested:", task);
    
    // Close the view modal
    setViewingTask(null);
    
    // Open the edit dialog with the task data
    setEditingTask(task);
  };

  // Handle task save from TaskDialog
  const handleSaveTask = async (taskData: any) => {
    try {
      setIsSubmittingTask(true);
      const token = localStorage.getItem('auth_token');
      
      // Check if it's an update (has id) or create (no id)
      const isUpdate = taskData.id !== undefined;
      const url = isUpdate ? `/api/tasks/${taskData.id}` : '/api/tasks';
      const method = isUpdate ? 'PUT' : 'POST';
      
      console.log(`${isUpdate ? 'Updating' : 'Creating'} task:`, taskData);
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(taskData)
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        toast.success(isUpdate ? 'Task updated successfully!' : 'Task created successfully!');
        
        // Refresh tasks list
        const tasksResponse = await fetch('/api/tasks', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (tasksResponse.ok) {
          const tasksData = await tasksResponse.json();
          if (tasksData.success && tasksData.data) {
            setTasks(tasksData.data.tasks || []);
          }
        }
        
        // Close the edit modal
        setEditingTask(null);
        
        // If we were editing a task that was being viewed, update it
        if (isUpdate && viewingTask && viewingTask.id === taskData.id) {
          setViewingTask(prev => prev ? { ...prev, ...taskData } : null);
        }
      } else {
        toast.error(data.error || `Failed to ${isUpdate ? 'update' : 'create'} task`);
      }
    } catch (error: any) {
      console.error('Task save error:', error);
      toast.error(error.message || 'Network error. Please try again.');
    } finally {
      setIsSubmittingTask(false);
    }
  };

  // Calculate team member statistics
  const teamMemberStats = useMemo(() => {
    if (!teamMembers.length || !tasks.length) return [];

    return teamMembers.map(member => {
      const memberTasks = tasks.filter(task => 
        task.created_by === member.id || task.assigned_to === member.id
      );
      
      return {
        ...member,
        taskCount: memberTasks.length,
        createdCount: tasks.filter(t => t.created_by === member.id).length,
        assignedCount: tasks.filter(t => t.assigned_to === member.id).length,
        completedCount: memberTasks.filter(t => t.status === 'done').length,
        pendingCount: memberTasks.filter(t => t.status !== 'done').length,
        inProgressCount: memberTasks.filter(t => t.status === 'in_progress').length,
        overdueCount: memberTasks.filter(t => 
          t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done'
        ).length,
        lastActive: memberTasks
          .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0]?.updated_at || null
      };
    }).sort((a, b) => b.taskCount - a.taskCount);
  }, [teamMembers, tasks]);

  // Filter tasks based on search and filters
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Search filter
      const matchesSearch = searchQuery === "" || 
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (task.creator_name && task.creator_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (task.assignee_name && task.assignee_name.toLowerCase().includes(searchQuery.toLowerCase()))
      
      // Status filter
      const matchesFilter = filterStatus === "all" || task.status === filterStatus
      
      // User filter
      const matchesUser = filterUser === "all" || 
        task.created_by?.toString() === filterUser || 
        task.assigned_to?.toString() === filterUser
      
      // Priority filter
      const matchesPriority = filterPriority === "all" || task.priority === filterPriority
      
      // Time range filter
      const taskDate = new Date(task.created_at);
      const now = new Date();
      let matchesTime = true;
      
      switch (timeRange) {
        case "today":
          matchesTime = taskDate.toDateString() === now.toDateString();
          break;
        case "week":
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchesTime = taskDate >= weekAgo;
          break;
        case "month":
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          matchesTime = taskDate >= monthAgo;
          break;
        case "all":
          matchesTime = true;
          break;
      }
      
      return matchesSearch && matchesFilter && matchesUser && matchesPriority && matchesTime;
    });
  }, [tasks, searchQuery, filterStatus, filterUser, filterPriority, timeRange]);

  // Get recent tasks (for overview)
  const recentTasks = [...filteredTasks]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10)

  // Get my tasks
  const myTasks = tasks.filter(t => t.assigned_to === user?.id)

  // Calculate stats - updated to include team insights
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
    teamMembers: teamMemberStats.length,
    teamTasks: teamMemberStats.reduce((sum, member) => sum + (member.taskCount || 0), 0),
    teamCompleted: teamMemberStats.reduce((sum, member) => sum + (member.completedCount || 0), 0),
  }

  // Calculate completion percentage
  const completionPercentage = stats.total > 0 
    ? Math.round((stats.completed / stats.total) * 100)
    : 0

  const teamCompletionPercentage = stats.teamTasks > 0
    ? Math.round((stats.teamCompleted / stats.teamTasks) * 100)
    : 0

  // Handle status update
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
        body: JSON.stringify({ status: newStatus })
      })

      const data = await response.json()
      
      if (response.ok && data.success) {
        // Animate task update
        const taskElement = document.getElementById(`task-${taskId}`);
        if (taskElement) {
          taskElement.classList.add('animate-update-pulse');
          setTimeout(() => {
            taskElement.classList.remove('animate-update-pulse');
          }, 1000);
        }
        
        setTasks(prev => prev.map(task => 
          task.id === taskId ? { ...task, status: newStatus, updated_at: new Date().toISOString() } : task
        ))
        toast.success(`Task status updated to ${getStatusDisplay(newStatus)}`);
      } else {
        toast.error(data.error || 'Failed to update task status');
      }
    } catch (error: any) {
      console.error('🔴 Network error:', error);
      toast.error(error.message || 'Failed to update task status');
    } finally {
      setIsUpdatingStatus(null);
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

  // Status display mapping
  const getStatusDisplay = (status: string) => {
    const statusMap: Record<string, string> = {
      'todo': 'To Do',
      'in_progress': 'In Progress',
      'review': 'Review',
      'done': 'Completed',
      'paused': 'Paused'
    }
    return statusMap[status] || status;
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
        return <Play className="h-3 w-3" />;
      case 'done':
        return <CheckCircle2 className="h-3 w-3" />;
      case 'paused':
        return <PauseCircle className="h-3 w-3" />;
      case 'review':
        return <Edit className="h-3 w-3" />;
      default:
        return <FileText className="h-3 w-3" />;
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
    const isUpdating = isUpdatingStatus === task.id;
    const statusOptions = getNextStatusOptions(task.status);
    const canEdit = task.canEdit || user?.role === 'admin' || task.assigned_to === user?.id || task.created_by === user?.id;

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

  // Get user initials for avatar
  const getUserInitials = (name: string) => {
    if (!name) return "U";
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  // Get user color based on ID
  const getUserColor = (id: number) => {
    const colors = [
      "from-blue-500 to-cyan-500",
      "from-purple-500 to-pink-500",
      "from-green-500 to-emerald-500",
      "from-orange-500 to-red-500",
      "from-indigo-500 to-purple-500",
      "from-pink-500 to-rose-500",
      "from-teal-500 to-cyan-500",
      "from-yellow-500 to-amber-500"
    ];
    return colors[id % colors.length];
  }

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
                  Team Dashboard
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-gray-500 dark:text-gray-400">
                    {isLoading ? "Syncing data..." : 
                     `${stats.teamMembers} members • ${stats.teamTasks} tasks • ${stats.teamCompleted} completed`}
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
                placeholder="Search tasks or members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="glass-input pl-9 pr-4 py-2 rounded-xl border border-white/20 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 w-full md:w-64"
              />
            </div>
            <Link href="/team">
              <Button variant="outline" className="border-white/20">
                <Users className="h-4 w-4 mr-2" />
                View All Members
              </Button>
            </Link>
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
            value: stats.teamTasks,
            icon: <Users className="h-5 w-5" />,
            color: "from-blue-500 to-cyan-500",
            progress: teamCompletionPercentage,
            label: `${stats.teamCompleted} completed • ${stats.teamMembers} members`
          },
          {
            title: "Active Now",
            value: stats.inProgress,
            icon: <Activity className="h-5 w-5" />,
            color: "from-purple-500 to-pink-500",
            progress: stats.total > 0 ? Math.round((stats.inProgress / stats.total) * 100) : 0,
            label: `${stats.todo} pending • ${stats.review} in review`
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
            title: "Team Performance",
            value: `${teamCompletionPercentage}%`,
            icon: <TrendingUp className="h-5 w-5" />,
            color: "from-green-500 to-emerald-500",
            progress: teamCompletionPercentage,
            label: `On track • ${stats.teamCompleted}/${stats.teamTasks} done`
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
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {stat.title.includes('%') ? 'complete' : 'total'}
                  </span>
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
      <div className="space-y-6">
        {/* Tabs and Filters */}
        <div className="glass-morphism rounded-2xl p-6 backdrop-blur-xl border border-white/20">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-blue-500" />
                Team Overview
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Track what everyone is working on
              </p>
            </div>
            
           <Tabs 
  value={activeTab} 
  onValueChange={(v) => setActiveTab(v as any)} 
  className="w-full"
>
  <TabsList className="glass-morphism border border-white/20 w-full lg:w-auto overflow-x-auto flex flex-nowrap lg:flex-wrap">
    {/* Overview Tab */}
    <TabsTrigger 
      value="overview" 
      className="flex items-center gap-1 sm:gap-2 px-3 py-2 text-xs sm:text-sm min-w-[80px] sm:min-w-[100px] flex-shrink-0"
    >
      <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
      <span className="hidden xs:inline">Overview</span>
      <span className="xs:hidden">View</span>
    </TabsTrigger>
    
    {/* Team Tab */}
    <TabsTrigger 
      value="team" 
      className="flex items-center gap-1 sm:gap-2 px-3 py-2 text-xs sm:text-sm min-w-[80px] sm:min-w-[100px] flex-shrink-0"
    >
      <Users className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
      <span className="hidden xs:inline">Team</span>
      <span className="xs:hidden">Team</span>
      <Badge 
        variant="outline" 
        className="h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center p-0 ml-1 text-[10px] sm:text-xs font-bold border-white/30 bg-white/10"
      >
        {stats.teamMembers > 9 ? '9+' : stats.teamMembers}
      </Badge>
    </TabsTrigger>
    
    {/* Projects Tab */}
    <TabsTrigger 
      value="projects" 
      className="flex items-center gap-1 sm:gap-2 px-3 py-2 text-xs sm:text-sm min-w-[80px] sm:min-w-[100px] flex-shrink-0"
    >
      <FolderKanban className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
      <span className="hidden xs:inline">Projects</span>
      <span className="xs:hidden">Proj</span>
    </TabsTrigger>
    
    {/* Performance Tab */}
    <TabsTrigger 
      value="performance" 
      className="flex items-center gap-1 sm:gap-2 px-3 py-2 text-xs sm:text-sm min-w-[80px] sm:min-w-[100px] flex-shrink-0"
    >
      <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
      <span className="hidden xs:inline">Performance</span>
      <span className="xs:hidden">Perf</span>
    </TabsTrigger>
  </TabsList>
</Tabs>
          </div>

          {/* Filters Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Filter by Status</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
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

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Filter by Team Member</label>
              <Select value={filterUser} onValueChange={setFilterUser}>
                <SelectTrigger className="glass-input border-white/20">
                  <SelectValue placeholder="All Members" />
                </SelectTrigger>
                <SelectContent className="glass-morphism border-white/20 backdrop-blur-xl max-h-[300px]">
                  <SelectItem value="all">All Team Members</SelectItem>
                  {teamMemberStats.map(member => (
                    <SelectItem key={member.id} value={member.id.toString()}>
                      <div className="flex items-center gap-2">
                        <div className={`h-6 w-6 rounded-full bg-gradient-to-r ${getUserColor(member.id)} flex items-center justify-center text-xs text-white`}>
                          {getUserInitials(member.name)}
                        </div>
                        <span>{member.name}</span>
                        <Badge className="ml-auto text-xs">{member.taskCount}</Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Filter by Priority</label>
              <Select value={filterPriority} onValueChange={setFilterPriority}>
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

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Time Range</label>
              <Select value={timeRange} onValueChange={setTimeRange as any}>
                <SelectTrigger className="glass-input border-white/20">
                  <SelectValue placeholder="This Week" />
                </SelectTrigger>
                <SelectContent className="glass-morphism border-white/20 backdrop-blur-xl">
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
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
                <FileText className="h-4 w-4" />
                <span className="ml-2">List</span>
              </Button>
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
                <CheckSquare className="h-4 w-4" />
                <span className="ml-2">Grid</span>
              </Button>
            </div>
            
            <div className="text-sm text-gray-500">
              Showing {filteredTasks.length} of {stats.total} tasks
              {filterUser !== "all" && ` • Filtered by ${teamMemberStats.find(m => m.id.toString() === filterUser)?.name}`}
            </div>
          </div>
        </div>

        {/* Content based on active tab */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Tasks */}
            <Card className="glass-morphism border-white/20 shadow-xl lg:col-span-2">
              <CardHeader className="bg-gradient-to-r from-blue-500/5 to-cyan-500/5">
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-blue-500" />
                  Recent Team Activity
                </CardTitle>
                <CardDescription>
                  Latest tasks from your team members
                </CardDescription>
              </CardHeader>
             <CardContent className="p-0">
  {isLoading ? (
    <div className="flex items-center justify-center py-8 sm:py-10 md:py-12">
      <div className="flex flex-col items-center gap-2 sm:gap-3">
        <div className="h-6 w-6 sm:h-8 sm:w-8 animate-spin rounded-full border-3 sm:border-4 border-primary/30 border-t-primary"></div>
        <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
          Loading team activity...
        </p>
      </div>
    </div>
  ) : recentTasks.length === 0 ? (
    <div className="text-center py-8 sm:py-10 md:py-12 px-4">
      <div className="mx-auto h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 rounded-full bg-gradient-to-r from-blue-500/10 to-cyan-500/10 flex items-center justify-center mb-3 sm:mb-4">
        <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 text-gray-400" />
      </div>
      <h3 className="text-base sm:text-lg md:text-xl font-semibold mb-1.5 sm:mb-2 text-gray-900 dark:text-gray-100">
        No team activity yet
      </h3>
      <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mb-4 sm:mb-5 md:mb-6 max-w-xs sm:max-w-sm mx-auto">
        Be the first to create a task and share it with your team!
      </p>
      <Link href="/tasks" className="inline-block">
        <Button className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-sm sm:text-base px-4 py-2 h-10 sm:h-11">
          <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
          Create New Task
        </Button>
      </Link>
    </div>
  ) : (
    <div className="divide-y divide-gray-200/50 dark:divide-gray-700/50">
      <AnimatePresence>
        {recentTasks.map((task) => {
          const isAssignedToMe = task.assigned_to === user?.id;
          const isCreatedByMe = task.created_by === user?.id;
          
          return (
            <motion.div
              key={task.id}
              id={`task-${task.id}`}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className={`p-3 sm:p-4 hover:bg-gradient-to-r hover:from-blue-500/5 hover:to-cyan-500/5 transition-all duration-300 group ${priorityColors[task.priority]}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
                {/* Left Content - Task Info */}
                <div className="flex-1 min-w-0">
                  {/* User Info Row */}
                  <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-3">
                    <div className="flex-shrink-0">
                      <div className={`h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 rounded-full bg-gradient-to-r ${getUserColor(task.created_by || 0)} flex items-center justify-center text-white text-xs sm:text-sm font-medium`}>
                        {task.creator_name ? getUserInitials(task.creator_name) : '?'}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      {/* Task Title and Badges */}
                      <div className="flex flex-col xs:flex-row xs:items-center gap-1 xs:gap-2 mb-1 sm:mb-2">
                        <h4 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                          {task.title}
                        </h4>
                        
                        <div className="flex flex-wrap gap-1">
                          {isAssignedToMe && (
                            <Badge className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-xs px-1.5 py-0 h-5">
                              Assigned to me
                            </Badge>
                          )}
                          {isCreatedByMe && (
                            <Badge className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 text-green-600 dark:text-green-400 border-green-500/20 text-xs px-1.5 py-0 h-5">
                              Created by me
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* User Info */}
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-2">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span className="truncate max-w-[100px] xs:max-w-[150px] sm:max-w-[200px]">
                            {task.creator_name || 'Unknown'}
                          </span>
                        </span>
                        {task.assignee_name && task.assignee_name !== task.creator_name && (
                          <>
                            <ChevronRight className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-gray-400" />
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              <span className="truncate max-w-[100px] xs:max-w-[150px] sm:max-w-[200px]">
                                {task.assignee_name}
                              </span>
                            </span>
                          </>
                        )}
                      </div>

                      {/* Task Description */}
                      <div className="mb-2 sm:mb-3">
                        {renderRichDescription(task.description)}
                      </div>

                      {/* Task Details */}
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        {task.due_date && (
                          <div className={`flex items-center gap-1.5 text-xs sm:text-sm ${
                            new Date(task.due_date) < new Date() && task.status !== 'done' 
                              ? 'text-red-500 font-medium' 
                              : 'text-gray-500 dark:text-gray-400'
                          }`}>
                            <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                            <span className="whitespace-nowrap">
                              Due: {new Date(task.due_date).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                        
                        <Badge 
                          className={`bg-gradient-to-r ${priorityColors[task.priority]} border-none text-xs px-2 py-0.5 h-5`}
                        >
                          {priorityDisplay[task.priority]}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Content - Status and Actions */}
                <div className="flex items-start justify-between sm:justify-end gap-2 sm:gap-3 self-end sm:self-start">
                  {/* Status Badge */}
                  <Badge className={cn(
                    "flex items-center gap-1.5 text-xs sm:text-sm px-2 py-0.5 h-5 sm:h-6",
                    statusColors[task.status],
                    "flex-shrink-0"
                  )}>
                    {getStatusIcon(task.status)}
                    <span className="hidden xs:inline">
                      {getStatusDisplay(task.status)}
                    </span>
                    <span className="xs:hidden">
                      {getStatusDisplay(task.status).split(' ')[0]}
                    </span>
                  </Badge>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center gap-1 sm:gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300">
                    <Button 
                      size="sm" 
                      variant="ghost"
                      className="h-7 w-7 sm:h-8 sm:w-8 p-0 rounded-full hover:bg-white/10 flex-shrink-0"
                      title="View task details"
                      onClick={() => setViewingTask(task)}
                      aria-label="View task details"
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

            {/* Team Members Overview */}
            <Card className="glass-morphism border-white/20 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-purple-500/5 to-pink-500/5">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-500" />
                  Team Members
                </CardTitle>
                <CardDescription>
                  Task distribution across team
                </CardDescription>
              </CardHeader>
              <CardContent>
                {teamMemberStats.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="mx-auto h-12 w-12 rounded-full bg-gradient-to-r from-purple-500/10 to-pink-500/10 flex items-center justify-center mb-4">
                      <Users className="h-6 w-6 text-gray-400" />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400">No team members found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {teamMemberStats.slice(0, 5).map((member) => (
                      <div 
                        key={member.id}
                        className="p-3 rounded-lg bg-gradient-to-r from-white/5 to-transparent hover:from-white/10 border border-white/10 transition-all duration-300"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-full bg-gradient-to-r ${getUserColor(member.id)} flex items-center justify-center text-white font-medium`}>
                            {getUserInitials(member.name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="font-medium truncate">{member.name}</h4>
                              <Badge className="text-xs capitalize">{member.role}</Badge>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                              <span className="flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                {member.completedCount || 0} done
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {member.pendingCount || 0} pending
                              </span>
                            </div>
                          </div>
                        </div>
                        {member.taskCount && member.taskCount > 0 && (
                          <div className="mt-2">
                            <div className="flex justify-between text-xs mb-1">
                              <span>Progress</span>
                              <span>{member.completedCount}/{member.taskCount}</span>
                            </div>
                            <Progress 
                              value={member.completedCount && member.taskCount ? 
                                (member.completedCount / member.taskCount) * 100 : 0} 
                              className="h-1.5 bg-gray-200/50 dark:bg-gray-700/50"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                    
                    <div className="pt-4 border-t border-white/10">
                      <Link href="/team">
                        <Button variant="outline" className="w-full border-white/20">
                          <Users className="h-4 w-4 mr-2" />
                          View All Team Members
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "team" && (
          <Card className="glass-morphism border-white/20 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-green-500/5 to-emerald-500/5">
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-green-500" />
                Team Performance Dashboard
              </CardTitle>
              <CardDescription>
                Detailed breakdown of team member contributions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {teamMemberStats.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mx-auto h-16 w-16 rounded-full bg-gradient-to-r from-green-500/10 to-emerald-500/10 flex items-center justify-center mb-4">
                    <Users className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No team data available</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-6">
                    Team members and tasks will appear here once created
                  </p>
                  <Link href="/team">
                    <Button className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600">
                      <Users className="h-4 w-4 mr-2" />
                      Go to Team Members
                    </Button>
                  </Link>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto mb-6">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Team Member</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Role</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Total Tasks</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Created</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Assigned</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Completed</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Completion Rate</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {teamMemberStats.map((member) => {
                          const completionRate = member.taskCount && member.completedCount ? 
                            Math.round((member.completedCount / member.taskCount) * 100) : 0;
                          
                          return (
                            <tr key={member.id} className="hover:bg-white/5 transition-colors">
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-3">
                                  <div className={`h-8 w-8 rounded-full bg-gradient-to-r ${getUserColor(member.id)} flex items-center justify-center text-white text-xs font-medium`}>
                                    {getUserInitials(member.name)}
                                  </div>
                                  <div>
                                    <div className="font-medium">{member.name}</div>
                                    <div className="text-xs text-gray-500 truncate max-w-[150px]">
                                      {member.email}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <Badge className={`capitalize ${
                                  member.role === 'admin' 
                                    ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' 
                                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                }`}>
                                  {member.role}
                                </Badge>
                              </td>
                              <td className="py-3 px-4">
                                <div className="font-semibold">{member.taskCount || 0}</div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="text-sm">{member.createdCount || 0}</div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="text-sm">{member.assignedCount || 0}</div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-1">
                                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                                  <span className="font-medium text-green-600 dark:text-green-400">
                                    {member.completedCount || 0}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 max-w-[80px]">
                                    <Progress 
                                      value={completionRate} 
                                      className="h-2 bg-gray-200/50 dark:bg-gray-700/50"
                                    />
                                  </div>
                                  <span className={`text-sm font-medium ${
                                    completionRate >= 80 ? 'text-green-600' :
                                    completionRate >= 50 ? 'text-yellow-600' : 'text-red-600'
                                  }`}>
                                    {completionRate}%
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setFilterUser(member.id.toString());
                                      setActiveTab("overview");
                                    }}
                                    className="text-xs h-7 border-white/20"
                                  >
                                    View Tasks
                                  </Button>
                                  <Link href="/team">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 w-7 p-0"
                                    >
                                      <ChevronRight className="h-3 w-3" />
                                    </Button>
                                  </Link>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="pt-4 border-t border-white/10">
                    <Link href="/team">
                      <Button className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600">
                        <Users className="h-4 w-4 mr-2" />
                        View Complete Team Dashboard
                      </Button>
                    </Link>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "projects" && (
          <Card className="glass-morphism border-white/20 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-orange-500/5 to-red-500/5">
              <CardTitle className="flex items-center gap-2">
                <FolderKanban className="h-5 w-5 text-orange-500" />
                Team Projects
              </CardTitle>
              <CardDescription>
                Projects and initiatives across the team
              </CardDescription>
            </CardHeader>
            <CardContent>
              {projects.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mx-auto h-16 w-16 rounded-full bg-gradient-to-r from-orange-500/10 to-red-500/10 flex items-center justify-center mb-4">
                    <FolderKanban className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-6">
                    Create your first project to organize team tasks
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {projects.map((project) => (
                    <Card key={project.id} className="border-white/20 bg-gradient-to-br from-white/5 to-transparent">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{project.name}</CardTitle>
                          <Badge className={
                            project.status === 'active' ? 'bg-green-500/20 text-green-600' :
                            project.status === 'completed' ? 'bg-blue-500/20 text-blue-600' :
                            'bg-gray-500/20 text-gray-600'
                          }>
                            {project.status}
                          </Badge>
                        </div>
                        <CardDescription className="line-clamp-2">
                          {project.description || 'No description'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <User className="h-4 w-4" />
                            <span>Owner: {project.user_name || 'Unassigned'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Calendar className="h-4 w-4" />
                            <span>Created: {new Date(project.created_at).toLocaleDateString()}</span>
                          </div>
                          <div className="pt-3 border-t border-white/10">
                            <Link href={`/projects/${project.id}`}>
                              <Button variant="outline" size="sm" className="w-full border-white/20">
                                View Project
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "performance" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="glass-morphism border-white/20 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                  Team Productivity Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Overall Completion</span>
                      <span className="font-semibold">{teamCompletionPercentage}%</span>
                    </div>
                    <Progress value={teamCompletionPercentage} className="h-3" />
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">On-time Delivery</span>
                      <span className="font-semibold">
                        {stats.overdue === 0 ? '100%' : `${Math.max(0, 100 - (stats.overdue / stats.total) * 100)}%`}
                      </span>
                    </div>
                    <Progress 
                      value={Math.max(0, 100 - (stats.overdue / stats.total) * 100)} 
                      className="h-3 bg-gray-200/50 dark:bg-gray-700/50" 
                    />
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Active Engagement</span>
                      <span className="font-semibold">
                        {stats.teamMembers > 0 ? Math.round((stats.inProgress + stats.review) / stats.teamMembers) : 0} tasks/member
                      </span>
                    </div>
                    <div className="h-3 bg-gray-200/50 dark:bg-gray-700/50 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-1000"
                        style={{ width: `${Math.min(100, (stats.inProgress + stats.review) / stats.teamMembers * 20)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-morphism border-white/20 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-amber-500" />
                  Top Performers
                </CardTitle>
              </CardHeader>
              <CardContent>
                {teamMemberStats.slice(0, 3).map((member, index) => {
                  const completionRate = member.taskCount && member.completedCount ? 
                    Math.round((member.completedCount / member.taskCount) * 100) : 0;
                  
                  return (
                    <div key={member.id} className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-white/5 to-transparent hover:from-white/10 transition-all duration-300 mb-3">
                      <div className="relative">
                        <div className={`h-10 w-10 rounded-full bg-gradient-to-r ${getUserColor(member.id)} flex items-center justify-center text-white font-medium`}>
                          {getUserInitials(member.name)}
                        </div>
                        {index === 0 && (
                          <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 flex items-center justify-center">
                            <Trophy className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium">{member.name}</h4>
                          <span className={`text-sm font-semibold ${
                            completionRate >= 80 ? 'text-green-600' :
                            completionRate >= 50 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {completionRate}%
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                          <span>{member.taskCount || 0} tasks</span>
                          <span>{member.completedCount || 0} completed</span>
                          <span>{member.overdueCount || 0} overdue</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {teamMemberStats.length === 0 && (
                  <div className="text-center py-8">
                    <div className="mx-auto h-12 w-12 rounded-full bg-gradient-to-r from-amber-500/10 to-yellow-500/10 flex items-center justify-center mb-4">
                      <Award className="h-6 w-6 text-gray-400" />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400">No team data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Task View Modal - This passes the function to TaskViewModal via onEditRequest */}
      <TaskViewModal 
        task={viewingTask}
        open={!!viewingTask}
        onOpenChange={(open) => !open && setViewingTask(null)}
        onEditRequest={handleEditTask}
        user={user}
      />

      {/* Task Edit Dialog - This is the popup that will open when Edit is clicked */}
      <TaskDialog
        open={!!editingTask}
        onOpenChange={(open) => {
          if (!open) setEditingTask(null); // Close the dialog
        }}
        onSave={handleSaveTask}
        task={editingTask}  // Pass the task to edit
        isSubmitting={isSubmittingTask}
      />
    </div>
  );
}