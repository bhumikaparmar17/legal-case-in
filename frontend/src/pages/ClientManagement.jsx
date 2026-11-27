import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Users, UserPlus, Save, RefreshCw, Printer, XCircle, Search,
  Phone, MapPin, Calendar, IndianRupee, ArrowLeft, CheckCircle2,
  AlertCircle, ChevronRight, UserCheck, Trash2, Eye,
  ShieldAlert, Plus
} from 'lucide-react'
import Pagination from '../components/Pagination.jsx'
import { OFFICE } from '../data/menu.js'
import {
  getClients, saveClient, updateClient, deleteClient,
  checkDuplicateClient, getClientHistory, onStorageUpdate
} from '../services/storageService.js'
import { api } from '../services/api.js'
import './management.css'

export default function ClientManagement({ viewMode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const isInfoMode = viewMode === 'information' || location.pathname.includes('client-information')
  const [clients, setClients] = useState(() => getClients())
  const [selectedId, setSelectedId] = useState(null)
  const formPanelRef = useRef(null)
  const nameInputRef = useRef(null)
  const [hoveredBtn, setHoveredBtn] = useState(null)

  // Compute strict sequential next Client ID (queue order: max existing numeric ID + 1)
  const nextClientId = useMemo(() => {
    let maxId = 0
    clients.forEach((c) => {
      const num = parseInt(String(c.id || '').replace(/\D/g, ''), 10)
      if (!isNaN(num) && num > maxId) maxId = num
    })
    return String(maxId + 1)
  }, [clients])
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [formClientSearch, setFormClientSearch] = useState('')
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  const [toast, setToast] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [clientToDelete, setClientToDelete] = useState(null)
  const [historyModalClient, setHistoryModalClient] = useState(null)
  const [duplicateWarning, setDuplicateWarning] = useState(null)

  // Form State
  const getInitialForm = () => ({
    name: '',
    relation: '',
    address: '',
    phone: '',
    extraPhone: '',
    otherPhones: [{ name: '', phone: '' }],
    referenceName: '',
    referencePhone: '',
    referencePhones: [''],
    otherReferences: [{ name: '', phone: '' }],
    clientCategory: 'Civil',
    casePosition: 'Petitioner / Plaintiff',
    urgency: 'Normal',
    feeAgreement: 'Lump Sum Agreed',
    fees: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  })

  const [formData, setFormData] = useState(getInitialForm)
  const [errors, setErrors] = useState({})

  // Live API fetch on mount & subscribe to storage updates
  useEffect(() => {
    api.getClients().then((data) => {
      if (Array.isArray(data)) setClients(data)
    }).catch(() => {})

    return onStorageUpdate(() => {
      setClients(getClients())
    })
  }, [])

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3500)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const showToast = (type, message) => {
    setToast({ type, message })
  }

  // Handle Input Changes
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }))
    }
    if (duplicateWarning) {
      setDuplicateWarning(null)
    }
  }

  // Reference phone array handlers
  const handleRefPhoneChange = (index, value) => {
    setFormData((prev) => {
      const list = [...(prev.referencePhones || [''])]
      list[index] = value
      return { ...prev, referencePhones: list }
    })
    if (errors[`refPhone_${index}`]) {
      setErrors((prev) => ({ ...prev, [`refPhone_${index}`]: null }))
    }
  }

  const handleAddRefPhone = () => {
    setFormData((prev) => ({
      ...prev,
      referencePhones: [...(prev.referencePhones || ['']), ''],
    }))
  }

  const handleRemoveRefPhone = (index) => {
    setFormData((prev) => {
      const list = (prev.referencePhones || ['']).filter((_, i) => i !== index)
      return { ...prev, referencePhones: list.length > 0 ? list : [''] }
    })
  }

  // Other phone (multiple with reference name) handlers
  const handleOtherPhoneChange = (index, field, value) => {
    setFormData((prev) => {
      const list = [...(prev.otherPhones || [{ name: '', phone: '' }])]
      list[index] = { ...list[index], [field]: value }
      return { ...prev, otherPhones: list }
    })
    if (errors[`otherPhone_${index}`]) {
      setErrors((prev) => ({ ...prev, [`otherPhone_${index}`]: null }))
    }
  }

  const handleAddOtherPhone = () => {
    setFormData((prev) => ({
      ...prev,
      otherPhones: [...(prev.otherPhones || []), { name: '', phone: '' }],
    }))
  }

  const handleRemoveOtherPhone = (index) => {
    setFormData((prev) => {
      const list = (prev.otherPhones || []).filter((_, i) => i !== index)
      return { ...prev, otherPhones: list.length > 0 ? list : [{ name: '', phone: '' }] }
    })
  }

  // Other person's reference handlers
  const handleOtherRefChange = (index, field, value) => {
    setFormData((prev) => {
      const list = [...(prev.otherReferences || [{ name: '', phone: '' }])]
      list[index] = { ...list[index], [field]: value }
      return { ...prev, otherReferences: list }
    })
    if (errors[`otherRefPhone_${index}`]) {
      setErrors((prev) => ({ ...prev, [`otherRefPhone_${index}`]: null }))
    }
  }

  const handleAddOtherRef = () => {
    setFormData((prev) => ({
      ...prev,
      otherReferences: [...(prev.otherReferences || []), { name: '', phone: '' }],
    }))
  }

  const handleRemoveOtherRef = (index) => {
    setFormData((prev) => {
      const list = (prev.otherReferences || []).filter((_, i) => i !== index)
      return { ...prev, otherReferences: list.length > 0 ? list : [{ name: '', phone: '' }] }
    })
  }

  // Validation
  const validateForm = () => {
    const errs = {}
    if (!formData.name.trim()) errs.name = 'Client Name is required'
    if (!formData.phone.trim()) {
      errs.phone = 'Mobile phone number is required'
    } else if (!/^\d{10}$/.test(formData.phone.replace(/[\s-+]/g, ''))) {
      errs.phone = 'Enter a valid 10-digit mobile number'
    }
    if (formData.extraPhone && !/^\d{10}$/.test(formData.extraPhone.replace(/[\s-+]/g, ''))) {
      errs.extraPhone = 'Enter valid 10-digit other phone number'
    }
    if (formData.otherPhones && formData.otherPhones.length > 0) {
      formData.otherPhones.forEach((p, idx) => {
        if (p.phone && !/^\d{10}$/.test(p.phone.replace(/[\s-+]/g, ''))) {
          errs[`otherPhone_${idx}`] = 'Enter valid 10-digit other phone number'
        }
      })
    }
    if (formData.otherReferences && formData.otherReferences.length > 0) {
      formData.otherReferences.forEach((r, idx) => {
        if (r.phone && !/^\d{10}$/.test(r.phone.replace(/[\s-+]/g, ''))) {
          errs[`otherRefPhone_${idx}`] = 'Enter valid 10-digit contact number'
        }
      })
    }
    if (!formData.date) errs.date = 'Registration date is required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  // Prepare clean payload for saving/updating
  const preparePayload = () => {
    const cleanedRefPhones = (formData.referencePhones || []).filter((p) => p && p.trim() !== '')
    const cleanedOtherPhones = (formData.otherPhones || []).filter(
      (p) => (p.name && p.name.trim() !== '') || (p.phone && p.phone.trim() !== '')
    )
    const cleanedOtherRefs = (formData.otherReferences || []).filter(
      (r) => (r.name && r.name.trim() !== '') || (r.phone && r.phone.trim() !== '')
    )
    const primaryOtherPhone = cleanedOtherPhones.find((p) => p.phone)?.phone || formData.extraPhone || ''
    return {
      ...formData,
      otherPhones: cleanedOtherPhones,
      extraPhone: primaryOtherPhone,
      referencePhones: cleanedRefPhones.length > 0 ? cleanedRefPhones : (formData.referencePhone ? [formData.referencePhone] : []),
      referencePhone: cleanedRefPhones[0] || formData.referencePhone || '',
      otherReferences: cleanedOtherRefs,
      referenceName: cleanedOtherRefs[0]?.name || formData.referenceName || '',
    }
  }

  // Select a Client from the Table
  const handleSelectClient = (client) => {
    setSelectedId(client.id)
    let refPhones = ['']
    if (Array.isArray(client.referencePhones) && client.referencePhones.length > 0) {
      refPhones = [...client.referencePhones]
    } else if (client.referencePhone) {
      refPhones = [client.referencePhone]
    }

    let otherPhoneList = [{ name: '', phone: '' }]
    if (Array.isArray(client.otherPhones) && client.otherPhones.length > 0) {
      otherPhoneList = client.otherPhones.map((p) => ({ name: p.name || '', phone: p.phone || '' }))
    } else if (client.extraPhone) {
      otherPhoneList = [{ name: '', phone: client.extraPhone }]
    }

    let otherRefs = [{ name: '', phone: '' }]
    if (Array.isArray(client.otherReferences) && client.otherReferences.length > 0) {
      otherRefs = client.otherReferences.map((r) => ({ name: r.name || '', phone: r.phone || '' }))
    } else if (client.referenceName || client.referencePhone) {
      otherRefs = [{ name: client.referenceName || '', phone: client.referencePhone || '' }]
    }

    setFormData({
      name: client.name || '',
      relation: client.relation || '',
      address: client.address || '',
      phone: client.phone || '',
      extraPhone: client.extraPhone || '',
      otherPhones: otherPhoneList,
      referenceName: client.referenceName || '',
      referencePhone: client.referencePhone || '',
      referencePhones: refPhones,
      otherReferences: otherRefs,
      clientCategory: client.clientCategory || 'Civil',
      casePosition: client.casePosition || 'Petitioner / Plaintiff',
      urgency: client.urgency || 'Normal',
      feeAgreement: client.feeAgreement || 'Lump Sum Agreed',
      fees: client.fees !== undefined ? String(client.fees) : '',
      date: client.date || new Date().toISOString().split('T')[0],
      notes: client.notes || '',
    })
    setErrors({})
    setDuplicateWarning(null)
    showToast('info', `Selected client ${client.id} — loaded into form`)
  }

  // Clear Form
  const handleClear = () => {
    setSelectedId(null)
    setFormData(getInitialForm())
    setErrors({})
    setDuplicateWarning(null)
  }

  // Save New Client
  const handleSave = (e) => {
    if (e) e.preventDefault()
    if (!validateForm()) {
      showToast('error', 'Please resolve form validation errors.')
      return
    }

    // Check for accidental duplicate record
    const dup = checkDuplicateClient(formData.phone, formData.name)
    if (dup && !duplicateWarning) {
      setDuplicateWarning({
        existing: dup,
        reason: dup.phone === formData.phone.trim() ? `Phone number (${formData.phone}) is already registered with ${dup.id} (${dup.name}).` : `Client name matches existing record ${dup.id}.`,
      })
      showToast('error', 'Potential duplicate client detected! Please verify below.')
      return
    }

    const payload = preparePayload()
    setLoading(true)
    setTimeout(() => {
      try {
        const saved = saveClient(payload)
        setSelectedId(saved.id)
        setDuplicateWarning(null)
        showToast('success', `Client ${saved.name} registered successfully with ID ${saved.id}!`)
      } catch (err) {
        showToast('error', err.message || 'Failed to save client.')
      } finally {
        setLoading(false)
      }
    }, 120)
  }

  // Update Existing Client
  const handleUpdate = (e) => {
    if (e) e.preventDefault()
    if (!selectedId) {
      showToast('error', 'Please select a client from the table to update.')
      return
    }
    if (!validateForm()) {
      showToast('error', 'Please resolve form validation errors.')
      return
    }

    // Check for duplicate excluding current client
    const dup = checkDuplicateClient(formData.phone, formData.name, selectedId)
    if (dup && !duplicateWarning) {
      setDuplicateWarning({
        existing: dup,
        reason: `Phone (${formData.phone}) is used by another record ${dup.id} (${dup.name}).`,
      })
      showToast('error', 'Phone number conflicts with another client record!')
      return
    }

    const payload = preparePayload()
    setLoading(true)
    setTimeout(() => {
      try {
        const updated = updateClient(selectedId, payload)
        setDuplicateWarning(null)
        showToast('success', `Client ${updated.id} (${updated.name}) updated successfully!`)
      } catch (err) {
        showToast('error', err.message || 'Failed to update client.')
      } finally {
        setLoading(false)
      }
    }, 120)
  }

  // Delete Client with Confirmation
  const promptDeleteClient = (client) => {
    setClientToDelete(client)
    setShowDeleteModal(true)
  }

  const confirmDeleteClient = () => {
    if (!clientToDelete) return
    try {
      deleteClient(clientToDelete.id)
      if (selectedId === clientToDelete.id) {
        handleClear()
      }
      showToast('success', `Client ${clientToDelete.id} (${clientToDelete.name}) deleted.`)
    } catch (err) {
      showToast('error', err.message || 'Failed to delete client.')
    } finally {
      setShowDeleteModal(false)
      setClientToDelete(null)
    }
  }

  // View Client History (Cases & Payments)
  const handleOpenHistory = (client) => {
    const history = getClientHistory(client.id)
    setHistoryModalClient(history)
  }

  // Print Selected Client Docket
  const handlePrint = () => {
    if (!selectedId) {
      showToast('error', 'Please select a client from the table to print docket.')
      return
    }
    window.print()
  }

  // Search filter
  const filteredClients = clients.filter((c) => {
    const q = search.toLowerCase()
    const matchesOtherPhones = Array.isArray(c.otherPhones) && c.otherPhones.some(
      (op) => (op.phone && op.phone.includes(q)) || (op.name && op.name.toLowerCase().includes(q))
    )
    return (
      (c.id && c.id.toLowerCase().includes(q)) ||
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q)) ||
      (c.extraPhone && c.extraPhone.includes(q)) ||
      matchesOtherPhones ||
      (c.relation && c.relation.toLowerCase().includes(q)) ||
      (c.address && c.address.toLowerCase().includes(q)) ||
      (c.clientCategory && c.clientCategory.toLowerCase().includes(q))
    )
  })

  const selectedClient = clients.find((c) => c.id === selectedId) || null

  const paginatedClients = useMemo(() => {
    return filteredClients.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  }, [filteredClients, currentPage, pageSize])

  return (
    <>

        <main className="dash mgmt-page">
          {/* Breadcrumb Navigation */}
          <div className="crumbs">
            <button className="crumbs-link" onClick={() => navigate('/dashboard')}>
              <ArrowLeft size={13} />
              <span>Dashboard</span>
            </button>
            <ChevronRight size={12} className="crumbs-sep" />
            <span className="crumbs-muted">{isInfoMode ? 'Case Operations' : 'Master Entry'}</span>
            <ChevronRight size={12} className="crumbs-sep" />
            <b className="crumbs-active">{isInfoMode ? 'Client Information' : 'Client Master (Registration & Records)'}</b>
          </div>

          {/* Page Header */}
          <div className="mgmt-header">
            <div className="mgmt-header-left">
              <span className="mgmt-icon-badge client-badge">
                <Users size={20} strokeWidth={2.2} />
              </span>
              <div>
                <div className="mgmt-tag-row">
                  <span className="tag-blue">{isInfoMode ? 'Client Information Module' : 'Client Master Module'}</span>
                  <span className="tag-muted">{clients.length} Registered Clients</span>
                </div>
                <h1 className="mgmt-title">{isInfoMode ? 'Client Information' : 'Client Master Management'}</h1>
                <p className="mgmt-desc">
                  {isInfoMode
                    ? 'Full client profiles, contact directory, linked case records & financial ledger view'
                    : 'Register clients, configure legal categories, inspect case histories & print dockets'}
                </p>
              </div>
            </div>
            <div className="mgmt-header-actions">
              <button className="btn-secondary" onClick={() => navigate('/dashboard')}>
                <ArrowLeft size={14} />
                <span>Dashboard</span>
              </button>
              {isInfoMode ? (
                <button className="btn-primary" onClick={() => navigate('/clients')}>
                  <UserPlus size={14} />
                  <span>Register New Client (Master)</span>
                </button>
              ) : (
                <button
                  className="btn-primary"
                  onClick={() => {
                    handleClear()
                    setTimeout(() => {
                      formPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      nameInputRef.current?.focus()
                    }, 50)
                  }}
                >
                  <UserPlus size={14} />
                  <span>New Client</span>
                </button>
              )}
            </div>
          </div>

          {/* Toast Notification */}
          {toast && (
            <div className={`mgmt-toast toast-${toast.type}`}>
              {toast.type === 'success' && <CheckCircle2 size={16} />}
              {toast.type === 'error' && <AlertCircle size={16} />}
              {toast.type === 'info' && <UserCheck size={16} />}
              <span>{toast.message}</span>
            </div>
          )}

          {/* Accidental Duplicate Alert Banner */}
          {duplicateWarning && (
            <div className="alert-card-warning" style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShieldAlert size={20} color="#d97706" />
                <div>
                  <strong style={{ color: '#92400e', fontSize: '13px' }}>Duplicate Client Warning:</strong>
                  <span style={{ color: '#b45309', fontSize: '13px', marginLeft: '6px' }}>{duplicateWarning.reason}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: '4px 10px', fontSize: '12px' }}
                  onClick={() => handleSelectClient(duplicateWarning.existing)}
                >
                  Load Existing {duplicateWarning.existing.id}
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ padding: '4px 10px', fontSize: '12px', background: '#d97706', borderColor: '#b45309' }}
                  onClick={() => {
                    const saved = saveClient(formData)
                    setSelectedId(saved.id)
                    setDuplicateWarning(null)
                    showToast('success', `Saved client ${saved.id} with duplicate acknowledgment.`)
                  }}
                >
                  Save Anyway (Different Person)
                </button>
              </div>
            </div>
          )}

          {/* Layout: Single-panel for Information, Two-panel for Master */}
          <div className={isInfoMode ? "mgmt-single-panel" : "mgmt-two-panel"}>
            {/* ================= LEFT PANEL: CLIENT FORM (Only in Client Master) ================= */}
            {!isInfoMode && (
              <div className="mgmt-form-panel" ref={formPanelRef}>
              <div className="panel-card-head">
                <div className="pch-title">
                  <span className="pch-dot pch-blue" />
                  <h3>{selectedId ? `Edit Client (${selectedId})` : 'New Client Registration Form'}</h3>
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  {selectedId ? (
                    <>
                      <span className="status-badge editing">Editing {selectedId}</span>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ padding: '3px 8px', fontSize: '11px' }}
                        onClick={handleClear}
                        title="Clear and start new registration"
                      >
                        + New Registration
                      </button>
                    </>
                  ) : (
                    <span className="status-badge creating">New Registration</span>
                  )}
                </div>
              </div>

              {/* Searchable Client Search Facility inside Form */}
              <div style={{ padding: '10px 14px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', position: 'relative' }}>
                <label className="field-lbl" style={{ marginBottom: '4px', fontWeight: '700', color: '#1e293b' }}>
                  Search Registered Client (Load for Editing)
                </label>
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="text"
                    placeholder="Search by Client ID (e.g. CL-1001) or Client Name..."
                    value={formClientSearch}
                    onChange={(e) => {
                      setFormClientSearch(e.target.value)
                      setShowClientDropdown(true)
                    }}
                    onFocus={() => setShowClientDropdown(true)}
                    className="form-input"
                    style={{ paddingLeft: '32px', fontSize: '12px' }}
                  />
                  {formClientSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormClientSearch('')
                        setShowClientDropdown(false)
                      }}
                      style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '14px' }}
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Dropdown Results */}
                {showClientDropdown && formClientSearch.trim() && (
                  <div
                    style={{
                      position: 'absolute',
                      left: '14px',
                      right: '14px',
                      top: '100%',
                      zIndex: 30,
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
                      maxHeight: '220px',
                      overflowY: 'auto',
                      marginTop: '4px',
                    }}
                  >
                    {clients.filter(
                      (c) =>
                        c.id.toLowerCase().includes(formClientSearch.toLowerCase()) ||
                        c.name.toLowerCase().includes(formClientSearch.toLowerCase()) ||
                        (c.phone && c.phone.includes(formClientSearch))
                    ).length === 0 ? (
                      <div style={{ padding: '10px 12px', fontSize: '12px', color: '#64748b' }}>
                        No registered client found for "{formClientSearch}".
                      </div>
                    ) : (
                      clients
                        .filter(
                          (c) =>
                            c.id.toLowerCase().includes(formClientSearch.toLowerCase()) ||
                            c.name.toLowerCase().includes(formClientSearch.toLowerCase()) ||
                            (c.phone && c.phone.includes(formClientSearch))
                        )
                        .map((c) => (
                          <div
                            key={c.id}
                            onClick={() => {
                              handleSelectClient(c)
                              setFormClientSearch('')
                              setShowClientDropdown(false)
                              showToast('info', `Loaded ${c.id} (${c.name}) for editing.`)
                            }}
                            style={{
                              padding: '8px 12px',
                              borderBottom: '1px solid #f1f5f9',
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              fontSize: '12px',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                          >
                            <div>
                              <strong style={{ color: '#0f172a' }}>{c.name}</strong>
                              <span style={{ marginLeft: '8px', color: '#64748b', fontSize: '11px' }}>{c.phone}</span>
                            </div>
                            <span className="id-pill" style={{ background: '#eff6ff', color: '#1d4ed8' }}>{c.id}</span>
                          </div>
                        ))
                    )}
                  </div>
                )}
              </div>

              <form className="mgmt-form" onSubmit={(e) => e.preventDefault()}>
                {/* Row 1: Client ID & Registration Date */}
                <div className="form-row-2">
                  <div className="form-field">
                    <label className="field-lbl">Client ID</label>
                    <input
                      type="text"
                      className="form-input readonly-input"
                      value={selectedId || nextClientId}
                      readOnly
                      tabIndex={-1}
                      style={{ pointerEvents: 'none', background: '#f1f5f9', fontWeight: '700', color: '#1d4ed8' }}
                    />
                  </div>
                  <div className="form-field">
                    <label className="field-lbl">Registration Date <span className="req">*</span></label>
                    <div className="input-with-icon">
                      <Calendar size={14} className="input-ic" />
                      <input
                        type="date"
                        name="date"
                        className={`form-input ${errors.date ? 'input-err' : ''}`}
                        value={formData.date}
                        onChange={handleChange}
                      />
                    </div>
                    {errors.date && <span className="err-msg">{errors.date}</span>}
                  </div>
                </div>

                {/* Row 2: Client Name */}
                <div className="form-field">
                  <label className="field-lbl">Client Full Name <span className="req">*</span></label>
                  <input
                    ref={nameInputRef}
                    type="text"
                    name="name"
                    placeholder="Enter full legal name of client"
                    className={`form-input ${errors.name ? 'input-err' : ''}`}
                    value={formData.name}
                    onChange={handleChange}
                    autoFocus
                  />
                  {errors.name && <span className="err-msg">{errors.name}</span>}
                </div>

                {/* Row 3: S/O or W/O */}
                <div className="form-field">
                  <label className="field-lbl">S/O or W/O (Son of / Wife of / Care of)</label>
                  <input
                    type="text"
                    name="relation"
                    placeholder="e.g. S/O Late Ramesh Sharma or W/O Pradip Adhikari"
                    className="form-input"
                    value={formData.relation}
                    onChange={handleChange}
                  />
                </div>

                {/* ORDER CHANGE REQUIRED: Client Address ABOVE Mobile Number */}
                {/* Residential Address (No "Chamber" wording) */}
                <div className="form-field">
                  <label className="field-lbl">Residential Address</label>
                  <div className="input-with-icon align-top">
                    <MapPin size={14} className="input-ic top-ic" />
                    <textarea
                      name="address"
                      rows={2}
                      placeholder="Village/City, Post Office, Police Station, District, PIN..."
                      className="form-input form-textarea"
                      value={formData.address}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                {/* Mobile Number */}
                <div className="form-field">
                  <label className="field-lbl">Mobile Number <span className="req">*</span></label>
                  <div className="input-with-icon">
                    <Phone size={14} className="input-ic" />
                    <input
                      type="tel"
                      name="phone"
                      placeholder="10-digit mobile no."
                      maxLength={10}
                      className={`form-input ${errors.phone ? 'input-err' : ''}`}
                      value={formData.phone}
                      onChange={handleChange}
                    />
                  </div>
                  {errors.phone && <span className="err-msg">{errors.phone}</span>}
                </div>

                {/* Other Phone Number Section (Multiple with Reference Name) */}
                <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', margin: '4px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.4px', color: '#475569' }}>
                      Other Phone Number
                    </div>
                    <button
                      type="button"
                      onClick={handleAddOtherPhone}
                      className="btn-secondary"
                      style={{ padding: '3px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', background: '#eff6ff', color: '#1d4ed8', borderColor: '#bfdbfe' }}
                    >
                      <Plus size={12} />
                      <span>Add Another Other Phone (+)</span>
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(formData.otherPhones || [{ name: '', phone: '' }]).map((op, idx) => (
                      <div key={idx} style={{ display: 'grid', gridTemplateColumns: (formData.otherPhones || []).length > 1 ? '1fr auto' : '1fr', gap: '8px', alignItems: 'center' }}>
                        <div className="input-with-icon">
                          <Phone size={14} className="input-ic" />
                          <input
                            type="tel"
                            placeholder="Other Phone Number"
                            maxLength={10}
                            className={`form-input ${errors[`otherPhone_${idx}`] ? 'input-err' : ''}`}
                            value={op.phone}
                            onChange={(e) => handleOtherPhoneChange(idx, 'phone', e.target.value)}
                          />
                        </div>
                        {(formData.otherPhones || []).length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveOtherPhone(idx)}
                            className="btn-icon-subtle"
                            style={{ padding: '6px 8px', border: '1px solid #fecaca', background: '#fff1f2', cursor: 'pointer', borderRadius: '4px', color: '#dc2626' }}
                            title="Remove this phone number"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {Object.keys(errors).some(k => k.startsWith('otherPhone_')) && (
                    <span className="err-msg" style={{ display: 'block', marginTop: '4px' }}>
                      Please enter valid 10-digit phone numbers for other phone entries.
                    </span>
                  )}
                </div>

                {/* Other Person's Reference Section: REPOSITIONED ABOVE CLIENT CLASSIFICATION */}
                <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', margin: '4px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.4px', color: '#475569' }}>
                      Other Person's Reference
                    </div>
                    <button
                      type="button"
                      onClick={handleAddOtherRef}
                      className="btn-secondary"
                      style={{ padding: '3px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', background: '#eff6ff', color: '#1d4ed8', borderColor: '#bfdbfe' }}
                    >
                      <Plus size={12} />
                      <span>Add Another Reference Person (+)</span>
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(formData.otherReferences || [{ name: '', phone: '' }]).map((ref, idx) => (
                      <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px', alignItems: 'center' }}>
                        <div>
                          <input
                            type="text"
                            placeholder="Reference Person Name"
                            className="form-input"
                            value={ref.name}
                            onChange={(e) => handleOtherRefChange(idx, 'name', e.target.value)}
                          />
                        </div>
                        <div className="input-with-icon">
                          <Phone size={14} className="input-ic" />
                          <input
                            type="tel"
                            placeholder="Contact Number"
                            maxLength={10}
                            className={`form-input ${errors[`otherRefPhone_${idx}`] ? 'input-err' : ''}`}
                            value={ref.phone}
                            onChange={(e) => handleOtherRefChange(idx, 'phone', e.target.value)}
                          />
                        </div>
                        {(formData.otherReferences || []).length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveOtherRef(idx)}
                            className="btn-icon-subtle"
                            style={{ padding: '6px 8px', border: '1px solid #fecaca', background: '#fff1f2', cursor: 'pointer', borderRadius: '4px', color: '#dc2626' }}
                            title="Remove this reference entry"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {Object.keys(errors).some(k => k.startsWith('otherRefPhone_')) && (
                    <span className="err-msg" style={{ display: 'block', marginTop: '4px' }}>
                      Please enter valid 10-digit phone numbers for reference persons.
                    </span>
                  )}
                </div>

                {/* Action Buttons Row */}
                <div className="mgmt-btn-bar" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                  <button
                    type="button"
                    className="act-btn btn-save"
                    onClick={handleSave}
                    disabled={loading || !!selectedId}
                    title={selectedId ? 'Clear selection to save a new client' : 'Save client permanently'}
                    style={{ flex: 1, height: '36px' }}
                  >
                    <Save size={14} />
                    <span>SAVE</span>
                  </button>

                  <button
                    type="button"
                    className="act-btn btn-update"
                    onClick={handleUpdate}
                    disabled={loading || !selectedId}
                    title={!selectedId ? 'Select a client from the table to update' : 'Update'}
                    aria-label="Update"
                    onMouseEnter={() => setHoveredBtn('update')}
                    onMouseLeave={() => setHoveredBtn(null)}
                    style={{ position: 'relative', width: '38px', height: '36px', padding: 0, flexShrink: 0 }}
                  >
                    <RefreshCw size={15} />
                    {hoveredBtn === 'update' && (
                      <span style={{
                        position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)',
                        background: '#0f172a', color: '#ffffff', fontSize: '10.5px', fontWeight: '600',
                        padding: '3px 8px', borderRadius: '4px', whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 50,
                        boxShadow: '0 4px 8px rgba(0,0,0,0.15)'
                      }}>
                        Update
                      </span>
                    )}
                  </button>

                  {selectedId && (
                    <button
                      type="button"
                      className="act-btn"
                      onClick={() => promptDeleteClient(selectedClient)}
                      disabled={loading}
                      title="Delete"
                      aria-label="Delete"
                      onMouseEnter={() => setHoveredBtn('delete')}
                      onMouseLeave={() => setHoveredBtn(null)}
                      style={{
                        position: 'relative', width: '38px', height: '36px', padding: 0, flexShrink: 0,
                        background: '#fee2e2', color: '#dc2626', borderColor: '#fca5a5'
                      }}
                    >
                      <Trash2 size={15} />
                      {hoveredBtn === 'delete' && (
                        <span style={{
                          position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)',
                          background: '#0f172a', color: '#ffffff', fontSize: '10.5px', fontWeight: '600',
                          padding: '3px 8px', borderRadius: '4px', whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 50,
                          boxShadow: '0 4px 8px rgba(0,0,0,0.15)'
                        }}>
                          Delete
                        </span>
                      )}
                    </button>
                  )}

                  <button
                    type="button"
                    className="act-btn btn-print"
                    onClick={handlePrint}
                    disabled={!selectedId}
                    title="Print"
                    aria-label="Print"
                    onMouseEnter={() => setHoveredBtn('print')}
                    onMouseLeave={() => setHoveredBtn(null)}
                    style={{ position: 'relative', width: '38px', height: '36px', padding: 0, flexShrink: 0 }}
                  >
                    <Printer size={15} />
                    {hoveredBtn === 'print' && (
                      <span style={{
                        position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)',
                        background: '#0f172a', color: '#ffffff', fontSize: '10.5px', fontWeight: '600',
                        padding: '3px 8px', borderRadius: '4px', whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 50,
                        boxShadow: '0 4px 8px rgba(0,0,0,0.15)'
                      }}>
                        Print
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    className="act-btn btn-clear"
                    onClick={handleClear}
                    title="Clear"
                    aria-label="Clear"
                    onMouseEnter={() => setHoveredBtn('clear')}
                    onMouseLeave={() => setHoveredBtn(null)}
                    style={{ position: 'relative', width: '38px', height: '36px', padding: 0, flexShrink: 0 }}
                  >
                    <XCircle size={15} />
                    {hoveredBtn === 'clear' && (
                      <span style={{
                        position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)',
                        background: '#0f172a', color: '#ffffff', fontSize: '10.5px', fontWeight: '600',
                        padding: '3px 8px', borderRadius: '4px', whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 50,
                        boxShadow: '0 4px 8px rgba(0,0,0,0.15)'
                      }}>
                        Clear
                      </span>
                    )}
                  </button>
                </div>
              </form>
            </div>
            )}

            {/* ================= RIGHT PANEL: CLIENT TABLE ================= */}
            <div className="mgmt-table-panel" style={isInfoMode ? { width: '100%' } : {}}>
              <div className="panel-card-head">
                <div className="pch-title">
                  <span className="pch-dot pch-slate" />
                  <h3>{isInfoMode ? 'Client Profiles & Directory' : 'Registered Clients Directory'}</h3>
                </div>
                <span className="panel-count">{filteredClients.length} of {clients.length} Records</span>
              </div>

              {/* Search Bar */}
              <div className="table-search-bar">
                <Search size={14} className="search-ic" />
                <input
                  type="text"
                  placeholder="Search by client ID, name, mobile, extra phone, category or address..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="table-search-input"
                />
                {search && (
                  <button className="clear-search-btn" onClick={() => { setSearch(''); setCurrentPage(1); }}>
                    ×
                  </button>
                )}
              </div>

              {/* Client Interactive Table */}
              <div className="table-scroll-container">
                <table className="mgmt-table">
                  <thead>
                    <tr>
                      <th style={{ width: isInfoMode ? '75px' : '65px', minWidth: isInfoMode ? '75px' : '65px', padding: '6px 8px' }}>CLIENT ID</th>
                      <th style={{ minWidth: isInfoMode ? '160px' : '140px', maxWidth: isInfoMode ? '220px' : '180px', padding: '6px 8px' }}>CLIENT NAME</th>
                      {isInfoMode && (
                        <th style={{ minWidth: '160px', padding: '6px 8px' }}>RESIDENTIAL ADDRESS</th>
                      )}
                      <th style={{ width: isInfoMode ? '140px' : '120px', minWidth: isInfoMode ? '140px' : '120px', maxWidth: isInfoMode ? '160px' : '130px', padding: '6px 8px' }}>PHONE</th>
                      <th style={{ width: isInfoMode ? '85px' : '75px', minWidth: isInfoMode ? '85px' : '75px', textAlign: 'right', padding: '6px 8px' }}>FEES (₹)</th>
                      <th style={{ width: isInfoMode ? '85px' : '65px', minWidth: isInfoMode ? '85px' : '65px', textAlign: 'center', padding: '6px 8px' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClients.length === 0 ? (
                      <tr>
                        <td colSpan={isInfoMode ? 6 : 5} className="empty-table-cell">
                          <AlertCircle size={18} className="empty-ic" />
                          <span>No client records match your search query.</span>
                        </td>
                      </tr>
                    ) : (
                      paginatedClients.map((client) => {
                        const isSelected = client.id === selectedId
                        return (
                          <tr
                            key={client.id}
                            className={`table-row-clickable ${isSelected ? 'row-selected' : ''}`}
                            onClick={() => (isInfoMode ? handleOpenHistory(client) : handleSelectClient(client))}
                            title={isInfoMode ? "Click to view full client history & ledger" : "Click to load client into form"}
                          >
                            <td style={{ width: isInfoMode ? '75px' : '65px', minWidth: isInfoMode ? '75px' : '65px', whiteSpace: 'nowrap' }}>
                              <span className="id-pill client-id">{client.id}</span>
                            </td>
                            <td style={{ minWidth: isInfoMode ? '160px' : '140px', maxWidth: isInfoMode ? '220px' : '180px', overflow: 'hidden' }}>
                              <div className="client-name-cell" title={`${client.name} ${client.relation ? `(${client.relation})` : ''}`}>
                                <strong className="primary-text" style={{ fontSize: '11.5px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {client.name}
                                </strong>
                                <small className="muted-subtext" style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {client.relation || (!isInfoMode ? client.address : '') || '—'}
                                </small>
                              </div>
                            </td>
                            {isInfoMode && (
                              <td style={{ minWidth: '160px', maxWidth: '240px', overflow: 'hidden' }}>
                                <div style={{ fontSize: '11px', color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={client.address || '—'}>
                                  {client.address || '—'}
                                </div>
                              </td>
                            )}
                            <td style={{ width: isInfoMode ? '140px' : '120px', minWidth: isInfoMode ? '140px' : '120px', maxWidth: isInfoMode ? '160px' : '130px', overflow: 'hidden' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.15', maxWidth: '100%', overflow: 'hidden' }}>
                                <span
                                  className="cell-phone"
                                  style={{ fontSize: '11px', fontWeight: '600', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                  title={client.phone}
                                >
                                  {client.phone || '—'}
                                </span>
                                {client.extraPhone ? (
                                  <small
                                    style={{ fontSize: '9.5px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}
                                    title={`Other: ${client.extraPhone}`}
                                  >
                                    Alt: {client.extraPhone}
                                  </small>
                                ) : null}
                              </div>
                            </td>
                            <td style={{ width: isInfoMode ? '85px' : '75px', minWidth: isInfoMode ? '85px' : '75px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                              <span className="cell-fees" style={{ fontSize: '11px', fontWeight: '700' }}>
                                {client.fees ? `₹${Number(client.fees).toLocaleString('en-IN')}` : '—'}
                              </span>
                            </td>
                            <td style={{ width: isInfoMode ? '85px' : '65px', minWidth: isInfoMode ? '85px' : '65px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'inline-flex', gap: '4px', alignItems: 'center', justifyContent: 'center' }} onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  className="btn-icon-subtle"
                                  style={{ padding: '3px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                                  onClick={() => handleOpenHistory(client)}
                                  title="View Cases & Financial History"
                                >
                                  <Eye size={12} color="#2563eb" />
                                  {isInfoMode && <span style={{ fontSize: '10.5px', color: '#2563eb', fontWeight: '600' }}>History</span>}
                                </button>
                                {!isInfoMode && (
                                  <button
                                    type="button"
                                    className="btn-icon-subtle"
                                    style={{ padding: '3px 5px', borderRadius: '4px', border: '1px solid #fecaca', background: '#fff1f2', cursor: 'pointer' }}
                                    onClick={() => promptDeleteClient(client)}
                                    title="Delete Client Record"
                                  >
                                    <Trash2 size={12} color="#dc2626" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <Pagination
                currentPage={currentPage}
                totalItems={filteredClients.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={(newSize) => {
                  setPageSize(newSize)
                  setCurrentPage(1)
                }}
              />

              {/* Table Footer Instructions */}
              <div className="table-foot-hint">
                <span className="hint-highlight">Tip:</span>
                <span>Click any row to load into form. Click the <Eye size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> icon to view case &amp; payment history.</span>
              </div>
            </div>
          </div>

          {/* ================= CLIENT HISTORY MODAL ================= */}
          {historyModalClient && (
            <div className="mgmt-modal-overlay" onClick={() => setHistoryModalClient(null)}>
              <div
                className="mgmt-modal-box"
                style={{
                  maxWidth: '780px',
                  width: '92%',
                  padding: '22px 24px',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '12px',
                  boxShadow: '0 20px 40px rgba(15, 23, 42, 0.22)',
                  maxHeight: '88vh',
                  overflowY: 'auto',
                  background: '#ffffff'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mgmt-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '14px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>
                      Client History: {historyModalClient.client?.name} ({historyModalClient.client?.id})
                    </h3>
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>
                      Phone: {historyModalClient.client?.phone || 'N/A'} · Address: {historyModalClient.client?.address || 'N/A'}
                    </p>
                  </div>
                  <button
                    className="clear-search-btn"
                    onClick={() => setHistoryModalClient(null)}
                    style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', display: 'grid', placeItems: 'center' }}
                  >
                    ✕
                  </button>
                </div>

                {/* Financial Summary */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', margin: '14px 0' }}>
                  <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Total Case Fees</span>
                    <strong style={{ fontSize: '15px', color: '#0f172a' }}>₹{Number(historyModalClient.financials.totalFees).toLocaleString('en-IN')}</strong>
                  </div>
                  <div style={{ background: '#f0fdf4', padding: '10px', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                    <span style={{ fontSize: '11px', color: '#166534', display: 'block' }}>Total Paid</span>
                    <strong style={{ fontSize: '15px', color: '#15803d' }}>₹{Number(historyModalClient.financials.totalPaid).toLocaleString('en-IN')}</strong>
                  </div>
                  <div style={{ background: '#fff1f2', padding: '10px', borderRadius: '6px', border: '1px solid #fecaca' }}>
                    <span style={{ fontSize: '11px', color: '#991b1b', display: 'block' }}>Outstanding Due</span>
                    <strong style={{ fontSize: '15px', color: '#b91c1c' }}>₹{Number(historyModalClient.financials.totalDue).toLocaleString('en-IN')}</strong>
                  </div>
                </div>

                {/* Linked Cases */}
                <h4 style={{ fontSize: '13px', margin: '12px 0 6px', color: '#1e293b' }}>
                  Linked Cases ({historyModalClient.cases.length})
                </h4>
                {historyModalClient.cases.length === 0 ? (
                  <p style={{ fontSize: '12px', color: '#94a3b8' }}>No cases linked yet to this client.</p>
                ) : (
                  <div style={{ maxHeight: '140px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                    <table className="mgmt-table" style={{ fontSize: '12px' }}>
                      <thead>
                        <tr>
                          <th>Case ID</th>
                          <th>Case Number</th>
                          <th>Court</th>
                          <th>Next Date</th>
                          <th>Total</th>
                          <th>Due</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historyModalClient.cases.map((c) => (
                          <tr key={c.id}>
                            <td><b>{c.id}</b></td>
                            <td>{c.caseNumber}</td>
                            <td>{c.courtName}</td>
                            <td>{c.nextDate || '—'}</td>
                            <td>₹{Number(c.totalFees || 0).toLocaleString('en-IN')}</td>
                            <td style={{ color: c.dueAmount > 0 ? '#dc2626' : '#16a34a', fontWeight: '600' }}>
                              ₹{Number(c.dueAmount || 0).toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Payment History */}
                <h4 style={{ fontSize: '13px', margin: '14px 0 6px', color: '#1e293b' }}>
                  Payment Records ({historyModalClient.payments.length})
                </h4>
                {historyModalClient.payments.length === 0 ? (
                  <p style={{ fontSize: '12px', color: '#94a3b8' }}>No payment receipts recorded yet.</p>
                ) : (
                  <div style={{ maxHeight: '140px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                    <table className="mgmt-table" style={{ fontSize: '12px' }}>
                      <thead>
                        <tr>
                          <th>Receipt</th>
                          <th>Date</th>
                          <th>Case ID</th>
                          <th>Mode</th>
                          <th>Amount</th>
                          <th>Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historyModalClient.payments.map((p) => (
                          <tr key={p.id}>
                            <td><b>{p.id}</b></td>
                            <td>{p.paymentDate}</td>
                            <td>{p.caseId}</td>
                            <td>{p.mode}</td>
                            <td style={{ color: '#16a34a', fontWeight: '600' }}>₹{Number(p.amount).toLocaleString('en-IN')}</td>
                            <td>{p.remarks || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <button className="btn-secondary" onClick={() => setHistoryModalClient(null)}>
                    Close History
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================= DELETE CONFIRMATION MODAL ================= */}
          {showDeleteModal && clientToDelete && (
            <div className="mgmt-modal-overlay" onClick={() => setShowDeleteModal(false)}>
              <div
                className="mgmt-modal-box"
                style={{
                  maxWidth: '430px',
                  width: '92%',
                  padding: '22px 24px',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '12px',
                  boxShadow: '0 20px 40px rgba(15, 23, 42, 0.22)',
                  background: '#ffffff'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#fee2e2', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <Trash2 size={18} color="#dc2626" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#991b1b' }}>Delete Client Record?</h3>
                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>This action cannot be undone.</p>
                  </div>
                </div>
                <p style={{ fontSize: '13px', color: '#334155', lineHeight: '1.5', margin: '0 0 18px' }}>
                  Are you sure you want to permanently delete <strong>{clientToDelete.name}</strong> ({clientToDelete.id})? All case linkages will be detached.
                </p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
                  <button className="btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                  <button
                    className="btn-primary"
                    style={{ background: '#dc2626', borderColor: '#b91c1c' }}
                    onClick={confirmDeleteClient}
                  >
                    Confirm Delete
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================= Printable Docket ================= */}
          {selectedClient && (
            <div className="printable-docket" id="printable-client-docket">
              <div className="print-header">
                <div className="print-chambers">
                  <h2>{OFFICE.name}</h2>
                  <p className="print-address">{OFFICE.address}</p>
                  <p className="print-title">CLIENT REGISTRATION DOCKET &amp; PRACTICE RECORD</p>
                </div>
                <div className="print-meta">
                  <div><b>Docket ID:</b> {selectedClient.id}</div>
                  <div><b>Date:</b> {selectedClient.date}</div>
                </div>
              </div>

              <div className="print-divider" />

              <table className="print-table">
                <tbody>
                  <tr>
                    <th>Client Full Name:</th>
                    <td><strong>{selectedClient.name}</strong></td>
                    <th>Client ID:</th>
                    <td><strong>{selectedClient.id}</strong></td>
                  </tr>
                  <tr>
                    <th>S/O or W/O:</th>
                    <td>{selectedClient.relation || '—'}</td>
                    <th>Mobile Phone:</th>
                    <td>
                      {selectedClient.phone || '—'}
                      {Array.isArray(selectedClient.otherPhones) && selectedClient.otherPhones.filter((p) => p && p.phone).length > 0 ? (
                        ` (Other: ${selectedClient.otherPhones.filter((p) => p && p.phone).map((p) => `${p.name ? p.name + ': ' : ''}${p.phone}`).join(', ')})`
                      ) : selectedClient.extraPhone ? (
                        ` (Other: ${selectedClient.extraPhone})`
                      ) : ''}
                    </td>
                  </tr>
                  <tr>
                    <th>Client Category:</th>
                    <td>{selectedClient.clientCategory || 'Civil Litigation'}</td>
                    <th>Legal Role / Position:</th>
                    <td>{selectedClient.casePosition || 'Petitioner'}</td>
                  </tr>
                  <tr>
                    <th>Urgency Level:</th>
                    <td>{selectedClient.urgency || 'Normal'}</td>
                    <th>Fee Agreement:</th>
                    <td>{selectedClient.feeAgreement || 'Lump Sum'}</td>
                  </tr>
                  <tr>
                    <th>Residential Address:</th>
                    <td colSpan={3}>{selectedClient.address || '—'}</td>
                  </tr>
                  <tr>
                    <th>Reference Person:</th>
                    <td>{selectedClient.referenceName || 'Direct Client'}</td>
                    <th>Reference Phone:</th>
                    <td>{selectedClient.referencePhone || '—'}</td>
                  </tr>
                  <tr>
                    <th>Agreed Retainer Fees:</th>
                    <td>₹{Number(selectedClient.fees || 0).toLocaleString('en-IN')}</td>
                    <th>Registration Status:</th>
                    <td>Permanent Record Verified</td>
                  </tr>
                </tbody>
              </table>

              <div className="print-terms">
                <h4>Chambers Record &amp; Authorization Notice:</h4>
                <p>
                  The above particulars have been entered into the advocate office case ledger. All original court documents and briefs are maintained under confidential custody at chambers.
                </p>
              </div>

              <div className="print-signatures">
                <div className="print-sig-box">
                  <div className="sig-line" />
                  <span>Client / Deponent Signature</span>
                </div>
                <div className="print-sig-box right">
                  <div className="sig-line" />
                  <span>Advocate Signature &amp; Seal</span>
                </div>
              </div>
            </div>
          )}
        </main>
      </>
  )
}