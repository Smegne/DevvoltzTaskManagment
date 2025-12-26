"use client"

import { useState, useMemo } from "react"
import { useAuth } from "@/lib/auth-context"
import { useData } from "@/lib/data-context"
import type { TimeEntry } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Clock, Calendar, Trash2, Edit } from "lucide-react"
import { TimeEntryDialog } from "@/components/time-entry-dialog"

export default function TimesheetPage() {
  const { user } = useAuth()
  const { tasks, timeEntries, addTimeEntry, updateTimeEntry, deleteTimeEntry } = useData()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<TimeEntry | undefined>()
  const [selectedWeek, setSelectedWeek] = useState(0) // 0 = current week, -1 = last week, etc.

  const isCEO = user?.role === "ceo"

  // Filter time entries based on role
  const visibleEntries = isCEO ? timeEntries : timeEntries.filter((e) => e.userId === user?.id)

  // Get date range for selected week
  const getWeekRange = (weekOffset: number) => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek // Monday as start of week
    const monday = new Date(today)
    monday.setDate(today.getDate() + diff + weekOffset * 7)
    monday.setHours(0, 0, 0, 0)

    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)

    return { start: monday, end: sunday }
  }

  const weekRange = getWeekRange(selectedWeek)

  // Filter entries by selected week
  const weekEntries = visibleEntries.filter((entry) => {
    const entryDate = new Date(entry.date)
    return entryDate >= weekRange.start && entryDate <= weekRange.end
  })

  // Group entries by date
  const entriesByDate = useMemo(() => {
    const grouped: { [key: string]: TimeEntry[] } = {}
    weekEntries.forEach((entry) => {
      if (!grouped[entry.date]) {
        grouped[entry.date] = []
      }
      grouped[entry.date].push(entry)
    })
    return grouped
  }, [weekEntries])

  // Calculate total hours for the week
  const weekTotal = weekEntries.reduce((sum, entry) => sum + entry.hours, 0)

  // Get all dates in the week
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekRange.start)
    date.setDate(weekRange.start.getDate() + i)
    return date.toISOString().split("T")[0]
  })

  const handleEdit = (entry: TimeEntry) => {
    setEditingEntry(entry)
    setDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this time entry?")) {
      deleteTimeEntry(id)
    }
  }

  const handleSave = (entryData: any) => {
    if ("id" in entryData) {
      updateTimeEntry(entryData.id, entryData)
    } else {
      addTimeEntry(entryData)
    }
    setEditingEntry(undefined)
  }

  const handleCreateNew = () => {
    setEditingEntry(undefined)
    setDialogOpen(true)
  }

  const getTaskTitle = (taskId: string) => {
    return tasks.find((t) => t.id === taskId)?.title || "Unknown Task"
  }

  const formatWeekRange = () => {
    const start = weekRange.start.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    const end = weekRange.end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    return `${start} - ${end}`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Timesheet</h2>
          <p className="text-muted-foreground">Track your time and hours worked</p>
        </div>
        <Button onClick={handleCreateNew}>
          <Plus className="h-4 w-4 mr-2" />
          Log Time
        </Button>
      </div>

      {/* Week Navigation */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => setSelectedWeek((w) => w - 1)}>
              Previous Week
            </Button>
            <div className="text-center">
              <p className="font-semibold">{formatWeekRange()}</p>
              <p className="text-sm text-muted-foreground">
                {selectedWeek === 0
                  ? "Current Week"
                  : `${Math.abs(selectedWeek)} week${Math.abs(selectedWeek) !== 1 ? "s" : ""} ${selectedWeek < 0 ? "ago" : "ahead"}`}
              </p>
            </div>
            <Button variant="outline" onClick={() => setSelectedWeek((w) => w + 1)}>
              Next Week
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Week Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{weekTotal.toFixed(2)}h</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Days Logged</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{Object.keys(entriesByDate).length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Hours/Day</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">
                {Object.keys(entriesByDate).length > 0
                  ? (weekTotal / Object.keys(entriesByDate).length).toFixed(2)
                  : "0.00"}
                h
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Time Entries by Date */}
      <div className="space-y-4">
        {weekDates.map((date) => {
          const dayEntries = entriesByDate[date] || []
          const dayTotal = dayEntries.reduce((sum, entry) => sum + entry.hours, 0)
          const dateObj = new Date(date + "T00:00:00")
          const isToday = date === new Date().toISOString().split("T")[0]

          return (
            <Card key={date} className={isToday ? "border-primary" : ""}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <h3 className="font-semibold">
                        {dateObj.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                      </h3>
                      {isToday && (
                        <Badge variant="default" className="mt-1">
                          Today
                        </Badge>
                      )}
                    </div>
                  </div>
                  {dayTotal > 0 && (
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Total</p>
                      <p className="font-semibold">{dayTotal.toFixed(2)}h</p>
                    </div>
                  )}
                </div>
              </CardHeader>
              {dayEntries.length > 0 && (
                <CardContent>
                  <div className="space-y-3">
                    {dayEntries.map((entry) => (
                      <div key={entry.id} className="flex items-start justify-between p-3 bg-muted rounded-lg">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium truncate">{getTaskTitle(entry.taskId)}</p>
                            <Badge variant="outline">{entry.hours}h</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{entry.description}</p>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(entry)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleDelete(entry.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>

      {weekEntries.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No time entries for this week</p>
          <Button onClick={handleCreateNew} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Log Your First Entry
          </Button>
        </div>
      )}

      {/* Time Entry Dialog */}
      <TimeEntryDialog open={dialogOpen} onOpenChange={setDialogOpen} onSave={handleSave} entry={editingEntry} />
    </div>
  )
}
