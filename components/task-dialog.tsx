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
  Shield,
  Sun,
  Moon,
  Coffee,
  Bed,
  Clock9,
  Clock4,
  Star,
  Trash2,
  MoreVertical,
  Copy,
  Check
} from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { RichTextEditor } from "@/components/rich-text-editor"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface TaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (task: any) => void
  task?: any
  isSubmitting?: boolean
  moduleOptions?: Array<{value: string, label: string}>
}

// Time Slot Configuration
interface TimeSlot {
  id: string
  partOfDay: 'morning' | 'afternoon' | 'before_midnight' | 'after_midnight'
  startTime: string
  endTime: string
  task: string
  status: 'todo' | 'in_progress' | 'review' | 'done' | 'paused'
  color: string
  icon: React.ReactNode
}

// Month options
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]

// Week options
const WEEKS = ["Week1", "Week2", "Week3", "Week4"]

// Subject options for module
const SUBJECTS = ["Task", "Meeting", "Development", "Research", "Design", "Testing", "Documentation"]

// Part of Day options
const PARTS_OF_DAY = [
  {
    id: 'morning',
    label: 'Morning',
    icon: <Sun className="h-4 w-4" />,
    color: 'bg-green-100 text-green-800 border-green-200',
    defaultStart: '08:00',
    defaultEnd: '12:00'
  },
  {
    id: 'afternoon',
    label: 'Afternoon',
    icon: <Coffee className="h-4 w-4" />,
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    defaultStart: '12:00',
    defaultEnd: '17:00'
  },
  {
    id: 'before_midnight',
    label: 'Before Midnight',
    icon: <Moon className="h-4 w-4" />,
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    defaultStart: '17:00',
    defaultEnd: '23:59'
  },
  {
    id: 'after_midnight',
    label: 'After Midnight',
    icon: <Bed className="h-4 w-4" />,
    color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    defaultStart: '00:00',
    defaultEnd: '08:00'
  }
]

// Time slot status options with colors
const TIME_SLOT_STATUSES = [
  { value: 'todo', label: 'To Do', color: 'bg-gray-100 text-gray-800', icon: <Clock className="h-3 w-3" /> },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-100 text-blue-800', icon: <Clock9 className="h-3 w-3" /> },
  { value: 'review', label: 'Review', color: 'bg-yellow-100 text-yellow-800', icon: <Clock4 className="h-3 w-3" /> },
  { value: 'done', label: 'Done', color: 'bg-green-100 text-green-800', icon: <Check className="h-3 w-3" /> },
  { value: 'paused', label: 'Paused', color: 'bg-red-100 text-red-800', icon: <Clock className="h-3 w-3" /> }
]

// Time options in 30-minute intervals
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2)
  const minute = i % 2 === 0 ? '00' : '30'
  const time = `${hour.toString().padStart(2, '0')}:${minute}`
  const display = format(new Date(`2000-01-01T${time}`), 'h:mm a')
  return { value: time, label: display }
})

const PRIORITIES = [
  { id: "low", label: "Low", color: "border-green-500 text-green-600" },
  { id: "medium", label: "Medium", color: "border-yellow-500 text-yellow-600" },
  { id: "high", label: "High", color: "border-red-500 text-red-600" },
]

// Default team members
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
  
  // Main form state
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
    timeSlots: [] as TimeSlot[],
  })

  // Module components
  const [selectedMonth, setSelectedMonth] = useState<string>("")
  const [selectedWeek, setSelectedWeek] = useState<string>("")
  const [selectedSubject, setSelectedSubject] = useState<string>("Task")
  
  // Time slot form
  const [currentTimeSlot, setCurrentTimeSlot] = useState<TimeSlot>({
    id: `slot_${Date.now()}`,
    partOfDay: 'morning',
    startTime: '08:00',
    endTime: '12:00',
    task: '',
    status: 'todo',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: <Sun className="h-4 w-4" />
  })

  // Other states
  const [teamMembers, setTeamMembers] = useState<Array<{id: string, name: string}>>(DEFAULT_TEAM_MEMBERS)
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [availableUsers, setAvailableUsers] = useState<User[]>([])
  const [availableTags] = useState<string[]>([
    "Frontend", "Backend", "API", "Database", "UI/UX", "Testing", "Meeting", "Planning", "Development"
  ])
  const [newTag, setNewTag] = useState("")

  // Initialize with current month/week
  useEffect(() => {
    if (!mounted) return
    
    const now = new Date()
    const month = now.toLocaleString('en-US', { month: 'long' })
    
    // Calculate week number
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    const firstDayWeekday = firstDay.getDay() || 7
    const offsetDate = now.getDate() + firstDayWeekday - 1
    const weekNumber = Math.ceil(offsetDate / 7)
    
    setSelectedMonth(month)
    setSelectedWeek(`Week${weekNumber}`)
    
  }, [mounted])

  // Fetch users when admin opens dialog
  useEffect(() => {
    if (!mounted || !open || !user) return

    const fetchUsers = async () => {
      if (user?.role !== 'admin') {
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

        const response = await fetch('/api/tasks?type=users', {
          headers: { 'Authorization': `Bearer ${token}` }
        })

        if (response.ok) {
          const data = await response.json()
          
          if (data.success && data.data && data.data.users) {
            const usersList = data.data.users.map((userData: any) => ({
              id: userData.id.toString(),
              name: userData.name || userData.full_name || userData.email || `User ${userData.id}`
            }))
            
            const allTeamMembers = [
              { id: "current", name: "Myself" },
              ...usersList,
              { id: "unassigned", name: "Unassigned" }
            ]
            
            setTeamMembers(allTeamMembers)
            setAvailableUsers(data.data.users)
          }
        }
      } catch (error: any) {
        console.error('Error fetching users:', error)
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
      let month = ""
      let week = ""
      let subject = "Task"
      let moduleName = task.module_name || ""
      
      if (moduleName) {
        const parts = moduleName.split('-')
        if (parts.length >= 4) {
          month = parts[0]
          week = parts[1]
          subject = parts.slice(3).join('-')
        }
      }
      
      setSelectedMonth(month)
      setSelectedWeek(week)
      setSelectedSubject(subject)
      
      // Parse time slots from description if they exist
      let timeSlots: TimeSlot[] = []
      if (task.description) {
        // Try to parse time slots from description
        // This would need a more robust parsing logic based on how you store time slots
        timeSlots = task.timeSlots || []
      }
      
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
        timeSlots: timeSlots
      })
    } else {
      // For new task
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

  // Update current time slot when part of day changes
  useEffect(() => {
    const part = PARTS_OF_DAY.find(p => p.id === currentTimeSlot.partOfDay)
    if (part) {
      setCurrentTimeSlot(prev => ({
        ...prev,
        startTime: part.defaultStart,
        endTime: part.defaultEnd,
        color: part.color,
        icon: part.icon
      }))
    }
  }, [currentTimeSlot.partOfDay])

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
      timeSlots: [],
    })
    setSelectedMonth("")
    setSelectedWeek("")
    setSelectedSubject("Task")
    setNewTag("")
    setTeamMembers(DEFAULT_TEAM_MEMBERS)
    setCurrentTimeSlot({
      id: `slot_${Date.now()}`,
      partOfDay: 'morning',
      startTime: '08:00',
      endTime: '12:00',
      task: '',
      status: 'todo',
      color: 'bg-green-100 text-green-800 border-green-200',
      icon: <Sun className="h-4 w-4" />
    })
  }

  const addTimeSlot = () => {
    if (!currentTimeSlot.task.trim()) {
      toast.error('Please enter a task description for this time slot')
      return
    }

    if (currentTimeSlot.startTime >= currentTimeSlot.endTime) {
      toast.error('Start time must be before end time')
      return
    }

    const newSlot: TimeSlot = {
      ...currentTimeSlot,
      id: `slot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    setFormData(prev => ({
      ...prev,
      timeSlots: [...prev.timeSlots, newSlot]
    }))

    // Reset current time slot
    setCurrentTimeSlot({
      id: `slot_${Date.now()}`,
      partOfDay: currentTimeSlot.partOfDay,
      startTime: currentTimeSlot.startTime,
      endTime: currentTimeSlot.endTime,
      task: '',
      status: 'todo',
      color: currentTimeSlot.color,
      icon: currentTimeSlot.icon
    })

    toast.success('Time slot added')
  }

  const removeTimeSlot = (id: string) => {
    setFormData(prev => ({
      ...prev,
      timeSlots: prev.timeSlots.filter(slot => slot.id !== id)
    }))
    toast.info('Time slot removed')
  }

  const updateTimeSlotStatus = (id: string, status: TimeSlot['status']) => {
    setFormData(prev => ({
      ...prev,
      timeSlots: prev.timeSlots.map(slot =>
        slot.id === id ? { ...slot, status } : slot
      )
    }))
  }

  const generateDescriptionFromTimeSlots = (): string => {
    if (formData.timeSlots.length === 0) {
      return formData.description || ''
    }

    let description = `<div class="time-schedule">\n<h3>Daily Schedule</h3>\n<ul>\n`

    // Sort time slots by start time
    const sortedSlots = [...formData.timeSlots].sort((a, b) => 
      a.startTime.localeCompare(b.startTime)
    )

    sortedSlots.forEach(slot => {
      const part = PARTS_OF_DAY.find(p => p.id === slot.partOfDay)
      const partName = part?.label || slot.partOfDay
      const statusColor = TIME_SLOT_STATUSES.find(s => s.value === slot.status)?.color || ''
      const statusIcon = TIME_SLOT_STATUSES.find(s => s.value === slot.status)?.icon
      
      description += `<li class="time-slot" style="margin-bottom: 12px;">\n`
      description += `<div class="time-header" style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">\n`
      description += `<span style="font-weight: bold; color: #374151;">${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}</span>\n`
      description += `<span class="part-badge" style="padding: 2px 8px; border-radius: 12px; font-size: 12px; ${slot.color.replace('bg-', 'background-color:').replace('text-', 'color:').replace('border-', 'border-color:').replace(' ', ';')}">${partName}</span>\n`
      description += `<span class="status-badge" style="padding: 2px 8px; border-radius: 12px; font-size: 12px; ${statusColor.replace('bg-', 'background-color:').replace('text-', 'color:')}">${slot.status.replace('_', ' ')}</span>\n`
      description += `</div>\n`
      description += `<div class="task-content" style="padding-left: 16px; color: #4b5563;">${slot.task}</div>\n`
      description += `</li>\n`
    })

    description += `</ul>\n</div>`

    // Add any existing description
    if (formData.description && !formData.description.includes('Daily Schedule')) {
      description += `\n\n${formData.description}`
    }

    return description
  }

  const formatTime = (time: string): string => {
    try {
      const [hours, minutes] = time.split(':')
      const hour = parseInt(hours, 10)
      const ampm = hour >= 12 ? 'PM' : 'AM'
      const displayHour = hour % 12 || 12
      return `${displayHour}:${minutes} ${ampm}`
    } catch {
      return time
    }
  }

  const calculateTotalHours = (): number => {
    let totalMinutes = 0
    
    formData.timeSlots.forEach(slot => {
      const [startHour, startMin] = slot.startTime.split(':').map(Number)
      const [endHour, endMin] = slot.endTime.split(':').map(Number)
      
      const startInMinutes = startHour * 60 + startMin
      const endInMinutes = endHour * 60 + endMin
      
      // Handle overnight slots (after midnight)
      let duration = endInMinutes - startInMinutes
      if (duration < 0) {
        duration += 24 * 60 // Add 24 hours
      }
      
      totalMinutes += duration
    })
    
    return parseFloat((totalMinutes / 60).toFixed(2))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) {
      toast.error("Task title is required")
      return
    }

    // Generate description from time slots
    const finalDescription = generateDescriptionFromTimeSlots()
    
    // Calculate estimated hours from time slots if not manually set
    let estimatedHours = formData.estimatedHours ? parseFloat(formData.estimatedHours) : undefined
    if (formData.timeSlots.length > 0 && !formData.estimatedHours) {
      estimatedHours = calculateTotalHours()
    }

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
      description: finalDescription,
      module_name: finalModuleName,
      status: formData.status,
      priority: formData.priority,
      due_date: formData.dueDate ? format(formData.dueDate, 'yyyy-MM-dd') : undefined,
      estimated_hours: estimatedHours,
      assigned_to: formData.assignedTo === "unassigned" ? undefined : 
                  formData.assignedTo === "current" ? user?.id :
                  formData.assignedTo ? parseInt(formData.assignedTo) : undefined,
      project_id: formData.projectId === "none" ? undefined : 
                 formData.projectId ? parseInt(formData.projectId) : undefined,
      created_by: user?.id,
      tags: formData.tags.length > 0 ? formData.tags : undefined,
      timeSlots: formData.timeSlots // Store time slots in data if needed
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

  const getUserDisplayName = () => {
    if (!user) return "user"
    return (user.name || user.email || 'user').replace(/\s+/g, '_').toLowerCase()
  }

  const getAssignedUserName = () => {
    if (formData.assignedTo === "current") return "Myself"
    if (formData.assignedTo === "unassigned") return "Unassigned"
    
    const userObj = availableUsers.find(u => u.id.toString() === formData.assignedTo) ||
                   teamMembers.find(m => m.id === formData.assignedTo)
    
    return userObj?.name || userObj?.full_name || `User ${formData.assignedTo}`
  }

  if (!mounted) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-[600px] md:max-w-[800px] lg:max-w-[900px] max-h-[90vh] overflow-y-auto p-0"
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

          {/* Time-Based Task Creation */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-semibold flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Time-Based Schedule
              </Label>
              {formData.timeSlots.length > 0 && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  {formData.timeSlots.length} time slots • {calculateTotalHours()} hours
                </Badge>
              )}
            </div>

            {/* Add Time Slot Form */}
            <div className="border rounded-lg p-4 bg-gradient-to-br from-gray-50 to-white">
              <h4 className="font-medium mb-4 flex items-center gap-2">
                <Plus className="h-4 w-4 text-primary" />
                Add Time Slot
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                {/* Part of Day */}
                <div className="space-y-2">
                  <Label className="text-sm">Part of Day</Label>
                  <Select
                    value={currentTimeSlot.partOfDay}
                    onValueChange={(value: any) => setCurrentTimeSlot(prev => ({ 
                      ...prev, 
                      partOfDay: value 
                    }))}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select part">
                        <div className="flex items-center gap-2">
                          {PARTS_OF_DAY.find(p => p.id === currentTimeSlot.partOfDay)?.icon}
                          <span>{PARTS_OF_DAY.find(p => p.id === currentTimeSlot.partOfDay)?.label || 'Select'}</span>
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {PARTS_OF_DAY.map((part) => (
                        <SelectItem key={part.id} value={part.id}>
                          <div className="flex items-center gap-2">
                            {part.icon}
                            <span>{part.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Start Time */}
                <div className="space-y-2">
                  <Label className="text-sm">Start Time</Label>
                  <Select
                    value={currentTimeSlot.startTime}
                    onValueChange={(value) => setCurrentTimeSlot(prev => ({ ...prev, startTime: value }))}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Start time">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3" />
                          <span>{formatTime(currentTimeSlot.startTime)}</span>
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                      {TIME_OPTIONS.map((time) => (
                        <SelectItem key={time.value} value={time.value}>
                          {time.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* End Time */}
                <div className="space-y-2">
                  <Label className="text-sm">End Time</Label>
                  <Select
                    value={currentTimeSlot.endTime}
                    onValueChange={(value) => setCurrentTimeSlot(prev => ({ ...prev, endTime: value }))}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="End time">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3" />
                          <span>{formatTime(currentTimeSlot.endTime)}</span>
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                      {TIME_OPTIONS.map((time) => (
                        <SelectItem key={time.value} value={time.value}>
                          {time.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <Label className="text-sm">Status</Label>
                  <Select
                    value={currentTimeSlot.status}
                    onValueChange={(value: any) => setCurrentTimeSlot(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Status">
                        <div className="flex items-center gap-2">
                          {TIME_SLOT_STATUSES.find(s => s.value === currentTimeSlot.status)?.icon}
                          <span className="capitalize">{currentTimeSlot.status.replace('_', ' ')}</span>
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_SLOT_STATUSES.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          <div className="flex items-center gap-2">
                            {status.icon}
                            <span>{status.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Task Input */}
              <div className="space-y-2 mb-4">
                <Label className="text-sm">Task Description</Label>
                <Textarea
                  value={currentTimeSlot.task}
                  onChange={(e) => setCurrentTimeSlot(prev => ({ ...prev, task: e.target.value }))}
                  placeholder="What will you do during this time?"
                  className="min-h-[80px]"
                />
              </div>

              {/* Add Button */}
              <Button
                type="button"
                onClick={addTimeSlot}
                disabled={!currentTimeSlot.task.trim()}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Time Slot
              </Button>
            </div>

            {/* Time Slots List */}
            {formData.timeSlots.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Scheduled Time Slots</Label>
                  <Badge variant="outline" className="text-xs">
                    Total: {calculateTotalHours().toFixed(1)} hours
                  </Badge>
                </div>
                
                <ScrollArea className="max-h-[300px]">
                  <div className="space-y-2 pr-4">
                    {formData.timeSlots.map((slot) => {
                      const part = PARTS_OF_DAY.find(p => p.id === slot.partOfDay)
                      const statusConfig = TIME_SLOT_STATUSES.find(s => s.value === slot.status)
                      
                      return (
                        <div
                          key={slot.id}
                          className="border rounded-lg p-3 bg-white hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 space-y-2">
                              {/* Header */}
                              <div className="flex items-center gap-3">
                                <div className={`px-3 py-1 rounded-full text-xs font-medium border ${slot.color}`}>
                                  <div className="flex items-center gap-1.5">
                                    {slot.icon}
                                    <span>{part?.label}</span>
                                  </div>
                                </div>
                                
                                <div className={`px-2.5 py-1 rounded-md text-xs font-medium ${statusConfig?.color}`}>
                                  <div className="flex items-center gap-1.5">
                                    {statusConfig?.icon}
                                    <span className="capitalize">{slot.status.replace('_', ' ')}</span>
                                  </div>
                                </div>
                                
                                <div className="text-sm font-medium text-gray-700">
                                  {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                                </div>
                              </div>
                              
                              {/* Task Description */}
                              <div className="pl-2">
                                <p className="text-gray-700">{slot.task}</p>
                              </div>
                            </div>
                            
                            {/* Actions */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => {
                                    navigator.clipboard.writeText(slot.task)
                                    toast.success('Task copied to clipboard')
                                  }}
                                >
                                  <Copy className="h-4 w-4 mr-2" />
                                  Copy Task
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => removeTimeSlot(slot.id)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Remove
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          
                          {/* Status Selector */}
                          <div className="flex items-center gap-2 mt-3">
                            <span className="text-xs text-gray-500">Change status:</span>
                            <div className="flex flex-wrap gap-1">
                              {TIME_SLOT_STATUSES.map((status) => (
                                <button
                                  key={status.value}
                                  type="button"
                                  onClick={() => updateTimeSlotStatus(slot.id, status.value as TimeSlot['status'])}
                                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                    slot.status === status.value
                                      ? `${status.color} border`
                                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                  }`}
                                >
                                  {status.icon}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>

                {/* Preview Generated Description */}
                <div className="border rounded-lg p-4 bg-gradient-to-br from-blue-50 to-white">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Check className="h-4 w-4 text-blue-600" />
                      Schedule Preview
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const description = generateDescriptionFromTimeSlots()
                        navigator.clipboard.writeText(description)
                        toast.success('Schedule copied to clipboard')
                      }}
                      className="h-7 text-xs"
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </Button>
                  </div>
                  
                  <div className="text-sm text-gray-600 bg-white p-3 rounded border max-h-[100px] overflow-y-auto">
                    {formData.timeSlots.length === 0 ? (
                      <p className="text-gray-400 italic">No time slots added yet</p>
                    ) : (
                      formData.timeSlots.map((slot, index) => (
                        <div key={index} className="flex items-center gap-2 mb-1">
                          <span className="font-medium">
                            {formatTime(slot.startTime)}-{formatTime(slot.endTime)}
                          </span>
                          <span className="text-gray-500">→</span>
                          <span className="truncate">{slot.task}</span>
                          <Badge variant="outline" className="ml-auto text-xs capitalize">
                            {slot.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Module Selection */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Module Configuration</Label>
            
            {/* User Info Display */}
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-blue-50 border-blue-200">
              <User className="h-5 w-5 text-blue-600" />
              <div>
                <span className="font-medium text-blue-700">
                  {user?.full_name || user?.name || user?.email || 'User'}
                </span>
                <p className="text-xs text-blue-600/80">
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
                    if (!value) setSelectedWeek("")
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
                <div className="flex items-center gap-2 p-3 rounded-lg border bg-green-50 border-green-200">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <div className="flex-1">
                    <span className="font-mono font-bold text-green-700 text-sm">
                      {formData.moduleName}
                    </span>
                    <p className="text-xs text-green-600/80 mt-0.5">
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
                </>
              )}
            </div>
          </div>

          <Separator />

          {/* Date & Estimated Hours */}
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
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  value={formData.estimatedHours || calculateTotalHours().toString()}
                  onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
                  placeholder="Auto-calculated"
                  className="h-11"
                />
                {formData.timeSlots.length > 0 && !formData.estimatedHours && (
                  <Badge variant="outline" className="text-xs whitespace-nowrap">
                    Auto: {calculateTotalHours().toFixed(1)}h
                  </Badge>
                )}
              </div>
            </div>
          </div>

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

          {/* Additional Description */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Additional Description (Optional)</Label>
            <RichTextEditor
              value={formData.description}
              onChange={(value) => setFormData({ ...formData, description: value })}
              placeholder="Add any additional details, notes, or context..."
              className="min-h-[150px]"
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t">
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