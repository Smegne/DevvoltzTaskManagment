"use client"

import type React from "react"

import type { TimeEntry } from "@/lib/types"
import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { useData } from "@/lib/data-context"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface TimeEntryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (entry: Omit<TimeEntry, "id" | "createdAt"> | ({ id: string } & Partial<TimeEntry>)) => void
  entry?: TimeEntry
}

export function TimeEntryDialog({ open, onOpenChange, onSave, entry }: TimeEntryDialogProps) {
  const { user } = useAuth()
  const { tasks } = useData()
  const [formData, setFormData] = useState({
    taskId: "",
    date: new Date().toISOString().split("T")[0],
    hours: "",
    description: "",
  })

  // Filter tasks assigned to the user
  const myTasks = user?.role === "ceo" ? tasks : tasks.filter((t) => t.assignedTo.includes(user?.id || ""))

  useEffect(() => {
    if (entry) {
      setFormData({
        taskId: entry.taskId,
        date: entry.date,
        hours: entry.hours.toString(),
        description: entry.description,
      })
    } else {
      setFormData({
        taskId: "",
        date: new Date().toISOString().split("T")[0],
        hours: "",
        description: "",
      })
    }
  }, [entry, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const entryData = {
      taskId: formData.taskId,
      userId: user?.id || "2",
      date: formData.date,
      hours: Number.parseFloat(formData.hours),
      description: formData.description,
    }

    if (entry) {
      onSave({
        id: entry.id,
        ...entryData,
      })
    } else {
      onSave(entryData)
    }

    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{entry ? "Edit Time Entry" : "Log Time"}</DialogTitle>
          <DialogDescription>
            {entry ? "Update your time entry details" : "Record time spent on a task"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="taskId">Task</Label>
            <Select
              value={formData.taskId}
              onValueChange={(value) => setFormData({ ...formData, taskId: value })}
              required
            >
              <SelectTrigger id="taskId">
                <SelectValue placeholder="Select a task" />
              </SelectTrigger>
              <SelectContent>
                {myTasks.map((task) => (
                  <SelectItem key={task.id} value={task.id}>
                    {task.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hours">Hours</Label>
              <Input
                id="hours"
                type="number"
                step="0.25"
                min="0"
                max="24"
                value={formData.hours}
                onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                placeholder="e.g. 2.5"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="What did you work on?"
              rows={3}
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{entry ? "Update" : "Log"} Time</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
