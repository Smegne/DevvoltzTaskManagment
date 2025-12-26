"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useData } from "@/lib/data-context"
import type { Project, ProjectStatus } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Search } from "lucide-react"
import { ProjectCard } from "@/components/project-card"
import { ProjectDialog } from "@/components/project-dialog"

export default function ProjectsPage() {
  const { user } = useAuth()
  const { projects, addProject, updateProject, deleteProject } = useData()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | undefined>()

  const isCEO = user?.role === "ceo"

  // Filter projects based on role
  const visibleProjects = isCEO ? projects : projects.filter((p) => p.teamMembers.includes(user?.id || ""))

  // Apply search and status filters
  const filteredProjects = visibleProjects.filter((project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || project.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleEdit = (project: Project) => {
    setEditingProject(project)
    setDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this project?")) {
      deleteProject(id)
    }
  }

  const handleSave = (projectData: any) => {
    if ("id" in projectData) {
      updateProject(projectData.id, projectData)
    } else {
      addProject(projectData)
    }
    setEditingProject(undefined)
  }

  const handleCreateNew = () => {
    setEditingProject(undefined)
    setDialogOpen(true)
  }

  const projectCounts = {
    all: visibleProjects.length,
    planning: visibleProjects.filter((p) => p.status === "planning").length,
    active: visibleProjects.filter((p) => p.status === "active").length,
    "on-hold": visibleProjects.filter((p) => p.status === "on-hold").length,
    completed: visibleProjects.filter((p) => p.status === "completed").length,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Projects</h2>
          <p className="text-muted-foreground">Manage and track all your projects</p>
        </div>
        {isCEO && (
          <Button onClick={handleCreateNew}>
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Status Tabs */}
      <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as ProjectStatus | "all")}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">
            All <span className="ml-1 text-xs">({projectCounts.all})</span>
          </TabsTrigger>
          <TabsTrigger value="planning">
            Planning <span className="ml-1 text-xs">({projectCounts.planning})</span>
          </TabsTrigger>
          <TabsTrigger value="active">
            Active <span className="ml-1 text-xs">({projectCounts.active})</span>
          </TabsTrigger>
          <TabsTrigger value="on-hold">
            On Hold <span className="ml-1 text-xs">({projectCounts["on-hold"]})</span>
          </TabsTrigger>
          <TabsTrigger value="completed">
            Done <span className="ml-1 text-xs">({projectCounts.completed})</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No projects found</p>
          {isCEO && searchQuery === "" && statusFilter === "all" && (
            <Button onClick={handleCreateNew} variant="outline" className="mt-4 bg-transparent">
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Project
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} onEdit={handleEdit} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* Project Dialog */}
      <ProjectDialog open={dialogOpen} onOpenChange={setDialogOpen} onSave={handleSave} project={editingProject} />
    </div>
  )
}
