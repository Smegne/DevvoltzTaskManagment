export type Priority = "low" | "medium" | "high" | "urgent"
export type TaskStatus = "todo" | "in-progress" | "review" | "completed"
export type ProjectStatus = "planning" | "active" | "on-hold" | "completed"

export interface Project {
  id: string
  name: string
  description: string
  status: ProjectStatus
  progress: number
  startDate: string
  endDate?: string
  teamMembers: string[]
  createdBy: string
  createdAt: string
}

export interface Task {
  id: string
  title: string
  description: string
  status: TaskStatus
  priority: Priority
  projectId?: string
  assignedTo: string[]
  createdBy: string
  createdAt: string
  dueDate?: string
  completedAt?: string
  estimatedHours?: number
  actualHours?: number
}

export interface TimeEntry {
  id: string
  taskId: string
  userId: string
  date: string
  hours: number
  description: string
  createdAt: string
}
