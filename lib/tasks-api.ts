import { apiClient } from './api-client';

export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  project_id: number | null;
  assigned_to: number | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  creator_name?: string;
  assignee_name?: string;
  project_name?: string;
  canEdit?: boolean;
}

export interface CreateTaskData {
  title: string;
  description?: string;
  status?: 'todo' | 'in_progress' | 'review' | 'done';
  priority?: 'low' | 'medium' | 'high';
  due_date?: string;
  project_id?: number;
  assigned_to?: number;
}

export interface UpdateTaskData extends Partial<CreateTaskData> {}

class TasksApi {
  async getAllTasks(params?: {
    projectId?: number;
    status?: string;
    priority?: string;
    assignedTo?: number;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ tasks: Task[]; pagination: any }> {
    const response = await apiClient.getTasks(params);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error || 'Failed to fetch tasks');
  }

  async getTaskById(id: number): Promise<{ task: Task }> {
    const response = await apiClient.getTaskById(id);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error || 'Failed to fetch task');
  }

  async createTask(taskData: CreateTaskData): Promise<{ task: Task }> {
    const response = await apiClient.createTask(taskData);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error || 'Failed to create task');
  }

  async updateTask(id: number, taskData: UpdateTaskData): Promise<{ task: Task }> {
    const response = await apiClient.updateTask(id, taskData);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error || 'Failed to update task');
  }

  async deleteTask(id: number): Promise<void> {
    const response = await apiClient.deleteTask(id);
    if (!response.success) {
      throw new Error(response.error || 'Failed to delete task');
    }
  }

  // Get tasks for current user
  async getMyTasks(): Promise<Task[]> {
    const response = await this.getAllTasks();
    return response.tasks;
  }

  // Get all team tasks (for dashboard)
  async getTeamTasks(): Promise<Task[]> {
    const response = await this.getAllTasks();
    return response.tasks;
  }
}

export const tasksApi = new TasksApi();