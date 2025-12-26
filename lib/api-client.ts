const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'user' | 'admin';
}

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

export interface Project {
  id: number;
  name: string;
  description: string | null;
  status: 'active' | 'completed' | 'archived';
  user_id: number | null;
  created_at: string;
  updated_at: string;
  user_name?: string;
}

class ApiClient {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  getToken(): string | null {
    if (!this.token && typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
    return this.token;
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  private getHeaders(includeAuth: boolean = true): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (includeAuth) {
      const token = this.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    includeAuth: boolean = true
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = this.getHeaders(includeAuth);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Auth methods
  async login(credentials: LoginCredentials): Promise<ApiResponse> {
    const data = await this.request<ApiResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }, false);

    if (data.success && data.token) {
      this.setToken(data.token);
    }

    return data;
  }

  async register(userData: RegisterData): Promise<ApiResponse> {
    const data = await this.request<ApiResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    }, false);

    if (data.success && data.token) {
      this.setToken(data.token);
    }

    return data;
  }

  async getProfile(): Promise<ApiResponse<{ user: User }>> {
    return this.request('/api/auth/profile');
  }

  async logout(): Promise<void> {
    this.clearToken();
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  // Tasks methods
  async getTasks(params?: {
    projectId?: number;
    status?: string;
    priority?: string;
    assignedTo?: number;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{ tasks: Task[]; pagination: any }>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    
    const queryString = queryParams.toString();
    const endpoint = `/api/tasks${queryString ? `?${queryString}` : ''}`;
    
    return this.request(endpoint);
  }

  async getTaskById(id: number): Promise<ApiResponse<{ task: Task }>> {
    return this.request(`/api/tasks/${id}`);
  }

  async createTask(taskData: {
    title: string;
    description?: string;
    status?: string;
    priority?: string;
    due_date?: string;
    project_id?: number;
    assigned_to?: number;
  }): Promise<ApiResponse<{ task: Task }>> {
    return this.request('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData),
    });
  }

  async updateTask(id: number, taskData: any): Promise<ApiResponse<{ task: Task }>> {
    return this.request(`/api/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(taskData),
    });
  }

  async deleteTask(id: number): Promise<ApiResponse> {
    return this.request(`/api/tasks/${id}`, {
      method: 'DELETE',
    });
  }

  // Projects methods
  async getProjects(params?: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{ projects: Project[]; pagination: any }>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    
    const queryString = queryParams.toString();
    const endpoint = `/api/projects${queryString ? `?${queryString}` : ''}`;
    
    return this.request(endpoint);
  }

  async createProject(projectData: {
    name: string;
    description?: string;
    status?: string;
  }): Promise<ApiResponse<{ project: Project }>> {
    return this.request('/api/projects', {
      method: 'POST',
      body: JSON.stringify(projectData),
    });
  }

  async getProjectById(id: number): Promise<ApiResponse<{ project: Project }>> {
    return this.request(`/api/projects/${id}`);
  }

  async updateProject(id: number, projectData: any): Promise<ApiResponse<{ project: Project }>> {
    return this.request(`/api/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(projectData),
    });
  }

  async deleteProject(id: number): Promise<ApiResponse> {
    return this.request(`/api/projects/${id}`, {
      method: 'DELETE',
    });
  }
}

// Create singleton instance
export const apiClient = new ApiClient();