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
  Check,
  Play,
  Pause,
  CheckCircle2,
  Edit,
  Eye,
  Timer,
  TrendingUp,
  AlertCircle,
  Download,
  Share2,
  Lock,
  Unlock,
  Repeat,
  RefreshCw,
  BarChart3,
  Target,
  Zap as ZapIcon,
  Battery,
  BatteryCharging,
  BatteryFull,
  BatteryLow,
  BatteryMedium,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  SkipForward,
  SkipBack,
  FastForward,
  Rewind,
  Square,
  Circle,
  Triangle,
  Hexagon,
  Octagon
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Progress } from "@/components/ui/progress"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface TaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (task: any) => void
  task?: any
  isSubmitting?: boolean
  moduleOptions?: Array<{value: string, label: string}>
}

// Enhanced Time Slot Interface
interface TimeSlot {
  id: string
  partOfDay: 'morning' | 'afternoon' | 'before_midnight' | 'after_midnight'
  startTime: string
  endTime: string
  task: string
  status: 'todo' | 'in_progress' | 'review' | 'done' | 'paused' | 'blocked'
  color: string
  icon: React.ReactNode
  notes?: string
  progress?: number // 0-100
  actualStartTime?: string // When actually started
  actualEndTime?: string // When actually completed
  priority?: 'low' | 'medium' | 'high'
  estimatedMinutes: number // Estimated duration in minutes
  actualMinutes?: number // Actual time spent
  isLocked?: boolean // Cannot be modified
  tags?: string[]
  dependencies?: string[] // IDs of slots this depends on
  energyLevel?: 'low' | 'medium' | 'high' // Energy required
  focusLevel?: number // 1-5 focus level
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

// Enhanced Part of Day options
const PARTS_OF_DAY = [
  {
    id: 'morning',
    label: 'Morning',
    icon: <Sun className="h-4 w-4" />,
    color: 'bg-gradient-to-r from-amber-50 to-orange-50 text-amber-800 border-amber-200',
    defaultStart: '08:00',
    defaultEnd: '12:00',
    description: 'High energy, creative work'
  },
  {
    id: 'afternoon',
    label: 'Afternoon',
    icon: <Coffee className="h-4 w-4" />,
    color: 'bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-800 border-emerald-200',
    defaultStart: '12:00',
    defaultEnd: '17:00',
    description: 'Focused, analytical work'
  },
  {
    id: 'before_midnight',
    label: 'Evening',
    icon: <Moon className="h-4 w-4" />,
    color: 'bg-gradient-to-r from-purple-50 to-violet-50 text-purple-800 border-purple-200',
    defaultStart: '17:00',
    defaultEnd: '23:59',
    description: 'Planning, review, light work'
  },
  {
    id: 'after_midnight',
    label: 'Night',
    icon: <Bed className="h-4 w-4" />,
    color: 'bg-gradient-to-r from-indigo-50 to-blue-50 text-indigo-800 border-indigo-200',
    defaultStart: '00:00',
    defaultEnd: '08:00',
    description: 'Deep work, no interruptions'
  }
]

// Enhanced Time slot status options with better descriptions
const TIME_SLOT_STATUSES = [
  { 
    value: 'todo', 
    label: 'To Do', 
    color: 'bg-gray-100 text-gray-800 border-gray-200', 
    icon: <Clock className="h-3 w-3" />,
    description: 'Not started yet',
    action: 'Start',
    actionIcon: <Play className="h-3 w-3" />
  },
  { 
    value: 'in_progress', 
    label: 'In Progress', 
    color: 'bg-blue-100 text-blue-800 border-blue-200', 
    icon: <Clock9 className="h-3 w-3" />,
    description: 'Currently working on',
    action: 'Pause',
    actionIcon: <Pause className="h-3 w-3" />
  },
  { 
    value: 'review', 
    label: 'Review', 
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
    icon: <Edit className="h-3 w-3" />,
    description: 'Needs review/feedback',
    action: 'Mark Reviewed',
    actionIcon: <Eye className="h-3 w-3" />
  },
  { 
    value: 'done', 
    label: 'Done', 
    color: 'bg-green-100 text-green-800 border-green-200', 
    icon: <CheckCircle2 className="h-3 w-3" />,
    description: 'Completed successfully',
    action: 'Reopen',
    actionIcon: <RefreshCw className="h-3 w-3" />
  },
  { 
    value: 'paused', 
    label: 'Paused', 
    color: 'bg-purple-100 text-purple-800 border-purple-200', 
    icon: <Pause className="h-3 w-3" />,
    description: 'Temporarily stopped',
    action: 'Resume',
    actionIcon: <Play className="h-3 w-3" />
  },
  { 
    value: 'blocked', 
    label: 'Blocked', 
    color: 'bg-red-100 text-red-800 border-red-200', 
    icon: <AlertCircle className="h-3 w-3" />,
    description: 'Blocked by dependency',
    action: 'Unblock',
    actionIcon: <Unlock className="h-3 w-3" />
  }
]

// Time options in 15-minute intervals for more precision
const TIME_OPTIONS = Array.from({ length: 96 }, (_, i) => {
  const hour = Math.floor(i / 4)
  const minute = (i % 4) * 15
  const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
  const display = format(new Date(`2000-01-01T${time}`), 'h:mm a')
  return { value: time, label: display }
})

const PRIORITIES = [
  { id: "low", label: "Low", color: "border-green-500 text-green-600 bg-green-50" },
  { id: "medium", label: "Medium", color: "border-yellow-500 text-yellow-600 bg-yellow-50" },
  { id: "high", label: "High", color: "border-red-500 text-red-600 bg-red-50" },
]

// Energy level options
const ENERGY_LEVELS = [
  { id: "low", label: "Low Energy", color: "from-blue-100 to-blue-50 text-blue-700", icon: <BatteryLow className="h-4 w-4" /> },
  { id: "medium", label: "Medium Energy", color: "from-green-100 to-green-50 text-green-700", icon: <BatteryMedium className="h-4 w-4" /> },
  { id: "high", label: "High Energy", color: "from-red-100 to-red-50 text-red-700", icon: <BatteryFull className="h-4 w-4" /> },
]

// Focus level options (1-5)
const FOCUS_LEVELS = [
  { level: 1, label: "Minimal", color: "bg-gray-100 text-gray-700", icon: <Eye className="h-3 w-3" /> },
  { level: 2, label: "Low", color: "bg-blue-100 text-blue-700", icon: <Eye className="h-3 w-3" /> },
  { level: 3, label: "Medium", color: "bg-green-100 text-green-700", icon: <Eye className="h-3 w-3" /> },
  { level: 4, label: "High", color: "bg-yellow-100 text-yellow-700", icon: <Eye className="h-3 w-3" /> },
  { level: 5, label: "Intense", color: "bg-red-100 text-red-700", icon: <Eye className="h-3 w-3" /> },
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
    color: 'bg-gradient-to-r from-amber-50 to-orange-50 text-amber-800 border-amber-200',
    icon: <Sun className="h-4 w-4" />,
    progress: 0,
    estimatedMinutes: 240, // 4 hours default
    priority: 'medium',
    energyLevel: 'medium',
    focusLevel: 3,
    tags: []
  })

  // Other states
  const [teamMembers, setTeamMembers] = useState<Array<{id: string, name: string}>>(DEFAULT_TEAM_MEMBERS)
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [availableUsers, setAvailableUsers] = useState<User[]>([])
  const [availableTags] = useState<string[]>([
    "Frontend", "Backend", "API", "Database", "UI/UX", "Testing", "Meeting", "Planning", "Development",
    "Coding", "Design", "Review", "Bug Fix", "Feature", "Documentation", "Research", "Learning"
  ])
  const [newTag, setNewTag] = useState("")
  
  // Time slot management states
  const [activeTab, setActiveTab] = useState<"schedule" | "progress" | "analytics">("schedule")
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)
  const [isEditingSlot, setIsEditingSlot] = useState<string | null>(null)
  const [showSlotDetails, setShowSlotDetails] = useState<string | null>(null)
  const [slotNotes, setSlotNotes] = useState<Record<string, string>>({})
  const [slotProgress, setSlotProgress] = useState<Record<string, number>>({})

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
        // Try to parse existing time slots from description
        // This regex looks for time slot patterns in the HTML
        const timeSlotRegex = /class="time-slot".*?data-slot-id="([^"]+)".*?data-part="([^"]+)".*?data-status="([^"]+)".*?data-start="([^"]+)".*?data-end="([^"]+)".*?data-task="([^"]+)"/gs
        const matches = task.description.matchAll(timeSlotRegex)
        
        for (const match of matches) {
          const part = PARTS_OF_DAY.find(p => p.id === match[2])
          timeSlots.push({
            id: match[1],
            partOfDay: match[2] as any,
            startTime: match[4],
            endTime: match[5],
            task: match[6],
            status: match[3] as any,
            color: part?.color || 'bg-gray-100',
            icon: part?.icon || <Clock className="h-4 w-4" />,
            progress: 0,
            estimatedMinutes: calculateMinutesBetween(match[4], match[5]),
            priority: 'medium',
            energyLevel: 'medium',
            focusLevel: 3,
            tags: []
          })
        }
      }
      
      // Also check if there's a timeSlots field in the task
      if (task.timeSlots && Array.isArray(task.timeSlots)) {
        timeSlots = task.timeSlots.map((slot: any) => ({
          ...slot,
          estimatedMinutes: slot.estimatedMinutes || calculateMinutesBetween(slot.startTime, slot.endTime),
          progress: slot.progress || 0,
          priority: slot.priority || 'medium',
          energyLevel: slot.energyLevel || 'medium',
          focusLevel: slot.focusLevel || 3,
          tags: slot.tags || []
        }))
      }
      
      // Initialize progress tracking
      const progressMap: Record<string, number> = {}
      const notesMap: Record<string, string> = {}
      
      timeSlots.forEach(slot => {
        progressMap[slot.id] = slot.progress || 0
        if (slot.notes) notesMap[slot.id] = slot.notes
      })
      
      setSlotProgress(progressMap)
      setSlotNotes(notesMap)
      
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
        icon: part.icon,
        estimatedMinutes: calculateMinutesBetween(part.defaultStart, part.defaultEnd)
      }))
    }
  }, [currentTimeSlot.partOfDay])

  // Calculate minutes between two times
  const calculateMinutesBetween = (start: string, end: string): number => {
    const [startHour, startMin] = start.split(':').map(Number)
    const [endHour, endMin] = end.split(':').map(Number)
    
    const startInMinutes = startHour * 60 + startMin
    const endInMinutes = endHour * 60 + endMin
    
    let duration = endInMinutes - startInMinutes
    if (duration < 0) {
      duration += 24 * 60 // Add 24 hours for overnight slots
    }
    
    return duration
  }

  // Update estimated minutes when times change
  useEffect(() => {
    const minutes = calculateMinutesBetween(currentTimeSlot.startTime, currentTimeSlot.endTime)
    setCurrentTimeSlot(prev => ({
      ...prev,
      estimatedMinutes: minutes
    }))
  }, [currentTimeSlot.startTime, currentTimeSlot.endTime])

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
      color: 'bg-gradient-to-r from-amber-50 to-orange-50 text-amber-800 border-amber-200',
      icon: <Sun className="h-4 w-4" />,
      progress: 0,
      estimatedMinutes: 240,
      priority: 'medium',
      energyLevel: 'medium',
      focusLevel: 3,
      tags: []
    })
    setActiveTab("schedule")
    setSelectedSlotId(null)
    setIsEditingSlot(null)
    setShowSlotDetails(null)
    setSlotNotes({})
    setSlotProgress({})
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

    // Initialize progress and notes for new slot
    setSlotProgress(prev => ({ ...prev, [newSlot.id]: 0 }))
    setSlotNotes(prev => ({ ...prev, [newSlot.id]: '' }))

    // Reset current time slot
    setCurrentTimeSlot({
      id: `slot_${Date.now()}`,
      partOfDay: currentTimeSlot.partOfDay,
      startTime: currentTimeSlot.startTime,
      endTime: currentTimeSlot.endTime,
      task: '',
      status: 'todo',
      color: currentTimeSlot.color,
      icon: currentTimeSlot.icon,
      progress: 0,
      estimatedMinutes: currentTimeSlot.estimatedMinutes,
      priority: 'medium',
      energyLevel: 'medium',
      focusLevel: 3,
      tags: []
    })

    toast.success('Time slot added')
  }

  const updateTimeSlot = (id: string, updates: Partial<TimeSlot>) => {
    setFormData(prev => ({
      ...prev,
      timeSlots: prev.timeSlots.map(slot =>
        slot.id === id ? { ...slot, ...updates } : slot
      )
    }))
  }

  const removeTimeSlot = (id: string) => {
    setFormData(prev => ({
      ...prev,
      timeSlots: prev.timeSlots.filter(slot => slot.id !== id)
    }))
    
    // Remove from progress and notes tracking
    const newProgress = { ...slotProgress }
    const newNotes = { ...slotNotes }
    delete newProgress[id]
    delete newNotes[id]
    setSlotProgress(newProgress)
    setSlotNotes(newNotes)
    
    toast.info('Time slot removed')
  }

  const updateTimeSlotStatus = (id: string, status: TimeSlot['status']) => {
    const slot = formData.timeSlots.find(s => s.id === id)
    if (!slot) return

    let progress = slotProgress[id] || 0
    
    // Auto-update progress based on status
    if (status === 'done' && progress < 100) {
      progress = 100
      setSlotProgress(prev => ({ ...prev, [id]: 100 }))
    } else if (status === 'in_progress' && progress === 0) {
      progress = 25 // Start with 25% when starting
      setSlotProgress(prev => ({ ...prev, [id]: 25 }))
    }

    updateTimeSlot(id, { status })
    
    const statusConfig = TIME_SLOT_STATUSES.find(s => s.value === status)
    toast.success(`Status updated to ${statusConfig?.label}`)
  }

  const updateSlotProgress = (id: string, progress: number) => {
    setSlotProgress(prev => ({ ...prev, [id]: progress }))
    
    // Auto-update status based on progress
    const slot = formData.timeSlots.find(s => s.id === id)
    if (slot) {
      if (progress >= 100 && slot.status !== 'done') {
        updateTimeSlotStatus(id, 'done')
      } else if (progress > 0 && progress < 100 && slot.status === 'todo') {
        updateTimeSlotStatus(id, 'in_progress')
      }
    }
  }

  const updateSlotNotes = (id: string, notes: string) => {
    setSlotNotes(prev => ({ ...prev, [id]: notes }))
  }

  const duplicateTimeSlot = (slot: TimeSlot) => {
    const newSlot: TimeSlot = {
      ...slot,
      id: `slot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'todo',
      progress: 0
    }

    setFormData(prev => ({
      ...prev,
      timeSlots: [...prev.timeSlots, newSlot]
    }))

    // Initialize progress and notes for duplicated slot
    setSlotProgress(prev => ({ ...prev, [newSlot.id]: 0 }))
    setSlotNotes(prev => ({ ...prev, [newSlot.id]: '' }))

    toast.success('Time slot duplicated')
  }

  const startTimeSlot = (id: string) => {
    const slot = formData.timeSlots.find(s => s.id === id)
    if (!slot) return

    updateTimeSlot(id, {
      status: 'in_progress',
      actualStartTime: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
    })
    
    setSlotProgress(prev => ({ ...prev, [id]: 25 })) // Start with 25% progress
    
    toast.success('Time slot started!')
  }

  const completeTimeSlot = (id: string) => {
    updateTimeSlot(id, {
      status: 'done',
      actualEndTime: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
    })
    
    setSlotProgress(prev => ({ ...prev, [id]: 100 }))
    
    toast.success('Time slot completed! 🎉')
  }

  const calculateTotalHours = (): number => {
    let totalMinutes = 0
    
    formData.timeSlots.forEach(slot => {
      totalMinutes += slot.estimatedMinutes
    })
    
    return parseFloat((totalMinutes / 60).toFixed(2))
  }

  const calculateCompletedHours = (): number => {
    let completedMinutes = 0
    
    formData.timeSlots.forEach(slot => {
      const progress = slotProgress[slot.id] || 0
      completedMinutes += (slot.estimatedMinutes * progress) / 100
    })
    
    return parseFloat((completedMinutes / 60).toFixed(2))
  }

  const calculateProgressPercentage = (): number => {
    if (formData.timeSlots.length === 0) return 0
    
    const totalEstimated = formData.timeSlots.reduce((sum, slot) => sum + slot.estimatedMinutes, 0)
    const totalCompleted = formData.timeSlots.reduce((sum, slot) => {
      const progress = slotProgress[slot.id] || 0
      return sum + (slot.estimatedMinutes * progress) / 100
    }, 0)
    
    return totalEstimated > 0 ? Math.round((totalCompleted / totalEstimated) * 100) : 0
  }

  const getSlotStats = () => {
    const total = formData.timeSlots.length
    const completed = formData.timeSlots.filter(s => s.status === 'done').length
    const inProgress = formData.timeSlots.filter(s => s.status === 'in_progress').length
    const todo = formData.timeSlots.filter(s => s.status === 'todo').length
    
    return { total, completed, inProgress, todo }
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

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  const generateDescriptionFromTimeSlots = (): string => {
    if (formData.timeSlots.length === 0) {
      return formData.description || ''
    }

    let description = `<div class="time-schedule">\n<h3>Daily Schedule</h3>\n<div class="schedule-stats" style="display: flex; gap: 16px; margin-bottom: 20px; padding: 12px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px; color: white;">\n`
    
    const stats = getSlotStats()
    const totalHours = calculateTotalHours()
    const completedHours = calculateCompletedHours()
    const progress = calculateProgressPercentage()
    
    description += `<div style="flex: 1; text-align: center;">\n`
    description += `<div style="font-size: 24px; font-weight: bold;">${stats.completed}/${stats.total}</div>\n`
    description += `<div style="font-size: 12px; opacity: 0.9;">Slots Done</div>\n`
    description += `</div>\n`
    
    description += `<div style="flex: 1; text-align: center;">\n`
    description += `<div style="font-size: 24px; font-weight: bold;">${progress}%</div>\n`
    description += `<div style="font-size: 12px; opacity: 0.9;">Progress</div>\n`
    description += `</div>\n`
    
    description += `<div style="flex: 1; text-align: center;">\n`
    description += `<div style="font-size: 24px; font-weight: bold;">${completedHours.toFixed(1)}/${totalHours.toFixed(1)}h</div>\n`
    description += `<div style="font-size: 12px; opacity: 0.9;">Hours</div>\n`
    description += `</div>\n`
    
    description += `</div>\n<ul>\n`

    // Sort time slots by start time
    const sortedSlots = [...formData.timeSlots].sort((a, b) => 
      a.startTime.localeCompare(b.startTime)
    )

    sortedSlots.forEach(slot => {
      const part = PARTS_OF_DAY.find(p => p.id === slot.partOfDay)
      const partName = part?.label || slot.partOfDay
      const statusConfig = TIME_SLOT_STATUSES.find(s => s.value === slot.status)
      const progress = slotProgress[slot.id] || 0
      
      description += `<li class="time-slot" data-slot-id="${slot.id}" data-part="${slot.partOfDay}" data-status="${slot.status}" data-start="${slot.startTime}" data-end="${slot.endTime}" data-task="${slot.task.replace(/"/g, '&quot;')}" style="margin-bottom: 16px; padding: 16px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">\n`
      
      // Header with status and progress
      description += `<div class="slot-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">\n`
      description += `<div style="display: flex; align-items: center; gap: 8px;">\n`
      description += `<span style="font-weight: bold; color: #374151;">${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}</span>\n`
      description += `<span class="part-badge" style="padding: 4px 12px; border-radius: 20px; font-size: 12px; ${slot.color.replace('bg-', 'background:').replace('text-', 'color:').replace('border-', 'border: 1px solid ').replace(' ', ';')}">${partName}</span>\n`
      description += `<span class="status-badge" style="padding: 4px 12px; border-radius: 20px; font-size: 12px; ${statusConfig?.color.replace('bg-', 'background-color:').replace('text-', 'color:').replace('border-', 'border-color:').replace(' ', ';')}">\n`
      description += `<span style="display: flex; align-items: center; gap: 4px;">\n`
      description += `${statusConfig?.label}\n`
      description += `</span>\n`
      description += `</span>\n`
      description += `</div>\n`
      
      // Progress indicator
      description += `<div style="display: flex; align-items: center; gap: 8px;">\n`
      description += `<span style="font-size: 12px; color: #6b7280;">${progress}%</span>\n`
      description += `<div style="width: 60px; height: 6px; background: #e5e7eb; border-radius: 3px; overflow: hidden;">\n`
      description += `<div style="width: ${progress}%; height: 100%; background: ${progress === 100 ? '#10b981' : progress > 50 ? '#3b82f6' : '#f59e0b'}; transition: width 0.3s ease;"></div>\n`
      description += `</div>\n`
      description += `</div>\n`
      
      description += `</div>\n`
      
      // Task content
      description += `<div class="task-content" style="margin-bottom: 12px;">\n`
      description += `<p style="color: #1f2937; margin: 0;">${slot.task}</p>\n`
      description += `</div>\n`
      
      // Metadata
      description += `<div class="slot-metadata" style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #6b7280;">\n`
      description += `<div style="display: flex; align-items: center; gap: 12px;">\n`
      description += `<span>${formatDuration(slot.estimatedMinutes)}</span>\n`
      if (slot.priority) {
        const priorityColor = PRIORITIES.find(p => p.id === slot.priority)?.color || ''
        description += `<span style="padding: 2px 8px; border-radius: 12px; ${priorityColor.replace('border-', 'border: 1px solid ').replace('text-', 'color:').replace('bg-', 'background-color:').replace(' ', ';')}">${slot.priority.charAt(0).toUpperCase() + slot.priority.slice(1)} Priority</span>\n`
      }
      description += `</div>\n`
      
      if (slot.actualStartTime) {
        description += `<span>Started: ${formatTime(slot.actualStartTime)}</span>\n`
      }
      if (slot.actualEndTime) {
        description += `<span>Completed: ${formatTime(slot.actualEndTime)}</span>\n`
      }
      
      description += `</div>\n`
      
      // Notes (if any)
      const notes = slotNotes[slot.id]
      if (notes && notes.trim()) {
        description += `<div class="slot-notes" style="margin-top: 12px; padding: 8px; background: #f9fafb; border-left: 3px solid #3b82f6; border-radius: 4px;">\n`
        description += `<p style="margin: 0; font-size: 12px; color: #4b5563;"><strong>Notes:</strong> ${notes}</p>\n`
        description += `</div>\n`
      }
      
      description += `</li>\n`
    })

    description += `</ul>\n</div>`

    // Add any existing description
    if (formData.description && !formData.description.includes('Daily Schedule')) {
      description += `\n\n${formData.description}`
    }

    return description
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) {
      toast.error("Task title is required")
      return
    }

    // Update time slots with current progress and notes
    const updatedTimeSlots = formData.timeSlots.map(slot => ({
      ...slot,
      progress: slotProgress[slot.id] || 0,
      notes: slotNotes[slot.id] || '',
      actualMinutes: slot.actualStartTime && slot.actualEndTime ? 
        calculateMinutesBetween(slot.actualStartTime, slot.actualEndTime) : undefined
    }))

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
      timeSlots: updatedTimeSlots, // Store enhanced time slots
      timeSlotStats: {
        total: updatedTimeSlots.length,
        completed: updatedTimeSlots.filter(s => s.status === 'done').length,
        inProgress: updatedTimeSlots.filter(s => s.status === 'in_progress').length,
        totalProgress: calculateProgressPercentage(),
        totalHours: calculateTotalHours(),
        completedHours: calculateCompletedHours()
      }
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

  const slotStats = getSlotStats()
  const progressPercentage = calculateProgressPercentage()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-[700px] md:max-w-[900px] lg:max-w-[1100px] max-h-[95vh] overflow-y-auto p-0"
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

          {/* Time-Based Task Creation with Tabs */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10">
                  <Timer className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    Time-Based Schedule
                    {formData.timeSlots.length > 0 && (
                      <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                        {slotStats.completed}/{slotStats.total} slots
                      </Badge>
                    )}
                  </h3>
                  <p className="text-sm text-gray-500">Plan and track your day hour by hour</p>
                </div>
              </div>
              
              {formData.timeSlots.length > 0 && (
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">{progressPercentage}%</div>
                  <div className="text-xs text-gray-500">Overall Progress</div>
                </div>
              )}
            </div>

            {/* Progress Overview Bar */}
            {formData.timeSlots.length > 0 && (
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-xl border border-blue-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium text-gray-700">Daily Progress</div>
                  <div className="text-sm font-semibold text-blue-700">
                    {calculateCompletedHours().toFixed(1)}/{calculateTotalHours().toFixed(1)} hours
                  </div>
                </div>
                <Progress value={progressPercentage} className="h-3 bg-blue-100" />
                <div className="flex justify-between mt-2 text-xs text-gray-500">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span>{slotStats.completed} Done</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span>{slotStats.inProgress} In Progress</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                    <span>{slotStats.todo} To Do</span>
                  </div>
                </div>
              </div>
            )}

            {/* Tabs for Time Slot Management */}
            <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
              <TabsList className="grid grid-cols-3 mb-6">
                <TabsTrigger value="schedule" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Schedule
                </TabsTrigger>
                <TabsTrigger value="progress" className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Progress
                </TabsTrigger>
                <TabsTrigger value="analytics" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Analytics
                </TabsTrigger>
              </TabsList>

              {/* Schedule Tab - Add/Edit Time Slots */}
              <TabsContent value="schedule" className="space-y-6">
                {/* Add Time Slot Form */}
                <div className="border rounded-xl p-5 bg-gradient-to-br from-gray-50 to-white shadow-sm">
                  <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <Plus className="h-5 w-5 text-primary" />
                    Add New Time Slot
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    {/* Part of Day */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Part of Day</Label>
                      <Select
                        value={currentTimeSlot.partOfDay}
                        onValueChange={(value: any) => setCurrentTimeSlot(prev => ({ 
                          ...prev, 
                          partOfDay: value 
                        }))}
                      >
                        <SelectTrigger className="h-11">
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
                                <div>
                                  <div className="font-medium">{part.label}</div>
                                  <div className="text-xs text-gray-500">{part.description}</div>
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Start Time */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Start Time</Label>
                      <Select
                        value={currentTimeSlot.startTime}
                        onValueChange={(value) => setCurrentTimeSlot(prev => ({ ...prev, startTime: value }))}
                      >
                        <SelectTrigger className="h-11">
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
                      <Label className="text-sm font-medium">End Time</Label>
                      <Select
                        value={currentTimeSlot.endTime}
                        onValueChange={(value) => setCurrentTimeSlot(prev => ({ ...prev, endTime: value }))}
                      >
                        <SelectTrigger className="h-11">
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
                      <Label className="text-sm font-medium">Initial Status</Label>
                      <Select
                        value={currentTimeSlot.status}
                        onValueChange={(value: any) => setCurrentTimeSlot(prev => ({ ...prev, status: value }))}
                      >
                        <SelectTrigger className="h-11">
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
                                <div>
                                  <div>{status.label}</div>
                                  <div className="text-xs text-gray-500">{status.description}</div>
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Additional Slot Options */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    {/* Priority */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Priority</Label>
                      <Select
                        value={currentTimeSlot.priority}
                        onValueChange={(value: any) => setCurrentTimeSlot(prev => ({ ...prev, priority: value }))}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Priority">
                            <div className="flex items-center gap-2">
                              <Flag className="h-3 w-3" />
                              <span className="capitalize">{currentTimeSlot.priority}</span>
                            </div>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {PRIORITIES.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${p.id === 'high' ? 'bg-red-500' : p.id === 'medium' ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                                <span>{p.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Energy Level */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Energy Required</Label>
                      <Select
                        value={currentTimeSlot.energyLevel}
                        onValueChange={(value: any) => setCurrentTimeSlot(prev => ({ ...prev, energyLevel: value }))}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Energy">
                            <div className="flex items-center gap-2">
                              <ZapIcon className="h-3 w-3" />
                              <span className="capitalize">{currentTimeSlot.energyLevel}</span>
                            </div>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {ENERGY_LEVELS.map((e) => (
                            <SelectItem key={e.id} value={e.id}>
                              <div className="flex items-center gap-2">
                                {e.icon}
                                <span>{e.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Focus Level */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Focus Level</Label>
                      <div className="flex items-center gap-2">
                        <Slider
                          value={[currentTimeSlot.focusLevel || 3]}
                          onValueChange={(value) => setCurrentTimeSlot(prev => ({ ...prev, focusLevel: value[0] }))}
                          min={1}
                          max={5}
                          step={1}
                          className="flex-1"
                        />
                        <Badge variant="outline" className="min-w-[60px]">
                          Level {currentTimeSlot.focusLevel}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Task Input */}
                  <div className="space-y-2 mb-4">
                    <Label className="text-sm font-medium">Task Description *</Label>
                    <Textarea
                      value={currentTimeSlot.task}
                      onChange={(e) => setCurrentTimeSlot(prev => ({ ...prev, task: e.target.value }))}
                      placeholder="What will you do during this time? Be specific!"
                      className="min-h-[100px] text-base"
                    />
                    <div className="text-xs text-gray-500 flex justify-between">
                      <span>Duration: {formatDuration(currentTimeSlot.estimatedMinutes)}</span>
                      <span>{currentTimeSlot.task.length}/500 characters</span>
                    </div>
                  </div>

                  {/* Add Button */}
                  <Button
                    type="button"
                    onClick={addTimeSlot}
                    disabled={!currentTimeSlot.task.trim()}
                    className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Add Time Slot
                  </Button>
                </div>
              </TabsContent>

              {/* Progress Tab - Manage Time Slot Progress */}
              <TabsContent value="progress" className="space-y-6">
                {formData.timeSlots.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="mx-auto h-16 w-16 rounded-full bg-gradient-to-r from-blue-100 to-purple-100 flex items-center justify-center mb-4">
                      <Clock className="h-8 w-8 text-blue-500" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No time slots yet</h3>
                    <p className="text-gray-500 mb-6">Add time slots in the Schedule tab to track progress</p>
                    <Button
                      type="button"
                      onClick={() => setActiveTab("schedule")}
                      className="bg-gradient-to-r from-blue-600 to-purple-600"
                    >
                      Go to Schedule
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* Progress Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border border-green-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm text-green-700 font-medium">Completed</div>
                            <div className="text-2xl font-bold text-green-800">{slotStats.completed}</div>
                          </div>
                          <CheckCircle2 className="h-8 w-8 text-green-600 opacity-50" />
                        </div>
                      </div>
                      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-xl border border-blue-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm text-blue-700 font-medium">In Progress</div>
                            <div className="text-2xl font-bold text-blue-800">{slotStats.inProgress}</div>
                          </div>
                          <Clock9 className="h-8 w-8 text-blue-600 opacity-50" />
                        </div>
                      </div>
                      <div className="bg-gradient-to-br from-gray-50 to-slate-50 p-4 rounded-xl border border-gray-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm text-gray-700 font-medium">To Do</div>
                            <div className="text-2xl font-bold text-gray-800">{slotStats.todo}</div>
                          </div>
                          <Clock className="h-8 w-8 text-gray-600 opacity-50" />
                        </div>
                      </div>
                    </div>

                    {/* Time Slots List with Progress Controls */}
                    <ScrollArea className="max-h-[400px]">
                      <div className="space-y-4 pr-4">
                        {formData.timeSlots.map((slot) => {
                          const part = PARTS_OF_DAY.find(p => p.id === slot.partOfDay)
                          const statusConfig = TIME_SLOT_STATUSES.find(s => s.value === slot.status)
                          const progress = slotProgress[slot.id] || 0
                          const notes = slotNotes[slot.id] || ''
                          const isSelected = selectedSlotId === slot.id
                          const isEditing = isEditingSlot === slot.id
                          const showDetails = showSlotDetails === slot.id
                          
                          return (
                            <div
                              key={slot.id}
                              className={`border rounded-xl p-4 transition-all duration-300 ${
                                isSelected 
                                  ? 'ring-2 ring-blue-500 bg-blue-50' 
                                  : 'bg-white hover:bg-gray-50'
                              }`}
                              onClick={() => setSelectedSlotId(slot.id)}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1 space-y-3">
                                  {/* Header */}
                                  <div className="flex items-center gap-3 flex-wrap">
                                    <div className={`px-3 py-1.5 rounded-full text-sm font-medium border ${slot.color} flex items-center gap-2`}>
                                      {slot.icon}
                                      <span>{part?.label}</span>
                                    </div>
                                    
                                    <div className={`px-3 py-1.5 rounded-md text-sm font-medium ${statusConfig?.color} flex items-center gap-2`}>
                                      {statusConfig?.icon}
                                      <span>{statusConfig?.label}</span>
                                    </div>
                                    
                                    <div className="text-sm font-medium text-gray-700">
                                      {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                                    </div>
                                    
                                    <Badge variant="outline" className={`${
                                      slot.priority === 'high' ? 'bg-red-50 text-red-700 border-red-200' :
                                      slot.priority === 'medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                      'bg-green-50 text-green-700 border-green-200'
                                    }`}>
                                      {slot.priority?.toUpperCase()}
                                    </Badge>
                                  </div>
                                  
                                  {/* Task Description */}
                                  <div className="pl-2">
                                    <p className="text-gray-800 font-medium">{slot.task}</p>
                                    <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                                      <span>Duration: {formatDuration(slot.estimatedMinutes)}</span>
                                      {slot.actualStartTime && (
                                        <span>Started: {formatTime(slot.actualStartTime)}</span>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* Progress Bar */}
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <Label className="text-sm font-medium">Progress</Label>
                                      <span className="text-sm font-semibold text-blue-700">{progress}%</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <Slider
                                        value={[progress]}
                                        onValueChange={(value) => updateSlotProgress(slot.id, value[0])}
                                        max={100}
                                        step={5}
                                        className="flex-1"
                                      />
                                      <div className="flex gap-1">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            updateSlotProgress(slot.id, Math.max(0, progress - 25))
                                          }}
                                          disabled={progress <= 0}
                                          className="h-8 w-8 p-0"
                                        >
                                          <ChevronDown className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            updateSlotProgress(slot.id, Math.min(100, progress + 25))
                                          }}
                                          disabled={progress >= 100}
                                          className="h-8 w-8 p-0"
                                        >
                                          <ChevronUp className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Quick Actions */}
                                  <div className="flex flex-wrap gap-2">
                                    {slot.status !== 'in_progress' && slot.status !== 'done' && (
                                      <Button
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          startTimeSlot(slot.id)
                                        }}
                                        className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                                      >
                                        <Play className="h-3 w-3 mr-1" />
                                        Start Now
                                      </Button>
                                    )}
                                    
                                    {slot.status === 'in_progress' && (
                                      <Button
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          completeTimeSlot(slot.id)
                                        }}
                                        className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                                      >
                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                        Mark Complete
                                      </Button>
                                    )}
                                    
                                    {/* Status Buttons */}
                                    <div className="flex flex-wrap gap-1">
                                      {TIME_SLOT_STATUSES.map((status) => (
                                        <Button
                                          key={status.value}
                                          size="sm"
                                          variant={slot.status === status.value ? "default" : "outline"}
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            updateTimeSlotStatus(slot.id, status.value as TimeSlot['status'])
                                          }}
                                          className={`h-8 text-xs ${
                                            slot.status === status.value
                                              ? status.color.replace('bg-', 'bg-').replace('text-', 'text-').replace('border-', 'border-')
                                              : ''
                                          }`}
                                        >
                                          {status.icon}
                                        </Button>
                                      ))}
                                    </div>
                                  </div>
                                  
                                  {/* Notes Section */}
                                  <div className="pt-3 border-t">
                                    <div className="flex items-center justify-between mb-2">
                                      <Label className="text-sm font-medium flex items-center gap-2">
                                        <Edit className="h-3 w-3" />
                                        Notes
                                      </Label>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setShowSlotDetails(showDetails ? null : slot.id)
                                        }}
                                      >
                                        {showDetails ? 'Hide' : 'Show'} Notes
                                      </Button>
                                    </div>
                                    
                                    {showDetails && (
                                      <div className="space-y-2 animate-in fade-in duration-300">
                                        <Textarea
                                          value={notes}
                                          onChange={(e) => updateSlotNotes(slot.id, e.target.value)}
                                          placeholder="Add notes about this time slot..."
                                          className="min-h-[80px] text-sm"
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                        <div className="text-xs text-gray-500">
                                          Add any details, blockers, or observations about this task.
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Actions Menu */}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 ml-2">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem
                                      onClick={() => duplicateTimeSlot(slot)}
                                    >
                                      <Copy className="h-4 w-4 mr-2" />
                                      Duplicate Slot
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        if (isEditing) {
                                          setIsEditingSlot(null)
                                        } else {
                                          setIsEditingSlot(slot.id)
                                          setCurrentTimeSlot(slot)
                                        }
                                      }}
                                    >
                                      <Edit className="h-4 w-4 mr-2" />
                                      {isEditing ? 'Cancel Edit' : 'Edit Slot'}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        navigator.clipboard.writeText(slot.task)
                                        toast.success('Task copied to clipboard')
                                      }}
                                    >
                                      <Copy className="h-4 w-4 mr-2" />
                                      Copy Task
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => removeTimeSlot(slot.id)}
                                      className="text-red-600"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Remove Slot
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                              
                              {/* Editing Mode */}
                              {isEditing && (
                                <div className="mt-4 pt-4 border-t animate-in fade-in duration-300">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <Label className="text-sm font-medium">Update Times</Label>
                                      <div className="grid grid-cols-2 gap-2">
                                        <Select
                                          value={slot.startTime}
                                          onValueChange={(value) => updateTimeSlot(slot.id, { startTime: value })}
                                        >
                                          <SelectTrigger className="h-9">
                                            <SelectValue placeholder="Start" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {TIME_OPTIONS.map((time) => (
                                              <SelectItem key={time.value} value={time.value}>
                                                {time.label}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                        <Select
                                          value={slot.endTime}
                                          onValueChange={(value) => updateTimeSlot(slot.id, { endTime: value })}
                                        >
                                          <SelectTrigger className="h-9">
                                            <SelectValue placeholder="End" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {TIME_OPTIONS.map((time) => (
                                              <SelectItem key={time.value} value={time.value}>
                                                {time.label}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </div>
                                    
                                    <div className="space-y-2">
                                      <Label className="text-sm font-medium">Update Priority</Label>
                                      <Select
                                        value={slot.priority}
                                        onValueChange={(value: any) => updateTimeSlot(slot.id, { priority: value })}
                                      >
                                        <SelectTrigger className="h-9">
                                          <SelectValue placeholder="Priority" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {PRIORITIES.map((p) => (
                                            <SelectItem key={p.id} value={p.id}>
                                              {p.label}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                  
                                  <div className="flex justify-end gap-2 mt-4">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setIsEditingSlot(null)}
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        updateTimeSlot(slot.id, currentTimeSlot)
                                        setIsEditingSlot(null)
                                        toast.success('Slot updated')
                                      }}
                                    >
                                      Save Changes
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </ScrollArea>
                    
                    {/* Bulk Actions */}
                    <div className="flex flex-wrap gap-2 pt-4 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          formData.timeSlots.forEach(slot => {
                            if (slot.status === 'todo') {
                              updateTimeSlotStatus(slot.id, 'in_progress')
                            }
                          })
                          toast.success('Started all todo slots')
                        }}
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Start All Todo
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          formData.timeSlots.forEach(slot => {
                            if (slot.status === 'in_progress') {
                              updateTimeSlotStatus(slot.id, 'done')
                              updateSlotProgress(slot.id, 100)
                            }
                          })
                          toast.success('Completed all in-progress slots')
                        }}
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Complete All In Progress
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          formData.timeSlots.forEach(slot => {
                            updateSlotProgress(slot.id, 0)
                            updateTimeSlotStatus(slot.id, 'todo')
                          })
                          toast.success('Reset all slots')
                        }}
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Reset All
                      </Button>
                    </div>
                  </>
                )}
              </TabsContent>

              {/* Analytics Tab */}
              <TabsContent value="analytics" className="space-y-6">
                {formData.timeSlots.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="mx-auto h-16 w-16 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 flex items-center justify-center mb-4">
                      <BarChart3 className="h-8 w-8 text-purple-500" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No analytics yet</h3>
                    <p className="text-gray-500 mb-6">Add time slots to see productivity analytics</p>
                  </div>
                ) : (
                  <>
                    {/* Analytics Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-white p-4 rounded-xl border shadow-sm">
                        <div className="text-sm text-gray-500 font-medium">Total Time</div>
                        <div className="text-2xl font-bold mt-1">{calculateTotalHours().toFixed(1)} hours</div>
                        <div className="text-xs text-gray-400 mt-1">{formData.timeSlots.length} slots</div>
                      </div>
                      <div className="bg-white p-4 rounded-xl border shadow-sm">
                        <div className="text-sm text-gray-500 font-medium">Completed Time</div>
                        <div className="text-2xl font-bold mt-1 text-green-600">{calculateCompletedHours().toFixed(1)} hours</div>
                        <Progress value={progressPercentage} className="h-2 mt-2" />
                      </div>
                      <div className="bg-white p-4 rounded-xl border shadow-sm">
                        <div className="text-sm text-gray-500 font-medium">Avg Progress</div>
                        <div className="text-2xl font-bold mt-1 text-blue-600">
                          {Math.round(formData.timeSlots.reduce((sum, slot) => sum + (slotProgress[slot.id] || 0), 0) / formData.timeSlots.length)}%
                        </div>
                        <div className="text-xs text-gray-400 mt-1">Per slot</div>
                      </div>
                      <div className="bg-white p-4 rounded-xl border shadow-sm">
                        <div className="text-sm text-gray-500 font-medium">Efficiency</div>
                        <div className="text-2xl font-bold mt-1 text-purple-600">
                          {Math.round((calculateCompletedHours() / calculateTotalHours()) * 100)}%
                        </div>
                        <div className="text-xs text-gray-400 mt-1">Time utilization</div>
                      </div>
                    </div>

                    {/* Status Distribution */}
                    <div className="bg-white p-5 rounded-xl border shadow-sm">
                      <h4 className="font-semibold mb-4 flex items-center gap-2">
                        <PieChart className="h-4 w-4" />
                        Status Distribution
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        {TIME_SLOT_STATUSES.map((status) => {
                          const count = formData.timeSlots.filter(s => s.status === status.value).length
                          const percentage = formData.timeSlots.length > 0 ? Math.round((count / formData.timeSlots.length) * 100) : 0
                          
                          return (
                            <div key={status.value} className="text-center">
                              <div className={`h-16 w-16 mx-auto rounded-full flex items-center justify-center ${status.color} mb-2`}>
                                {status.icon}
                              </div>
                              <div className="text-lg font-bold">{count}</div>
                              <div className="text-sm text-gray-500">{status.label}</div>
                              <div className="text-xs text-gray-400">{percentage}%</div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Time of Day Analysis */}
                    <div className="bg-white p-5 rounded-xl border shadow-sm">
                      <h4 className="font-semibold mb-4 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Time of Day Analysis
                      </h4>
                      <div className="space-y-4">
                        {PARTS_OF_DAY.map((part) => {
                          const slotsInPart = formData.timeSlots.filter(s => s.partOfDay === part.id)
                          const completedInPart = slotsInPart.filter(s => s.status === 'done').length
                          const progressInPart = slotsInPart.length > 0 
                            ? Math.round(slotsInPart.reduce((sum, s) => sum + (slotProgress[s.id] || 0), 0) / slotsInPart.length)
                            : 0
                          
                          return (
                            <div key={part.id} className="flex items-center gap-4">
                              <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${part.color}`}>
                                {part.icon}
                              </div>
                              <div className="flex-1">
                                <div className="flex justify-between mb-1">
                                  <span className="font-medium">{part.label}</span>
                                  <span className="text-sm text-gray-500">
                                    {completedInPart}/{slotsInPart.length} completed
                                  </span>
                                </div>
                                <Progress value={progressInPart} className="h-2" />
                                <div className="flex justify-between text-xs text-gray-500 mt-1">
                                  <span>{part.description}</span>
                                  <span>{progressInPart}% avg progress</span>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* The rest of your existing form (Module Selection, Priority, etc.) remains the same */}
          {/* ... (All the existing form sections below remain unchanged) ... */}

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
              className="flex-1 h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
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

// Helper component for PieChart icon (add this import or create the component)
const PieChart = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
    <path d="M22 12A10 10 0 0 0 12 2v10z" />
  </svg>
)