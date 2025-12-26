"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import type { Project, Task, TimeEntry } from "./types"

interface DataContextType {
  projects: Project[]
  tasks: Task[]
  timeEntries: TimeEntry[]
  addProject: (project: Omit<Project, "id" | "createdAt">) => void
  updateProject: (id: string, updates: Partial<Project>) => void
  deleteProject: (id: string) => void
  addTask: (task: Omit<Task, "id" | "createdAt">) => void
  updateTask: (id: string, updates: Partial<Task>) => void
  deleteTask: (id: string) => void
  addTimeEntry: (entry: Omit<TimeEntry, "id" | "createdAt">) => void
  updateTimeEntry: (id: string, updates: Partial<TimeEntry>) => void
  deleteTimeEntry: (id: string) => void
}

const DataContext = createContext<DataContextType | undefined>(undefined)

const STORAGE_KEYS = {
  PROJECTS: "devvoltz_projects",
  TASKS: "devvoltz_tasks",
  TIME_ENTRIES: "devvoltz_time_entries",
}

// Initial demo data
const DEMO_PROJECTS: Project[] = [
  {
    id: "1",
    name: "Website Redesign",
    description: "Complete overhaul of company website with modern design",
    status: "active",
    progress: 65,
    startDate: "2024-01-15",
    endDate: "2024-03-30",
    teamMembers: ["1", "2"],
    createdBy: "1",
    createdAt: "2024-01-10T10:00:00Z",
  },
  {
    id: "2",
    name: "Mobile App Development",
    description: "Native iOS and Android app for customer portal",
    status: "active",
    progress: 30,
    startDate: "2024-02-01",
    endDate: "2024-06-30",
    teamMembers: ["2"],
    createdBy: "1",
    createdAt: "2024-01-25T14:30:00Z",
  },
  {
    id: "3",
    name: "Database Migration",
    description: "Migrate legacy database to cloud infrastructure",
    status: "planning",
    progress: 10,
    startDate: "2024-03-01",
    teamMembers: ["2"],
    createdBy: "1",
    createdAt: "2024-02-15T09:00:00Z",
  },
]

const DEMO_TASKS: Task[] = [
  {
    id: "1",
    title: "Design homepage mockups",
    description: "Create high-fidelity mockups for the new homepage",
    status: "completed",
    priority: "high",
    projectId: "1",
    assignedTo: ["2"],
    createdBy: "1",
    createdAt: "2024-01-15T10:00:00Z",
    dueDate: "2024-02-01",
    completedAt: "2024-01-28T16:30:00Z",
    estimatedHours: 16,
    actualHours: 18,
  },
  {
    id: "2",
    title: "Implement responsive navigation",
    description: "Build mobile-friendly navigation component",
    status: "in-progress",
    priority: "high",
    projectId: "1",
    assignedTo: ["2"],
    createdBy: "1",
    createdAt: "2024-02-01T09:00:00Z",
    dueDate: "2024-02-15",
    estimatedHours: 12,
  },
  {
    id: "3",
    title: "Setup authentication flow",
    description: "Implement OAuth and session management",
    status: "in-progress",
    priority: "urgent",
    projectId: "2",
    assignedTo: ["2"],
    createdBy: "1",
    createdAt: "2024-02-05T11:00:00Z",
    dueDate: "2024-02-20",
    estimatedHours: 20,
  },
  {
    id: "4",
    title: "Database schema design",
    description: "Design normalized schema for new cloud database",
    status: "todo",
    priority: "medium",
    projectId: "3",
    assignedTo: ["2"],
    createdBy: "1",
    createdAt: "2024-02-10T13:00:00Z",
    dueDate: "2024-03-05",
    estimatedHours: 24,
  },
  {
    id: "5",
    title: "Performance optimization review",
    description: "Audit and optimize application performance",
    status: "review",
    priority: "medium",
    assignedTo: ["2"],
    createdBy: "1",
    createdAt: "2024-02-12T15:00:00Z",
    dueDate: "2024-02-28",
    estimatedHours: 8,
  },
]

const DEMO_TIME_ENTRIES: TimeEntry[] = [
  {
    id: "1",
    taskId: "1",
    userId: "2",
    date: "2024-01-28",
    hours: 6,
    description: "Completed homepage mockups and iterations",
    createdAt: "2024-01-28T17:00:00Z",
  },
  {
    id: "2",
    taskId: "2",
    userId: "2",
    date: "2024-02-15",
    hours: 5,
    description: "Built responsive menu and tested on various devices",
    createdAt: "2024-02-15T18:00:00Z",
  },
]

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])

  // Load data from localStorage on mount
  useEffect(() => {
    const storedProjects = localStorage.getItem(STORAGE_KEYS.PROJECTS)
    const storedTasks = localStorage.getItem(STORAGE_KEYS.TASKS)
    const storedTimeEntries = localStorage.getItem(STORAGE_KEYS.TIME_ENTRIES)

    setProjects(storedProjects ? JSON.parse(storedProjects) : DEMO_PROJECTS)
    setTasks(storedTasks ? JSON.parse(storedTasks) : DEMO_TASKS)
    setTimeEntries(storedTimeEntries ? JSON.parse(storedTimeEntries) : DEMO_TIME_ENTRIES)
  }, [])

  // Save to localStorage whenever data changes
  useEffect(() => {
    if (projects.length > 0) {
      localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects))
    }
  }, [projects])

  useEffect(() => {
    if (tasks.length > 0) {
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks))
    }
  }, [tasks])

  useEffect(() => {
    if (timeEntries.length > 0) {
      localStorage.setItem(STORAGE_KEYS.TIME_ENTRIES, JSON.stringify(timeEntries))
    }
  }, [timeEntries])

  // Project operations
  const addProject = (project: Omit<Project, "id" | "createdAt">) => {
    const newProject: Project = {
      ...project,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    }
    setProjects((prev) => [...prev, newProject])
  }

  const updateProject = (id: string, updates: Partial<Project>) => {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)))
  }

  const deleteProject = (id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id))
  }

  // Task operations
  const addTask = (task: Omit<Task, "id" | "createdAt">) => {
    const newTask: Task = {
      ...task,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    }
    setTasks((prev) => [...prev, newTask])
  }

  const updateTask = (id: string, updates: Partial<Task>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)))
  }

  const deleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }

  // Time entry operations
  const addTimeEntry = (entry: Omit<TimeEntry, "id" | "createdAt">) => {
    const newEntry: TimeEntry = {
      ...entry,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    }
    setTimeEntries((prev) => [...prev, newEntry])
  }

  const updateTimeEntry = (id: string, updates: Partial<TimeEntry>) => {
    setTimeEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...updates } : e)))
  }

  const deleteTimeEntry = (id: string) => {
    setTimeEntries((prev) => prev.filter((e) => e.id !== id))
  }

  return (
    <DataContext.Provider
      value={{
        projects,
        tasks,
        timeEntries,
        addProject,
        updateProject,
        deleteProject,
        addTask,
        updateTask,
        deleteTask,
        addTimeEntry,
        updateTimeEntry,
        deleteTimeEntry,
      }}
    >
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const context = useContext(DataContext)
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider")
  }
  return context
}
