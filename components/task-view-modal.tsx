"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Calendar, Users, FolderKanban, Clock, AlertCircle, CheckCircle2, Play, PauseCircle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DatabaseTask } from "@/app/(app)/dashboard/page"

interface TaskViewModalProps {
  task: DatabaseTask | null
  open: boolean
  onOpenChange: (open: boolean) => void
  user: any
}

export default function TaskViewModal({ task, open, onOpenChange, user }: TaskViewModalProps) {
  if (!task) return null

  // Function to render HTML description safely with rich text formatting
  const renderRichDescription = (html: string | null) => {
    if (!html) return (
      <p className="text-muted-foreground italic">No description provided</p>
    )
    
    // Create a safe HTML string with basic styling
    const safeHtml = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+="[^"]*"/g, '')
    
    return (
      <div 
        className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-semibold prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-1"
        dangerouslySetInnerHTML={{ __html: safeHtml }}
      />
    )
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
    'low': "bg-green-100 text-green-800 border-green-200",
    'medium': "bg-yellow-100 text-yellow-800 border-yellow-200",
    'high': "bg-red-100 text-red-800 border-red-200",
  }

  const priorityDisplay: Record<string, string> = {
    'low': 'Low',
    'medium': 'Medium',
    'high': 'High'
  }

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'in_progress':
        return <Play className="h-4 w-4" />
      case 'done':
        return <CheckCircle2 className="h-4 w-4" />
      case 'paused':
        return <PauseCircle className="h-4 w-4" />
      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="text-xl">Task Details</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Task Header */}
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {task.title}
              </h2>
              <div className="flex items-center gap-2">
                <Badge className={`${statusColors[task.status]} flex items-center gap-1 px-3 py-1`}>
                  {getStatusIcon(task.status)}
                  {getStatusDisplay(task.status)}
                </Badge>
                <Badge className={`${priorityColors[task.priority]} px-3 py-1`}>
                  {priorityDisplay[task.priority]} Priority
                </Badge>
              </div>
            </div>

            {/* Task Metadata Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Assigned to</p>
                    <p className="font-medium">
                      {task.assignee_name || "Unassigned"}
                      {task.assigned_to === user?.id && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          You
                        </Badge>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Created by</p>
                    <p className="font-medium">{task.creator_name || "Unknown"}</p>
                  </div>
                </div>

                {task.project_name && (
                  <div className="flex items-center gap-3">
                    <FolderKanban className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Project</p>
                      <p className="font-medium">{task.project_name}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {task.due_date && (
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Due Date</p>
                      <p className={`font-medium ${new Date(task.due_date) < new Date() && task.status !== 'done' ? 'text-red-600' : ''}`}>
                        {new Date(task.due_date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                        {new Date(task.due_date) < new Date() && task.status !== 'done' && (
                          <span className="ml-2 text-xs text-red-600">(Overdue)</span>
                        )}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Created</p>
                    <p className="font-medium">
                      {new Date(task.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Last Updated</p>
                    <p className="font-medium">
                      {new Date(task.updated_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Description</h3>
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg min-h-[150px]">
              {renderRichDescription(task.description)}
            </div>
          </div>

          {/* Additional Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold">Task ID</h4>
              <p className="text-muted-foreground">#{task.id}</p>
            </div>
            
            {task.module_name && (
              <div className="space-y-2">
                <h4 className="font-semibold">Module</h4>
                <Badge variant="outline" className="text-sm">
                  {task.module_name}
                </Badge>
              </div>
            )}
          </div>

          {/* Close Button */}
          <div className="flex justify-end pt-4 border-t">
            <Button onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}