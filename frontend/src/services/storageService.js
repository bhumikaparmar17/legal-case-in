import { api } from './api.js'
// ==========================================================================
// Comprehensive Database & Persistent Storage Service for LegalCase Suite
// Supports Clients, Cases, Payments, Due List, Daily Collections,
// Expense Heads, Expenses, Consultancy Fees, Documents (IndexedDB backed),
// Next Date Reminders, Extra Briefs, and Waiting List.
// ==========================================================================

const STORAGE_PREFIX = 'legalcase_'
const CLIENTS_KEY = `${STORAGE_PREFIX}clients_data_v2`
const CASES_KEY = `${STORAGE_PREFIX}cases_data_v2`
const PAYMENTS_KEY = `${STORAGE_PREFIX}payments_data_v2`
const BILLS_KEY = `${STORAGE_PREFIX}bills_data_v2`
const APPEARANCES_KEY = `${STORAGE_PREFIX}appearances_data_v2`
const EXPENSE_HEADS_KEY = `${STORAGE_PREFIX}expense_heads_v2`
const EXPENSES_KEY = `${STORAGE_PREFIX}expenses_data_v2`
const CONSULTANCY_KEY = `${STORAGE_PREFIX}consultancy_fees_v2`
const DOCUMENTS_META_KEY = `${STORAGE_PREFIX}documents_meta_v2`
const REMINDERS_KEY = `${STORAGE_PREFIX}reminders_data_v2`
const EXTRA_BRIEFS_KEY = `${STORAGE_PREFIX}extra_briefs_v2`
const WAITING_LIST_KEY = `${STORAGE_PREFIX}waiting_list_v2`
const ANNOUNCEMENTS_KEY = `${STORAGE_PREFIX}tv_announcements_v2`

const EVENT_NAME = 'legalcase_storage_updated'
const IDB_NAME = 'LegalCaseAppDB'
const IDB_VERSION = 1
const IDB_DOCS_STORE = 'documents_store'

// ----------------- IndexedDB Helper for Permanent File Storage -----------------
function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null)
      return
    }
    const req = window.indexedDB.open(IDB_NAME, IDB_VERSION)
    req.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(IDB_DOCS_STORE)) {
        db.createObjectStore(IDB_DOCS_STORE, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => {
      console.warn('IndexedDB open error:', req.error)
      resolve(null)
    }
  })
}

async function idbSaveDocument(doc) {
  try {
    const db = await openDB()
    if (!db) return
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_DOCS_STORE, 'readwrite')
      const store = tx.objectStore(IDB_DOCS_STORE)
      store.put(doc)
      tx.oncomplete = () => resolve(true)
      tx.onerror = () => resolve(false)
    })
  } catch (err) {
    console.error('idbSaveDocument error:', err)
  }
}

async function idbGetDocument(id) {
  try {
    const db = await openDB()
    if (!db) return null
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_DOCS_STORE, 'readonly')
      const store = tx.objectStore(IDB_DOCS_STORE)
      const req = store.get(id)
      req.onsuccess = () => resolve(req.result || null)
      req.onerror = () => resolve(null)
    })
  } catch (err) {
    console.error('idbGetDocument error:', err)
    return null
  }
}

async function idbDeleteDocument(id) {
  try {
    const db = await openDB()
    if (!db) return
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_DOCS_STORE, 'readwrite')
      const store = tx.objectStore(IDB_DOCS_STORE)
      store.delete(id)
      tx.oncomplete = () => resolve(true)
      tx.onerror = () => resolve(false)
    })
  } catch (err) {
    console.error('idbDeleteDocument error:', err)
  }
}

// ----------------- Dispatch Event -----------------
export function dispatchStorageEvent() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT_NAME))
  }
}

export function onStorageUpdate(callback) {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(EVENT_NAME, callback)
  window.addEventListener('storage', callback)
  return () => {
    window.removeEventListener(EVENT_NAME, callback)
    window.removeEventListener('storage', callback)
  }
}

// ----------------- SEED DATA (EMPTY - REAL DATA PERSISTED IN MYSQL) -----------------
const SEED_CLIENTS = []
const SEED_CASES = []
const SEED_BILLS = []
const SEED_APPEARANCES = []
const SEED_PAYMENTS = []
const SEED_EXPENSE_HEADS = []
const SEED_EXPENSES = []
const SEED_CONSULTANCY = []
const SEED_DOCUMENTS_META = []
const SEED_REMINDERS = []
const SEED_EXTRA_BRIEFS = []
const SEED_WAITING_LIST = []

// ----------------- Comprehensive Dummy Data Filter -----------------
const DUMMY_MARKERS = [
  'Subhendu Ghosh', 'Bhabani Charan Das', 'Alok Kumar Jana', 'CF-5001', 'CF-5002', 'CF-5003',
  'Rajesh Kumar Sharma', 'GR - 175/14', 'W-501', 'ANN-101', 'Sunita Devi', 'Nirmal Chandra Patra',
  'Madhabi Giri', 'EB-8001', 'EB-8002', 'EB-8003', 'EB-8004', 'Debashis Roy Chowdhury',
  'Gour Mohan Pramanik', 'Shyamal Adak', 'DOC-901', 'DOC-902', 'DOC-903'
]

function isDummyItem(item) {
  if (!item || typeof item !== 'object') return false
  const str = JSON.stringify(item)
  return DUMMY_MARKERS.some((marker) => str.includes(marker))
}

// Immediate execution on module load: strip all dummy caches from browser localStorage
if (typeof window !== 'undefined') {
  try {
    const allStorageKeys = [
      CLIENTS_KEY, CASES_KEY, PAYMENTS_KEY, BILLS_KEY, APPEARANCES_KEY,
      EXPENSE_HEADS_KEY, EXPENSES_KEY, REMINDERS_KEY, WAITING_LIST_KEY,
      ANNOUNCEMENTS_KEY, CONSULTANCY_KEY, EXTRA_BRIEFS_KEY, DOCUMENTS_META_KEY
    ]
    allStorageKeys.forEach((k) => {
      const raw = localStorage.getItem(k)
      if (raw && DUMMY_MARKERS.some((m) => raw.includes(m))) {
        try {
          const parsed = JSON.parse(raw)
          if (Array.isArray(parsed)) {
            const cleaned = parsed.filter((item) => !isDummyItem(item))
            localStorage.setItem(k, JSON.stringify(cleaned))
          }
        } catch (e) {
          localStorage.removeItem(k)
        }
      }
    })
  } catch (e) {}
}

// ----------------- Memory Store & Helper: Read & Write JSON -----------------
const memoryStore = {
  [CLIENTS_KEY]: null,
  [CASES_KEY]: null,
  [REMINDERS_KEY]: null,
  [BILLS_KEY]: null,
  [PAYMENTS_KEY]: null,
  [EXPENSE_HEADS_KEY]: null,
  [EXPENSES_KEY]: null,
  [WAITING_LIST_KEY]: null,
  [ANNOUNCEMENTS_KEY]: null,
  overview: null,
}

function readStorage(key, seedValue) {
  if (memoryStore[key] && Array.isArray(memoryStore[key]) && memoryStore[key].length > 0) {
    return memoryStore[key]
  }
  try {
    const raw = localStorage.getItem(key)
    if (!raw) {
      return seedValue
    }
    let parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      const filtered = parsed.filter((item) => !isDummyItem(item))
      if (filtered.length !== parsed.length) {
        try { localStorage.setItem(key, JSON.stringify(filtered)) } catch (e) {}
        parsed = filtered
      }
    }
    return Array.isArray(parsed) || typeof parsed === 'object' ? parsed : seedValue
  } catch (err) {
    console.warn(`Storage read error for ${key}:`, err)
    return seedValue
  }
}

function writeStorage(key, data) {
  memoryStore[key] = data
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (err) {
    // Quota reached; data remains preserved in memoryStore
    console.warn(`LocalStorage write skipped for ${key} (cached in memory)`)
  }
  dispatchStorageEvent()
}

// -------------------------------------------------------------
// MODULE 1: CLIENT MASTER APIS
// -------------------------------------------------------------
export function getClients() {
  return readStorage(CLIENTS_KEY, SEED_CLIENTS)
}

export function getClientById(id) {
  const clients = getClients()
  return clients.find((c) => String(c.id).toLowerCase() === String(id).toLowerCase()) || null
}

export function checkDuplicateClient(phone, name, excludeId = null) {
  const clients = getClients()
  const cleanPhone = String(phone || '').replace(/[\s-+]/g, '')
  const cleanName = String(name || '').trim().toLowerCase()

  return clients.find((c) => {
    if (excludeId && String(c.id).toLowerCase() === String(excludeId).toLowerCase()) {
      return false
    }
    const cPhone = String(c.phone || '').replace(/[\s-+]/g, '')
    const cName = String(c.name || '').trim().toLowerCase()
    return (cleanPhone && cPhone === cleanPhone) || (cleanName && cName === cleanName)
  }) || null
}

export function saveClient(clientData) {
  const clients = getClients()
  let maxNum = 1000
  clients.forEach((c) => {
    const match = String(c.id).match(/\d+/)
    if (match) {
      const num = parseInt(match[0], 10)
      if (num > maxNum) maxNum = num
    }
  })
  const newId = `CL-${maxNum + 1}`

  const newClient = {
    ...clientData,
    id: newId,
    phone: String(clientData.phone || '').trim(),
    extraPhone: String(clientData.extraPhone || '').trim(),
    fees: Number(clientData.fees || 0),
    clientCategory: clientData.clientCategory || 'Civil',
    casePosition: clientData.casePosition || 'Petitioner / Plaintiff',
    urgency: clientData.urgency || 'Normal',
    feeAgreement: clientData.feeAgreement || 'Lump Sum Agreed',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  const updated = [newClient, ...clients]
  writeStorage(CLIENTS_KEY, updated)
  api.createClient(clientData).then((res) => {
    if (res && res.id) {
      const current = getClients()
      const idx = current.findIndex((c) => c.id === newId)
      if (idx !== -1) {
        current[idx] = { ...current[idx], id: String(res.id) }
        writeStorage(CLIENTS_KEY, current)
      }
    }
  }).catch((e) => console.warn('MySQL saveClient sync:', e.message))
  return newClient
}

export function updateClient(id, clientData) {
  const clients = getClients()
  const idx = clients.findIndex((c) => String(c.id).toLowerCase() === String(id).toLowerCase())
  if (idx === -1) {
    throw new Error(`Client with ID ${id} not found`)
  }

  const updatedClient = {
    ...clients[idx],
    ...clientData,
    id, // Preserve original ID
    phone: String(clientData.phone || '').trim(),
    extraPhone: String(clientData.extraPhone || '').trim(),
    fees: Number(clientData.fees || 0),
    updatedAt: new Date().toISOString(),
  }

  clients[idx] = updatedClient
  writeStorage(CLIENTS_KEY, clients)
  api.updateClient(id, clientData).catch((e) => console.warn('MySQL updateClient sync:', e.message))

  // Sync client name and phone across linked cases
  try {
    const cases = getCases()
    let changed = false
    const updatedCases = cases.map((cs) => {
      if (String(cs.clientId).toLowerCase() === String(id).toLowerCase()) {
        changed = true
        return {
          ...cs,
          clientName: updatedClient.name,
          phone: updatedClient.phone,
        }
      }
      return cs
    })
    if (changed) {
      writeStorage(CASES_KEY, updatedCases)
    }
  } catch (e) {
    console.error('Error updating linked cases:', e)
  }

  return updatedClient
}

export function deleteClient(id) {
  const clients = getClients()
  const filtered = clients.filter((c) => String(c.id).toLowerCase() !== String(id).toLowerCase())
  writeStorage(CLIENTS_KEY, filtered)
  api.deleteClient(id).catch((e) => console.warn('MySQL deleteClient sync:', e.message))
  return true
}

export function getClientHistory(clientId) {
  const client = getClientById(clientId)
  const cases = getCases().filter((cs) => String(cs.clientId).toLowerCase() === String(clientId).toLowerCase())
  const caseIds = new Set(cases.map((c) => c.id))
  const bills = getBills().filter((b) => String(b.clientId).toLowerCase() === String(clientId).toLowerCase() || caseIds.has(b.caseId))
  const payments = getPayments().filter((p) => String(p.clientId).toLowerCase() === String(clientId).toLowerCase() || caseIds.has(p.caseId))
  const totalFees = bills.length > 0 ? bills.reduce((acc, b) => acc + Number(b.totalAmount || 0), 0) : cases.reduce((acc, c) => acc + Number(c.totalFees || 0), 0)
  const totalPaid = payments.reduce((acc, p) => acc + Number(p.amount || 0), 0)
  const totalDue = Math.max(0, totalFees - totalPaid)
  const documents = getDocuments().filter((d) => String(d.associatedId).toLowerCase() === String(clientId).toLowerCase() || caseIds.has(d.associatedId))

  return {
    client,
    cases,
    bills,
    payments,
    documents,
    financials: {
      totalFees,
      totalPaid,
      totalDue,
    },
  }
}

// -------------------------------------------------------------
// MODULE 2: CASE MASTER APIS
// -------------------------------------------------------------
export function getCases() {
  const cases = readStorage(CASES_KEY, SEED_CASES)
  if (!cases || !Array.isArray(cases)) return []
  return cases.map((cs) => ({
    ...cs,
    clientId: cs.clientId || 'CL-1001',
    regNumber: cs.regNumber || cs.reck || '',
    reck: cs.reck || cs.regNumber || '',
  }))
}

export function getCaseById(id) {
  const cases = getCases()
  return cases.find((c) => String(c.id).toLowerCase() === String(id).toLowerCase()) || null
}

export function getCasesByClientId(clientId) {
  const cases = getCases()
  return cases.filter((c) => String(c.clientId).toLowerCase() === String(clientId).toLowerCase())
}

export function saveBulkCases(casesArray) {
  if (!Array.isArray(casesArray) || casesArray.length === 0) return []
  const existing = getCases()
  let maxNum = 2000
  existing.forEach((c) => {
    const match = String(c.id).match(/\d+/)
    if (match) {
      const num = parseInt(match[0], 10)
      if (num > maxNum) maxNum = num
    }
  })

  const newCases = casesArray.map((c, idx) => ({
    ...c,
    id: c.id || `CS-${maxNum + idx + 1}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }))

  const updated = [...newCases, ...existing]
  writeStorage(CASES_KEY, updated)

  // Persist to MySQL backend
  api.createBulkCases(newCases).catch((err) => console.warn('Bulk cases save error:', err))

  return newCases
}

export function saveCase(caseData) {
  const cases = getCases()
  let maxNum = 2000
  cases.forEach((c) => {
    const match = String(c.id).match(/\d+/)
    if (match) {
      const num = parseInt(match[0], 10)
      if (num > maxNum) maxNum = num
    }
  })
  const newId = `CS-${maxNum + 1}`

  const totalFees = Number(caseData.totalFees || 0)
  const paidAmount = Number(caseData.paidAmount || 0)
  const dueAmount = Math.max(0, totalFees - paidAmount)

  const newCase = {
    ...caseData,
    id: newId,
    advocateName: caseData.advocateName || 'ANUPAM MAITY (ADVOCATE)',
    totalFees,
    paidAmount,
    dueAmount,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  // If initial paidAmount > 0, automatically record initial payment entry
  if (paidAmount > 0) {
    savePayment({
      caseId: newId,
      clientId: newCase.clientId,
      clientName: newCase.clientName,
      tcc: newCase.tcc || '',
      idNumber: newCase.idNumber || '',
      paymentDate: new Date().toISOString().split('T')[0],
      amount: paidAmount,
      dueAmount,
      mode: caseData.paymentMode || 'Cash',
      remarks: 'Initial retainer payment during case registration',
    }, false) // skip case update since we already computed it
  }

  const updated = [newCase, ...cases]
  writeStorage(CASES_KEY, updated)
  api.createCase(caseData).then((res) => {
    if (res && res.id) {
      const current = getCases()
      const idx = current.findIndex((c) => c.id === newId)
      if (idx !== -1) {
        current[idx] = { ...current[idx], id: String(res.id) }
        writeStorage(CASES_KEY, current)
      }
    }
  }).catch((e) => console.warn('MySQL saveCase sync:', e.message))
  return newCase
}

export function updateCase(id, caseData) {
  const cases = getCases()
  const idx = cases.findIndex((c) => String(c.id).toLowerCase() === String(id).toLowerCase())
  if (idx === -1) {
    throw new Error(`Case with ID ${id} not found`)
  }

  // Calculate accurate paid amount from all payments
  const payments = getPayments().filter((p) => String(p.caseId).toLowerCase() === String(id).toLowerCase())
  const calculatedPaid = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0)
  const totalFees = Number(caseData.totalFees !== undefined ? caseData.totalFees : cases[idx].totalFees || 0)
  const dueAmount = Math.max(0, totalFees - calculatedPaid)

  const updatedCase = {
    ...cases[idx],
    ...caseData,
    id, // CRITICAL: Preserve existing Case ID
    totalFees,
    paidAmount: calculatedPaid,
    dueAmount,
    updatedAt: new Date().toISOString(),
  }

  cases[idx] = updatedCase
  writeStorage(CASES_KEY, cases)
  api.updateCase(id, caseData).catch((e) => console.warn('MySQL updateCase sync:', e.message))
  return updatedCase
}

export function deleteCase(id) {
  const cases = getCases()
  const filtered = cases.filter((c) => String(c.id).toLowerCase() !== String(id).toLowerCase())
  writeStorage(CASES_KEY, filtered)
  api.deleteCase(id).catch((e) => console.warn('MySQL deleteCase sync:', e.message))
  return true
}

export function recalculateCaseFinancials(caseId) {
  const cases = getCases()
  const idx = cases.findIndex((c) => String(c.id).toLowerCase() === String(caseId).toLowerCase())
  if (idx === -1) return null

  const payments = getPayments().filter((p) => String(p.caseId).toLowerCase() === String(caseId).toLowerCase())
  const totalPaid = payments.reduce((acc, p) => acc + Number(p.amount || 0), 0)
  const totalFees = Number(cases[idx].totalFees || 0)
  const dueAmount = Math.max(0, totalFees - totalPaid)

  cases[idx].paidAmount = totalPaid
  cases[idx].dueAmount = dueAmount
  cases[idx].updatedAt = new Date().toISOString()

  writeStorage(CASES_KEY, cases)
  return cases[idx]
}

export function clearCaseDue(caseId) {
  const cases = getCases()
  const idx = cases.findIndex((c) => String(c.id).toLowerCase() === String(caseId).toLowerCase())
  if (idx === -1) return false

  const paid = Number(cases[idx].paidAmount || 0)
  cases[idx].totalFees = paid
  cases[idx].dueAmount = 0
  cases[idx].updatedAt = new Date().toISOString()

  writeStorage(CASES_KEY, cases)
  api.updateCase(cases[idx].id, { totalFees: paid }).catch((e) => console.warn('MySQL clearCaseDue sync:', e.message))
  return cases[idx]
}

// -------------------------------------------------------------
// MODULE 4: PAYMENT MANAGEMENT & ACCOUNTS APIS
// -------------------------------------------------------------
export function getPayments() {
  return readStorage(PAYMENTS_KEY, SEED_PAYMENTS)
}

export function getPaymentById(id) {
  const payments = getPayments()
  return payments.find((p) => String(p.id).toLowerCase() === String(id).toLowerCase()) || null
}

export function getPaymentsByCaseId(caseId) {
  const payments = getPayments()
  return payments.filter((p) => String(p.caseId).toLowerCase() === String(caseId).toLowerCase())
}

export function getPaymentsByDate(date) {
  const payments = getPayments()
  return payments.filter((p) => String(p.paymentDate) === String(date))
}

export function savePayment(paymentData, updateCaseRecord = true) {
  const payments = getPayments()
  let maxNum = 3000
  payments.forEach((p) => {
    const match = String(p.id).match(/\d+/)
    if (match) {
      const num = parseInt(match[0], 10)
      if (num > maxNum) maxNum = num
    }
  })
  const newId = `PM-${maxNum + 1}`

  const amount = Number(paymentData.amount || 0)
  const newPayment = {
    ...paymentData,
    id: newId,
    amount,
    paymentDate: paymentData.paymentDate || new Date().toISOString().split('T')[0],
    mode: paymentData.mode || 'Cash',
    remarks: paymentData.remarks || '',
    createdAt: new Date().toISOString(),
  }

  const updatedPayments = [newPayment, ...payments]
  writeStorage(PAYMENTS_KEY, updatedPayments)

  if (updateCaseRecord && paymentData.caseId) {
    recalculateCaseFinancials(paymentData.caseId)
  }

  // Persist to MySQL Payment table
  const apiPayload = {
    clientId: paymentData.clientId,
    paymentDate: newPayment.paymentDate,
    amount: newPayment.amount,
    paidAmount: newPayment.amount,
    remarks: paymentData.remarks || paymentData.details || paymentData.mode || 'Payment',
    details: paymentData.remarks || paymentData.details || paymentData.mode || 'Payment',
  }
  api.createPayment(apiPayload).then((res) => {
    if (res && res.id) {
      const current = getPayments()
      const idx = current.findIndex((p) => p.id === newId)
      if (idx !== -1) {
        current[idx] = { ...current[idx], id: String(res.id) }
        writeStorage(PAYMENTS_KEY, current)
      }
    }
  }).catch((e) => console.warn('MySQL savePayment sync:', e.message))

  return newPayment
}

export function updatePayment(id, paymentData) {
  const payments = getPayments()
  const idx = payments.findIndex((p) => String(p.id).toLowerCase() === String(id).toLowerCase())
  if (idx === -1) {
    throw new Error(`Payment ${id} not found`)
  }

  const updatedPayment = {
    ...payments[idx],
    ...paymentData,
    id,
    amount: Number(paymentData.amount || 0),
    updatedAt: new Date().toISOString(),
  }

  payments[idx] = updatedPayment
  writeStorage(PAYMENTS_KEY, payments)

  if (updatedPayment.caseId) {
    recalculateCaseFinancials(updatedPayment.caseId)
  }

  // Persist update to MySQL Payment table
  api.updatePayment(id, {
    clientId: updatedPayment.clientId,
    paymentDate: updatedPayment.paymentDate,
    amount: updatedPayment.amount,
    paidAmount: updatedPayment.amount,
    remarks: updatedPayment.remarks || updatedPayment.details || updatedPayment.mode || '',
    details: updatedPayment.remarks || updatedPayment.details || updatedPayment.mode || '',
  }).catch((e) => console.warn('MySQL updatePayment sync:', e.message))

  return updatedPayment
}

export function deletePayment(id) {
  const payments = getPayments()
  const target = payments.find((p) => String(p.id).toLowerCase() === String(id).toLowerCase())
  if (!target) return false

  const filtered = payments.filter((p) => String(p.id).toLowerCase() !== String(id).toLowerCase())
  writeStorage(PAYMENTS_KEY, filtered)
  api.deletePayment(id).catch((e) => console.warn('MySQL deletePayment sync:', e.message))

  if (target.caseId) {
    recalculateCaseFinancials(target.caseId)
  }

  return true
}

// -------------------------------------------------------------
// MODULE: BILLING & INVOICING APIS (SEPARATE FROM PAYMENTS)
// -------------------------------------------------------------
export function getBills() {
  let bills = readStorage(BILLS_KEY, null)
  if (!bills || !Array.isArray(bills)) {
    return []
  }
  return bills
}

export function getBillById(id) {
  const bills = getBills()
  return bills.find((b) => String(b.id).toLowerCase() === String(id).toLowerCase() || String(b.billNumber).toLowerCase() === String(id).toLowerCase()) || null
}

export function getBillsByClientId(clientId) {
  const bills = getBills()
  return bills.filter((b) => String(b.clientId).toLowerCase() === String(clientId).toLowerCase())
}

export function getBillsByCaseId(caseId) {
  const bills = getBills()
  return bills.filter((b) => String(b.caseId).toLowerCase() === String(caseId).toLowerCase())
}

export function saveBill(billData) {
  const bills = getBills()
  let maxNum = 1000
  bills.forEach((b) => {
    const match = String(b.id || b.billNumber).match(/\d+/)
    if (match) {
      const num = parseInt(match[0], 10)
      if (num > maxNum) maxNum = num
    }
  })
  const newId = `BL-${maxNum + 1}`
  const billNumber = billData.billNumber || `BILL-${maxNum + 1}`

  const contractAmount = Number(billData.contractAmount || 0)
  const additionalCharges = Number(billData.additionalCharges || 0)
  const discount = Number(billData.discount || 0)
  const totalAmount = Math.max(0, contractAmount + additionalCharges - discount)
  const paidAmount = Number(billData.paidAmount || 0)
  const dueAmount = Math.max(0, totalAmount - paidAmount)

  const newBill = {
    ...billData,
    id: newId,
    billNumber,
    contractAmount,
    additionalCharges,
    discount,
    totalAmount,
    paidAmount,
    dueAmount,
    billDate: billData.billDate || new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  const updated = [newBill, ...bills]
  writeStorage(BILLS_KEY, updated)
  api.createBill(billData).then((res) => {
    if (res && res.id) {
      const current = getBills()
      const idx = current.findIndex((b) => b.id === newId)
      if (idx !== -1) {
        current[idx] = { ...current[idx], id: String(res.id) }
        writeStorage(BILLS_KEY, current)
      }
    }
  }).catch((e) => console.warn('MySQL saveBill sync:', e.message))
  return newBill
}

export function updateBill(id, billData) {
  const bills = getBills()
  const idx = bills.findIndex((b) => String(b.id).toLowerCase() === String(id).toLowerCase() || String(b.billNumber).toLowerCase() === String(id).toLowerCase())
  if (idx === -1) throw new Error(`Bill ${id} not found`)

  const contractAmount = Number(billData.contractAmount !== undefined ? billData.contractAmount : bills[idx].contractAmount || 0)
  const additionalCharges = Number(billData.additionalCharges !== undefined ? billData.additionalCharges : bills[idx].additionalCharges || 0)
  const discount = Number(billData.discount !== undefined ? billData.discount : bills[idx].discount || 0)
  const totalAmount = Math.max(0, contractAmount + additionalCharges - discount)

  const payments = getPayments().filter((p) => p.billId === bills[idx].id || p.billId === bills[idx].billNumber || (p.caseId && p.caseId === bills[idx].caseId))
  const computedPaid = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0)
  const paidAmount = billData.paidAmount !== undefined ? Number(billData.paidAmount) : computedPaid
  const dueAmount = Math.max(0, totalAmount - paidAmount)

  bills[idx] = {
    ...bills[idx],
    ...billData,
    id: bills[idx].id,
    billNumber: bills[idx].billNumber,
    contractAmount,
    additionalCharges,
    discount,
    totalAmount,
    totalBillAmount: totalAmount,
    paidAmount,
    dueAmount,
    updatedAt: new Date().toISOString(),
  }

  writeStorage(BILLS_KEY, bills)
  api.updateBill(bills[idx].id, {
    ...bills[idx],
    amount: totalAmount,
    totalAmount,
    totalBillAmount: totalAmount,
    details: billData.description || billData.details || billData.remarks || '',
  }).catch((e) => console.warn('MySQL updateBill sync:', e.message))
  return bills[idx]
}

export function deleteBill(id) {
  const bills = getBills()
  const target = bills.find((b) => String(b.id).toLowerCase() === String(id).toLowerCase() || String(b.billNumber).toLowerCase() === String(id).toLowerCase())
  if (!target) return false

  const payments = getPayments().filter((p) => p.billId === target.id || p.billId === target.billNumber)
  if (payments.length > 0) {
    throw new Error(`Cannot delete Bill ${target.billNumber} because it has ${payments.length} payment receipt(s) recorded against it. Remove payments first.`)
  }

  const filtered = bills.filter((b) => b.id !== target.id)
  writeStorage(BILLS_KEY, filtered)
  api.deleteBill(id).catch((e) => console.warn('MySQL deleteBill sync:', e.message))
  return true
}

export function recalculateBillFinancials(billIdOrCaseId) {
  const bills = getBills()
  let changed = false
  bills.forEach((b) => {
    if (b.id === billIdOrCaseId || b.billNumber === billIdOrCaseId || b.caseId === billIdOrCaseId) {
      const payments = getPayments().filter((p) => p.billId === b.id || p.billId === b.billNumber || p.caseId === b.caseId)
      const paid = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0)
      b.paidAmount = paid
      b.dueAmount = Math.max(0, Number(b.totalAmount || 0) - paid)
      b.updatedAt = new Date().toISOString()
      changed = true
    }
  })
  if (changed) {
    writeStorage(BILLS_KEY, bills)
  }
}

// -------------------------------------------------------------
// MODULE: APPEARANCE HISTORY APIS
// -------------------------------------------------------------
export function getAppearances() {
  const appearances = readStorage(APPEARANCES_KEY, SEED_APPEARANCES)
  return appearances.sort((a, b) => (b.appearanceDate || '').localeCompare(a.appearanceDate || ''))
}

export function saveAppearance(entryData) {
  const appearances = getAppearances()
  let maxNum = 1000
  appearances.forEach((a) => {
    const match = String(a.id).match(/\d+/)
    if (match) {
      const num = parseInt(match[0], 10)
      if (num > maxNum) maxNum = num
    }
  })
  const newId = `APP-${maxNum + 1}`

  const newEntry = {
    ...entryData,
    id: newId,
    appearanceDate: entryData.appearanceDate || entryData.nextDate || new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
  }

  const updated = [newEntry, ...appearances]
  writeStorage(APPEARANCES_KEY, updated)

  // Persist to MySQL CaseNext hearing records
  const appearanceDate = entryData.appearanceDate || entryData.nextDate || new Date().toISOString().split('T')[0]
  api.createReminder({
    caseId: entryData.caseId,
    clientName: entryData.clientName,
    phone: entryData.phone,
    nextDate: appearanceDate,
    for: entryData.purpose || 'Court appearance',
    courtName: entryData.courtName || '',
    ppName: entryData.ppName || '',
    otherAc: entryData.otherCaseNumber || '',
  }).catch((e) => console.warn('MySQL saveAppearance sync:', e.message))

  return newEntry
}

export function getAppearancesByDateRange(fromDate, toDate) {
  const apps = getAppearances()
  return apps.filter((a) => {
    const d = a.appearanceDate
    if (!d) return false
    if (fromDate && d < fromDate) return false
    if (toDate && d > toDate) return false
    return true
  })
}

// -------------------------------------------------------------
// MODULE 5: DUE LIST APIS
// -------------------------------------------------------------
export function getDueList() {
  const cases = getCases()
  return cases
    .filter((cs) => Number(cs.dueAmount || 0) > 0)
    .sort((a, b) => Number(b.dueAmount || 0) - Number(a.dueAmount || 0))
}

// -------------------------------------------------------------
// MODULE 6: DAILY COLLECTION REPORT APIS
// -------------------------------------------------------------
export function getDailyCollection(targetDate) {
  const dateStr = String(targetDate || new Date().toISOString().split('T')[0])
  const payments = getPayments().filter((p) => String(p.paymentDate) === dateStr)
  const consultancy = getConsultancyFees().filter((c) => String(c.consultationDate) === dateStr)

  const totalCasePayments = payments.reduce((acc, p) => acc + Number(p.amount || 0), 0)
  const totalConsultancy = consultancy.reduce((acc, c) => acc + Number(c.amount || 0), 0)
  const grandTotal = totalCasePayments + totalConsultancy

  // Unified collection rows
  const collectionRows = [
    ...payments.map((p) => ({
      id: p.id,
      type: 'Case Payment',
      category: 'Litigation Fee',
      refId: p.caseId,
      tcc: p.tcc || '—',
      idNumber: p.idNumber || '—',
      clientName: p.clientName,
      amount: Number(p.amount || 0),
      mode: p.mode || 'Cash',
      remarks: p.remarks || 'Court case appearance fee',
      time: p.createdAt ? p.createdAt.split('T')[1]?.substring(0, 5) : '10:00',
    })),
    ...consultancy.map((c) => ({
      id: c.id,
      type: 'Consultancy Fee',
      category: 'Legal Advice',
      refId: c.receiptNo || 'Consultancy',
      tcc: '—',
      idNumber: '—',
      clientName: c.clientName,
      amount: Number(c.amount || 0),
      mode: c.paymentMode || 'Cash',
      remarks: c.remarks || 'Chamber legal consultation',
      time: c.createdAt ? c.createdAt.split('T')[1]?.substring(0, 5) : '11:00',
    })),
  ]

  return {
    date: dateStr,
    rows: collectionRows,
    totalCasePayments,
    totalConsultancy,
    grandTotal,
    count: collectionRows.length,
  }
}

// -------------------------------------------------------------
// MODULE 7: EXPENSE HEAD MASTER & EXPENSES APIS
// -------------------------------------------------------------
export function getExpenseHeads() {
  return readStorage(EXPENSE_HEADS_KEY, SEED_EXPENSE_HEADS)
}

export function getExpenseHeadById(id) {
  const heads = getExpenseHeads()
  return heads.find((h) => String(h.id).toLowerCase() === String(id).toLowerCase()) || null
}

export function saveExpenseHead(headData) {
  const heads = getExpenseHeads()
  let maxNum = 100
  heads.forEach((h) => {
    const match = String(h.id).match(/\d+/)
    if (match) {
      const num = parseInt(match[0], 10)
      if (num > maxNum) maxNum = num
    }
  })
  const newId = `EH-${maxNum + 1}`

  const newHead = {
    ...headData,
    id: newId,
    createdAt: new Date().toISOString().split('T')[0],
  }

  const updated = [newHead, ...heads]
  writeStorage(EXPENSE_HEADS_KEY, updated)
  api.createExpenseHead(headData).then((res) => {
    if (res && res.id) {
      const current = getExpenseHeads()
      const idx = current.findIndex((h) => h.id === newId)
      if (idx !== -1) {
        current[idx] = { ...current[idx], id: String(res.id) }
        writeStorage(EXPENSE_HEADS_KEY, current)
      }
    }
  }).catch((e) => console.warn('MySQL saveExpenseHead sync:', e.message))
  return newHead
}

export function updateExpenseHead(id, headData) {
  const heads = getExpenseHeads()
  const idx = heads.findIndex((h) => String(h.id).toLowerCase() === String(id).toLowerCase())
  if (idx === -1) throw new Error(`Expense Head ${id} not found`)

  heads[idx] = { ...heads[idx], ...headData, id }
  writeStorage(EXPENSE_HEADS_KEY, heads)
  api.updateExpenseHead(id, headData).catch((e) => console.warn('MySQL updateExpenseHead sync:', e.message))
  return heads[idx]
}

export function deleteExpenseHead(id) {
  const expenses = getExpenses()
  const isUsed = expenses.some((e) => String(e.headId).toLowerCase() === String(id).toLowerCase())
  if (isUsed) {
    throw new Error('Cannot delete this Expense Head because it is linked to existing expense transactions. Please reassign or delete the associated expenses first.')
  }

  const heads = getExpenseHeads()
  const filtered = heads.filter((h) => String(h.id).toLowerCase() !== String(id).toLowerCase())
  writeStorage(EXPENSE_HEADS_KEY, filtered)
  api.deleteExpenseHead(id).catch((e) => console.warn('MySQL deleteExpenseHead sync:', e.message))
  return true
}

export function getExpenses() {
  return readStorage(EXPENSES_KEY, SEED_EXPENSES)
}

export function saveExpense(expenseData) {
  const expenses = getExpenses()
  let maxNum = 4000
  expenses.forEach((e) => {
    const match = String(e.id).match(/\d+/)
    if (match) {
      const num = parseInt(match[0], 10)
      if (num > maxNum) maxNum = num
    }
  })
  const newId = `EX-${maxNum + 1}`

  const newExpense = {
    ...expenseData,
    id: newId,
    amount: Number(expenseData.amount || 0),
    expenseDate: expenseData.expenseDate || new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
  }

  const updated = [newExpense, ...expenses]
  writeStorage(EXPENSES_KEY, updated)
  api.createExpense(expenseData).then((res) => {
    if (res && res.id) {
      const current = getExpenses()
      const idx = current.findIndex((ex) => ex.id === newId)
      if (idx !== -1) {
        current[idx] = { ...current[idx], id: String(res.id) }
        writeStorage(EXPENSES_KEY, current)
      }
    }
  }).catch((e) => console.warn('MySQL saveExpense sync:', e.message))
  return newExpense
}

export function updateExpense(id, expenseData) {
  const expenses = getExpenses()
  const idx = expenses.findIndex((e) => String(e.id).toLowerCase() === String(id).toLowerCase())
  if (idx === -1) throw new Error(`Expense ${id} not found`)

  expenses[idx] = {
    ...expenses[idx],
    ...expenseData,
    id,
    amount: Number(expenseData.amount || 0),
    updatedAt: new Date().toISOString(),
  }
  writeStorage(EXPENSES_KEY, expenses)
  api.updateExpense(id, expenseData).catch((e) => console.warn('MySQL updateExpense sync:', e.message))
  return expenses[idx]
}

export function deleteExpense(id) {
  const expenses = getExpenses()
  const filtered = expenses.filter((e) => String(e.id).toLowerCase() !== String(id).toLowerCase())
  writeStorage(EXPENSES_KEY, filtered)
  api.deleteExpense(id).catch((e) => console.warn('MySQL deleteExpense sync:', e.message))
  return true
}

export function getExpenseHeadWiseSummary() {
  const heads = getExpenseHeads()
  const expenses = getExpenses()
  return heads.map((h) => {
    const matching = expenses.filter((e) => String(e.headId).toLowerCase() === String(h.id).toLowerCase())
    const total = matching.reduce((acc, m) => acc + Number(m.amount || 0), 0)
    return {
      ...h,
      count: matching.length,
      total,
    }
  })
}

// -------------------------------------------------------------
// MODULE 8: CONSULTANCY FEES (NO CASE ID)
// -------------------------------------------------------------
export function getConsultancyFees() {
  return readStorage(CONSULTANCY_KEY, SEED_CONSULTANCY)
}

export function saveConsultancyFee(feeData) {
  const fees = getConsultancyFees()
  let maxNum = 5000
  fees.forEach((f) => {
    const match = String(f.id).match(/\d+/)
    if (match) {
      const num = parseInt(match[0], 10)
      if (num > maxNum) maxNum = num
    }
  })
  const newId = `CF-${maxNum + 1}`
  const receiptNo = `REC-${maxNum + 1}`

  // IMPORTANT: NO CASE ID GENERATED
  const newEntry = {
    ...feeData,
    id: newId,
    receiptNo: feeData.receiptNo || receiptNo,
    amount: Number(feeData.amount || 0),
    consultationDate: feeData.consultationDate || new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
  }

  const updated = [newEntry, ...fees]
  writeStorage(CONSULTANCY_KEY, updated)

  // Sync to MySQL ClientMaster & Payment via Backend API
  api.createConsultancyFee({
    clientName: newEntry.clientName,
    phone: newEntry.phone,
    consultationDate: newEntry.consultationDate,
    amount: newEntry.amount,
    paymentMode: newEntry.paymentMode || 'Cash',
    remarks: newEntry.remarks || '',
  }).then((res) => {
    if (res && res.id) {
      const current = getConsultancyFees()
      const idx = current.findIndex((f) => f.id === newId)
      if (idx !== -1) {
        current[idx] = { ...current[idx], id: String(res.id), dbId: res.dbId }
        writeStorage(CONSULTANCY_KEY, current)
      }
    }
  }).catch((e) => console.warn('MySQL saveConsultancyFee sync:', e.message))

  return newEntry
}

export function updateConsultancyFee(id, feeData) {
  const fees = getConsultancyFees()
  const idx = fees.findIndex((f) => String(f.id).toLowerCase() === String(id).toLowerCase())
  if (idx === -1) throw new Error(`Consultancy entry ${id} not found`)

  fees[idx] = {
    ...fees[idx],
    ...feeData,
    id,
    amount: Number(feeData.amount || 0),
    updatedAt: new Date().toISOString(),
  }
  writeStorage(CONSULTANCY_KEY, fees)

  // Sync update to MySQL
  api.updateConsultancyFee(id, {
    clientName: fees[idx].clientName,
    phone: fees[idx].phone,
    consultationDate: fees[idx].consultationDate,
    amount: fees[idx].amount,
    paymentMode: fees[idx].paymentMode,
    remarks: fees[idx].remarks,
  }).catch((e) => console.warn('MySQL updateConsultancyFee sync:', e.message))

  return fees[idx]
}

export function deleteConsultancyFee(id) {
  const fees = getConsultancyFees()
  const filtered = fees.filter((f) => String(f.id).toLowerCase() !== String(id).toLowerCase())
  writeStorage(CONSULTANCY_KEY, filtered)
  api.deleteConsultancyFee(id).catch((e) => console.warn('MySQL deleteConsultancyFee sync:', e.message))
  return true
}

// -------------------------------------------------------------
// MODULE 9: ID-WISE DOCUMENT UPLOAD SYSTEM (IndexedDB Backed)
// -------------------------------------------------------------
export function getDocuments(filterId = null) {
  const docs = readStorage(DOCUMENTS_META_KEY, SEED_DOCUMENTS_META)
  if (!filterId) return docs
  const f = String(filterId).toLowerCase()
  return docs.filter((d) =>
    String(d.associatedId || '').toLowerCase() === f ||
    String(d.idNumber || '').toLowerCase() === f
  )
}

export async function saveDocument(docData) {
  const docs = getDocuments()
  let maxNum = 6000
  docs.forEach((d) => {
    const match = String(d.id).match(/\d+/)
    if (match) {
      const num = parseInt(match[0], 10)
      if (num > maxNum) maxNum = num
    }
  })
  const newId = `DOC-${maxNum + 1}`

  const now = new Date()
  const dateStr = `${now.toISOString().split('T')[0]} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  const docRecord = {
    id: newId,
    entityType: docData.entityType || 'case',
    associatedId: docData.associatedId || '',
    idNumber: docData.idNumber || '',
    docName: docData.docName || 'Untitled_Document',
    docType: docData.docType || 'Court Document',
    fileSize: docData.fileSize || 0,
    fileType: docData.fileType || 'application/pdf',
    uploadDate: dateStr,
    remarks: docData.remarks || '',
    downloadUrl: docData.fileData || '#',
  }

  // Dual store: full data in IndexedDB, metadata in localStorage
  if (docData.fileData) {
    await idbSaveDocument({
      id: newId,
      ...docRecord,
      fileData: docData.fileData,
    })
  }

  const updated = [docRecord, ...docs]
  writeStorage(DOCUMENTS_META_KEY, updated)

  // Persist file and metadata to Backend API & MySQL audit log
  api.uploadDocument({
    entityType: docRecord.entityType,
    associatedId: docRecord.associatedId,
    idNumber: docRecord.idNumber,
    docName: docRecord.docName,
    docType: docRecord.docType,
    fileSize: docRecord.fileSize,
    fileType: docRecord.fileType,
    fileData: docData.fileData || null,
    remarks: docRecord.remarks,
  }).then((res) => {
    if (res && res.id) {
      const current = getDocuments()
      const idx = current.findIndex((d) => d.id === newId)
      if (idx !== -1) {
        current[idx] = {
          ...current[idx],
          id: String(res.id),
          downloadUrl: res.downloadUrl || current[idx].downloadUrl,
        }
        writeStorage(DOCUMENTS_META_KEY, current)
      }
    }
  }).catch((e) => console.warn('Backend uploadDocument sync:', e.message))

  return docRecord
}

export async function getDocumentById(id) {
  // Try IndexedDB first for full binary file
  const fullDoc = await idbGetDocument(id)
  if (fullDoc) return fullDoc

  const docs = getDocuments()
  const localDoc = docs.find((d) => String(d.id).toLowerCase() === String(id).toLowerCase())
  if (localDoc && localDoc.fileData) return localDoc

  // Fetch full file from backend API if not in client storage
  try {
    const apiDoc = await api.getDocumentById(id)
    if (apiDoc) return apiDoc
  } catch (e) {}

  return localDoc || null
}

export async function deleteDocument(id) {
  await idbDeleteDocument(id)
  const docs = getDocuments()
  const filtered = docs.filter((d) => String(d.id).toLowerCase() !== String(id).toLowerCase())
  writeStorage(DOCUMENTS_META_KEY, filtered)
  api.deleteDocument(id).catch((e) => console.warn('Backend deleteDocument sync:', e.message))
  return true
}

// -------------------------------------------------------------
// MODULE 10 & 12: NEXT DATE REMINDERS & HEARING CAUSE LIST
// -------------------------------------------------------------
export function getReminders() {
  return readStorage(REMINDERS_KEY, SEED_REMINDERS)
}

export function saveReminder(reminderData) {
  const reminders = getReminders()
  let maxNum = 7000
  reminders.forEach((r) => {
    const match = String(r.id).match(/\d+/)
    if (match) {
      const num = parseInt(match[0], 10)
      if (num > maxNum) maxNum = num
    }
  })
  const newId = `REM-${maxNum + 1}`

  const newReminder = {
    ...reminderData,
    id: newId,
    status: reminderData.status || 'Pending',
    createdAt: new Date().toISOString(),
  }

  const updated = [newReminder, ...reminders]
  writeStorage(REMINDERS_KEY, updated)
  api.createReminder({
    ...reminderData,
    nextDate: reminderData.date || reminderData.nextDate,
    for: reminderData.reasons || reminderData.for,
  }).then((res) => {
    if (res && res.id) {
      const current = getReminders()
      const idx = current.findIndex((r) => r.id === newId)
      if (idx !== -1) {
        current[idx] = { ...current[idx], id: String(res.id) }
        writeStorage(REMINDERS_KEY, current)
      }
    }
  }).catch((e) => console.warn('MySQL saveReminder sync:', e.message))
  return newReminder
}

export function updateReminder(id, reminderData) {
  const reminders = getReminders()
  const idx = reminders.findIndex((r) => String(r.id).toLowerCase() === String(id).toLowerCase())
  if (idx === -1) throw new Error(`Reminder ${id} not found`)

  reminders[idx] = { ...reminders[idx], ...reminderData, id, updatedAt: new Date().toISOString() }
  writeStorage(REMINDERS_KEY, reminders)
  api.updateReminder(id, {
    ...reminderData,
    nextDate: reminderData.date || reminderData.nextDate,
    for: reminderData.reasons || reminderData.for,
  }).catch((e) => console.warn('MySQL updateReminder sync:', e.message))
  return reminders[idx]
}

export function deleteReminder(id) {
  const reminders = getReminders()
  const filtered = reminders.filter((r) => String(r.id).toLowerCase() !== String(id).toLowerCase())
  writeStorage(REMINDERS_KEY, filtered)
  api.deleteReminder(id).catch((e) => console.warn('MySQL deleteReminder sync:', e.message))
  return true
}

export function markReminderSent(id) {
  return updateReminder(id, {
    status: 'Sent',
    sentAt: new Date().toISOString(),
  })
}

// -------------------------------------------------------------
// MODULE 13: EXTRA BRIEF FOR COURT TO OTHER ADVOCATE (EVIDENCE)
// -------------------------------------------------------------
export function getExtraBriefs() {
  return readStorage(EXTRA_BRIEFS_KEY, SEED_EXTRA_BRIEFS)
}

export function saveExtraBrief(briefData) {
  const briefs = getExtraBriefs()
  let maxNum = 8000
  briefs.forEach((b) => {
    const match = String(b.id).match(/\d+/)
    if (match) {
      const num = parseInt(match[0], 10)
      if (num > maxNum) maxNum = num
    }
  })
  const newId = `EB-${maxNum + 1}`

  const newBrief = {
    ...briefData,
    id: newId,
    hasIdNumber: !!briefData.hasIdNumber,
    idNumber: briefData.hasIdNumber ? String(briefData.idNumber || '').trim() : '',
    createdAt: new Date().toISOString(),
  }

  const updated = [newBrief, ...briefs]
  writeStorage(EXTRA_BRIEFS_KEY, updated)

  // Persist to Backend API & MySQL clientinformation
  api.createExtraBrief(newBrief).then((res) => {
    if (res && res.id) {
      const current = getExtraBriefs()
      const idx = current.findIndex((b) => b.id === newId)
      if (idx !== -1) {
        current[idx] = { ...current[idx], id: String(res.id) }
        writeStorage(EXTRA_BRIEFS_KEY, current)
      }
    }
  }).catch((e) => console.warn('Backend saveExtraBrief sync:', e.message))

  return newBrief
}

export function updateExtraBrief(id, briefData) {
  const briefs = getExtraBriefs()
  const idx = briefs.findIndex((b) => String(b.id).toLowerCase() === String(id).toLowerCase())
  if (idx === -1) throw new Error(`Extra Brief ${id} not found`)

  briefs[idx] = {
    ...briefs[idx],
    ...briefData,
    id,
    hasIdNumber: !!briefData.hasIdNumber,
    idNumber: briefData.hasIdNumber ? String(briefData.idNumber || '').trim() : '',
    updatedAt: new Date().toISOString(),
  }
  writeStorage(EXTRA_BRIEFS_KEY, briefs)

  api.updateExtraBrief(id, briefs[idx]).catch((e) => console.warn('Backend updateExtraBrief sync:', e.message))

  return briefs[idx]
}

export function deleteExtraBrief(id) {
  const briefs = getExtraBriefs()
  const filtered = briefs.filter((b) => String(b.id).toLowerCase() !== String(id).toLowerCase())
  writeStorage(EXTRA_BRIEFS_KEY, filtered)
  api.deleteExtraBrief(id).catch((e) => console.warn('Backend deleteExtraBrief sync:', e.message))
  return true
}

// -------------------------------------------------------------
// WAITING LIST APIS
// -------------------------------------------------------------
export function getWaitingList() {
  return readStorage(WAITING_LIST_KEY, SEED_WAITING_LIST)
}

export function saveWaitingListEntry(entryData) {
  const list = getWaitingList()
  let maxNum = 9000
  list.forEach((w) => {
    const match = String(w.id).match(/\d+/)
    if (match) {
      const num = parseInt(match[0], 10)
      if (num > maxNum) maxNum = num
    }
  })
  const newId = `WL-${maxNum + 1}`

  const newEntry = {
    consultancyType: entryData.consultancyType || 'Conference',
    ...entryData,
    id: newId,
    status: entryData.status || 'Waiting',
    date: entryData.date || new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
  }

  const updated = [newEntry, ...list]
  writeStorage(WAITING_LIST_KEY, updated)
  api.createWaitingListEntry(entryData).then((res) => {
    if (res && res.id) {
      const current = getWaitingList()
      const idx = current.findIndex((w) => w.id === newId)
      if (idx !== -1) {
        current[idx] = { ...current[idx], id: String(res.id) }
        writeStorage(WAITING_LIST_KEY, current)
      }
    }
  }).catch((e) => console.warn('MySQL saveWaitingListEntry sync:', e.message))
  return newEntry
}

export function updateWaitingListEntry(id, entryData) {
  const list = getWaitingList()
  const idx = list.findIndex((w) => String(w.id).toLowerCase() === String(id).toLowerCase())
  if (idx === -1) throw new Error(`Waiting list item ${id} not found`)

  list[idx] = { ...list[idx], ...entryData, id, updatedAt: new Date().toISOString() }
  writeStorage(WAITING_LIST_KEY, list)
  api.updateWaitingListEntry(id, entryData).catch((e) => console.warn('MySQL updateWaitingListEntry sync:', e.message))
  return list[idx]
}

export function toggleWaitingListPriority(id) {
  const list = getWaitingList()
  const idx = list.findIndex((w) => String(w.id).toLowerCase() === String(id).toLowerCase())
  if (idx === -1) throw new Error(`Waiting list item ${id} not found`)
  const current = list[idx].consultancyType === 'Emergency' ? 'Emergency' : 'Conference'
  const nextType = current === 'Emergency' ? 'Conference' : 'Emergency'
  list[idx] = { ...list[idx], consultancyType: nextType, updatedAt: new Date().toISOString() }
  writeStorage(WAITING_LIST_KEY, list)
  return list[idx]
}

export function deleteWaitingListEntry(id) {
  const list = getWaitingList()
  const filtered = list.filter((w) => String(w.id).toLowerCase() !== String(id).toLowerCase())
  writeStorage(WAITING_LIST_KEY, filtered)
  api.deleteWaitingListEntry(id).catch((e) => console.warn('MySQL deleteWaitingListEntry sync:', e.message))
  return true
}

// -------------------------------------------------------------
// TV DIGITAL SIGNAGE ANNOUNCEMENTS & CUSTOMER NOTICES
// -------------------------------------------------------------
export const SEED_ANNOUNCEMENTS = []

export function getAnnouncements() {
  return readStorage(ANNOUNCEMENTS_KEY, SEED_ANNOUNCEMENTS)
}

export function saveAnnouncement(noticeData) {
  const list = getAnnouncements()
  const newNotice = {
    ...noticeData,
    id: noticeData.id || `ANN-${Date.now()}`,
    createdAt: new Date().toISOString(),
  }
  const updated = [newNotice, ...list]
  writeStorage(ANNOUNCEMENTS_KEY, updated)
  api.createAnnouncement(noticeData).then((res) => {
    if (res && res.id) {
      const current = getAnnouncements()
      const idx = current.findIndex((a) => a.id === newNotice.id)
      if (idx !== -1) {
        current[idx] = { ...current[idx], id: String(res.id) }
        writeStorage(ANNOUNCEMENTS_KEY, current)
      }
    }
  }).catch((e) => console.warn('MySQL saveAnnouncement sync:', e.message))
  return newNotice
}

export function deleteAnnouncement(id) {
  const list = getAnnouncements()
  const filtered = list.filter((a) => String(a.id) !== String(id))
  const finalNotices = filtered.length > 0 ? filtered : SEED_ANNOUNCEMENTS
  writeStorage(ANNOUNCEMENTS_KEY, finalNotices)
  api.deleteAnnouncement(id).catch((e) => console.warn('MySQL deleteAnnouncement sync:', e.message))
  return true
}

export function resetAnnouncements() {
  writeStorage(ANNOUNCEMENTS_KEY, SEED_ANNOUNCEMENTS)
  return SEED_ANNOUNCEMENTS
}

// -------------------------------------------------------------
// COMPREHENSIVE PRACTICE OVERVIEW & STATS
// -------------------------------------------------------------
export function getPracticeOverviewStats() {
  if (memoryStore.overview) {
    return memoryStore.overview
  }
  try {
    const cached = localStorage.getItem('legalcase_practice_overview')
    if (cached) {
      const parsed = JSON.parse(cached)
      if (parsed && typeof parsed.totalClients === 'number') {
        return parsed
      }
    }
  } catch (e) {}

  const clients = getClients()
  const cases = getCases()
  const bills = getBills()
  const payments = getPayments()
  const expenses = getExpenses()
  const consultancy = getConsultancyFees()

  const totalClients = clients.length
  const totalCases = cases.length

  // Real sums of current records from MySQL database (Zero fake/hardcoded numbers)
  const totalBilling = bills.length > 0
    ? bills.reduce((sum, b) => sum + Number(b.totalAmount || b.amount || 0), 0)
    : cases.reduce((sum, c) => sum + Number(c.totalFees || 0), 0)
  const totalPayment = payments.reduce((sum, p) => sum + Number(p.amount || p.paidAmount || 0), 0)
  const totalExpense = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0)
  const totalConsultancy = consultancy.reduce((sum, c) => sum + Number(c.amount || 0), 0)

  return {
    totalClients,
    totalCases,
    totalBilling,
    totalPayment,
    totalExpense,
    totalConsultancy,
  }
}

// -------------------------------------------------------------
// DATABASE BACKUP & RESTORE UTILITIES
// -------------------------------------------------------------
export function exportDatabaseAsJSON() {
  const payload = {
    version: '2.0',
    exportDate: new Date().toISOString(),
    clients: getClients(),
    cases: getCases(),
    bills: getBills(),
    payments: getPayments(),
    appearances: getAppearances(),
    expenseHeads: getExpenseHeads(),
    expenses: getExpenses(),
    consultancyFees: getConsultancyFees(),
    documents: getDocuments(),
    reminders: getReminders(),
    extraBriefs: getExtraBriefs(),
    waitingList: getWaitingList(),
  }
  return JSON.stringify(payload, null, 2)
}

export function importDatabaseFromJSON(jsonString) {
  try {
    const data = JSON.parse(jsonString)
    if (Array.isArray(data.clients)) writeStorage(CLIENTS_KEY, data.clients)
    if (Array.isArray(data.cases)) writeStorage(CASES_KEY, data.cases)
    if (Array.isArray(data.bills)) writeStorage(BILLS_KEY, data.bills)
    if (Array.isArray(data.payments)) writeStorage(PAYMENTS_KEY, data.payments)
    if (Array.isArray(data.appearances)) writeStorage(APPEARANCES_KEY, data.appearances)
    if (Array.isArray(data.expenseHeads)) writeStorage(EXPENSE_HEADS_KEY, data.expenseHeads)
    if (Array.isArray(data.expenses)) writeStorage(EXPENSES_KEY, data.expenses)
    if (Array.isArray(data.consultancyFees)) writeStorage(CONSULTANCY_KEY, data.consultancyFees)
    if (Array.isArray(data.documents)) writeStorage(DOCUMENTS_META_KEY, data.documents)
    if (Array.isArray(data.reminders)) writeStorage(REMINDERS_KEY, data.reminders)
    if (Array.isArray(data.extraBriefs)) writeStorage(EXTRA_BRIEFS_KEY, data.extraBriefs)
    if (Array.isArray(data.waitingList)) writeStorage(WAITING_LIST_KEY, data.waitingList)
    dispatchStorageEvent()
    return true
  } catch (err) {
    console.error('Failed to import database:', err)
    throw new Error('Invalid JSON backup file format.')
  }
}


// =====================================================================
// LIVE BACKEND SYNCHRONIZATION & DUMMY DATA PURGE
// Synchronizes frontend LocalStorage cache with MySQL legalcase_db
// =====================================================================
let isSyncing = false
const PURGE_FLAG_KEY = 'legalcase_clean_v6_purged'

export async function initStorageSync() {
  if (typeof window === 'undefined' || isSyncing) return
  isSyncing = true

  const allKeys = [
    CLIENTS_KEY, CASES_KEY, PAYMENTS_KEY, BILLS_KEY, APPEARANCES_KEY,
    EXPENSE_HEADS_KEY, EXPENSES_KEY, REMINDERS_KEY, WAITING_LIST_KEY,
    ANNOUNCEMENTS_KEY, CONSULTANCY_KEY, EXTRA_BRIEFS_KEY, DOCUMENTS_META_KEY
  ]

  // 1. One-time clean sweep of legacy dummy data from localStorage
  if (localStorage.getItem(PURGE_FLAG_KEY) !== 'true') {
    allKeys.forEach((k) => {
      try {
        localStorage.removeItem(k)
      } catch (e) {}
    })
    localStorage.removeItem('legalcase_practice_overview')
    localStorage.setItem(PURGE_FLAG_KEY, 'true')
    dispatchStorageEvent()
  }

  // 2. Extra safety: Purge any key containing known dummy seed signatures
  const dummyMarkers = [
    'Rajesh Kumar Sharma', 'GR - 175/14', 'W-501', 'ANN-101', 'Sunita Devi',
    'Nirmal Chandra Patra', 'Madhabi Giri', 'Subhendu Ghosh', 'CF-5001',
    'EB-8001', 'Debashis Roy Chowdhury', 'Gour Mohan Pramanik'
  ]
  allKeys.forEach((k) => {
    try {
      const raw = localStorage.getItem(k)
      if (raw && dummyMarkers.some((m) => raw.includes(m))) {
        localStorage.removeItem(k)
      }
    } catch (e) {}
  })

  // 3. Immediately fetch live overview metrics from MySQL legalcase_db
  try {
    const overviewRes = await api.getOverview()
    if (overviewRes && overviewRes.success && overviewRes.data) {
      memoryStore.overview = overviewRes.data
      try {
        localStorage.setItem('legalcase_practice_overview', JSON.stringify(overviewRes.data))
      } catch (e) {}
      dispatchStorageEvent()
    }
  } catch (err) {
    console.warn('Backend overview fetch error:', err)
  }

  // 4. Fetch fresh snapshot from MySQL database legalcase_db
  try {
    const res = await api.getSync()
    if (res && res.success && res.data) {
      // Retain full dataset in memoryStore so all UI modules have access to all records
      memoryStore[CLIENTS_KEY] = res.data.clients || []
      memoryStore[CASES_KEY] = res.data.cases || []
      memoryStore[REMINDERS_KEY] = res.data.reminders || []
      memoryStore[BILLS_KEY] = res.data.bills || []
      memoryStore[PAYMENTS_KEY] = res.data.payments || []
      memoryStore[EXPENSE_HEADS_KEY] = res.data.expenseHeads || []
      memoryStore[EXPENSES_KEY] = res.data.expenses || []
      memoryStore[WAITING_LIST_KEY] = res.data.waitingList || []
      memoryStore[ANNOUNCEMENTS_KEY] = res.data.announcements || []
      memoryStore[CONSULTANCY_KEY] = res.data.consultancyFees || []
      memoryStore[EXTRA_BRIEFS_KEY] = res.data.extraBriefs || []
      memoryStore[DOCUMENTS_META_KEY] = res.data.documents || []

      // Safely write to localStorage with quota protection
      const safeWrite = (k, v) => {
        try {
          localStorage.setItem(k, JSON.stringify(v))
        } catch (e) {
          // If 5MB quota is exceeded, data remains safe in memoryStore
        }
      }

      safeWrite(CLIENTS_KEY, (res.data.clients || []).slice(0, 200))
      safeWrite(CASES_KEY, (res.data.cases || []).slice(0, 200))
      safeWrite(EXPENSE_HEADS_KEY, res.data.expenseHeads || [])
      safeWrite(WAITING_LIST_KEY, res.data.waitingList || [])
      safeWrite(ANNOUNCEMENTS_KEY, res.data.announcements || [])
      safeWrite(CONSULTANCY_KEY, res.data.consultancyFees || [])
      safeWrite(EXTRA_BRIEFS_KEY, res.data.extraBriefs || [])
      safeWrite(DOCUMENTS_META_KEY, res.data.documents || [])
      safeWrite(REMINDERS_KEY, (res.data.reminders || []).slice(0, 100))
      safeWrite(BILLS_KEY, (res.data.bills || []).slice(0, 100))
      safeWrite(PAYMENTS_KEY, (res.data.payments || []).slice(0, 100))
      safeWrite(EXPENSES_KEY, (res.data.expenses || []).slice(0, 100))

      dispatchStorageEvent()
    }
  } catch (err) {
    console.warn('Backend MySQL initial sync error:', err)
  } finally {
    isSyncing = false
  }
}

// Auto-trigger on initial browser load
if (typeof window !== 'undefined') {
  initStorageSync()
}
