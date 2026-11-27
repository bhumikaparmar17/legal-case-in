import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Hourglass, ListPlus, Clock, User, Phone, CheckCircle2,
  AlertCircle, ArrowLeft, ChevronRight, Search, Plus, Trash2, Edit3, Zap, ShieldAlert,
  Megaphone, Flame, X, Volume2
} from 'lucide-react'
import Topbar from '../components/Topbar.jsx'
import { OFFICE } from '../data/menu.js'
import {
  getWaitingList, saveWaitingListEntry, updateWaitingListEntry,
  deleteWaitingListEntry, toggleWaitingListPriority, getClients, onStorageUpdate,
  getAnnouncements, saveAnnouncement, deleteAnnouncement, resetAnnouncements
} from '../services/storageService.js'
import { api } from '../services/api.js'
import './management.css'

export default function WaitingList() {
  const navigate = useNavigate()
  const [list, setList] = useState(() => getWaitingList())
  const [clients, setClients] = useState(() => getClients())
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  // TV Announcements Management State
  const [showNoticeModal, setShowNoticeModal] = useState(false)
  const [announcements, setAnnouncements] = useState(() => getAnnouncements())
  const initialNoticeForm = {
    headline: '',
    text: '',
    tag: 'Chamber Advisory',
    priority: 'Normal',
    date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
  }
  const [noticeForm, setNoticeForm] = useState(initialNoticeForm)

  const initialForm = {
    clientName: '',
    address: '',
    phone: '',
    date: new Date().toISOString().split('T')[0],
    timeSlot: '11:00 AM',
    status: 'Waiting',
    consultancyType: 'Conference',
    notes: '',
  }
  const [formData, setFormData] = useState(initialForm)

  useEffect(() => {
    // 1. Live API fetch on mount -> registers in DevTools Network tab
    api.getWaitingList().then((data) => {
      if (Array.isArray(data)) setList(data)
    }).catch(() => {})

    api.getClients().then((data) => {
      if (Array.isArray(data)) setClients(data)
    }).catch(() => {})

    api.getAnnouncements().then((data) => {
      if (Array.isArray(data)) setAnnouncements(data)
    }).catch(() => {})

    // 2. Storage event listener for reactivity
    return onStorageUpdate(() => {
      setList(getWaitingList())
      setClients(getClients())
      setAnnouncements(getAnnouncements())
    })
  }, [])

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3500)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const showToast = (type, message) => setToast({ type, message })

  const handleAddNotice = (e) => {
    e.preventDefault()
    if (!noticeForm.headline.trim() || !noticeForm.text.trim()) {
      showToast('error', 'Headline and notice message are required.')
      return
    }
    saveAnnouncement(noticeForm)
    setNoticeForm(initialNoticeForm)
    showToast('success', 'Notice published! TV Display updated live.')
  }

  const handleDeleteNotice = (id) => {
    deleteAnnouncement(id)
    showToast('info', 'Notice deleted from TV Display.')
  }

  const handleResetNotices = () => {
    resetAnnouncements()
    showToast('info', 'Reset TV announcements to default.')
  }

  const handleTogglePriority = (id, currentType, clientName) => {
    try {
      const updated = toggleWaitingListPriority(id)
      const isEmerg = updated.consultancyType === 'Emergency'
      showToast(
        'success',
        isEmerg
          ? `⚡ ${clientName} shifted to EMERGENCY CONSULTANCY!`
          : `👥 ${clientName} shifted back to Conference Consultancy.`
      )
    } catch (err) {
      showToast('error', err.message || 'Failed to update priority.')
    }
  }

  const handleClientSelect = (clientId) => {
    const c = clients.find((x) => x.id === clientId)
    if (c) {
      setFormData((p) => ({
        ...p,
        clientName: c.name,
        phone: c.phone || '',
        address: c.address || '',
      }))
    }
  }

  const handleOpenAdd = () => {
    setEditingItem(null)
    setFormData(initialForm)
    setShowModal(true)
  }

  const handleOpenEdit = (item) => {
    setEditingItem(item)
    setFormData({
      clientName: item.clientName || '',
      address: item.address || item.purpose || '',
      phone: item.phone || '',
      date: item.date || '',
      timeSlot: item.timeSlot || '11:00 AM',
      status: item.status || 'Waiting',
      consultancyType: item.consultancyType || 'Conference',
      notes: item.notes || '',
    })
    setShowModal(true)
  }

  const handleSave = (e) => {
    e.preventDefault()
    if (!formData.clientName.trim()) {
      showToast('error', 'Client Name is required.')
      return
    }

    try {
      const payload = {
        ...formData,
        purpose: formData.address, // backward compatibility
      }
      if (editingItem) {
        updateWaitingListEntry(editingItem.id, payload)
        if (payload.status === 'In Consultation') {
          try {
            localStorage.setItem('legalcase_tv_call_event', JSON.stringify({ id: editingItem.id, ts: Date.now() }))
          } catch {}
        }
        showToast('success', `Updated entry for ${formData.clientName}!`)
      } else {
        saveWaitingListEntry(payload)
        showToast('success', `Added ${formData.clientName} to Waiting List!`)
      }
      setShowModal(false)
    } catch (err) {
      showToast('error', err.message || 'Operation failed.')
    }
  }

  const handleDelete = (item) => {
    setDeleteTarget(item)
  }

  const confirmDelete = () => {
    if (!deleteTarget) return
    deleteWaitingListEntry(deleteTarget.id)
    setDeleteTarget(null)
    showToast('info', 'Client removed from queue.')
  }

  const handleStatusChange = (id, newStatus) => {
    updateWaitingListEntry(id, { status: newStatus })
    if (newStatus === 'In Consultation') {
      try {
        localStorage.setItem('legalcase_tv_call_event', JSON.stringify({ id, ts: Date.now() }))
      } catch {}
    }
    showToast('success', `Status updated to ${newStatus}`)
  }

  const filteredList = list.filter((w) => {
    const q = search.toLowerCase()
    return (
      (w.clientName && w.clientName.toLowerCase().includes(q)) ||
      (w.phone && w.phone.includes(q)) ||
      (w.address && w.address.toLowerCase().includes(q)) ||
      (w.purpose && w.purpose.toLowerCase().includes(q)) ||
      (w.status && w.status.toLowerCase().includes(q))
    )
  })

  return (
    <div className="app-shell">
      <div className="app-main">
        <Topbar />

        <main className="dash mgmt-page">
          <div className="crumbs">
            <button className="crumbs-link" onClick={() => navigate('/dashboard')}>
              <ArrowLeft size={13} />
              <span>Dashboard</span>
            </button>
            <ChevronRight size={12} className="crumbs-sep" />
            <span className="crumbs-muted">Chamber Operations</span>
            <ChevronRight size={12} className="crumbs-sep" />
            <b className="crumbs-active">Chamber Waiting List &amp; Queue</b>
          </div>

          <div className="mgmt-header">
            <div className="mgmt-header-left">
              <span className="mgmt-icon-badge" style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }}>
                <Hourglass size={20} strokeWidth={2.2} />
              </span>
              <div>
                <div className="mgmt-tag-row">
                  <span className="tag-muted">Chamber Reception Queue</span>
                  <span className="tag-muted">{list.filter((x) => x.status === 'Waiting').length} In Waiting</span>
                </div>
                <h1 className="mgmt-title">Client Chamber Waiting List</h1>
                <p className="mgmt-desc">Manage daily visitor queue, appointment slots, &amp; consultation progress</p>
              </div>
            </div>
            <div className="mgmt-header-actions">
              <button className="btn-primary" onClick={handleOpenAdd}>
                <Plus size={14} />
                <span>Add to Queue</span>
              </button>
              <button className="btn-secondary" onClick={() => setShowNoticeModal(true)}>
                <Megaphone size={14} />
                <span>Manage Notices</span>
              </button>
              <button className="btn-secondary" onClick={() => navigate('/dashboard')}>
                <ArrowLeft size={14} />
                <span>Dashboard</span>
              </button>
            </div>
          </div>

          {toast && (
            <div className={`mgmt-toast toast-${toast.type}`}>
              {toast.type === 'success' && <CheckCircle2 size={16} />}
              {toast.type === 'error' && <AlertCircle size={16} />}
              <span>{toast.message}</span>
            </div>
          )}

          {/* Search Bar */}
          <div className="panel" style={{ padding: '12px 16px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search waiting client name, mobile, address, or status..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '32px' }}
              />
            </div>
          </div>

          {/* Waiting Table */}
          <div className="panel" style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div className="panel-card-head">
              <div className="pch-title">
                <span className="pch-dot" style={{ background: '#f59e0b' }} />
                <h3>Chamber Consultation Queue</h3>
              </div>
              <span className="panel-count">{filteredList.length} Appointments</span>
            </div>

            <div className="table-scroll-container">
              <table className="mgmt-table">
                <thead>
                  <tr>
                    <th style={{ width: '65px' }}>SL NO.</th>
                    <th>CLIENT NAME</th>
                    <th>ADDRESS</th>
                    <th style={{ width: '130px' }}>MOBILE NUMBER</th>
                    <th style={{ width: '140px' }}>DATE / TIME SLOT</th>
                    <th style={{ width: '160px' }}>CONSULTANCY TYPE</th>
                    <th style={{ width: '130px' }}>STATUS</th>
                    <th style={{ width: '80px', textAlign: 'center' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="empty-table-cell">
                        <CheckCircle2 size={20} color="#16a34a" style={{ margin: '0 auto 6px', display: 'block' }} />
                        <span>No clients currently in the waiting list queue.</span>
                      </td>
                    </tr>
                  ) : (
                    filteredList.map((w, idx) => (
                      <tr key={w.id}>
                        <td>
                          <span className="sl-badge" style={{ fontWeight: '700', color: '#475569', fontSize: '12px' }}>
                            {idx + 1}
                          </span>
                        </td>
                        <td>
                          <strong className="primary-text">{w.clientName}</strong>
                        </td>
                        <td>
                          <span style={{ fontSize: '12px', color: '#334155', whiteSpace: 'pre-line' }}>
                            {w.address || w.purpose || '—'}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '12px', fontWeight: '600', color: '#1e293b' }}>
                            {w.phone || '—'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span className="cell-date">{w.date}</span>
                            <span style={{ fontSize: '11px', fontWeight: '700', color: '#0f172a' }}>{w.timeSlot}</span>
                          </div>
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => handleTogglePriority(w.id, w.consultancyType, w.clientName)}
                            title="Click to shift between Conference and Emergency"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '4px 10px',
                              borderRadius: '20px',
                              fontSize: '11px',
                              fontWeight: '700',
                              cursor: 'pointer',
                              border: w.consultancyType === 'Emergency' ? '1px solid #f87171' : '1px solid #bfdbfe',
                              background: w.consultancyType === 'Emergency' ? '#fef2f2' : '#f0fdf4',
                              color: w.consultancyType === 'Emergency' ? '#dc2626' : '#15803d',
                              boxShadow: w.consultancyType === 'Emergency' ? '0 1px 3px rgba(220, 38, 38, 0.2)' : 'none',
                              transition: 'all 0.2s ease',
                            }}
                          >
                            {w.consultancyType === 'Emergency' ? (
                              <>
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#dc2626', display: 'inline-block' }} />
                                <span>🚨 Emergency</span>
                                <span style={{ fontSize: '9px', background: '#fee2e2', color: '#991b1b', padding: '1px 5px', borderRadius: '8px' }}>Active</span>
                              </>
                            ) : (
                              <>
                                <span>👥 Conference</span>
                                <span style={{ fontSize: '9px', background: '#e0f2fe', color: '#0369a1', padding: '1px 5px', borderRadius: '8px' }}>⚡ Shift</span>
                              </>
                            )}
                          </button>
                        </td>
                        <td>
                          <select
                            value={w.status}
                            onChange={(e) => handleStatusChange(w.id, e.target.value)}
                            style={{
                              fontSize: '11px',
                              fontWeight: '700',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              border: '1px solid #cbd5e1',
                              background: w.status === 'Waiting' ? '#fef3c7' : w.status === 'In Consultation' ? '#eff6ff' : '#dcfce7',
                              color: w.status === 'Waiting' ? '#b45309' : w.status === 'In Consultation' ? '#1d4ed8' : '#15803d',
                            }}
                          >
                            <option value="Waiting">Waiting</option>
                            <option value="In Consultation">In Consultation</option>
                            <option value="Completed">Completed</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', justifyContent: 'center', gap: '4px' }}>
                            {w.status === 'In Consultation' && (
                              <button
                                type="button"
                                className="btn-icon-subtle"
                                style={{ padding: '3px 6px', border: '1px solid #bfdbfe', background: '#eff6ff', cursor: 'pointer' }}
                                onClick={() => {
                                  try {
                                    localStorage.setItem('legalcase_tv_recall', JSON.stringify({ id: String(w.id), ts: Date.now() }))
                                    api.recallWaitingListEntry(w.id).catch(() => {})
                                    showToast('info', `Recall announcement sent to TV for ${w.clientName}`)
                                  } catch {
                                    // ignore
                                  }
                                }}
                                title="Recall / Re-announce on TV Display"
                              >
                                <Volume2 size={12} color="#1d4ed8" />
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn-icon-subtle"
                              style={{ padding: '3px 6px', border: '1px solid #cbd5e1', cursor: 'pointer' }}
                              onClick={() => handleOpenEdit(w)}
                              title="Edit"
                            >
                              <Edit3 size={12} color="#475569" />
                            </button>
                            <button
                              type="button"
                              className="btn-icon-subtle"
                              style={{ padding: '3px 6px', border: '1px solid #fecaca', background: '#fff1f2', cursor: 'pointer' }}
                              onClick={() => handleDelete(w)}
                              title="Remove"
                            >
                              <Trash2 size={12} color="#dc2626" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal */}
          {showModal && (
            <div className="mgmt-modal-overlay" onClick={() => setShowModal(false)}>
              <div
                className="mgmt-modal-box"
                style={{
                  maxWidth: '460px',
                  width: '92%',
                  padding: '22px 24px',
                  background: '#ffffff',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '12px',
                  boxShadow: '0 20px 40px rgba(15, 23, 42, 0.22)',
                  maxHeight: '88vh',
                  overflowY: 'auto',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  className="mgmt-modal-header"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid #e2e8f0',
                    paddingBottom: '12px',
                    marginBottom: '14px',
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>
                    {editingItem ? 'Edit Queue Entry' : 'Add Client to Waiting List'}
                  </h3>
                  <button type="button" className="clear-search-btn" onClick={() => setShowModal(false)} title="Close">✕</button>
                </div>

                <form onSubmit={handleSave}>
                  <div className="form-field" style={{ marginBottom: '10px' }}>
                    <label className="field-lbl">Autofill from Registered Client</label>
                    <select className="form-input form-select" onChange={(e) => handleClientSelect(e.target.value)}>
                      <option value="">-- Optional --</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-field" style={{ marginBottom: '10px' }}>
                    <label className="field-lbl">Client Full Name <span className="req">*</span></label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.clientName}
                      onChange={(e) => setFormData((p) => ({ ...p, clientName: e.target.value }))}
                      required
                      autoFocus
                    />
                  </div>

                  <div className="form-field" style={{ marginBottom: '10px' }}>
                    <label className="field-lbl">Address</label>
                    <textarea
                      rows={2}
                      className="form-input form-textarea"
                      style={{ height: 'auto', padding: '8px 10px' }}
                      value={formData.address}
                      onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))}
                      placeholder="Enter client residential / chamber address..."
                    />
                  </div>

                  <div className="form-row-2" style={{ marginBottom: '10px' }}>
                    <div className="form-field">
                      <label className="field-lbl">Mobile Number</label>
                      <input
                        type="tel"
                        className="form-input"
                        value={formData.phone}
                        onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                        placeholder="e.g. +91 98765 43210"
                      />
                    </div>
                    <div className="form-field">
                      <label className="field-lbl">Date</label>
                      <input
                        type="date"
                        className="form-input"
                        value={formData.date}
                        onChange={(e) => setFormData((p) => ({ ...p, date: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-row-2" style={{ marginBottom: '10px' }}>
                    <div className="form-field">
                      <label className="field-lbl">Time Slot</label>
                      <input
                        type="text"
                        className="form-input"
                        value={formData.timeSlot}
                        onChange={(e) => setFormData((p) => ({ ...p, timeSlot: e.target.value }))}
                        placeholder="e.g. 11:30 AM"
                      />
                    </div>
                    <div className="form-field">
                      <label className="field-lbl">Status</label>
                      <select
                        className="form-input form-select"
                        value={formData.status}
                        onChange={(e) => setFormData((p) => ({ ...p, status: e.target.value }))}
                      >
                        <option value="Waiting">Waiting</option>
                        <option value="In Consultation">In Consultation</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-field" style={{ marginBottom: '14px' }}>
                    <label className="field-lbl">Consultancy Queue Category <span className="req">*</span></label>
                    <select
                      className="form-input form-select"
                      value={formData.consultancyType || 'Conference'}
                      onChange={(e) => setFormData((p) => ({ ...p, consultancyType: e.target.value }))}
                      style={{ fontWeight: '600' }}
                    >
                      <option value="Conference">👥 Conference Consultancy (Default Standard Queue)</option>
                      <option value="Emergency">🚨 Emergency Consultancy (Priority Urgent Queue)</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '14px', marginTop: '6px' }}>
                    <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                    <button type="submit" className="btn-primary" style={{ background: '#f59e0b', borderColor: '#d97706', color: '#0f172a' }}>
                      {editingItem ? 'Update Queue' : 'Add to Queue'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {deleteTarget && (
            <div className="mgmt-modal-overlay" onClick={() => setDeleteTarget(null)}>
              <div
                className="mgmt-modal-box"
                style={{
                  maxWidth: '400px',
                  width: '92%',
                  padding: '22px 24px',
                  background: '#ffffff',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '12px',
                  boxShadow: '0 20px 40px rgba(15, 23, 42, 0.22)',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  className="mgmt-modal-header"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid #e2e8f0',
                    paddingBottom: '10px',
                    marginBottom: '12px',
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#dc2626' }}>
                    Remove Queue Entry?
                  </h3>
                  <button type="button" className="clear-search-btn" onClick={() => setDeleteTarget(null)} title="Close">✕</button>
                </div>
                <p style={{ margin: '0 0 18px', fontSize: '13.5px', color: '#334155', lineHeight: 1.5 }}>
                  Are you sure you want to remove <strong>{deleteTarget.clientName}</strong> from the chamber waiting list?
                </p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                  <button type="button" className="btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ background: '#dc2626', borderColor: '#b91c1c', color: '#ffffff' }}
                    onClick={confirmDelete}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TV Announcements Management Modal */}
          {showNoticeModal && (
            <div className="mgmt-modal-overlay" onClick={() => setShowNoticeModal(false)}>
              <div className="mgmt-modal-box" style={{ maxWidth: '580px', width: '92%' }} onClick={(e) => e.stopPropagation()}>
                <div className="mgmt-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Megaphone size={16} color="#d97706" />
                    <span>Manage TV Announcements &amp; Notices</span>
                  </h3>
                  <button className="clear-search-btn" onClick={() => setShowNoticeModal(false)}>✕</button>
                </div>

                <div style={{ marginTop: '14px', maxHeight: '75vh', overflowY: 'auto' }}>
                  <form onSubmit={handleAddNotice} style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>
                      Publish New Notice to TV Display
                    </div>

                    <div className="form-field" style={{ marginBottom: '8px' }}>
                      <label className="field-lbl">Notice Headline / Title <span className="req">*</span></label>
                      <input
                        type="text"
                        className="form-input"
                        value={noticeForm.headline}
                        onChange={(e) => setNoticeForm((p) => ({ ...p, headline: e.target.value }))}
                        placeholder="e.g. Special Lok Adalat Hearing Notice..."
                        required
                      />
                    </div>

                    <div className="form-field" style={{ marginBottom: '8px' }}>
                      <label className="field-lbl">Detailed Message (Supports Multi-line) <span className="req">*</span></label>
                      <textarea
                        rows={2}
                        className="form-input form-textarea"
                        value={noticeForm.text}
                        onChange={(e) => setNoticeForm((p) => ({ ...p, text: e.target.value }))}
                        placeholder="Enter full notice message for TV display..."
                        required
                      />
                    </div>

                    <div className="form-row-2" style={{ marginBottom: '10px' }}>
                      <div className="form-field">
                        <label className="field-lbl">Notice Priority</label>
                        <select
                          className="form-input form-select"
                          value={noticeForm.priority}
                          onChange={(e) => setNoticeForm((p) => ({ ...p, priority: e.target.value }))}
                        >
                          <option value="Normal">Normal Advisory (7.5s Display)</option>
                          <option value="Urgent">🚨 Urgent Priority (14s + Red Glow)</option>
                        </select>
                      </div>

                      <div className="form-field">
                        <label className="field-lbl">Category Badge</label>
                        <select
                          className="form-input form-select"
                          value={noticeForm.tag}
                          onChange={(e) => setNoticeForm((p) => ({ ...p, tag: e.target.value }))}
                        >
                          <option value="Chamber Advisory">Chamber Advisory</option>
                          <option value="Urgent Court Notice">Urgent Court Notice</option>
                          <option value="Client Guidelines">Client Guidelines</option>
                          <option value="Daily Cause List">Daily Cause List</option>
                          <option value="Court Vacation Notice">Court Vacation Notice</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button type="submit" className="btn-primary" style={{ padding: '6px 14px', fontSize: '12px' }}>
                        <Plus size={13} />
                        <span>Publish to TV</span>
                      </button>
                    </div>
                  </form>

                  {/* Existing Notices List */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>
                        Active Notices on TV ({announcements.length})
                      </span>
                      <button
                        type="button"
                        onClick={handleResetNotices}
                        style={{ background: 'transparent', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '11px', textDecoration: 'underline' }}
                      >
                        Reset Defaults
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {announcements.map((a) => (
                        <div
                          key={a.id}
                          style={{
                            background: '#ffffff',
                            border: a.priority === 'Urgent' ? '1px solid #fca5a5' : '1px solid #e2e8f0',
                            borderLeft: a.priority === 'Urgent' ? '4px solid #ef4444' : '4px solid #f59e0b',
                            borderRadius: '6px',
                            padding: '8px 12px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <div style={{ flex: 1, marginRight: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{
                                fontSize: '10px',
                                fontWeight: '700',
                                padding: '1px 5px',
                                borderRadius: '3px',
                                background: a.priority === 'Urgent' ? '#fee2e2' : '#fef3c7',
                                color: a.priority === 'Urgent' ? '#b91c1c' : '#92400e',
                              }}>
                                {a.priority === 'Urgent' ? 'URGENT' : 'NORMAL'}
                              </span>
                              <strong style={{ fontSize: '13px', color: '#0f172a' }}>{a.headline}</strong>
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '380px' }}>
                              {a.text}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteNotice(a.id)}
                            style={{
                              background: '#fff1f2',
                              border: '1px solid #fecaca',
                              color: '#dc2626',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11px',
                              fontWeight: '600',
                              flexShrink: 0,
                            }}
                            title="Delete Notice"
                          >
                            <Trash2 size={12} />
                            <span>Delete</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
