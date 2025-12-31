"use client"

import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useEffect, useState, useMemo } from "react"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { 
  Users, CheckCircle2, AlertCircle, TrendingUp, Activity, 
  FileText, Search, Eye, Edit, ArrowLeft, 
  EyeOff, Lock, MoreVertical, Plus, ChevronRight,
  Shield, Target, Download, BarChart3, Zap,
  Calendar, User, Tag, Clock, MessageSquare,
  X, ExternalLink, Copy, Check,
  ArrowUpRight, ArrowDownRight, Circle,
  FolderKanban
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

// ============================================
// TYPE DEFINITIONS
// ============================================

interface Task {
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
  module_name?: string
  tags?: string[]
  estimated_hours?: number
  creator_name?: string
  assignee_name?: string
  project_name?: string
  canEdit?: boolean
  canDelete?: boolean
  isReadOnly?: boolean
}

interface TeamMember {
  id: number
  name: string
  email: string
  role: 'user' | 'admin'
  created_at: string
  updated_at: string
  tasks: Task[]
  taskCount: number
  completedCount: number
  inProgressCount: number
  overdueCount: number
  completionRate: number
  lastActive?: string
}

// ============================================
// TASK VIEW MODAL COMPONENT
// ============================================

interface TaskViewModalProps {
  task: Task | null
  isOpen: boolean
  onClose: () => void
  currentUserId: number | null
  currentUserRole: 'user' | 'admin' | null
}

function TaskViewModal({ task, isOpen, onClose, currentUserId, currentUserRole }: TaskViewModalProps) {
  if (!task) return null

  const canEdit = currentUserRole === 'admin' || 
                  task.created_by === currentUserId || 
                  task.assigned_to === currentUserId

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'todo': return <Circle className="h-3 w-3 text-gray-500" />
      case 'in_progress': return <Activity className="h-3 w-3 text-blue-500" />
      case 'review': return <Eye className="h-3 w-3 text-yellow-500" />
      case 'done': return <CheckCircle2 className="h-3 w-3 text-green-500" />
      case 'paused': return <AlertCircle className="h-3 w-3 text-red-500" />
      default: return <Circle className="h-3 w-3 text-gray-500" />
    }
  }

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200'
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'low': return 'text-green-600 bg-green-50 border-green-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set'
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'Not set'
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Copied to clipboard')
    } catch (err) {
      toast.error('Failed to copy')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              {getStatusIcon(task.status)}
              <span className="truncate">{task.title}</span>
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription>
            Task details and information
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Status</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="capitalize">
                      {task.status.replace('_', ' ')}
                    </Badge>
                    {task.status === 'overdue' && (
                      <Badge variant="destructive" className="animate-pulse">
                        Overdue
                      </Badge>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-500">Priority</Label>
                  <Badge className={cn("mt-1 capitalize", getPriorityColor(task.priority))}>
                    {task.priority}
                  </Badge>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-500">Module</Label>
                  <p className="mt-1 text-sm">{task.module_name || 'Not assigned'}</p>
                </div>

                {task.tags && task.tags.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Tags</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {task.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          <Tag className="h-3 w-3 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Due Date</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">
                      {formatDate(task.due_date)}
                    </span>
                    {task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done' && (
                      <Badge variant="destructive" className="text-xs">
                        Overdue
                      </Badge>
                    )}
                  </div>
                </div>

                {task.estimated_hours && (
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Estimated Hours</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">{task.estimated_hours} hours</span>
                    </div>
                  </div>
                )}

                <div>
                  <Label className="text-sm font-medium text-gray-500">Created</Label>
                  <p className="mt-1 text-sm">{formatDateTime(task.created_at)}</p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-500">Last Updated</Label>
                  <p className="mt-1 text-sm">{formatDateTime(task.updated_at)}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Description */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium text-gray-500">Description</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => task.description && copyToClipboard(task.description)}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </Button>
              </div>
              {task.description ? (
                <div className="prose prose-sm max-w-none p-4 bg-gray-50 rounded-lg border">
                  <div dangerouslySetInnerHTML={{ __html: task.description }} />
                </div>
              ) : (
                <div className="p-4 text-center text-gray-500 bg-gray-50 rounded-lg border">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p>No description provided</p>
                </div>
              )}
            </div>

            <Separator />

            {/* People */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="text-sm font-medium text-gray-500 mb-3 block">Created By</Label>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                  <Avatar>
                    <AvatarFallback className="bg-blue-100 text-blue-600">
                      {task.creator_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{task.creator_name || 'Unknown'}</p>
                    {task.created_by === currentUserId && (
                      <Badge variant="outline" className="text-xs mt-1">You</Badge>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-500 mb-3 block">Assigned To</Label>
                {task.assignee_name ? (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                    <Avatar>
                      <AvatarFallback className="bg-green-100 text-green-600">
                        {task.assignee_name?.charAt(0) || 'A'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{task.assignee_name}</p>
                      {task.assigned_to === currentUserId && (
                        <Badge variant="outline" className="text-xs mt-1">You</Badge>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 text-center text-gray-500 bg-gray-50 rounded-lg border">
                    <User className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p>Not assigned</p>
                  </div>
                )}
              </div>
            </div>

            {task.project_name && (
              <>
                <Separator />
                <div>
                  <Label className="text-sm font-medium text-gray-500 mb-3 block">Project</Label>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                    <FolderKanban className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium">{task.project_name}</p>
                      <p className="text-sm text-gray-500">Project ID: {task.project_id}</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Task ID: {task.id}</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={() => copyToClipboard(`Task ID: ${task.id}\nTitle: ${task.title}`)}
            >
              <Copy className="h-3 w-3 mr-1" />
              Copy ID
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            
            {canEdit && (
              <Button 
                onClick={() => {
                  onClose()
                  // Navigate to edit page
                  window.open(`/tasks/${task.id}/edit`, '_blank')
                }}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Task
              </Button>
            )}
            
            <Button
              variant="outline"
              onClick={() => {
                onClose()
                // Navigate to full task page
                window.open(`/tasks/${task.id}`, '_blank')
              }}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Full View
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function TeamPage() {
  // ============================================
  // AUTHENTICATION & STATE
  // ============================================
  const { user: currentUser, isLoading: authLoading } = useAuth()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  
  // UI State
  const [searchQuery, setSearchQuery] = useState("")
  const [filterRole, setFilterRole] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("name")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [expandedUsers, setExpandedUsers] = useState<Set<number>>(new Set())
  
  // Task Modal State
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)

  // ============================================
  // INITIALIZATION
  // ============================================
  useEffect(() => {
    setMounted(true)
  }, [])

  // ============================================
  // DATA FETCHING WITH RBAC
  // ============================================
  useEffect(() => {
    if (!mounted || !currentUser || authLoading) return

    const fetchTeamData = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const token = localStorage.getItem('auth_token')
        if (!token) {
          throw new Error('Authentication required')
        }

        console.log('🔵 [TeamPage] Fetching team data for:', {
          userId: currentUser.id,
          role: currentUser.role
        })

        // Call the team dashboard API
        const response = await fetch('/api/team/dashboard', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          cache: 'no-store'
        })

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`)
        }

        const result = await response.json()
        
        // Debug log
        console.log('🔵 [TeamPage] API Response received:', {
          success: result.success,
          dataStructure: result.data ? 'has data' : 'no data'
        })

        if (result.success && result.data) {
          const teamData = result.data
          
          // Convert API response to TeamMember format
          const apiMembers = teamData.members || []
          const membersList: TeamMember[] = apiMembers.map((member: any) => ({
            id: member.id,
            name: member.name,
            email: member.email,
            role: member.role,
            created_at: member.created_at,
            updated_at: member.updated_at,
            tasks: member.tasks || [],
            taskCount: member.taskCount || 0,
            completedCount: member.completedCount || 0,
            inProgressCount: member.inProgressCount || 0,
            overdueCount: member.overdueCount || 0,
            completionRate: member.completionRate || 0,
            lastActive: member.lastActive
          }))
          
          setMembers(membersList)
          
          console.log('✅ [TeamPage] Team data loaded:', {
            membersCount: membersList.length,
            currentUserRole: currentUser.role
          })
        } else {
          throw new Error(result.message || 'Failed to load team data')
        }
      } catch (err: any) {
        console.error('🔴 [TeamPage] Error fetching team data:', err)
        setError(err.message || 'Failed to load team dashboard')
        toast.error('Could not load team data')
        
        // Load mock data for development
        await loadMockData()
      } finally {
        setIsLoading(false)
      }
    }

    // Mock data loader for development
    const loadMockData = async () => {
      console.warn('⚠️ Loading mock data for development')
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const mockMembers: TeamMember[] = [
        {
          id: 1,
          name: 'John Doe',
          email: 'john@example.com',
          role: 'admin',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          tasks: [
            {
              id: 1,
              title: 'Design System Implementation',
              description: '<p>Create and implement design system components for the entire application.</p><ul><li>Create color palette</li><li>Design typography scale</li><li>Build component library</li></ul>',
              status: 'in_progress',
              priority: 'high',
              due_date: '2024-01-15',
              project_id: 1,
              assigned_to: 1,
              created_by: 1,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              module_name: 'Design System',
              tags: ['UI', 'Design', 'Frontend'],
              estimated_hours: 40,
              creator_name: 'John Doe',
              assignee_name: 'John Doe',
              project_name: 'UI Revamp',
              canEdit: true,
              canDelete: true,
              isReadOnly: false
            }
          ],
          taskCount: 5,
          completedCount: 3,
          inProgressCount: 1,
          overdueCount: 0,
          completionRate: 60,
          lastActive: new Date().toISOString()
        },
        {
          id: 2,
          name: 'Jane Smith',
          email: 'jane@example.com',
          role: 'user',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          tasks: [
            {
              id: 2,
              title: 'API Integration',
              description: 'Integrate with third-party payment API',
              status: 'todo',
              priority: 'medium',
              due_date: '2024-01-20',
              project_id: 1,
              assigned_to: 2,
              created_by: 1,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              module_name: 'Backend',
              tags: ['API', 'Backend', 'Integration'],
              estimated_hours: 20,
              creator_name: 'John Doe',
              assignee_name: 'Jane Smith',
              project_name: 'Payment System',
              canEdit: false,
              canDelete: false,
              isReadOnly: true
            }
          ],
          taskCount: 3,
          completedCount: 1,
          inProgressCount: 1,
          overdueCount: 0,
          completionRate: 33,
          lastActive: new Date().toISOString()
        },
        {
          id: 3,
          name: 'Bob Johnson',
          email: 'bob@example.com',
          role: 'user',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          tasks: [],
          taskCount: 0,
          completedCount: 0,
          inProgressCount: 0,
          overdueCount: 0,
          completionRate: 0,
          lastActive: undefined
        }
      ]
      
      setMembers(mockMembers)
    }

    fetchTeamData()
  }, [currentUser, authLoading, mounted])

  // ============================================
  // PERMISSION & ROLE-BASED LOGIC
  // ============================================

  /**
   * Check if current user can edit a specific task
   */
  const canEditTask = (task: Task): boolean => {
    if (!currentUser) return false
    
    // ADMIN has full edit permissions
    if (currentUser.role === 'admin') return true
    
    // USER can only edit their own tasks
    return task.created_by === currentUser.id || task.assigned_to === currentUser.id
  }

  /**
   * Check if current user can delete a specific task
   */
  const canDeleteTask = (task: Task): boolean => {
    return canEditTask(task)
  }

  // ============================================
  // DATA FILTERING & SORTING
  // ============================================

  const filteredAndSortedMembers = useMemo(() => {
    let result = [...members]

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(member =>
        member.name.toLowerCase().includes(query) ||
        member.email.toLowerCase().includes(query) ||
        member.tasks.some(task => 
          task.title?.toLowerCase().includes(query) ||
          task.module_name?.toLowerCase().includes(query)
        )
      )
    }

    // Apply role filter
    if (filterRole !== "all") {
      result = result.filter(member => member.role === filterRole)
    }

    // Apply status filter
    if (filterStatus !== "all") {
      result = result.filter(member => {
        switch (filterStatus) {
          case "active":
            return member.inProgressCount > 0
          case "productive":
            return member.completionRate >= 70
          case "overdue":
            return member.overdueCount > 0
          case "inactive":
            return member.taskCount === 0
          default:
            return true
        }
      })
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name)
          break
        case "tasks":
          comparison = a.taskCount - b.taskCount
          break
        case "completed":
          comparison = a.completedCount - b.completedCount
          break
        case "completion":
          comparison = a.completionRate - b.completionRate
          break
        case "role":
          comparison = a.role.localeCompare(b.role)
          break
        default:
          comparison = 0
      }

      return sortOrder === "asc" ? comparison : -comparison
    })

    return result
  }, [members, searchQuery, filterRole, filterStatus, sortBy, sortOrder])

  // ============================================
  // TEAM STATISTICS
  // ============================================

  const teamStatistics = useMemo(() => {
    if (members.length === 0) {
      return {
        totalMembers: 0,
        totalTasks: 0,
        completedTasks: 0,
        overdueTasks: 0,
        averageCompletionRate: 0,
        activeMembers: 0,
        adminCount: 0,
        userCount: 0
      }
    }

    const totalTasks = members.reduce((sum, member) => 
      sum + (member.taskCount || 0), 0
    )
    const completedTasks = members.reduce((sum, member) => 
      sum + (member.completedCount || 0), 0
    )
    const overdueTasks = members.reduce((sum, member) => 
      sum + (member.overdueCount || 0), 0
    )
    const averageCompletionRate = Math.round(
      members.reduce((sum, member) => 
        sum + (member.completionRate || 0), 0
      ) / members.length
    )
    const activeMembers = members.filter(member => 
      (member.inProgressCount || 0) > 0
    ).length
    const adminCount = members.filter(member => member.role === 'admin').length
    const userCount = members.filter(member => member.role === 'user').length

    return {
      totalMembers: members.length,
      totalTasks,
      completedTasks,
      overdueTasks,
      averageCompletionRate,
      activeMembers,
      adminCount,
      userCount
    }
  }, [members])

  // ============================================
  // UI HELPERS
  // ============================================

  const toggleUserExpansion = (userId: number) => {
    const newExpanded = new Set(expandedUsers)
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId)
    } else {
      newExpanded.add(userId)
    }
    setExpandedUsers(newExpanded)
  }

  const getUserInitials = (name: string): string => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getUserColor = (id: number): string => {
    const colors = [
      "bg-gradient-to-r from-blue-500 to-cyan-500",
      "bg-gradient-to-r from-purple-500 to-pink-500",
      "bg-gradient-to-r from-green-500 to-emerald-500",
      "bg-gradient-to-r from-orange-500 to-red-500",
      "bg-gradient-to-r from-indigo-500 to-violet-500"
    ]
    return colors[id % colors.length]
  }

  const getStatusColor = (status: Task['status']): string => {
    const colors: Record<Task['status'], string> = {
      'todo': 'bg-gray-100 text-gray-800',
      'in_progress': 'bg-blue-100 text-blue-800',
      'review': 'bg-yellow-100 text-yellow-800',
      'done': 'bg-green-100 text-green-800',
      'paused': 'bg-red-100 text-red-800'
    }
    return colors[status]
  }

  const getPriorityColor = (priority: Task['priority']): string => {
    const colors: Record<Task['priority'], string> = {
      'low': 'bg-green-100 text-green-800',
      'medium': 'bg-yellow-100 text-yellow-800',
      'high': 'bg-red-100 text-red-800'
    }
    return colors[priority]
  }

  // ============================================
  // EVENT HANDLERS
  // ============================================

  const handleTaskAction = (task: Task, action: 'view' | 'edit' | 'delete') => {
    switch (action) {
      case 'view':
        // Open task in modal
        setSelectedTask(task)
        setIsTaskModalOpen(true)
        break
        
      case 'edit':
        if (!canEditTask(task)) {
          toast.error("You don't have permission to edit this task")
          return
        }
        window.open(`/tasks/${task.id}/edit`, '_blank')
        break
        
      case 'delete':
        if (!canDeleteTask(task)) {
          toast.error("You don't have permission to delete this task")
          return
        }
        if (confirm('Are you sure you want to delete this task?')) {
          toast.info('Delete functionality would be implemented')
        }
        break
    }
  }

  const handleAssignTask = (userId: number) => {
    if (!currentUser) return
    
    if (currentUser.role !== 'admin' && userId !== currentUser.id) {
      toast.error("You don't have permission to assign tasks to this user")
      return
    }
    window.open(`/tasks/new?assign=${userId}`, '_blank')
  }

  // ============================================
  // RENDER STATES
  // ============================================

  if (!mounted || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading team dashboard...</p>
        </div>
      </div>
    )
  }

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please login to view the team dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/login">
              <Button className="w-full">Go to Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Import missing icon
  const FolderKanban = FolderKanbanIcon

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      {/* Task View Modal */}
      <TaskViewModal
        task={selectedTask}
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false)
          setSelectedTask(null)
        }}
        currentUserId={currentUser?.id || null}
        currentUserRole={currentUser?.role || null}
      />

      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Team Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {currentUser.role === 'admin' 
                ? 'Full administrative access to team and tasks'
                : 'Team transparency view - Read-only access to all tasks'
              }
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search team members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-full md:w-64"
              />
            </div>
            
            {currentUser.role === 'admin' && (
              <Link href="/tasks/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Task
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Team Transparency Notice */}
        {currentUser.role === 'user' && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <Eye className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-800 dark:text-blue-300">
                  Team Transparency Mode
                </h3>
                <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                  You can view all team members and their assigned tasks. 
                  Edit and delete permissions are restricted to your own tasks only.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
              <div>
                <h3 className="font-medium text-red-800 dark:text-red-300">
                  Error Loading Data
                </h3>
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Team Members
                </p>
                <h3 className="text-2xl font-bold mt-2">
                  {teamStatistics.totalMembers}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  {teamStatistics.adminCount} admin • {teamStatistics.userCount} users
                </p>
              </div>
              <Users className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Tasks
                </p>
                <h3 className="text-2xl font-bold mt-2">
                  {teamStatistics.totalTasks}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  {teamStatistics.completedTasks} completed
                </p>
              </div>
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Active Members
                </p>
                <h3 className="text-2xl font-bold mt-2">
                  {teamStatistics.activeMembers}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  {Math.round((teamStatistics.activeMembers / teamStatistics.totalMembers) * 100)}% of team
                </p>
              </div>
              <Activity className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Avg. Completion
                </p>
                <h3 className="text-2xl font-bold mt-2">
                  {teamStatistics.averageCompletionRate}%
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  {teamStatistics.averageCompletionRate >= 70 ? 'On track' : 'Needs attention'}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admins</SelectItem>
                  <SelectItem value="user">Users</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="productive">Productive</SelectItem>
                  <SelectItem value="overdue">Has Overdue</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="tasks">Task Count</SelectItem>
                  <SelectItem value="completed">Completed Tasks</SelectItem>
                  <SelectItem value="completion">Completion Rate</SelectItem>
                  <SelectItem value="role">Role</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            >
              {sortOrder === "asc" ? "↑ Asc" : "↓ Desc"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Team Members List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Members
            <Badge variant="secondary">
              {filteredAndSortedMembers.length} members
            </Badge>
          </CardTitle>
          <CardDescription>
            {currentUser.role === 'admin' 
              ? 'Manage team members and their tasks'
              : 'View team members and their tasks (read-only)'
            }
          </CardDescription>
        </CardHeader>
       <CardContent className="p-3 sm:p-4 md:p-6">
  {isLoading ? (
    <div className="flex items-center justify-center py-8 sm:py-10 md:py-12">
      <div className="flex flex-col items-center gap-2 sm:gap-3">
        <div className="h-6 w-6 sm:h-8 sm:w-8 animate-spin rounded-full border-3 sm:border-4 border-primary border-t-transparent"></div>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
          Loading team members...
        </p>
      </div>
    </div>
  ) : filteredAndSortedMembers.length === 0 ? (
    <div className="text-center py-8 sm:py-10 md:py-12 px-2">
      <Users className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-gray-400 mx-auto mb-2 sm:mb-3 md:mb-4" />
      <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 dark:text-white mb-1 sm:mb-2">
        No team members found
      </h3>
      <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
        {searchQuery 
          ? "Try adjusting your search terms"
          : "No members match the current filters"
        }
      </p>
    </div>
  ) : (
    <div className="space-y-3 sm:space-y-4">
      {filteredAndSortedMembers.map((member) => (
        <motion.div
          key={member.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
        >
          {/* Member Header - Responsive Layout */}
          <div className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            {/* Left Section: Avatar and Info */}
            <div className="flex items-start sm:items-center gap-3 sm:gap-4">
              <Avatar className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
                <AvatarFallback className={`${getUserColor(member.id)} text-sm sm:text-base`}>
                  {getUserInitials(member.name)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                {/* Name and Role Row */}
                <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-1">
                  <h3 className="font-semibold text-base sm:text-lg truncate">
                    {member.name}
                  </h3>
                  <div className="flex flex-wrap gap-1">
                    <Badge 
                      variant={member.role === 'admin' ? 'destructive' : 'default'}
                      className="text-xs px-1.5 py-0 h-5"
                    >
                      {member.role}
                    </Badge>
                    {member.id === currentUser.id && (
                      <Badge variant="outline" className="text-xs px-1.5 py-0 h-5">
                        You
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Email */}
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate mb-2 sm:mb-1">
                  {member.email}
                </p>

                {/* Stats Row - Responsive Layout */}
                <div className="flex flex-wrap gap-2 sm:gap-4">
                  <div className="flex items-center gap-1">
                    <span className="text-xs sm:text-sm text-gray-500 whitespace-nowrap">
                      <span className="font-medium">{member.taskCount}</span> tasks
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs sm:text-sm text-gray-500 whitespace-nowrap">
                      <span className="font-medium">{member.completedCount}</span> completed
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`text-xs sm:text-sm font-medium whitespace-nowrap ${
                      member.completionRate >= 70 ? 'text-green-600' :
                      member.completionRate >= 30 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {member.completionRate}% completion
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Section: Actions */}
            <div className="flex items-center justify-between sm:justify-end gap-2 self-end sm:self-center">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 sm:px-3 text-xs sm:text-sm"
                onClick={() => toggleUserExpansion(member.id)}
              >
                <span className="hidden xs:inline">
                  {expandedUsers.has(member.id) ? 'Hide Tasks' : 'Show Tasks'}
                </span>
                <span className="xs:hidden">
                  {expandedUsers.has(member.id) ? 'Hide' : 'Tasks'}
                </span>
                <ChevronRight className={`h-3 w-3 sm:h-4 sm:w-4 ml-1 transition-transform ${
                  expandedUsers.has(member.id) ? 'rotate-90' : ''
                }`} />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 sm:h-8 sm:w-8 p-0"
                    aria-label="More options"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 sm:w-56">
                  <DropdownMenuLabel className="text-xs sm:text-sm">Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => window.open(`/tasks?assigned=${member.id}`, '_blank')}
                    className="text-xs sm:text-sm py-2"
                  >
                    <Target className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                    View All Tasks
                  </DropdownMenuItem>
                  
                  {currentUser.role === 'admin' && (
                    <>
                      <DropdownMenuItem
                        onClick={() => handleAssignTask(member.id)}
                        className="text-xs sm:text-sm py-2"
                      >
                        <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                        Assign New Task
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => toast.info('Edit user functionality coming soon')}
                        className="text-xs sm:text-sm py-2"
                      >
                        <Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                        Edit User
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Tasks Section - Responsive */}
          <AnimatePresence>
            {expandedUsers.has(member.id) && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="border-t"
              >
                <div className="p-3 sm:p-4 bg-white dark:bg-gray-900">
                  <div className="mb-3 sm:mb-4 flex flex-col xs:flex-row xs:items-center justify-between gap-2">
                    <h4 className="font-medium text-sm sm:text-base">
                      {member.name}'s Tasks ({member.tasks.length})
                    </h4>
                    {currentUser.role === 'user' && member.id !== currentUser.id && (
                      <Badge variant="outline" className="text-xs px-2 py-0 h-5 self-start xs:self-center">
                        <Lock className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
                        View Only
                      </Badge>
                    )}
                  </div>

                  {member.tasks.length === 0 ? (
                    <div className="text-center py-6 sm:py-8">
                      <FileText className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-gray-400 mx-auto mb-2 sm:mb-3 md:mb-4" />
                      <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-3 sm:mb-4">
                        No tasks assigned
                      </p>
                      {currentUser.role === 'admin' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs sm:text-sm"
                          onClick={() => handleAssignTask(member.id)}
                        >
                          <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          Assign First Task
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2 sm:space-y-3">
                      {member.tasks.map((task) => (
                        <div
                          key={task.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-2 sm:p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 gap-2 sm:gap-3"
                        >
                          {/* Task Info */}
                          <div className="flex-1 min-w-0">
                            {/* Task Title and Badges */}
                            <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-1">
                              <span className="font-medium text-sm sm:text-base truncate">
                                {task.title}
                              </span>
                              <div className="flex flex-wrap gap-1">
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs px-1.5 py-0 h-5 ${getStatusColor(task.status)}`}
                                >
                                  {task.status.replace('_', ' ')}
                                </Badge>
                                <Badge 
                                  className={`text-xs px-1.5 py-0 h-5 ${getPriorityColor(task.priority)}`}
                                >
                                  {task.priority}
                                </Badge>
                                {task.isReadOnly && (
                                  <Badge variant="outline" className="text-xs px-1.5 py-0 h-5">
                                    <Lock className="h-2.5 w-2.5 mr-1" />
                                    Read-only
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* Task Details */}
                            <div className="flex flex-col xs:flex-row xs:items-center gap-1 xs:gap-3 text-xs sm:text-sm text-gray-500">
                              {task.module_name && (
                                <span className="truncate">
                                  Module: <span className="font-medium">{task.module_name}</span>
                                </span>
                              )}
                              {task.due_date && (
                                <span className="truncate whitespace-nowrap">
                                  Due: <span className="font-medium">
                                    {new Date(task.due_date).toLocaleDateString()}
                                  </span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Task Actions */}
                          <div className="flex items-center justify-end sm:justify-start gap-1 self-end sm:self-center">
                            {/* View button */}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                              onClick={() => handleTaskAction(task, 'view')}
                              title="View task details"
                              aria-label="View task"
                            >
                              <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>

                            {/* Edit/Delete buttons */}
                            {canEditTask(task) ? (
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                                  onClick={() => handleTaskAction(task, 'edit')}
                                  title="Edit task"
                                  aria-label="Edit task"
                                >
                                 
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 sm:h-8 sm:w-8 p-0 text-red-600 hover:text-red-700"
                                  onClick={() => handleTaskAction(task, 'delete')}
                                  title="Delete task"
                                  aria-label="Delete task"
                                >
                                  <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                                </Button>
                              </div>
                            ) : (
                              <div className="px-2 py-1 text-xs text-gray-400 italic whitespace-nowrap">
                                Read-only
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ))}
    </div>
  )}
</CardContent>
      </Card>
    </div>
  )
}

// Add missing icon import
import { FolderKanban as FolderKanbanIcon } from "lucide-react"