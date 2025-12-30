"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { 
  CalendarIcon, 
  Clock, 
  Hash, 
  Users, 
  FileText, 
  Folder,
  Plus,
  X,
  Tag,
  Flag,
  Zap,
  Sparkles,
  CheckCircle,
  User,
  Loader2,
  Shield
} from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { RichTextEditor } from "@/components/rich-text-editor"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"

interface TaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (task: any) => void
  task?: any
  isSubmitting?: boolean
  moduleOptions?: Array<{value: string, label: string}>
}

// Month options
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]

// Week options - Updated to Week1, Week2, etc
const WEEKS = ["Week1", "Week2", "Week3", "Week4"]

// Subject options for module
const SUBJECTS = [
   "Task"
  
]

const PRIORITIES = [
  { id: "low", label: "Low", color: "border-green-500 text-green-600" },
  { id: "medium", label: "Medium", color: "border-yellow-500 text-yellow-600" },
  { id: "high", label: "High", color: "border-red-500 text-red-600" },
]

// Default team members (will be replaced with fetched users for admin)
const DEFAULT_TEAM_MEMBERS = [
  { id: "current", name: "Myself" },
  { id: "unassigned", name: "Unassigned" },
]

interface User {
  id: number
  name: string
  email: string
  full_name?: string
  role?: string
}

export function TaskDialog({ open, onOpenChange, onSave, task, isSubmitting = false, moduleOptions = [] }: TaskDialogProps) {
  const { user } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [formData, setFormData] = useState({
    moduleName: "",
    title: "",
    description: "",
    status: "todo" as string,
    priority: "medium" as string,
    projectId: "",
    assignedTo: "current",
    dueDate: undefined as Date | undefined,
    estimatedHours: "",
    tags: [] as string[],
  })

  // State for module components
  const [selectedMonth, setSelectedMonth] = useState<string>("")
  const [selectedWeek, setSelectedWeek] = useState<string>("")
  const [selectedSubject, setSelectedSubject] = useState<string>("project")
  
  // State for fetching users
  const [teamMembers, setTeamMembers] = useState<Array<{id: string, name: string}>>(DEFAULT_TEAM_MEMBERS)
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [availableUsers, setAvailableUsers] = useState<User[]>([])
  
  const [availableTags] = useState<string[]>([
    "Frontend", "Backend", "API", "Database", "UI/UX", "Testing"
  ])
  const [newTag, setNewTag] = useState("")

  // Initialize with current month/week
  useEffect(() => {
    if (!mounted) return
    
    const now = new Date()
    const month = now.toLocaleString('en-US', { month: 'long' })
    
    // Calculate week number of the month
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    const firstDayWeekday = firstDay.getDay() || 7
    const offsetDate = now.getDate() + firstDayWeekday - 1
    const weekNumber = Math.ceil(offsetDate / 7)
    
    setSelectedMonth(month)
    setSelectedWeek(`Week${weekNumber}`)
    
  }, [mounted])

  // CORRECTED: Fetch all users when admin opens dialog
  useEffect(() => {
    if (!mounted || !open || !user) return

    const fetchUsers = async () => {
      // Only fetch users for admin
      if (user?.role !== 'admin') {
        // For regular users, only show themselves and unassigned
        setTeamMembers([
          { id: "current", name: "Myself" },
          { id: "unassigned", name: "Unassigned" },
        ])
        return
      }

      try {
        setIsLoadingUsers(true)
        const token = localStorage.getItem('auth_token')
        
        if (!token) {
          toast.error('Authentication token not found')
          return
        }

        console.log('🔵 Fetching users from /api/tasks?type=users')
        
        // CORRECTED: Fetch users from tasks endpoint with type=users parameter
        const response = await fetch('/api/tasks?type=users', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        console.log('🔵 Users response status:', response.status)
        
        if (response.ok) {
          const data = await response.json()
          console.log('🔵 Users response data:', data)
          
          if (data.success && data.data && data.data.users) {
            // CORRECTED: Handle the response properly
            const usersList = data.data.users.map((userData: any) => ({
              id: userData.id.toString(),
              // Use name from the response (which could be from name or full_name mapping)
              name: userData.name || userData.full_name || userData.email || `User ${userData.id}`
            }))
            
            // Combine with default options
            const allTeamMembers = [
              { id: "current", name: "Myself" },
              ...usersList,
              { id: "unassigned", name: "Unassigned" }
            ]
            
            setTeamMembers(allTeamMembers)
            setAvailableUsers(data.data.users)
            console.log('✅ Loaded users from /api/tasks?type=users:', data.data.users.length)
            console.log('✅ Sample user:', data.data.users[0])
          } else {
            console.error('Invalid response format:', data)
            toast.error('Invalid response from server')
          }
        } else {
          const errorText = await response.text()
          console.error('Failed to fetch users:', response.status, errorText)
          toast.error(`Failed to load users: ${response.status}`)
        }
      } catch (error: any) {
        console.error('Error fetching users:', error)
        toast.error(`Error: ${error.message || 'Failed to load users'}`)
      } finally {
        setIsLoadingUsers(false)
      }
    }

    fetchUsers()
  }, [open, user, mounted])

  // Prevent SSR
  useEffect(() => {
    setMounted(true)
  }, [])

  // Load task data when editing
  useEffect(() => {
    if (!mounted || !user) return
    
    if (task) {
      // Parse existing module name if it follows the new format "Month-Week#-username-subject"
      let month = ""
      let week = ""
      let subject = "project"
      let moduleName = task.module_name || ""
      
      if (moduleName) {
        const parts = moduleName.split('-')
        if (parts.length >= 4) {
          month = parts[0]
          week = parts[1]
          subject = parts.slice(3).join('-') // In case subject has hyphens
        }
      }
      
      setSelectedMonth(month)
      setSelectedWeek(week)
      setSelectedSubject(subject)
      
      // Determine assignedTo value
      let assignedToValue = "current"
      if (task.assigned_to === null || task.assigned_to === undefined) {
        assignedToValue = "unassigned"
      } else if (task.assigned_to !== user.id) {
        assignedToValue = task.assigned_to.toString()
      }
      
      setFormData({
        moduleName: task.module_name || "",
        title: task.title || "",
        description: task.description || "",
        status: task.status || "todo",
        priority: task.priority || "medium",
        projectId: task.project_id?.toString() || "",
        assignedTo: assignedToValue,
        dueDate: task.due_date ? new Date(task.due_date) : undefined,
        estimatedHours: task.estimated_hours?.toString() || "",
        tags: task.tags || [],
      })
    } else {
      // For new task, generate module name based on current user
      if (user && selectedMonth && selectedWeek) {
        const userName = (user.name || user.email || 'user')
          .replace(/\s+/g, '_')
          .toLowerCase()
        
        const generatedModuleName = `${selectedMonth}-${selectedWeek}-${userName}-${selectedSubject}`
        setFormData(prev => ({
          ...prev,
          moduleName: generatedModuleName
        }))
      }
    }
  }, [task, open, mounted, user, selectedMonth, selectedWeek, selectedSubject])

  // Update module name when any component changes
  useEffect(() => {
    if (user && selectedMonth && selectedWeek && selectedSubject) {
      const userName = (user.name || user.email || 'user')
        .replace(/\s+/g, '_')
        .toLowerCase()
      
      const generatedModuleName = `${selectedMonth}-${selectedWeek}-${userName}-${selectedSubject}`
      setFormData(prev => ({
        ...prev,
        moduleName: generatedModuleName
      }))
    }
  }, [selectedMonth, selectedWeek, selectedSubject, user])

  const resetForm = () => {
    setFormData({
      moduleName: "",
      title: "",
      description: "",
      status: "todo",
      priority: "medium",
      projectId: "",
      assignedTo: "current",
      dueDate: undefined,
      estimatedHours: "",
      tags: [],
    })
    setSelectedMonth("")
    setSelectedWeek("")
    setSelectedSubject("project")
    setNewTag("")
    // Reset team members to default
    setTeamMembers(DEFAULT_TEAM_MEMBERS)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) {
      alert("Task title is required")
      return
    }

    // Ensure module name is generated
    let finalModuleName = formData.moduleName
    if (!finalModuleName && user) {
      const userName = (user.name || user.email || 'user')
        .replace(/\s+/g, '_')
        .toLowerCase()
      finalModuleName = `${selectedMonth || 'January'}-${selectedWeek || 'Week1'}-${userName}-${selectedSubject}`
    }

    const taskData = {
      id: task?.id,
      title: formData.title,
      description: formData.description,
      module_name: finalModuleName,
      status: formData.status,
      priority: formData.priority,
      due_date: formData.dueDate ? format(formData.dueDate, 'yyyy-MM-dd') : undefined,
      estimated_hours: formData.estimatedHours ? parseFloat(formData.estimatedHours) : undefined,
      assigned_to: formData.assignedTo === "unassigned" ? undefined : 
                  formData.assignedTo === "current" ? user?.id :
                  formData.assignedTo ? parseInt(formData.assignedTo) : undefined,
      project_id: formData.projectId === "none" ? undefined : 
                 formData.projectId ? parseInt(formData.projectId) : undefined,
      created_by: user?.id,
      tags: formData.tags.length > 0 ? formData.tags : undefined,
    }

    onSave(taskData)
    if (!task) resetForm()
  }

  const toggleTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }))
  }

  const addNewTag = () => {
    if (newTag.trim() && !availableTags.includes(newTag.trim()) && !formData.tags.includes(newTag.trim())) {
      toggleTag(newTag.trim())
      setNewTag("")
    }
  }

  // CORRECTED: Get current user name for display
  const getUserDisplayName = () => {
    if (!user) return "user"
    // Use name since your user object might not have full_name
    return (user.name || user.email || 'user').replace(/\s+/g, '_').toLowerCase()
  }

  // CORRECTED: Get display name for assigned user
  const getAssignedUserName = () => {
    if (formData.assignedTo === "current") return "Myself"
    if (formData.assignedTo === "unassigned") return "Unassigned"
    
    // Find user in available users or team members
    const userObj = availableUsers.find(u => u.id.toString() === formData.assignedTo) ||
                   teamMembers.find(m => m.id === formData.assignedTo)
    
    // Handle name properly
    return userObj?.name || userObj?.full_name || `User ${formData.assignedTo}`
  }

  if (!mounted) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-[600px] md:max-w-[700px] lg:max-w-[800px] max-h-[90vh] overflow-y-auto p-0"
        aria-describedby={task ? "edit-task-description" : "create-task-description"}
      >
        <div className="bg-gradient-to-b from-primary/5 to-transparent p-6">
          <DialogHeader className="text-center">
            <DialogTitle className="text-2xl font-bold flex items-center justify-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              {task ? "Edit Task" : "Create New Task"}
              {user?.role === 'admin' && (
                <Badge variant="outline" className="ml-2 bg-blue-100 text-blue-700 border-blue-300">
                  <Shield className="h-3 w-3 mr-1" />
                  Admin
                </Badge>
              )}
            </DialogTitle>
            <p className="text-muted-foreground mt-2">
              {task ? "Update your task details" : "Add details to create a new task"}
              {user?.role === 'admin' && " - You can assign to any user"}
            </p>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          {/* Task Title */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Task Title *
            </Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="What needs to be done?"
              className="h-12 text-base"
              required
            />
          </div>

          <Separator />

          {/* Module Selection - New Format: Month-Week#-username-subject */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Module Configuration</Label>
            
            {/* User Info Display */}
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
              <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <div>
                <span className="font-medium text-blue-700 dark:text-blue-300">
                  {user?.full_name || user?.name || user?.email || 'User'}
                </span>
                <p className="text-xs text-blue-600 dark:text-blue-400/80">
                  Module will include: {getUserDisplayName()}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Month Selection */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Month</Label>
                <Select
                  value={selectedMonth}
                  onValueChange={(value) => {
                    setSelectedMonth(value)
                    if (!value) {
                      setSelectedWeek("") // Clear week if month is cleared
                    }
                  }}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((month) => (
                      <SelectItem key={month} value={month}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Week Selection */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Week</Label>
                <Select
                  value={selectedWeek}
                  onValueChange={setSelectedWeek}
                  disabled={!selectedMonth}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Week" />
                  </SelectTrigger>
                  <SelectContent>
                    {WEEKS.map((week) => (
                      <SelectItem key={week} value={week}>
                        {week.replace('Week', 'Week ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Subject Selection */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Subject</Label>
                <Select
                  value={selectedSubject}
                  onValueChange={setSelectedSubject}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBJECTS.map((subject) => (
                      <SelectItem key={subject} value={subject}>
                        {subject.charAt(0).toUpperCase() + subject.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Generated Module Name Display */}
            {formData.moduleName && (
              <div className="space-y-2 animate-in fade-in duration-200">
                <Label className="text-sm text-muted-foreground">Generated Module Name</Label>
                <div className="flex items-center gap-2 p-3 rounded-lg border bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <div className="flex-1">
                    <span className="font-mono font-bold text-green-700 dark:text-green-300 text-sm">
                      {formData.moduleName}
                    </span>
                    <p className="text-xs text-green-600 dark:text-green-400/80 mt-0.5">
                      Format: Month-Week#-username-subject
                    </p>
                  </div>
                </div>
                <input
                  type="hidden"
                  name="moduleName"
                  value={formData.moduleName}
                />
              </div>
            )}

            {/* Helper text */}
            {(!selectedMonth || !selectedWeek) && (
              <p className="text-xs text-muted-foreground">
                Select month and week to generate the module name
              </p>
            )}
          </div>

          <Separator />

          {/* Priority & Assignment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Flag className="h-4 w-4 text-primary" />
                Priority
              </Label>
              <div className="flex gap-2">
                {PRIORITIES.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, priority: p.id })}
                    className={cn(
                      "flex-1 py-2.5 rounded-lg border text-sm font-medium transition-all",
                      formData.priority === p.id
                        ? `${p.color} border-2 bg-background`
                        : "border-border hover:border-primary/50 hover:bg-accent/50"
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Assign To
                </Label>
                {user?.role === 'admin' && teamMembers.length > 2 && (
                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                    {teamMembers.length - 2} users available
                  </Badge>
                )}
              </div>
              
              {isLoadingUsers ? (
                <div className="flex items-center justify-center h-11 border rounded-lg">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span className="text-sm text-muted-foreground">Loading users...</span>
                </div>
              ) : (
                <>
                  <Select
                    value={formData.assignedTo}
                    onValueChange={(value) => setFormData({ ...formData, assignedTo: value })}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select assignee">
                        <div className="flex items-center gap-2">
                          <span>{getAssignedUserName()}</span>
                          {formData.assignedTo === "current" && (
                            <Badge variant="secondary" className="text-xs">You</Badge>
                          )}
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {teamMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          <div className="flex items-center gap-2">
                            {member.id === "current" && <User className="h-3 w-3" />}
                            {member.id === "unassigned" && <Users className="h-3 w-3" />}
                            {member.id !== "current" && member.id !== "unassigned" && (
                              <div className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center">
                                <span className="text-xs text-blue-700 font-medium">
                                  {member.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <span>{member.name}</span>
                            {member.id === "current" && (
                              <Badge variant="outline" className="ml-auto text-xs">You</Badge>
                            )}
                            {member.id === String(user?.id) && member.id !== "current" && (
                              <Badge variant="secondary" className="ml-auto text-xs">You</Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {/* Show selected user info for admin */}
                  {user?.role === 'admin' && formData.assignedTo !== "current" && formData.assignedTo !== "unassigned" && (
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <User className="h-3 w-3" />
                      Assigning to: {getAssignedUserName()}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <Separator />

          {/* Date & Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full h-11 justify-start text-left font-normal",
                      !formData.dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.dueDate ? format(formData.dueDate, "PPP") : "Select a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.dueDate}
                    onSelect={(date) => setFormData({ ...formData, dueDate: date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Estimated Hours
              </Label>
              <Input
                type="number"
                step="0.5"
                min="0"
                value={formData.estimatedHours}
                onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
                placeholder="e.g., 4.5"
                className="h-11"
              />
            </div>
          </div>

          <Separator />

          {/* Project */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Folder className="h-4 w-4 text-primary" />
              Project (Optional)
            </Label>
            <Select
              value={formData.projectId}
              onValueChange={(value) => setFormData({ ...formData, projectId: value })}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Project</SelectItem>
                <SelectItem value="1">Website Redesign</SelectItem>
                <SelectItem value="2">Mobile App</SelectItem>
                <SelectItem value="3">API Integration</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Tags */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Tag className="h-4 w-4 text-primary" />
              Tags
            </Label>
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm transition-all",
                    formData.tags.includes(tag)
                      ? "bg-primary text-primary-foreground"
                      : "bg-accent text-accent-foreground hover:bg-accent/80"
                  )}
                >
                  {tag}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add custom tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addNewTag())}
                className="h-9"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addNewTag}
                disabled={!newTag.trim()}
                className="h-9"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Separator />

          {/* Description */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Description</Label>
            <RichTextEditor
              value={formData.description}
              onChange={(value) => setFormData({ ...formData, description: value })}
              placeholder="Describe the task details..."
              className="min-h-[200px]"
            />
          </div>

          {/* Admin Info Panel */}
          {user?.role === 'admin' && (
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-blue-800 dark:text-blue-300">
                    Admin Privileges Active
                  </p>
                  <p className="text-sm text-blue-600 dark:text-blue-400/80 mt-0.5">
                    You can assign this task to any user in the system
                    {availableUsers.length > 0 && ` • ${availableUsers.length} users available`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Status Indicator */}
          <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center">
                <Zap className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-yellow-800 dark:text-yellow-300">
                  New tasks are set to "To Do" status
                </p>
                <p className="text-sm text-yellow-600 dark:text-yellow-400/80 mt-0.5">
                  Status will be updated as work progresses
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false)
                resetForm()
              }}
              disabled={isSubmitting}
              className="flex-1 sm:flex-none h-11"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !formData.title.trim()}
              className="flex-1 h-11"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {task ? "Updating..." : "Creating..."}
                </>
              ) : (
                <>
                  {task ? "Update Task" : "Create Task"}
                  <Sparkles className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}