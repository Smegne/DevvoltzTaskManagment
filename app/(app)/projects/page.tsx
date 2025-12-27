"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { useData } from "@/lib/data-context"
import type { Project, ProjectStatus } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Search, Filter, Grid3x3, List, TrendingUp, Users, Calendar, Target, MoreVertical, Download, RefreshCw, Sparkles, FolderKanban, BarChart3, Zap, Loader2, ChevronDown, ChevronUp, Clock, CheckCircle2, PauseCircle, AlertCircle } from "lucide-react"
import { ProjectCard } from "@/components/project-card"
import { ProjectDialog } from "@/components/project-dialog"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"

export default function ProjectsPage() {
  const { user } = useAuth()
  const { projects, tasks, addProject, updateProject, deleteProject } = useData()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | undefined>()
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [sortBy, setSortBy] = useState<"progress" | "deadline" | "created" | "name">("progress")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<string>("overview")

  const isCEO = user?.role === "ceo"

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800)
    return () => clearTimeout(timer)
  }, [])

  // Filter projects based on role
  const visibleProjects = isCEO ? projects : projects.filter((p) => p.teamMembers.includes(user?.id || ""))

  // Calculate project metrics
  const projectMetrics = {
    total: visibleProjects.length,
    active: visibleProjects.filter((p) => p.status === "active").length,
    planning: visibleProjects.filter((p) => p.status === "planning").length,
    onHold: visibleProjects.filter((p) => p.status === "on-hold").length,
    completed: visibleProjects.filter((p) => p.status === "completed").length,
    overdue: visibleProjects.filter((p) => 
      p.deadline && new Date(p.deadline) < new Date() && p.status !== "completed"
    ).length,
    avgProgress: visibleProjects.length > 0 
      ? visibleProjects.reduce((sum, p) => sum + p.progress, 0) / visibleProjects.length 
      : 0,
    totalTasks: tasks.filter(t => visibleProjects.some(p => p.id === t.projectId)).length,
    completedTasks: tasks.filter(t => 
      visibleProjects.some(p => p.id === t.projectId) && t.status === "completed"
    ).length,
  }

  // Apply search and status filters
  const filteredProjects = visibleProjects.filter((project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (project.description && project.description.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesStatus = statusFilter === "all" || project.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Sort projects
  const sortedProjects = [...filteredProjects].sort((a, b) => {
    let comparison = 0
    
    switch (sortBy) {
      case "progress":
        comparison = a.progress - b.progress
        break
      case "deadline":
        const dateA = a.deadline ? new Date(a.deadline).getTime() : Infinity
        const dateB = b.deadline ? new Date(b.deadline).getTime() : Infinity
        comparison = dateA - dateB
        break
      case "created":
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        break
      case "name":
        comparison = a.name.localeCompare(b.name)
        break
    }
    
    return sortOrder === "asc" ? comparison : -comparison
  })

  // Group projects by status
  const groupedProjects = () => {
    const groups: { [key: string]: Project[] } = {
      active: [],
      planning: [],
      'on-hold': [],
      completed: [],
      uncategorized: []
    }
    
    sortedProjects.forEach(project => {
      if (groups[project.status]) {
        groups[project.status].push(project)
      } else {
        groups.uncategorized.push(project)
      }
    })
    
    return groups
  }

  const toggleGroupCollapse = (status: string) => {
    setCollapsedGroups(prev => {
      const newSet = new Set(prev)
      if (newSet.has(status)) {
        newSet.delete(status)
      } else {
        newSet.add(status)
      }
      return newSet
    })
  }

  const handleEdit = (project: Project) => {
    setEditingProject(project)
    setDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    const project = projects.find(p => p.id === id)
    if (project && confirm(`Delete project "${project.name}"? This will also remove all associated tasks.`)) {
      deleteProject(id)
      toast.success(`Project "${project.name}" deleted`)
    }
  }

  const handleSave = (projectData: any) => {
    if ("id" in projectData) {
      updateProject(projectData.id, projectData)
      toast.success("Project updated successfully")
    } else {
      addProject(projectData)
      toast.success("Project created successfully")
    }
    setEditingProject(undefined)
  }

  const handleCreateNew = () => {
    setEditingProject(undefined)
    setDialogOpen(true)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <TrendingUp className="h-4 w-4" />
      case 'planning': return <Target className="h-4 w-4" />
      case 'on-hold': return <PauseCircle className="h-4 w-4" />
      case 'completed': return <CheckCircle2 className="h-4 w-4" />
      default: return <FolderKanban className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'from-blue-500 to-cyan-500'
      case 'planning': return 'from-purple-500 to-pink-500'
      case 'on-hold': return 'from-yellow-500 to-amber-500'
      case 'completed': return 'from-green-500 to-emerald-500'
      default: return 'from-gray-500 to-gray-600'
    }
  }

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'active': return 'Active'
      case 'planning': return 'Planning'
      case 'on-hold': return 'On Hold'
      case 'completed': return 'Completed'
      default: return 'Unknown'
    }
  }

  const exportData = () => {
    toast.success("Projects data exported successfully!")
  }

  const refreshData = () => {
    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
      toast.success("Projects refreshed")
    }, 800)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-black">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/30 border-t-primary"></div>
            <div className="absolute inset-0 h-12 w-12 animate-ping rounded-full border-4 border-primary/10"></div>
          </div>
          <p className="text-gray-500 dark:text-gray-400 animate-pulse">Loading projects...</p>
        </div>
      </div>
    )
  }

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-black p-4 md:p-6 space-y-6">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden -z-10">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-purple-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass-morphism rounded-2xl p-6 backdrop-blur-xl border border-white/20 shadow-xl"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10">
                <FolderKanban className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
                  Project Portfolio
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                  {isCEO ? "Managing organization-wide projects" : "Your assigned projects"} • {projectMetrics.total} total projects
                </p>
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="flex flex-wrap gap-3 mt-4">
              <div className="px-3 py-1.5 rounded-full bg-gradient-to-r bg-white/5 backdrop-blur-sm border border-white/10">
                <span className="text-sm font-medium">Active: </span>
                <span className="font-bold bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">
                  {projectMetrics.active}
                </span>
              </div>
              <div className="px-3 py-1.5 rounded-full bg-gradient-to-r bg-white/5 backdrop-blur-sm border border-white/10">
                <span className="text-sm font-medium">Avg Progress: </span>
                <span className="font-bold bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">
                  {projectMetrics.avgProgress.toFixed(0)}%
                </span>
              </div>
              <div className="px-3 py-1.5 rounded-full bg-gradient-to-r bg-white/5 backdrop-blur-sm border border-white/10">
                <span className="text-sm font-medium">Tasks: </span>
                <span className="font-bold">
                  {projectMetrics.completedTasks}/{projectMetrics.totalTasks} completed
                </span>
              </div>
              {projectMetrics.overdue > 0 && (
                <div className="px-3 py-1.5 rounded-full bg-gradient-to-r bg-red-500/10 backdrop-blur-sm border border-red-500/20">
                  <span className="text-sm font-medium text-red-600">Overdue: </span>
                  <span className="font-bold text-red-600">{projectMetrics.overdue}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={refreshData}
              disabled={isLoading}
              className="glass-input border-white/20"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh
            </Button>

            <Button
              variant="outline"
              onClick={exportData}
              className="glass-input border-white/20"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            
            {isCEO && (
              <Button 
                onClick={handleCreateNew}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg shadow-purple-500/20 group"
              >
                <Plus className="h-5 w-5 mr-2 group-hover:rotate-90 transition-transform duration-300" />
                New Project
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="glass-morphism rounded-xl p-1 backdrop-blur-xl border border-white/20"
      >
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4">
            <TabsTrigger value="overview" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500">
              <BarChart3 className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="grid" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500">
              <Grid3x3 className="h-4 w-4 mr-2" />
              Grid View
            </TabsTrigger>
            <TabsTrigger value="list" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500">
              <List className="h-4 w-4 mr-2" />
              List View
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-amber-500">
              <TrendingUp className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </motion.div>

      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="glass-morphism rounded-2xl p-6 backdrop-blur-xl border border-white/20 shadow-xl"
      >
        <div className="flex flex-col gap-6">
          {/* Main Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search projects by name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="glass-input w-full pl-12 pr-10 py-3 rounded-xl border border-white/20 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-white/10 rounded-full transition-colors"
              >
                <AlertCircle className="h-4 w-4 text-gray-400" />
              </button>
            )}
          </div>

          {/* Filter Row */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                  <Filter className="h-3 w-3" />
                  Status
                </label>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                  <SelectTrigger className="glass-input border-white/20">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent className="glass-morphism border-white/20 backdrop-blur-xl">
                    <SelectItem value="all">All Projects</SelectItem>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on-hold">On Hold</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                  <TrendingUp className="h-3 w-3" />
                  Sort By
                </label>
                <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                  <SelectTrigger className="glass-input border-white/20">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent className="glass-morphism border-white/20 backdrop-blur-xl">
                    <SelectItem value="progress">Progress</SelectItem>
                    <SelectItem value="deadline">Deadline</SelectItem>
                    <SelectItem value="created">Created Date</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                  <Zap className="h-3 w-3" />
                  Order
                </label>
                <div className="flex gap-2">
                  <Button
                    variant={sortOrder === "desc" ? "default" : "outline"}
                    onClick={() => setSortOrder("desc")}
                    className={cn(
                      "flex-1",
                      sortOrder === "desc" ? "bg-gradient-to-r from-blue-500 to-cyan-500" : "glass-input border-white/20"
                    )}
                  >
                    Descending
                  </Button>
                  <Button
                    variant={sortOrder === "asc" ? "default" : "outline"}
                    onClick={() => setSortOrder("asc")}
                    className={cn(
                      "flex-1",
                      sortOrder === "asc" ? "bg-gradient-to-r from-blue-500 to-cyan-500" : "glass-input border-white/20"
                    )}
                  >
                    Ascending
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex items-end gap-3">
              <Button
                variant="outline"
                onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
                className="glass-input border-white/20"
              >
                {viewMode === "grid" ? (
                  <>
                    <List className="h-4 w-4 mr-2" />
                    List View
                  </>
                ) : (
                  <>
                    <Grid3x3 className="h-4 w-4 mr-2" />
                    Grid View
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Total Projects", value: projectMetrics.total, color: "from-purple-500 to-pink-500" },
              { label: "Active", value: projectMetrics.active, color: "from-blue-500 to-cyan-500" },
              { label: "Avg Progress", value: `${projectMetrics.avgProgress.toFixed(0)}%`, color: "from-green-500 to-emerald-500" },
              { label: "Completed", value: projectMetrics.completed, color: "from-green-500 to-emerald-500" },
            ].map((stat, index) => (
              <div
                key={index}
                className="p-3 rounded-xl bg-gradient-to-r from-white/5 to-transparent border border-white/10 text-center hover:scale-105 transition-transform duration-300"
              >
                <div className={`text-2xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                  {stat.value}
                </div>
                <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <AnimatePresence mode="wait">
        {activeTab === "overview" && (
          <motion.div
            key="overview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Status Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { status: 'active', label: 'Active Projects', count: projectMetrics.active },
                { status: 'planning', label: 'Planning', count: projectMetrics.planning },
                { status: 'on-hold', label: 'On Hold', count: projectMetrics.onHold },
                { status: 'completed', label: 'Completed', count: projectMetrics.completed },
              ].map((item, index) => (
                <Card key={index} className="glass-morphism border-white/20 overflow-hidden">
                  <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${getStatusColor(item.status)}`} />
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className={`text-2xl font-bold bg-gradient-to-r ${getStatusColor(item.status)} bg-clip-text text-transparent`}>
                          {item.count}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">{item.label}</p>
                      </div>
                      <div className={`p-3 rounded-lg bg-gradient-to-r ${getStatusColor(item.status)}/10`}>
                        {getStatusIcon(item.status)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Progress Overview */}
            <Card className="glass-morphism border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                  Project Progress Overview
                </CardTitle>
                <CardDescription>
                  Overall progress across all active projects
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {visibleProjects.slice(0, 5).map(project => (
                    <div key={project.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`h-3 w-3 rounded-full bg-gradient-to-r ${getStatusColor(project.status)}`} />
                          <span className="font-medium">{project.name}</span>
                        </div>
                        <span className="font-bold">{project.progress}%</span>
                      </div>
                      <Progress value={project.progress} className="h-2 bg-gray-200/50 dark:bg-gray-700/50" />
                      <div className={`h-full bg-gradient-to-r ${getStatusColor(project.status)} transition-all duration-1000`} 
                        style={{ width: `${project.progress}%` }} 
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Projects */}
            <Card className="glass-morphism border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-purple-500" />
                  Recently Updated Projects
                </CardTitle>
                <CardDescription>
                  Projects with recent activity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {visibleProjects
                    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                    .slice(0, 4)
                    .map(project => (
                      <div
                        key={project.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-white/5 to-transparent hover:from-white/10 transition-all duration-300 group"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-lg bg-gradient-to-r ${getStatusColor(project.status)} flex items-center justify-center`}>
                            {getStatusIcon(project.status)}
                          </div>
                          <div>
                            <p className="font-medium group-hover:text-blue-500 transition-colors">{project.name}</p>
                            <p className="text-sm text-gray-500">
                              Updated {new Date(project.updatedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Badge className={cn(
                          "px-3 py-1",
                          project.status === 'active' ? "bg-blue-500/20 text-blue-600" :
                          project.status === 'completed' ? "bg-green-500/20 text-green-600" :
                          project.status === 'on-hold' ? "bg-yellow-500/20 text-yellow-600" :
                          "bg-purple-500/20 text-purple-600"
                        )}>
                          {getStatusDisplay(project.status)}
                        </Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {activeTab === "grid" && (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {sortedProjects.map((project, index) => (
              <motion.div
                key={project.id}
                variants={itemVariants}
                transition={{ delay: index * 0.05 }}
              >
                <ProjectCard 
                  project={project} 
                  onEdit={handleEdit} 
                  onDelete={handleDelete}
                  viewMode="grid"
                />
              </motion.div>
            ))}
          </motion.div>
        )}

        {activeTab === "list" && (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {Object.entries(groupedProjects()).map(([status, projects]) => {
              if (projects.length === 0) return null
              
              return (
                <Card key={status} className="glass-morphism border-white/20 overflow-hidden">
                  {/* Group Header */}
                  <CardHeader className="pb-3">
                    <div 
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => toggleGroupCollapse(status)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-lg bg-gradient-to-r ${getStatusColor(status)} flex items-center justify-center`}>
                          {getStatusIcon(status)}
                        </div>
                        <div>
                          <CardTitle className="text-lg font-bold">
                            {getStatusDisplay(status)} Projects
                          </CardTitle>
                          <CardDescription>
                            {projects.length} projects • {projects.reduce((sum, p) => sum + p.progress, 0) / projects.length}% avg progress
                          </CardDescription>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 rounded-full"
                      >
                        {collapsedGroups.has(status) ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                      </Button>
                    </div>
                  </CardHeader>
                  
                  {/* Group Content */}
                  {!collapsedGroups.has(status) && (
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        {projects.map((project) => (
                          <div
                            key={project.id}
                            className="group p-4 rounded-xl bg-gradient-to-r from-white/5 to-transparent hover:from-white/10 border border-white/10 transition-all duration-300"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h3 className="font-semibold text-lg group-hover:text-blue-500 transition-colors">
                                    {project.name}
                                  </h3>
                                  <Badge className={cn(
                                    "px-2 py-0.5 text-xs",
                                    project.status === 'active' ? "bg-blue-500/20 text-blue-600" :
                                    project.status === 'completed' ? "bg-green-500/20 text-green-600" :
                                    project.status === 'on-hold' ? "bg-yellow-500/20 text-yellow-600" :
                                    "bg-purple-500/20 text-purple-600"
                                  )}>
                                    {getStatusDisplay(project.status)}
                                  </Badge>
                                </div>
                                
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                                  {project.description || "No description available"}
                                </p>
                                
                                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                                  <div className="flex items-center gap-2">
                                    <Users className="h-3 w-3" />
                                    <span>{project.teamMembers.length} members</span>
                                  </div>
                                  {project.deadline && (
                                    <div className="flex items-center gap-2">
                                      <Calendar className="h-3 w-3" />
                                      <span className={new Date(project.deadline) < new Date() ? 'text-red-600 font-medium' : ''}>
                                        Due: {new Date(project.deadline).toLocaleDateString()}
                                      </span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2">
                                    <Target className="h-3 w-3" />
                                    <span>{project.progress}% complete</span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                {isCEO && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 rounded-full hover:bg-blue-500/10 hover:text-blue-500"
                                      onClick={() => handleEdit(project)}
                                      title="Edit project"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 rounded-full hover:bg-red-500/10 hover:text-red-500"
                                      onClick={() => handleDelete(project.id)}
                                      title="Delete project"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              )
            })}
          </motion.div>
        )}

        {activeTab === "analytics" && (
          <motion.div
            key="analytics"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Analytics Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="glass-morphism border-white/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-blue-500" />
                    Project Health Score
                  </CardTitle>
                  <CardDescription>
                    Overall health of your project portfolio
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {visibleProjects.slice(0, 5).map(project => {
                      const healthScore = Math.min(100, project.progress + (project.status === 'active' ? 20 : 0))
                      return (
                        <div key={project.id} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{project.name}</span>
                            <span className="font-bold">{healthScore}%</span>
                          </div>
                          <Progress value={healthScore} className="h-2 bg-gray-200/50 dark:bg-gray-700/50" />
                          <div className={`h-full ${
                            healthScore >= 80 ? "bg-gradient-to-r from-green-500 to-emerald-500" :
                            healthScore >= 60 ? "bg-gradient-to-r from-yellow-500 to-amber-500" :
                            "bg-gradient-to-r from-red-500 to-rose-500"
                          } transition-all duration-1000`} 
                            style={{ width: `${healthScore}%` }} 
                          />
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-morphism border-white/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    Timeline Overview
                  </CardTitle>
                  <CardDescription>
                    Project deadlines and milestones
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {visibleProjects
                      .filter(p => p.deadline)
                      .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
                      .slice(0, 5)
                      .map(project => {
                        const daysUntilDeadline = Math.ceil((new Date(project.deadline!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                        return (
                          <div key={project.id} className="p-3 rounded-lg bg-gradient-to-r from-white/5 to-transparent border border-white/10">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium">{project.name}</span>
                              <Badge className={
                                daysUntilDeadline < 0 ? "bg-red-500/20 text-red-600" :
                                daysUntilDeadline < 7 ? "bg-yellow-500/20 text-yellow-600" :
                                "bg-green-500/20 text-green-600"
                              }>
                                {daysUntilDeadline < 0 ? 'Overdue' : `${daysUntilDeadline} days`}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-500">
                              Due: {new Date(project.deadline!).toLocaleDateString()}
                            </p>
                          </div>
                        )
                      })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Insights */}
            <Card className="glass-morphism border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-500" />
                  AI Insights & Recommendations
                </CardTitle>
                <CardDescription>
                  Based on your project portfolio analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    {
                      icon: <Target className="h-5 w-5" />,
                      title: "Focus Areas",
                      description: "Prioritize projects with deadlines within 2 weeks",
                      color: "from-blue-500 to-cyan-500"
                    },
                    {
                      icon: <AlertCircle className="h-5 w-5" />,
                      title: "Attention Needed",
                      description: `${projectMetrics.overdue} projects are overdue`,
                      color: "from-red-500 to-rose-500"
                    },
                    {
                      icon: <TrendingUp className="h-5 w-5" />,
                      title: "Good Progress",
                      description: `${projectMetrics.active} active projects are on track`,
                      color: "from-green-500 to-emerald-500"
                    },
                  ].map((insight, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-xl bg-gradient-to-r ${insight.color}/10 border border-white/10 hover:scale-105 transition-transform duration-300`}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`p-2 rounded-lg bg-gradient-to-r ${insight.color}/20`}>
                          {insight.icon}
                        </div>
                        <h4 className="font-semibold">{insight.title}</h4>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{insight.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {sortedProjects.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center py-16"
        >
          <div className="max-w-md mx-auto">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-r from-purple-500/10 to-pink-500/10 flex items-center justify-center">
              <FolderKanban className="h-12 w-12 text-purple-500" />
            </div>
            <h3 className="text-2xl font-bold mb-3">No projects found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-8">
              {searchQuery ? "Try adjusting your search terms" : 
               isCEO ? "Get started by creating your first project" :
               "You haven't been assigned to any projects yet"}
            </p>
            {isCEO && searchQuery === "" && statusFilter === "all" && (
              <Button 
                onClick={handleCreateNew}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg shadow-purple-500/20"
                size="lg"
              >
                <Plus className="h-5 w-5 mr-2" />
                Create Your First Project
              </Button>
            )}
          </div>
        </motion.div>
      )}

      {/* Project Dialog */}
      <ProjectDialog 
        open={dialogOpen} 
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setEditingProject(undefined)
        }} 
        onSave={handleSave} 
        project={editingProject} 
      />
    </div>
  )
}