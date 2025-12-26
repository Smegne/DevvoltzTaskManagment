"use client"

import type { Task } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, MoreVertical } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface TaskCardProps {
  task: Task
  projectName?: string
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
}

const statusColors = {
  todo: "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300",
  "in-progress": "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  review: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  completed: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
}

const priorityColors = {
  low: "border-l-4 border-muted-foreground/30",
  medium: "border-l-4 border-blue-500",
  high: "border-l-4 border-orange-500",
  urgent: "border-l-4 border-red-500",
}

export function TaskCard({ task, projectName, onEdit, onDelete }: TaskCardProps) {
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "completed"

  return (
    <Card className={`hover:shadow-md transition-shadow ${priorityColors[task.priority]}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold truncate">{task.title}</h3>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{task.description}</p>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className={statusColors[task.status]}>
                {task.status}
              </Badge>
              <Badge variant="outline" className="capitalize">
                {task.priority}
              </Badge>
              {projectName && (
                <Badge variant="outline" className="text-xs">
                  {projectName}
                </Badge>
              )}
            </div>

            {task.dueDate && (
              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span className={isOverdue ? "text-red-500 font-medium" : ""}>
                    {new Date(task.dueDate).toLocaleDateString()}
                  </span>
                </div>
                {task.estimatedHours && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{task.estimatedHours}h</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(task)}>Edit</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(task.id)} className="text-destructive">
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  )
}
