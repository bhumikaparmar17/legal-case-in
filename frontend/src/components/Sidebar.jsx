import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Briefcase, Scale, CreditCard, AlertTriangle,
  BellRing, Receipt, BarChart3, Tv, PanelLeftClose, PanelLeftOpen,
  Compass, FileSpreadsheet, BadgeIndianRupee, UploadCloud, Users,
  BookOpen, CalendarClock, ShieldCheck, X
} from 'lucide-react'

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const path = location.pathname

  // Default is BADA (expanded) as requested; persisted in localStorage
  const [expanded, setExpanded] = useState(() => {
    try {
      const saved = localStorage.getItem('legalcase_sidebar_expanded')
      return saved !== null ? saved === 'true' : true
    } catch (e) {
      return true
    }
  })

  // Mobile drawer open state
  const [mobileOpen, setMobileOpen] = useState(false)

  // Synchronize state across tabs and windows
  useEffect(() => {
    const handleToggle = () => {
      try {
        const saved = localStorage.getItem('legalcase_sidebar_expanded')
        if (saved !== null) {
          setExpanded(saved === 'true')
        }
      } catch (e) {}
    }
    const handleMobileToggle = () => {
      setMobileOpen((prev) => !prev)
    }
    const handleMobileClose = () => {
      setMobileOpen(false)
    }
    window.addEventListener('legalcase_sidebar_toggle', handleToggle)
    window.addEventListener('legalcase_mobile_sidebar_toggle', handleMobileToggle)
    window.addEventListener('legalcase_mobile_sidebar_close', handleMobileClose)
    return () => {
      window.removeEventListener('legalcase_sidebar_toggle', handleToggle)
      window.removeEventListener('legalcase_mobile_sidebar_toggle', handleMobileToggle)
      window.removeEventListener('legalcase_mobile_sidebar_close', handleMobileClose)
    }
  }, [])

  // Auto-close mobile sidebar drawer on navigation
  useEffect(() => {
    setMobileOpen(false)
  }, [path])

  const toggle = () => {
    setExpanded((prev) => {
      const next = !prev
      try {
        localStorage.setItem('legalcase_sidebar_expanded', String(next))
      } catch (e) {}
      window.dispatchEvent(new Event('legalcase_sidebar_toggle'))
      return next
    })
  }

  const navItems = [
    {
      label: 'Dashboard',
      shortLabel: 'Dash',
      path: '/dashboard',
      icon: LayoutDashboard,
      active: path === '/dashboard' || path === '/',
    },
    {
      label: 'Case Master',
      shortLabel: 'Cases',
      path: '/cases',
      icon: Briefcase,
      active: path.startsWith('/cases') || path.startsWith('/case-master'),
    },
    {
      label: 'Client Master',
      shortLabel: 'Clients',
      path: '/clients',
      icon: Scale,
      active: path.startsWith('/clients') || path.startsWith('/client-master') || path.startsWith('/client-info'),
    },
    {
      label: 'Payments & Bills',
      shortLabel: 'Payments',
      path: '/payments',
      icon: CreditCard,
      active: path.startsWith('/payment') || path.startsWith('/client-billing') || path.startsWith('/client-payment'),
    },
    {
      label: 'Outstanding Dues',
      shortLabel: 'Dues',
      path: '/due-list',
      icon: AlertTriangle,
      active: path.startsWith('/due-list'),
    },
    {
      label: 'Hearing Reminders',
      shortLabel: 'Hearings',
      path: '/reminders',
      icon: BellRing,
      active: path.startsWith('/reminder') || path.startsWith('/case-next'),
    },
    {
      label: 'Daily Collection',
      shortLabel: 'Daily',
      path: '/daily-collection',
      icon: FileSpreadsheet,
      active: path.startsWith('/daily-collection'),
    },
    {
      label: 'Office Expenses',
      shortLabel: 'Expenses',
      path: '/expenses',
      icon: Receipt,
      active: path.startsWith('/expense'),
    },
    {
      label: 'Consultancy Fees',
      shortLabel: 'Consultancy',
      path: '/consultancy-fees',
      icon: BadgeIndianRupee,
      active: path.startsWith('/consultancy'),
    },
    {
      label: 'Document Upload',
      shortLabel: 'Docs',
      path: '/documents',
      icon: UploadCloud,
      active: path.startsWith('/document'),
    },
    {
      label: 'Waiting List',
      shortLabel: 'Queue',
      path: '/waiting-list',
      icon: Users,
      active: path.startsWith('/waiting-list'),
    },
    {
      label: 'Case Search & Query',
      shortLabel: 'Search',
      path: '/case-search',
      icon: BarChart3,
      active: path.startsWith('/case-search'),
    },
    {
      label: 'Client Ledger Report',
      shortLabel: 'Ledger',
      path: '/client-ledger-report',
      icon: BookOpen,
      active: path.startsWith('/client-ledger'),
    },
    {
      label: 'Chamber TV Display',
      shortLabel: 'TV Screen',
      path: '/tv-display',
      icon: Tv,
      active: path.startsWith('/tv-display'),
    },
  ]

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          className="mobile-sidebar-backdrop"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
        />
      )}

      <aside className={`rail ${expanded ? 'expanded' : 'collapsed'} ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="rail-top">
          <div className="rail-header">
            <span className="rail-header-title">
              <Compass size={14} />
              <span>Navigation</span>
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                className="rail-toggle-btn desktop-toggle-btn"
                onClick={toggle}
                title={expanded ? 'Collapse to icon view' : 'Expand sidebar'}
              >
                {expanded ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
              </button>

              <button
                className="rail-toggle-btn mobile-close-btn"
                onClick={() => setMobileOpen(false)}
                title="Close menu"
                aria-label="Close menu"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <nav className="rail-nav">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.path}
                  className={`rail-btn ${item.active ? 'active' : ''}`}
                  onClick={() => {
                    navigate(item.path)
                    setMobileOpen(false)
                  }}
                  title={item.label}
                >
                  <Icon size={17} />
                  <span className="rail-label">{item.label}</span>
                  <span className="rail-tip">{item.shortLabel}</span>
                </button>
              )
            })}
          </nav>
        </div>

        <div className="rail-bottom">
          <div className="rail-bottom-card">
            <span className="pulse-dot" />
            <span>Practice Suite Active</span>
          </div>
        </div>
      </aside>
    </>
  )
}
