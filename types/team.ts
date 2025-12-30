export interface TeamMemberStats {
  id: number;
  name: string;
  email: string;
  role: string;
  created_at: string;
  updated_at: string;
  
  // Statistics
  taskCount: number;
  createdCount: number;
  assignedCount: number;
  completedCount: number;
  inProgressCount: number;
  pendingCount: number;
  reviewCount: number;
  pausedCount: number;
  overdueCount: number;
  highPriorityCount: number;
  mediumPriorityCount: number;
  lowPriorityCount: number;
  
  // Performance metrics
  completionRate: number;
  lastActive: string | null;
  
  // References
  taskIds: number[];
  createdTaskIds: number[];
  assignedTaskIds: number[];
}

export interface TeamStats {
  totalMembers: number;
  adminCount: number;
  userCount: number;
  
  // Task statistics
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  todoTasks: number;
  reviewTasks: number;
  pausedTasks: number;
  overdueTasks: number;
  
  // Priority breakdown
  highPriorityTasks: number;
  mediumPriorityTasks: number;
  lowPriorityTasks: number;
  
  // Performance metrics
  activeMembers: number;
  avgCompletionRate: number;
  
  // Time-based metrics
  recentTasks: number;
  
  // Top performers
  topPerformers: Array<{
    id: number;
    name: string;
    completionRate: number;
    taskCount: number;
  }>;
  
  // Members needing attention
  membersNeedingAttention: Array<{
    id: number;
    name: string;
    overdueCount: number;
    completionRate: number;
  }>;
}

export interface RoleSummary {
  admin: {
    count: number;
    totalTasks: number;
    avgCompletionRate: number;
  };
  user: {
    count: number;
    totalTasks: number;
    avgCompletionRate: number;
  };
}

export interface TeamApiResponse {
  teamStats: TeamStats;
  members: TeamMemberStats[];
  memberCount: number;
  tasks?: any[];
  taskCount?: number;
  summaryByRole: RoleSummary;
}