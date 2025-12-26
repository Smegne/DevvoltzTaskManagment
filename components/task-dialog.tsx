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
  CheckCircle
} from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { RichTextEditor } from "@/components/rich-text-editor"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

interface TaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (task: any) => void
  task?: any
  isSubmitting?: boolean
}

// Month options
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]

// Week options
const WEEKS = ["Week 1", "Week 2", "Week 3", "Week 4"]

const PRIORITIES = [
  { id: "low", label: "Low", color: "border-green-500 text-green-600" },
  { id: "medium", label: "Medium", color: "border-yellow-500 text-yellow-600" },
  { id: "high", label: "High", color: "border-red-500 text-red-600" },
]

const TEAM_MEMBERS = [
  { id: "current", name: "Myself" },
  { id: "unassigned", name: "Unassigned" },
  { id: "2", name: "Alex Chen" },
  { id: "3", name: "Sarah Kim" },
]

export function TaskDialog({ open, onOpenChange, onSave, task, isSubmitting = false }: TaskDialogProps) {
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

  // New state for month and week selection
  const [selectedMonth, setSelectedMonth] = useState<string>("")
  const [selectedWeek, setSelectedWeek] = useState<string>("")
  
  const [availableTags] = useState<string[]>([
    "Frontend", "Backend", "API", "Database", "UI/UX", "Testing"
  ])
  const [newTag, setNewTag] = useState("")

  // Prevent SSR
  useEffect(() => {
    setMounted(true)
  }, [])

  // Load task data when editing
  useEffect(() => {
    if (!mounted) return
    
    if (task) {
      // Parse existing module name if it follows the format "Month - Week X"
      let month = ""
      let week = ""
      let moduleName = task.module_name || ""
      
      if (moduleName) {
        const match = moduleName.match(/^(.+?) - Week (\d+)$/)
        if (match) {
          month = match[1].trim()
          week = `Week ${match[2]}`
        }
      }
      
      setSelectedMonth(month)
      setSelectedWeek(week)
      
      setFormData({
        moduleName: task.module_name || "",
        title: task.title || "",
        description: task.description || "",
        status: task.status || "todo",
        priority: task.priority || "medium",
        projectId: task.project_id?.toString() || "",
        assignedTo: task.assigned_to?.toString() || "current",
        dueDate: task.due_date ? new Date(task.due_date) : undefined,
        estimatedHours: task.estimated_hours?.toString() || "",
        tags: task.tags || [],
      })
    }
  }, [task, open, mounted])

  // Update module name when month or week changes
  useEffect(() => {
    if (selectedMonth && selectedWeek) {
      const weekNumber = selectedWeek.replace("Week ", "")
      const generatedModuleName = `${selectedMonth} - Week ${weekNumber}`
      setFormData(prev => ({
        ...prev,
        moduleName: generatedModuleName
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        moduleName: ""
      }))
    }
  }, [selectedMonth, selectedWeek])

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
    setNewTag("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) {
      alert("Task title is required")
      return
    }

    // Ensure module name is generated if month and week are selected
    let finalModuleName = formData.moduleName
    if (selectedMonth && selectedWeek && !finalModuleName) {
      const weekNumber = selectedWeek.replace("Week ", "")
      finalModuleName = `${selectedMonth} - Week ${weekNumber}`
    }

    const taskData = {
      id: task?.id,
      title: formData.title,
      description: formData.description,
      module_name: finalModuleName || undefined,
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

  if (!mounted) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] md:max-w-[700px] lg:max-w-[800px] max-h-[90vh] overflow-y-auto p-0">
        <div className="bg-gradient-to-b from-primary/5 to-transparent p-6">
          <DialogHeader className="text-center">
            <DialogTitle className="text-2xl font-bold flex items-center justify-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              {task ? "Edit Task" : "Create New Task"}
            </DialogTitle>
            <p className="text-muted-foreground mt-2">
              {task ? "Update your task details" : "Add details to create a new task"}
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

          {/* Module Selection - Updated with Month/Week */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Module</Label>
            
            {/* Month Selection */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Select Month</Label>
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
                  <SelectValue placeholder="Choose a month" />
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

            {/* Week Selection (only shown when month is selected) */}
            {selectedMonth && (
              <div className="space-y-2 animate-in fade-in duration-200">
                <Label className="text-sm text-muted-foreground">Select Week</Label>
                <Select
                  value={selectedWeek}
                  onValueChange={setSelectedWeek}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select week" />
                  </SelectTrigger>
                  <SelectContent>
                    {WEEKS.map((week) => (
                      <SelectItem key={week} value={week}>
                        {week}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Generated Module Name Display */}
            {formData.moduleName && (
              <div className="space-y-2 animate-in fade-in duration-200">
                <Label className="text-sm text-muted-foreground">Generated Module Name</Label>
                <div className="flex items-center gap-2 p-3 rounded-lg border bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <div className="flex-1">
                    <span className="font-bold text-green-700 dark:text-green-300">
                      {formData.moduleName}
                    </span>
                    <p className="text-xs text-green-600 dark:text-green-400/80 mt-0.5">
                      This will be saved as the module name
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
            {!selectedMonth && (
              <p className="text-xs text-muted-foreground">
                Select a month to begin creating a module-based task
              </p>
            )}
            {selectedMonth && !selectedWeek && (
              <p className="text-xs text-muted-foreground">
                Now select a week to generate the module name
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
              <Label className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Assign To
              </Label>
              <Select
                value={formData.assignedTo}
                onValueChange={(value) => setFormData({ ...formData, assignedTo: value })}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  {TEAM_MEMBERS.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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