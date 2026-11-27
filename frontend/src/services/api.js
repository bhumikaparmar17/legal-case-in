// =====================================================================
// Frontend API Client for LegalCase Management System
// Connects to Node.js / Express Backend (Local / Live via .env)
// =====================================================================

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'

async function request(endpoint, options = {}) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      ...options,
    })
    if (!res.ok) {
      console.warn(`API ${endpoint} responded with status ${res.status}`)
      return null
    }
    return await res.json()
  } catch (err) {
    console.warn(`API request ${endpoint} error:`, err.message)
    return null
  }
}

export const api = {
  // Practice Overview Summary (Fast real-time SQL aggregation)
  getOverview: () => request('/overview'),

  // Snapshot sync for all modules
  getSync: () => request('/sync'),

  // Clients (ClientMaster)
  getClients: () => request('/clients'),
  createClient: (data) => request('/clients', { method: 'POST', body: JSON.stringify(data) }),
  updateClient: (id, data) => request(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteClient: (id) => request(`/clients/${id}`, { method: 'DELETE' }),

  // Cases (CaseMaster)
  getCases: () => request('/cases'),
  createCase: (data) => request('/cases', { method: 'POST', body: JSON.stringify(data) }),
  createBulkCases: (data) => request('/cases/bulk', { method: 'POST', body: JSON.stringify(data) }),
  updateCase: (id, data) => request(`/cases/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCase: (id) => request(`/cases/${id}`, { method: 'DELETE' }),

  // Next Dates / Reminders (CaseNext)
  getReminders: () => request('/reminders'),
  createReminder: (data) => request('/reminders', { method: 'POST', body: JSON.stringify(data) }),
  updateReminder: (id, data) => request(`/reminders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteReminder: (id) => request(`/reminders/${id}`, { method: 'DELETE' }),

  // Billing (Billing)
  getBills: () => request('/bills'),
  createBill: (data) => request('/bills', { method: 'POST', body: JSON.stringify(data) }),
  updateBill: (id, data) => request(`/bills/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBill: (id) => request(`/bills/${id}`, { method: 'DELETE' }),

  // Payments (Payment)
  getPayments: () => request('/payments'),
  createPayment: (data) => request('/payments', { method: 'POST', body: JSON.stringify(data) }),
  updatePayment: (id, data) => request(`/payments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePayment: (id) => request(`/payments/${id}`, { method: 'DELETE' }),

  // Direct Consultancy Fees (No Case ID - ClientMaster ConFees & Payment)
  getConsultancyFees: () => request('/consultancy-fees'),
  createConsultancyFee: (data) => request('/consultancy-fees', { method: 'POST', body: JSON.stringify(data) }),
  updateConsultancyFee: (id, data) => request(`/consultancy-fees/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteConsultancyFee: (id) => request(`/consultancy-fees/${id}`, { method: 'DELETE' }),

  // Extra Brief for Court to Other Advocate (Evidence)
  getExtraBriefs: () => request('/extra-briefs'),
  createExtraBrief: (data) => request('/extra-briefs', { method: 'POST', body: JSON.stringify(data) }),
  updateExtraBrief: (id, data) => request(`/extra-briefs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteExtraBrief: (id) => request(`/extra-briefs/${id}`, { method: 'DELETE' }),

  // ID-Wise Document Upload Repository
  getDocuments: (filterId) => request(`/documents${filterId ? `?filterId=${encodeURIComponent(filterId)}` : ''}`),
  getDocumentById: (id) => request(`/documents/${id}`),
  uploadDocument: (data) => request('/documents', { method: 'POST', body: JSON.stringify(data) }),
  deleteDocument: (id) => request(`/documents/${id}`, { method: 'DELETE' }),

  // Expense Heads (ExpenseHeadMaster)
  getExpenseHeads: () => request('/expense-heads'),
  createExpenseHead: (data) => request('/expense-heads', { method: 'POST', body: JSON.stringify(data) }),
  updateExpenseHead: (id, data) => request(`/expense-heads/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteExpenseHead: (id) => request(`/expense-heads/${id}`, { method: 'DELETE' }),

  // Expenses (Expense)
  getExpenses: () => request('/expenses'),
  createExpense: (data) => request('/expenses', { method: 'POST', body: JSON.stringify(data) }),
  updateExpense: (id, data) => request(`/expenses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteExpense: (id) => request(`/expenses/${id}`, { method: 'DELETE' }),

  // Waiting List (WaitingList)
  getWaitingList: () => request('/waiting-list'),
  createWaitingListEntry: (data) => request('/waiting-list', { method: 'POST', body: JSON.stringify(data) }),
  updateWaitingListEntry: (id, data) => request(`/waiting-list/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  recallWaitingListEntry: (id) => request(`/waiting-list/${id}/recall`, { method: 'POST' }),
  deleteWaitingListEntry: (id) => request(`/waiting-list/${id}`, { method: 'DELETE' }),

  // Announcements (Announcements)
  getAnnouncements: () => request('/announcements'),
  createAnnouncement: (data) => request('/announcements', { method: 'POST', body: JSON.stringify(data) }),
  deleteAnnouncement: (id) => request(`/announcements/${id}`, { method: 'DELETE' }),

  // Consultancy Fees (ConsultancyFees)
  getConsultancyFees: () => request('/consultancy-fees'),
  createConsultancyFee: (data) => request('/consultancy-fees', { method: 'POST', body: JSON.stringify(data) }),
  updateConsultancyFee: (id, data) => request(`/consultancy-fees/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteConsultancyFee: (id) => request(`/consultancy-fees/${id}`, { method: 'DELETE' }),

  // Extra Briefs (ExtraBriefs)
  getExtraBriefs: () => request('/extra-briefs'),
  createExtraBrief: (data) => request('/extra-briefs', { method: 'POST', body: JSON.stringify(data) }),
  updateExtraBrief: (id, data) => request(`/extra-briefs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteExtraBrief: (id) => request(`/extra-briefs/${id}`, { method: 'DELETE' }),

  // Documents (Documents)
  getDocuments: (params = {}) => {
    const q = new URLSearchParams(params).toString()
    return request(`/documents${q ? `?${q}` : ''}`)
  },
  createDocument: (data) => request('/documents', { method: 'POST', body: JSON.stringify(data) }),
  deleteDocument: (id) => request(`/documents/${id}`, { method: 'DELETE' }),
}
