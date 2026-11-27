import { Outlet, useLocation } from 'react-router-dom'
import Topbar from './Topbar.jsx'
import Sidebar from './Sidebar.jsx'

export default function AppLayout() {
  const location = useLocation()
  const isDashboard = location.pathname === '/dashboard' || location.pathname === '/'

  return (
    <div className={`app-shell ${isDashboard ? 'dashboard-page' : ''}`}>
      <Topbar />
      <div className="dash-body-layout">
        <Sidebar />
        <div className="app-main">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
