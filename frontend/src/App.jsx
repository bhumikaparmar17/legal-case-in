import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'
import { initStorageSync } from './services/storageService.js'
import AppLayout from './components/AppLayout.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import ModulePage from './pages/ModulePage.jsx'

// Module Views
import ClientManagement from './pages/ClientManagement.jsx'
import CaseManagement from './pages/CaseManagement.jsx'
import CaseSearchReports from './pages/CaseSearchReports.jsx'
import PaymentManagement from './pages/PaymentManagement.jsx'
import DueList from './pages/DueList.jsx'
import DailyCollectionReport from './pages/DailyCollectionReport.jsx'
import ExpenseManagement from './pages/ExpenseManagement.jsx'
import ConsultancyFees from './pages/ConsultancyFees.jsx'
import DocumentUploadSystem from './pages/DocumentUploadSystem.jsx'
import NextDateReminders from './pages/NextDateReminders.jsx'
import DateWiseCaseSearch from './pages/DateWiseCaseSearch.jsx'
import DateWiseReminders from './pages/DateWiseReminders.jsx'
import ExtraBriefAdvocate from './pages/ExtraBriefAdvocate.jsx'
import WaitingList from './pages/WaitingList.jsx'
import ClientLedgerReport from './pages/ClientLedgerReport.jsx'
import IncomeExpenseReport from './pages/IncomeExpenseReport.jsx'
import ForWiseCaseReport from './pages/ForWiseCaseReport.jsx'
import WelcomeScreen from './pages/WelcomeScreen.jsx'
import TvDisplayScreen from './pages/TvDisplayScreen.jsx'

function Protected({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  const { user } = useAuth()

  useEffect(() => {
    initStorageSync()
  }, [])

  return (
    <Routes>
      <Route path="/" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />

      {/* Persistent App Layout with Fixed Global Sidebar & Topbar */}
      <Route element={<Protected><AppLayout /></Protected>}>
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Module 1: Client Master */}
        <Route path="/clients" element={<ClientManagement viewMode="master" />} />
        <Route path="/client-master" element={<ClientManagement viewMode="master" />} />
        <Route path="/client-information" element={<ClientManagement viewMode="information" />} />

        {/* Module 2: Case Master */}
        <Route path="/cases" element={<CaseManagement />} />
        <Route path="/case-master" element={<CaseManagement />} />

        {/* Module 3: Case Search & Reports */}
        <Route path="/case-search" element={<CaseSearchReports />} />

        {/* Module 4: Payment Management & Client Billing */}
        <Route path="/payments" element={<PaymentManagement initialTab="billing" />} />
        <Route path="/client-billing" element={<PaymentManagement initialTab="billing" />} />
        <Route path="/client-payment" element={<PaymentManagement initialTab="payments" />} />
        <Route path="/date-wise-payments" element={<PaymentManagement initialTab="date-wise" />} />

        {/* Module 5: Due List */}
        <Route path="/due-list" element={<DueList />} />

        {/* Module 6: Daily Collection Report */}
        <Route path="/daily-collection" element={<DailyCollectionReport />} />

        {/* Module 7: Expense Head Master & Expenses */}
        <Route path="/expenses" element={<ExpenseManagement initialTab="expenses" />} />
        <Route path="/expense-heads" element={<ExpenseManagement initialTab="heads" />} />
        <Route path="/head-wise-expenses" element={<ExpenseManagement initialTab="summary" />} />

        {/* Module 8: Consultancy Fees */}
        <Route path="/consultancy" element={<ConsultancyFees />} />
        <Route path="/consultancy-fees" element={<ConsultancyFees />} />

        {/* Module 9: ID-Wise Document Upload */}
        <Route path="/documents" element={<DocumentUploadSystem />} />
        <Route path="/document-upload" element={<DocumentUploadSystem />} />

        {/* Module 10: Next Date Reminder System */}
        <Route path="/reminders" element={<NextDateReminders />} />
        <Route path="/case-next-entry" element={<NextDateReminders />} />

        {/* Module 11: Date-Wise Case Searching (PDF) */}
        <Route path="/date-wise-case-search" element={<DateWiseCaseSearch />} />

        {/* Module 12: Date-Wise Reminders (PDF) */}
        <Route path="/date-wise-reminders" element={<DateWiseReminders />} />

        {/* Module 13: Extra Brief for Court to Other Advocate (Evidence) */}
        <Route path="/extra-brief" element={<ExtraBriefAdvocate />} />

        {/* Supporting Operations & Reports */}
        <Route path="/waiting-list" element={<WaitingList />} />
        <Route path="/client-ledger" element={<ClientLedgerReport />} />
        <Route path="/client-ledger-report" element={<ClientLedgerReport />} />
        <Route path="/income-expense" element={<IncomeExpenseReport />} />
        <Route path="/income-expense-report" element={<IncomeExpenseReport />} />
        <Route path="/for-wise-case" element={<ForWiseCaseReport />} />
        <Route path="/for-wise-case-report" element={<ForWiseCaseReport />} />

        {/* Generic Dynamic Module Route */}
        <Route path="/module/:slug" element={<ModulePage />} />
      </Route>

      {/* Standalone Fullscreen Views (No Sidebar) */}
      <Route path="/welcome-screen" element={<Protected><WelcomeScreen /></Protected>} />
      <Route path="/tv-display" element={<Protected><TvDisplayScreen /></Protected>} />

      {/* Wildcard */}
      <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
    </Routes>
  )
}
