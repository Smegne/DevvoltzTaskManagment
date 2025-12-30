"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { 
  Home,
  CheckSquare,
  Users,
  FolderKanban,
  Bell,
  MoreVertical,
  Clock,
  BarChart3,
  ChevronUp,
  Smartphone
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Type for notification data
interface NotificationCounts {
  pendingTasks: number
  overdueTasks: number
  todayTasks: number
  unreadNotifications: number
  activeProjects: number
  teamActivity: number
  timesheetPending: number
}

// Type for badge configuration
interface NavItemConfig {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  showBadge: boolean
  badgeType: 'tasks' | 'projects' | 'notifications' | 'team' | 'timesheet' | 'analytics' | 'mobile' | 'none'
  description?: string
  isMainNav?: boolean
  isMobileOnly?: boolean
}

// Custom hook for fetching notification counts
const useNotificationCounts = () => {
  const [counts, setCounts] = useState<NotificationCounts>({
    pendingTasks: 0,
    overdueTasks: 0,
    todayTasks: 0,
    unreadNotifications: 0,
    activeProjects: 0,
    teamActivity: 0,
    timesheetPending: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return

    const fetchCounts = async () => {
      try {
        setIsLoading(true)
        const token = localStorage.getItem('auth_token')
        
        if (!token) {
          console.warn('No auth token found for notification counts')
          return
        }

        // Fetch all counts in parallel
        const [tasksResponse, projectsResponse, notificationsResponse, timesheetResponse] = await Promise.all([
          fetch('/api/tasks/counts', {
            headers: { 'Authorization': `Bearer ${token}` }
          }).catch(() => ({ ok: false })),
          fetch('/api/projects/counts', {
            headers: { 'Authorization': `Bearer ${token}` }
          }).catch(() => ({ ok: false })),
          fetch('/api/notifications/counts', {
            headers: { 'Authorization': `Bearer ${token}` }
          }).catch(() => ({ ok: false })),
          fetch('/api/timesheet/pending-count', {
            headers: { 'Authorization': `Bearer ${token}` }
          }).catch(() => ({ ok: false }))
        ])

        // Process tasks counts
        let pendingTasks = 0
        let overdueTasks = 0
        let todayTasks = 0
        
        if (tasksResponse.ok) {
          try {
            const tasksData = await tasksResponse.json()
            if (tasksData.success) {
              pendingTasks = tasksData.data?.pendingTasks || 0
              overdueTasks = tasksData.data?.overdueTasks || 0
              todayTasks = tasksData.data?.todayTasks || 0
            }
          } catch (e) {
            console.error('Error parsing tasks counts:', e)
          }
        }

        // Process projects count
        let activeProjects = 0
        if (projectsResponse.ok) {
          try {
            const projectsData = await projectsResponse.json()
            if (projectsData.success) {
              activeProjects = projectsData.data?.activeProjects || 0
            }
          } catch (e) {
            console.error('Error parsing projects counts:', e)
          }
        }

        // Process notifications count
        let unreadNotifications = 0
        if (notificationsResponse.ok) {
          try {
            const notificationsData = await notificationsResponse.json()
            if (notificationsData.success) {
              unreadNotifications = notificationsData.data?.unreadCount || 0
            }
          } catch (e) {
            console.error('Error parsing notifications counts:', e)
          }
        }

        // Process timesheet count
        let timesheetPending = 0
        if (timesheetResponse.ok) {
          try {
            const timesheetData = await timesheetResponse.json()
            if (timesheetData.success) {
              timesheetPending = timesheetData.data?.pendingEntries || 0
            }
          } catch (e) {
            console.error('Error parsing timesheet counts:', e)
          }
        }

        // Get team activity (simplified)
        const teamActivity = Math.floor(Math.random() * 5) // Mock for now

        setCounts({
          pendingTasks,
          overdueTasks,
          todayTasks,
          unreadNotifications,
          activeProjects,
          teamActivity,
          timesheetPending
        })

      } catch (error) {
        console.error('Failed to fetch notification counts:', error)
        // Use mock data in development
        if (process.env.NODE_ENV === 'development') {
          setCounts({
            pendingTasks: Math.floor(Math.random() * 5),
            overdueTasks: Math.floor(Math.random() * 3),
            todayTasks: Math.floor(Math.random() * 4),
            unreadNotifications: Math.floor(Math.random() * 7),
            activeProjects: Math.floor(Math.random() * 3),
            teamActivity: Math.floor(Math.random() * 5),
            timesheetPending: Math.floor(Math.random() * 3)
          })
        }
      } finally {
        setIsLoading(false)
      }
    }

    // Initial fetch
    fetchCounts()

    // Set up polling for real-time updates (every 60 seconds)
    const interval = setInterval(fetchCounts, 60000)

    // Cleanup
    return () => clearInterval(interval)
  }, [user])

  return { counts, isLoading }
}

// Check if device is mobile
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return isMobile
}

// Main navigation items (shown in bottom nav)
const mainNavItems: NavItemConfig[] = [
  { 
    href: "/dashboard", 
    label: "Home", 
    icon: Home,
    showBadge: true,
    badgeType: 'tasks',
    description: "Dashboard overview",
    isMainNav: true
  },
  { 
    href: "/tasks", 
    label: "Tasks", 
    icon: CheckSquare,
    showBadge: true,
    badgeType: 'tasks',
    description: "Task management",
    isMainNav: true
  },
  { 
    href: "/team", 
    label: "Team", 
    icon: Users,
    showBadge: true,
    badgeType: 'team',
    description: "Team collaboration",
    isMainNav: true
  },
]

// Secondary navigation items (hidden in "More" dropdown)
const secondaryNavItems: NavItemConfig[] = [
  { 
    href: "/projects", 
    label: "Projects", 
    icon: FolderKanban,
    showBadge: true,
    badgeType: 'projects',
    description: "Project management",
    isMainNav: false,
    isMobileOnly: false
  },
  { 
    href: "/notifications", 
    label: "Notifications", 
    icon: Bell,
    showBadge: true,
    badgeType: 'notifications',
    description: "Alerts and notifications"
  },
  { 
    href: "/timesheet", 
    label: "Timesheet", 
    icon: Clock,
    showBadge: true,
    badgeType: 'timesheet',
    description: "Time tracking"
  },
  { 
    href: "/analytics", 
    label: "Analytics", 
    icon: BarChart3,
    showBadge: false,
    badgeType: 'analytics',
    description: "Reports and analytics"
  },
]

// Mobile-only items (only show in mobile view in "More" dropdown)
const mobileNavItems: NavItemConfig[] = [
  { 
    href: "/mobile-projects", 
    label: "Mobile Projects", 
    icon: Smartphone,
    showBadge: false,
    badgeType: 'mobile',
    description: "Mobile project view",
    isMobileOnly: true
  },
]

export function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuth()
  const { counts, isLoading } = useNotificationCounts()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const isMobile = useIsMobile()

  // Filter navigation items based on device
  const getFilteredNavItems = useCallback(() => {
    const allSecondaryItems = [...secondaryNavItems]
    
    // If on mobile, add mobile-only items
    if (isMobile) {
      allSecondaryItems.push(...mobileNavItems)
    }
    
    return allSecondaryItems
  }, [isMobile])

  // Check if the current path matches or starts with the href
  const isActive = (href: string) => {
    if (href === "/dashboard" || href === "/") {
      return pathname === "/dashboard" || pathname === "/"
    }
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  // Function to get badge count based on type (FIXED: using counts parameter)
  const getBadgeCount = (
    badgeType: NavItemConfig['badgeType'], 
    counts: NotificationCounts
  ): number => {
    switch (badgeType) {
      case 'tasks':
        // Show pending + overdue tasks
        return counts.pendingTasks + counts.overdueTasks
      case 'projects':
        return counts.activeProjects
      case 'notifications':
        return counts.unreadNotifications
      case 'team':
        return counts.teamActivity
      case 'timesheet':
        return counts.timesheetPending
      case 'analytics':
        return 0
      case 'mobile':
        return 0
      default:
        return 0
    }
  }

  // Handle badge click with client-side navigation
  const handleBadgeClick = async (e: React.MouseEvent, badgeType: string, href: string) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (badgeType === 'notifications') {
      try {
        const token = localStorage.getItem('auth_token')
        if (!token) return
        
        // Mark all notifications as read
        const response = await fetch('/api/notifications/mark-read', {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (response.ok) {
          toast.success('Notifications marked as read')
        }
      } catch (error) {
        console.error('Failed to mark notifications as read:', error)
      }
    }
    
    // Use Next.js router for client-side navigation
    router.push(href)
  }

  // Render badge component
  const renderBadge = (item: NavItemConfig) => {
    const badgeCount = item.showBadge ? getBadgeCount(item.badgeType, counts) : 0
    const hasBadge = badgeCount > 0
    
    if (!hasBadge) return null

    return (
      <button
        onClick={(e) => handleBadgeClick(e, item.badgeType, item.href)}
        className="absolute -top-1 -right-1 z-10 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-full"
        aria-label={`${badgeCount} notifications for ${item.label}`}
      >
        <Badge 
          variant="destructive"
          className={cn(
            "h-5 min-w-5 p-0 flex items-center justify-center text-xs border-2 border-background font-bold",
            "bg-red-600 hover:bg-red-700",
            badgeCount > 3 && "animate-pulse",
            "shadow-sm transition-transform hover:scale-110"
          )}
        >
          {badgeCount > 9 ? '9+' : badgeCount}
        </Badge>
      </button>
    )
  }

  // Render navigation item
  const renderNavItem = (item: NavItemConfig, isDropdown = false) => {
    const active = isActive(item.href)
    const Icon = item.icon
    const badgeCount = item.showBadge ? getBadgeCount(item.badgeType, counts) : 0
    const hasBadge = badgeCount > 0

    if (isDropdown) {
      return (
        <DropdownMenuItem key={item.href} asChild>
          <Link
            href={item.href}
            className={cn(
              "flex items-center justify-between w-full px-3 py-2 rounded-md transition-colors",
              active && "bg-primary/10 text-primary font-medium",
              !active && "hover:bg-muted/50"
            )}
            onClick={() => setDropdownOpen(false)}
            prefetch={true}
          >
            <div className="flex items-center gap-3">
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
              {item.isMobileOnly && (
                <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full">
                  Mobile
                </span>
              )}
            </div>
            {hasBadge && (
              <Badge 
                variant="destructive" 
                className="h-5 min-w-5 p-0 text-xs font-bold"
              >
                {badgeCount > 9 ? '9+' : badgeCount}
              </Badge>
            )}
          </Link>
        </DropdownMenuItem>
      )
    }

    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "relative flex flex-col items-center justify-center gap-0.5 px-2 py-2 rounded-xl transition-all duration-200 min-w-[64px] group",
          "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background",
          active 
            ? "text-primary bg-primary/5" 
            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
        )}
        prefetch={true}
      >
        {/* Badge indicator */}
        {renderBadge(item)}

        {/* Icon */}
        <div className="relative">
          <Icon className={cn(
            "h-5 w-5 transition-all duration-200", 
            active && "stroke-[2.5] scale-110"
          )} />
          
          {/* Active indicator line */}
          {active && (
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 h-1 w-6 bg-primary rounded-full" />
          )}
        </div>
        
        {/* Label */}
        <span className={cn(
          "text-xs font-medium transition-all truncate max-w-[70px] text-center",
          active ? "text-primary font-semibold" : "font-normal"
        )}>
          {item.label}
        </span>

        {/* Loading state */}
        {isLoading && item.showBadge && (
          <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full border-2 border-red-600/30 border-t-red-600 animate-spin" />
        )}
      </Link>
    )
  }

  // Calculate total badge count for "More" button (FIXED: using counts parameter)
  const moreBadgeCount = getFilteredNavItems().reduce((total, item) => {
    return total + (item.showBadge ? getBadgeCount(item.badgeType, counts) : 0)
  }, 0)

  // Don't render if no user (not logged in)
  if (!user) {
    return null
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-green-50 to-emerald-50 backdrop-blur-sm border-t border-green-200 shadow-lg safe-area-pb">
      {/* Green background with subtle gradient */}
      <div className="absolute inset-0 bg-green-500/5"></div>
      
      <div className="relative flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {/* Main navigation items */}
        {mainNavItems.map(item => renderNavItem(item))}
        
        {/* More dropdown */}
        <div className="relative">
          <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <button 
                className={cn(
                  "relative flex flex-col items-center justify-center gap-0.5 px-2 py-2 rounded-xl transition-all duration-200 min-w-[64px]",
                  "focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-green-50",
                  "text-gray-700 hover:text-green-700 hover:bg-green-100/50",
                  dropdownOpen && "text-green-700 bg-green-100"
                )}
                aria-label="More navigation options"
                aria-expanded={dropdownOpen}
              >
                {/* Badge for total counts in "More" */}
                {moreBadgeCount > 0 && (
                  <div className="absolute -top-1 -right-1 z-10">
                    <Badge 
                      variant="destructive"
                      className="h-5 min-w-5 p-0 flex items-center justify-center text-xs border-2 border-green-50 font-bold animate-pulse"
                    >
                      {moreBadgeCount > 9 ? '9+' : moreBadgeCount}
                    </Badge>
                  </div>
                )}

                {/* Icon with animation when open */}
                <div className="relative">
                  <MoreVertical className={cn(
                    "h-5 w-5 transition-all duration-200", 
                    dropdownOpen && "stroke-[2.5] scale-110 text-green-700"
                  )} />
                  
                  {/* Arrow indicator when open */}
                  {dropdownOpen && (
                    <ChevronUp className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 h-3 w-3 text-green-700" />
                  )}
                </div>
                
                {/* Label */}
                <span className={cn(
                  "text-xs font-medium transition-all",
                  dropdownOpen ? "text-green-700 font-semibold" : "font-normal"
                )}>
                  More
                </span>
              </button>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent 
              align="center" 
              side="top" 
              className="w-56 mb-2 shadow-xl border border-green-200 max-h-[70vh] overflow-y-auto bg-white"
              onCloseAutoFocus={(e) => e.preventDefault()}
            >
              <div className="px-2 py-1.5 text-xs font-medium text-gray-600 bg-green-50 rounded-t-md">
                More Options {isMobile && "(Mobile View)"}
              </div>
              <DropdownMenuSeparator />
              
              {getFilteredNavItems().map(item => renderNavItem(item, true))}
              
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5 text-xs text-gray-600 bg-green-50 rounded-b-md">
                Total alerts: <span className="font-bold text-red-600">{moreBadgeCount}</span>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Subtle green accent at the top of the nav bar */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-green-400 to-emerald-400"></div>
    </nav>
  )
}