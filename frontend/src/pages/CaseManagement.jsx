import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Briefcase, FolderPlus, Save, RefreshCw, Printer, XCircle, Search,
  Calendar, Building2, Gavel, ArrowLeft, CheckCircle2,
  AlertCircle, ChevronRight, Hash, Phone, User, Trash2, Eye,
  Download, Upload, FileSpreadsheet, MapPin, Scale, Check, Layers
} from 'lucide-react'
import Pagination from '../components/Pagination.jsx'
import { OFFICE } from '../data/menu.js'
import {
  getClients, getCases, saveCase, updateCase, deleteCase, saveBulkCases,
  getPaymentsByCaseId, onStorageUpdate
} from '../services/storageService.js'
import { api } from '../services/api.js'
import './management.css'

export default function CaseManagement() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const formPanelRef = useRef(null)
  const caseNoInputRef = useRef(null)
  const [hoveredBtn, setHoveredBtn] = useState(null)

  const [clients, setClients] = useState(() => getClients())
  const [cases, setCases] = useState(() => getCases())
  const [selectedCaseId, setSelectedCaseId] = useState(null)
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [clientSearchQuery, setClientSearchQuery] = useState('')
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  const [toast, setToast] = useState(null)
  const [loading, setLoading] = useState(false)

  // Modals
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [caseToDelete, setCaseToDelete] = useState(null)
  const [viewModalCase, setViewModalCase] = useState(null)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importPreviewList, setImportPreviewList] = useState([])
  const [importing, setImporting] = useState(false)

  // Initial Form State - Matched strictly with CaseMaster & CaseNext in db/schema.sql
  const getInitialForm = () => {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    return {
      clientId: '',
      clientName: '',
      phone: '',
      caseNumber: '',
      courtName: '',
      vsName: '',
      underSection: '',
      purpose: 'Bail / Scrutiny',
      nextDate: d.toISOString().split('T')[0],
      psCaseNumber: '',
      psCaseDate: '',
      startDate: new Date().toISOString().split('T')[0],
      rackNo: '',
      roomNo: '',
      ppName: '',
      lc: '',
      advocateName: 'ANUPAM MAITY (ADVOCATE)',
      notes: '',
    }
  }

  const [formData, setFormData] = useState(getInitialForm)
  const [errors, setErrors] = useState({})

  // Live API fetch on mount & subscribe to storage updates
  useEffect(() => {
    api.getCases().then((data) => {
      if (Array.isArray(data)) setCases(data)
    }).catch(() => {})

    api.getClients().then((data) => {
      if (Array.isArray(data)) setClients(data)
    }).catch(() => {})

    return onStorageUpdate(() => {
      setClients(getClients())
      setCases(getCases())
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

  // Handle regular input changes
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }))
    }
  }

  // Validation
  const validateForm = () => {
    const errs = {}
    if (!formData.caseNumber || !formData.caseNumber.trim()) {
      errs.caseNumber = 'Case Number is required'
    }
    if (!formData.courtName || !formData.courtName.trim()) {
      errs.courtName = 'Court Name is required'
    }
    if (!formData.nextDate) {
      errs.nextDate = 'Next hearing date is required'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  // Select a case from the table for editing
  const handleSelectCase = (cs) => {
    setSelectedCaseId(cs.id)
    setFormData({
      clientId: cs.clientId || '',
      clientName: cs.clientName || '',
      phone: cs.phone || '',
      caseNumber: cs.caseNumber || cs.caseNo || '',
      courtName: cs.courtName || '',
      vsName: cs.vsName || cs.versusName || '',
      underSection: cs.underSection || cs.us || '',
      purpose: cs.purpose || cs.caseFor || cs.for || '',
      nextDate: cs.nextDate || '',
      psCaseNumber: cs.psCaseNumber || cs.psCaseNo || '',
      psCaseDate: cs.psCaseDate || '',
      startDate: cs.startDate || '',
      rackNo: cs.rackNo || '',
      roomNo: cs.roomNo || '',
      ppName: cs.ppName || '',
      lc: cs.lc || cs.lcName || '',
      advocateName: cs.advocateName || cs.adAdvName || 'ANUPAM MAITY (ADVOCATE)',
      notes: cs.notes || cs.caseDetails || '',
    })
    setErrors({})
    showToast('info', `Selected Case: ${cs.caseNumber || cs.caseNo || cs.id}`)
  }

  // Clear form
  const handleClear = () => {
    setSelectedCaseId(null)
    setFormData(getInitialForm())
    setClientSearchQuery('')
    setShowClientDropdown(false)
    setErrors({})
  }

  // Save new case
  const handleSave = (e) => {
    if (e) e.preventDefault()
    if (!validateForm()) {
      showToast('error', 'Please fill required fields (Case Number, Court, Next Date).')
      return
    }

    setLoading(true)
    setTimeout(() => {
      try {
        const payload = {
          ...formData,
          caseNo: formData.caseNumber,
          psCaseNo: formData.psCaseNumber,
          psCaseDate: formData.psCaseDate,
          us: formData.underSection,
          for: formData.purpose,
          versusName: formData.vsName,
          adAdvName: formData.advocateName,
          lcName: formData.lc,
          caseDetails: formData.notes,
        }
        const saved = saveCase(payload)
        setSelectedCaseId(saved.id)
        showToast('success', `Case ${saved.caseNumber || saved.caseNo} registered successfully!`)
      } catch (err) {
        showToast('error', err.message || 'Failed to save case.')
      } finally {
        setLoading(false)
      }
    }, 120)
  }

  // Update existing case
  const handleUpdate = (e) => {
    if (e) e.preventDefault()
    if (!selectedCaseId) {
      showToast('error', 'Please select a case from the table to update.')
      return
    }
    if (!validateForm()) {
      showToast('error', 'Please fill required fields.')
      return
    }

    setLoading(true)
    setTimeout(() => {
      try {
        const payload = {
          ...formData,
          caseNo: formData.caseNumber,
          psCaseNo: formData.psCaseNumber,
          psCaseDate: formData.psCaseDate,
          us: formData.underSection,
          for: formData.purpose,
          versusName: formData.vsName,
          adAdvName: formData.advocateName,
          lcName: formData.lc,
          caseDetails: formData.notes,
        }
        const updated = updateCase(selectedCaseId, payload)
        showToast('success', `Case ${updated.id} (${updated.caseNumber || updated.caseNo}) updated successfully!`)
      } catch (err) {
        showToast('error', err.message || 'Failed to update case.')
      } finally {
        setLoading(false)
      }
    }, 120)
  }

  // Delete Case
  const promptDeleteCase = (cs) => {
    setCaseToDelete(cs)
    setShowDeleteModal(true)
  }

  const confirmDeleteCase = () => {
    if (!caseToDelete) return
    try {
      deleteCase(caseToDelete.id)
      if (selectedCaseId === caseToDelete.id) {
        handleClear()
      }
      showToast('success', `Case ${caseToDelete.id} (${caseToDelete.caseNumber || caseToDelete.caseNo}) deleted.`)
    } catch (err) {
      showToast('error', err.message || 'Failed to delete case.')
    } finally {
      setShowDeleteModal(false)
      setCaseToDelete(null)
    }
  }

  // Open Full Case Details Modal
  const handleViewCaseDetails = (cs) => {
    const payments = getPaymentsByCaseId(cs.id)
    setViewModalCase({ ...cs, payments })
  }

  // Print Case Docket
  const handlePrint = () => {
    if (!selectedCaseId) {
      showToast('error', 'Please select a case to print its docket.')
      return
    }
    window.print()
  }

  // =====================================================================
  // EXPORT CASES AS PDF TABLE (ONLY TABLE & DATA)
  // =====================================================================
  const handleExportPDF = () => {
    const listToExport = filteredCases.length > 0 ? filteredCases : cases
    if (listToExport.length === 0) {
      showToast('error', 'No cases to export. Database is empty.')
      return
    }

    const esc = (v) => String(v ?? '—')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

    const rowsHtml = listToExport.map((cs) => `
      <tr>
        <td>${esc(cs.id)}</td>
        <td><strong>${esc(cs.caseNumber || cs.caseNo)}</strong></td>
        <td>${esc(cs.courtName)}</td>
        <td>${esc(cs.clientName || 'Unassigned')}</td>
        <td>${esc(cs.vsName || cs.versusName)}</td>
        <td>${esc(cs.underSection || cs.us)}</td>
        <td>${esc(cs.purpose || cs.caseFor || cs.for)}</td>
        <td>${esc(cs.nextDate)}</td>
        <td>${cs.rackNo || cs.roomNo ? `R:${esc(cs.rackNo || '-')} Rm:${esc(cs.roomNo || '-')}` : '—'}</td>
      </tr>
    `).join('')

    const printWindow = window.open('', '_blank', 'width=1050,height=750')
    if (!printWindow) {
      showToast('error', 'Popup blocked. Please allow popups to export PDF.')
      return
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Case Master Export (${listToExport.length} Records)</title>
          <style>
            @page { size: landscape; margin: 10mm; }
            body { font-family: Arial, sans-serif; margin: 0; padding: 10px; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; vertical-align: top; }
            th { background: #f1f5f9; font-weight: 700; text-transform: uppercase; font-size: 10px; }
            tr:nth-child(even) td { background: #f8fafc; }
          </style>
        </head>
        <body>
          <table>
            <thead>
              <tr>
                <th>Case ID</th>
                <th>Case Number</th>
                <th>Court Name</th>
                <th>Client Name</th>
                <th>Opposite Party (Versus)</th>
                <th>Under Section</th>
                <th>Stage / For</th>
                <th>Next Date</th>
                <th>Location</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
    showToast('success', `Prepared PDF table for ${listToExport.length} cases!`)
  }

  // =====================================================================
  // DOWNLOAD SAMPLE CSV TEMPLATE FOR BULK IMPORT
  // =====================================================================
  const handleDownloadTemplate = () => {
    const headers = [
      'Case Number',
      'Client Name',
      'Court Name',
      'Versus Party',
      'Under Section',
      'Purpose',
      'Next Hearing Date',
      'PS Case Number',
      'Start Date',
      'Rack No',
      'Room No',
      'PP Name',
      'LC Name',
      'Advocate Name',
      'Remarks'
    ]
    const sampleRow = [
      'GR - 175/26',
      'Rajesh Sharma',
      'ACJM Court Contai',
      'State of WB',
      '420/406 IPC',
      'Bail Scrutiny',
      '2026-12-15',
      'Contai PS 42/26',
      '2026-11-20',
      'Rack-04',
      'Room-02',
      'S. K. Mondal',
      'B. Patra',
      'ANUPAM MAITY (ADVOCATE)',
      'Regular appearance required'
    ]

    const csvContent = '\uFEFF' + [headers.join(','), sampleRow.join(',')].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'LegalCase_Bulk_Case_Template.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // =====================================================================
  // PARSE & PREVIEW UPLOADED BULK FILE (CSV / JSON)
  // =====================================================================
  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const text = evt.target.result
        let parsed = []

        if (file.name.endsWith('.json')) {
          const json = JSON.parse(text)
          parsed = Array.isArray(json) ? json : [json]
        } else {
          const lines = text.split(/\r\n|\n/).filter((l) => l.trim().length > 0)
          if (lines.length < 2) {
            showToast('error', 'CSV file must contain a header row and data rows.')
            return
          }

          const parseCsvLine = (line) => {
            const result = []
            let curr = ''
            let inQuotes = false
            for (let i = 0; i < line.length; i++) {
              const char = line[i]
              if (char === '"' && line[i + 1] === '"') {
                curr += '"'
                i++
              } else if (char === '"') {
                inQuotes = !inQuotes
              } else if (char === ',' && !inQuotes) {
                result.push(curr.trim())
                curr = ''
              } else {
                curr += char
              }
            }
            result.push(curr.trim())
            return result
          }

          const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''))

          for (let i = 1; i < lines.length; i++) {
            const cols = parseCsvLine(lines[i])
            if (cols.length === 0 || cols.every((c) => !c)) continue

            const row = {}
            headers.forEach((h, idx) => {
              row[h] = cols[idx] || ''
            })

            const caseNumber = row['casenumber'] || row['caseno'] || row['case'] || ''
            if (!caseNumber) continue

            const clientName = row['clientname'] || row['client'] || row['partyname'] || 'Chamber Client'
            const courtName = row['courtname'] || row['court'] || 'ACJM Court'
            const vsName = row['versusparty'] || row['versusname'] || row['versus'] || row['vs'] || ''
            const underSection = row['undersection'] || row['section'] || row['us'] || ''
            const purpose = row['purposestage'] || row['purpose'] || row['for'] || 'Bail Scrutiny'
            const nextDate = row['nexthearingdate'] || row['nextdate'] || ''
            const psCaseNumber = row['pscasenumber'] || row['pscaseno'] || row['ps'] || ''
            const startDate = row['startdate'] || row['filingdate'] || new Date().toISOString().split('T')[0]
            const rackNo = row['chamberrackno'] || row['rackno'] || row['rack'] || ''
            const roomNo = row['chamberroomno'] || row['roomno'] || row['room'] || ''
            const ppName = row['publicprosecutor'] || row['ppname'] || row['pp'] || ''
            const lc = row['legalcounsellc'] || row['lcname'] || row['lc'] || ''
            const advocateName = row['appearingadvocate'] || row['advocatename'] || 'ANUPAM MAITY (ADVOCATE)'
            const notes = row['casedetailsnotes'] || row['casedetails'] || row['notes'] || row['remarks'] || ''

            parsed.push({
              caseNumber,
              caseNo: caseNumber,
              clientName,
              courtName,
              vsName,
              versusName: vsName,
              underSection,
              us: underSection,
              purpose,
              caseFor: purpose,
              for: purpose,
              nextDate,
              psCaseNumber,
              psCaseNo: psCaseNumber,
              startDate,
              rackNo,
              roomNo,
              ppName,
              lc,
              lcName: lc,
              advocateName,
              adAdvName: advocateName,
              notes,
              caseDetails: notes,
            })
          }
        }

        if (parsed.length === 0) {
          showToast('error', 'No valid case records found in the uploaded file.')
          return
        }

        setImportPreviewList(parsed)
      } catch (err) {
        showToast('error', 'Failed to read file: ' + err.message)
      }
    }
    reader.readAsText(file)
  }

  // Execute bulk import
  const handleExecuteImport = async () => {
    if (!importPreviewList || importPreviewList.length === 0) return
    setImporting(true)
    try {
      saveBulkCases(importPreviewList)
      showToast('success', `Successfully imported ${importPreviewList.length} cases in bulk!`)
      setShowImportModal(false)
      setImportPreviewList([])
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      showToast('error', 'Bulk import failed: ' + err.message)
    } finally {
      setImporting(false)
    }
  }

  // Filter cases for table search
  const filteredCases = cases.filter((cs) => {
    const q = search.toLowerCase()
    return (
      !q ||
      String(cs.id || '').toLowerCase().includes(q) ||
      String(cs.caseNumber || cs.caseNo || '').toLowerCase().includes(q) ||
      String(cs.clientName || '').toLowerCase().includes(q) ||
      String(cs.courtName || '').toLowerCase().includes(q) ||
      String(cs.vsName || cs.versusName || '').toLowerCase().includes(q) ||
      String(cs.underSection || cs.us || '').toLowerCase().includes(q) ||
      String(cs.purpose || cs.caseFor || cs.for || '').toLowerCase().includes(q) ||
      String(cs.rackNo || '').toLowerCase().includes(q) ||
      String(cs.roomNo || '').toLowerCase().includes(q)
    )
  })

  const selectedCase = cases.find((c) => c.id === selectedCaseId)

  const paginatedCases = useMemo(() => {
    return filteredCases.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  }, [filteredCases, currentPage, pageSize])

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
            <span className="crumbs-muted">Case Operations</span>
            <ChevronRight size={12} className="crumbs-sep" />
            <b className="crumbs-active">Case Master Management</b>
          </div>

          {/* Header Bar */}
          <div className="mgmt-header">
            <div className="mgmt-header-left">
              <span className="mgmt-icon-badge case-badge">
                <Briefcase size={20} strokeWidth={2.2} />
              </span>
              <div>
                <div className="mgmt-tag-row">
                  <span className="tag-blue">Case Master Module</span>
                  <span className="tag-muted">{cases.length} Registered Cases</span>
                </div>
                <h1 className="mgmt-title">Case Master Management</h1>
                <p className="mgmt-desc">Register court cases, track hearing dates, police stations &amp; manage bulk imports</p>
              </div>
            </div>

            {/* Header Actions: Dashboard, Export, Import, and New Case Registration */}
            <div className="mgmt-header-actions">
              <button className="btn-secondary" onClick={() => navigate('/dashboard')} title="Back to dashboard">
                <ArrowLeft size={14} />
                <span>Dashboard</span>
              </button>

              <button className="btn-secondary btn-export" onClick={handleExportPDF} title="Export cases table to PDF">
                <Download size={14} />
                <span>Export</span>
              </button>

              <button className="btn-secondary btn-import" onClick={() => setShowImportModal(true)} title="Bulk import cases from CSV/Excel">
                <Upload size={14} />
                <span>Import Cases</span>
              </button>

              <button
                className="btn-primary"
                onClick={() => {
                  handleClear()
                  setTimeout(() => {
                    formPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    caseNoInputRef.current?.focus()
                  }, 50)
                }}
                title="Register new case"
              >
                <FolderPlus size={14} />
                <span>New Case</span>
              </button>
            </div>
          </div>

          {/* Toast Notification */}
          {toast && (
            <div className={`mgmt-toast toast-${toast.type}`}>
              {toast.type === 'success' && <CheckCircle2 size={16} />}
              {toast.type === 'error' && <AlertCircle size={16} />}
              {toast.type === 'info' && <CheckCircle2 size={16} />}
              <span>{toast.message}</span>
            </div>
          )}

          {/* Two-Panel Layout */}
          <div className="mgmt-two-panel">
            {/* ================= LEFT SIDE: STREAMLINED CASE FORM ================= */}
            <div className="mgmt-form-panel" ref={formPanelRef}>
              <div className="panel-card-head">
                <div className="pch-title">
                  <span className="pch-dot pch-violet" />
                  <h3>{selectedCaseId ? `Edit Case (${selectedCaseId} — ${formData.caseNumber || ''})` : 'New Case Registration'}</h3>
                </div>
                {selectedCaseId ? (
                  <span className="status-badge editing">Editing Case</span>
                ) : (
                  <span className="status-badge creating">Unique Case ID Auto-Generated</span>
                )}
              </div>

              <form className="mgmt-form" onSubmit={(e) => e.preventDefault()} style={{ gap: '12px', padding: '16px' }}>
                <div className="form-row-2">
                  <div className="form-field">
                    <label className="field-lbl" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', minHeight: '18px', whiteSpace: 'nowrap' }}>
                      Case Number <span className="req" style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <div className="input-with-icon">
                      <Hash size={13} className="input-ic" />
                      <input
                        ref={caseNoInputRef}
                        type="text"
                        name="caseNumber"
                        placeholder="e.g. GR - 175/14 or CR/342/26"
                        className={`form-input ${errors.caseNumber ? 'input-err' : ''}`}
                        value={formData.caseNumber}
                        onChange={handleChange}
                      />
                    </div>
                    {errors.caseNumber && <span className="err-msg">{errors.caseNumber}</span>}
                  </div>

                  <div className="form-field">
                    <label className="field-lbl" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', minHeight: '18px', whiteSpace: 'nowrap' }}>
                      Court Name <span className="req" style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <div className="input-with-icon">
                      <Building2 size={13} className="input-ic" />
                      <input
                        type="text"
                        name="courtName"
                        placeholder="e.g. III - JM, ACJM Contai"
                        className={`form-input ${errors.courtName ? 'input-err' : ''}`}
                        value={formData.courtName}
                        onChange={handleChange}
                      />
                    </div>
                    {errors.courtName && <span className="err-msg">{errors.courtName}</span>}
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-field" style={{ position: 'relative' }}>
                    <label className="field-lbl" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', minHeight: '18px', whiteSpace: 'nowrap' }}>
                      Registered Client
                      {formData.clientId && <span style={{ marginLeft: '4px', color: '#1d4ed8', fontWeight: '700' }}>({formData.clientId})</span>}
                    </label>
                    <div className="input-with-icon" style={{ position: 'relative' }}>
                      <User size={13} className="input-ic" />
                      <input
                        type="text"
                        placeholder="Search Client ID or Name..."
                        value={clientSearchQuery || (formData.clientId ? `${formData.clientId} — ${formData.clientName}` : formData.clientName)}
                        onChange={(e) => {
                          setClientSearchQuery(e.target.value)
                          setShowClientDropdown(true)
                        }}
                        onFocus={() => setShowClientDropdown(true)}
                        className="form-input"
                        style={{ paddingRight: (clientSearchQuery || formData.clientId) ? '24px' : '9px' }}
                      />
                      {(clientSearchQuery || formData.clientId) && (
                        <button
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({ ...prev, clientId: '', clientName: '', phone: '' }))
                            setClientSearchQuery('')
                            setShowClientDropdown(false)
                          }}
                          style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '13px' }}
                          title="Clear client selection"
                        >✕</button>
                      )}
                    </div>
                    {showClientDropdown && (
                      <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', zIndex: 40, background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', boxShadow: '0 8px 16px rgba(0,0,0,0.1)', maxHeight: '180px', overflowY: 'auto', marginTop: '2px' }}>
                        {clients.filter((c) => {
                          const q = (clientSearchQuery || '').toLowerCase()
                          return !q || c.id.toLowerCase().includes(q) || c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q))
                        }).length === 0 ? (
                          <div style={{ padding: '8px 12px', fontSize: '12px', color: '#94a3b8' }}>No matching clients found</div>
                        ) : (
                          clients.filter((c) => {
                            const q = (clientSearchQuery || '').toLowerCase()
                            return !q || c.id.toLowerCase().includes(q) || c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q))
                          }).slice(0, 10).map((c) => (
                            <div
                              key={c.id}
                              onClick={() => {
                                setFormData((prev) => ({ ...prev, clientId: c.id, clientName: c.name, phone: c.phone || '' }))
                                setClientSearchQuery(`${c.id} — ${c.name}`)
                                setShowClientDropdown(false)
                              }}
                              style={{ padding: '6px 10px', fontSize: '12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                            >
                              <div style={{ fontWeight: '600', color: '#1e293b' }}>{c.name} <span style={{ color: '#2563eb', fontSize: '11px' }}>({c.id})</span></div>
                              {c.phone && <div style={{ fontSize: '11px', color: '#64748b' }}>Ph: {c.phone}</div>}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  <div className="form-field">
                    <label className="field-lbl" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', minHeight: '18px', whiteSpace: 'nowrap' }}>
                      Opposite Party (Versus)
                    </label>
                    <div className="input-with-icon">
                      <User size={13} className="input-ic" />
                      <input
                        type="text"
                        name="vsName"
                        placeholder="e.g. State of West Bengal / Bimal Roy"
                        className="form-input"
                        value={formData.vsName}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-field">
                    <label className="field-lbl" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', minHeight: '18px', whiteSpace: 'nowrap' }}>
                      Under Section (U/S)
                    </label>
                    <div className="input-with-icon">
                      <Scale size={13} className="input-ic" />
                      <input
                        type="text"
                        name="underSection"
                        placeholder="e.g. 302/34 IPC or 138 NI Act"
                        className="form-input"
                        value={formData.underSection}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  <div className="form-field">
                    <label className="field-lbl" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', minHeight: '18px', whiteSpace: 'nowrap' }}>
                      Hearing Stage / Purpose <span className="req" style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <div className="input-with-icon">
                      <Gavel size={13} className="input-ic" />
                      <input
                        type="text"
                        name="purpose"
                        placeholder="e.g. Bail, Scrutiny, Argument"
                        className="form-input"
                        value={formData.purpose}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-field">
                    <label className="field-lbl" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', minHeight: '18px', whiteSpace: 'nowrap' }}>
                      Next Hearing Date <span className="req" style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="date"
                      name="nextDate"
                      className={`form-input ${errors.nextDate ? 'input-err' : ''}`}
                      value={formData.nextDate}
                      onChange={handleChange}
                    />
                    {errors.nextDate && <span className="err-msg">{errors.nextDate}</span>}
                  </div>

                  <div className="form-field">
                    <label className="field-lbl" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', minHeight: '18px', whiteSpace: 'nowrap' }}>
                      Case Filing Date
                    </label>
                    <input
                      type="date"
                      name="startDate"
                      className="form-input"
                      value={formData.startDate}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label className="field-lbl" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', minHeight: '18px', whiteSpace: 'nowrap' }}>
                    Police Station &amp; PS Case No.
                  </label>
                  <div className="input-with-icon">
                    <MapPin size={13} className="input-ic" />
                    <input
                      type="text"
                      name="psCaseNumber"
                      placeholder="e.g. CONTAI PS - 42/14"
                      className="form-input"
                      value={formData.psCaseNumber}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-field">
                    <label className="field-lbl" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', minHeight: '18px', whiteSpace: 'nowrap' }}>
                      Chamber Rack No.
                    </label>
                    <input
                      type="text"
                      name="rackNo"
                      placeholder="e.g. R-1"
                      className="form-input"
                      value={formData.rackNo}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="form-field">
                    <label className="field-lbl" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', minHeight: '18px', whiteSpace: 'nowrap' }}>
                      Chamber Room No.
                    </label>
                    <input
                      type="text"
                      name="roomNo"
                      placeholder="e.g. Rm-2"
                      className="form-input"
                      value={formData.roomNo}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                {/* Action Buttons Row */}
                <div
                  className="mgmt-btn-bar"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginTop: '6px'
                  }}
                >
                  <button
                    type="button"
                    className="act-btn btn-save"
                    onClick={handleSave}
                    disabled={loading || !!selectedCaseId}
                    title={selectedCaseId ? 'Clear selection to create a new case' : 'Save case'}
                    style={{ flex: 1, height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                  >
                    <Save size={14} />
                    <span>SAVE</span>
                  </button>

                  <button
                    type="button"
                    className="act-btn btn-update"
                    onClick={handleUpdate}
                    disabled={loading || !selectedCaseId}
                    title={!selectedCaseId ? 'Select a case from the table to update' : 'Update'}
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

                  {selectedCaseId && (
                    <button
                      type="button"
                      className="act-btn"
                      onClick={() => promptDeleteCase(selectedCase)}
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
                    disabled={!selectedCaseId}
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

            {/* ================= RIGHT SIDE: CASE TABLE ================= */}
            <div className="mgmt-table-panel">
              <div className="panel-card-head">
                <div className="pch-title">
                  <span className="pch-dot pch-violet" />
                  <h3>Hearing Cause List &amp; Case Registry</h3>
                </div>
                <span className="panel-count">{filteredCases.length} of {cases.length} Records</span>
              </div>

              {/* Search Bar */}
              <div className="table-search-bar">
                <Search size={14} className="search-ic" />
                <input
                  type="text"
                  placeholder="Search by case no, client name, court, versus, U/S, purpose, rack..."
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

              {/* Case Table */}
              <div className="table-scroll-container">
                <table className="mgmt-table">
                  <thead>
                    <tr>
                      <th style={{ width: '80px' }}>CASE ID</th>
                      <th>CASE NUMBER &amp; COURT</th>
                      <th>CLIENT NAME</th>
                      <th>VERSUS &amp; U/S</th>
                      <th style={{ width: '120px' }}>STAGE / FOR</th>
                      <th style={{ width: '110px' }}>NEXT DATE</th>
                      <th style={{ width: '90px' }}>LOCATION</th>
                      <th style={{ width: '75px' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCases.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="empty-table-cell">
                          <AlertCircle size={18} className="empty-ic" />
                          <span>No case records found. Click "+ New Case Registration" or "Import Cases" to add records.</span>
                        </td>
                      </tr>
                    ) : (
                      paginatedCases.map((cs) => {
                        const isSelected = cs.id === selectedCaseId
                        return (
                          <tr
                            key={cs.id}
                            className={`table-row-clickable ${isSelected ? 'row-selected' : ''}`}
                            onClick={() => handleSelectCase(cs)}
                            title="Click to load case into form"
                          >
                            <td>
                              <span className="id-pill" style={{ background: '#ede9fe', color: '#6d28d9' }}>
                                {cs.id}
                              </span>
                            </td>
                            <td>
                              <div style={{ fontWeight: '700', color: '#0f172a' }}>{cs.caseNumber || cs.caseNo || 'No Case No'}</div>
                              <div style={{ fontSize: '11px', color: '#64748b' }}>{cs.courtName || 'Court unassigned'}</div>
                            </td>
                            <td>
                              <div style={{ fontWeight: '600' }}>{cs.clientName || 'Unassigned'}</div>
                              {cs.phone && <div style={{ fontSize: '11px', color: '#64748b' }}>{cs.phone}</div>}
                            </td>
                            <td>
                              <div style={{ fontSize: '12px', color: '#1e293b' }}>{cs.vsName || cs.versusName || '—'}</div>
                              {cs.underSection && (
                                <span style={{ fontSize: '11px', background: '#fef3c7', color: '#b45309', padding: '1px 5px', borderRadius: '4px' }}>
                                  U/S {cs.underSection || cs.us}
                                </span>
                              )}
                            </td>
                            <td>
                              <span className="case-purpose-badge" style={{ background: '#eff6ff', color: '#1d4ed8' }}>
                                {cs.purpose || cs.caseFor || cs.for || 'General'}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontWeight: '600', color: cs.nextDate ? '#0f172a' : '#94a3b8' }}>
                                {cs.nextDate || 'Not set'}
                              </span>
                            </td>
                            <td>
                              <div style={{ fontSize: '11px', color: '#475569' }}>
                                {cs.rackNo ? `R: ${cs.rackNo}` : ''} {cs.roomNo ? `Rm: ${cs.roomNo}` : ''}
                                {!cs.rackNo && !cs.roomNo ? '—' : ''}
                              </div>
                            </td>
                            <td onClick={(e) => e.stopPropagation()}>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button
                                  type="button"
                                  className="row-action-btn"
                                  onClick={() => handleViewCaseDetails(cs)}
                                  title="View full case docket"
                                >
                                  <Eye size={13} />
                                </button>
                                <button
                                  type="button"
                                  className="row-action-btn delete-btn"
                                  onClick={() => promptDeleteCase(cs)}
                                  title="Delete case"
                                >
                                  <Trash2 size={13} />
                                </button>
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
                totalItems={filteredCases.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={(newSize) => {
                  setPageSize(newSize)
                  setCurrentPage(1)
                }}
              />
            </div>
          </div>

          {/* ================= BULK IMPORT MODAL ================= */}
          {showImportModal && (
            <div className="mgmt-modal-overlay" onClick={() => setShowImportModal(false)}>
              <div
                className="mgmt-modal-box"
                style={{ maxWidth: '640px', width: '92%' }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#eff6ff', color: '#2563eb', display: 'grid', placeItems: 'center' }}>
                      <FileSpreadsheet size={20} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                        Bulk Import Cases
                      </h3>
                      <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                        Upload CSV or Excel-compatible spreadsheet to insert cases in bulk into MySQL database
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowImportModal(false)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#94a3b8' }}
                  >
                    ✕
                  </button>
                </div>

                {/* Step 1: Download Sample Template */}
                <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ fontSize: '13px', color: '#1e293b' }}>Need a template?</strong>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Download a sample CSV file with all CaseMaster column headers.</div>
                  </div>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleDownloadTemplate}
                    style={{ fontSize: '12px', padding: '6px 12px' }}
                  >
                    <Download size={13} />
                    <span>Download Template</span>
                  </button>
                </div>

                {/* Step 2: Choose File */}
                <div style={{ marginBottom: '14px' }}>
                  <label className="field-lbl" style={{ marginBottom: '6px', display: 'block' }}>
                    Select CSV File (.csv or .json)
                  </label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".csv, .json, text/csv, application/json"
                    onChange={handleFileChange}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '10px',
                      border: '2px dashed #cbd5e1',
                      borderRadius: '8px',
                      background: '#f8fafc',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  />
                </div>

                {/* Preview Table if records found */}
                {importPreviewList.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <strong style={{ fontSize: '13px', color: '#166534' }}>
                        ✓ {importPreviewList.length} cases detected in file
                      </strong>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>Showing preview of first 3 rows:</span>
                    </div>

                    <div style={{ maxHeight: '140px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                      <table className="mgmt-table" style={{ fontSize: '11px' }}>
                        <thead>
                          <tr>
                            <th>Case No</th>
                            <th>Client Name</th>
                            <th>Court Name</th>
                            <th>Next Hearing</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importPreviewList.slice(0, 3).map((row, i) => (
                            <tr key={i}>
                              <td><b>{row.caseNumber}</b></td>
                              <td>{row.clientName}</td>
                              <td>{row.courtName}</td>
                              <td>{row.nextDate || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Modal Action Buttons */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setShowImportModal(false)
                      setImportPreviewList([])
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={importPreviewList.length === 0 || importing}
                    onClick={handleExecuteImport}
                  >
                    <Check size={14} />
                    <span>{importing ? 'Importing...' : `Import ${importPreviewList.length} Cases Now`}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================= VIEW CASE DOCKET MODAL ================= */}
          {viewModalCase && (
            <div className="mgmt-modal-overlay" onClick={() => setViewModalCase(null)}>
              <div
                className="mgmt-modal-box"
                style={{
                  maxWidth: '640px',
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                      Case Docket — {viewModalCase.caseNumber || viewModalCase.caseNo}
                    </h3>
                    <div style={{ color: '#64748b', fontSize: '12px', marginTop: '3px' }}>
                      Case ID: {viewModalCase.id} · Client: {viewModalCase.clientName || 'Unassigned'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setViewModalCase(null)}
                    style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontSize: '14px', color: '#64748b', display: 'grid', placeItems: 'center' }}
                  >
                    ✕
                  </button>
                </div>

                <div style={{ marginTop: '14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px', background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div><strong>Court:</strong> {viewModalCase.courtName || '—'}</div>
                  <div><strong>Versus:</strong> {viewModalCase.vsName || viewModalCase.versusName || '—'}</div>
                  <div><strong>Under Section:</strong> {viewModalCase.underSection || viewModalCase.us || '—'}</div>
                  <div><strong>Stage / For:</strong> {viewModalCase.purpose || viewModalCase.caseFor || viewModalCase.for || '—'}</div>
                  <div><strong>Next Hearing:</strong> {viewModalCase.nextDate || 'Not set'}</div>
                  <div><strong>PS Case:</strong> {viewModalCase.psCaseNumber || viewModalCase.psCaseNo || '—'}</div>
                  <div><strong>Chamber File:</strong> Rack: {viewModalCase.rackNo || '—'} | Room: {viewModalCase.roomNo || '—'}</div>
                  <div><strong>Public Prosecutor:</strong> {viewModalCase.ppName || '—'}</div>
                  <div><strong>Law Clerk (LC):</strong> {viewModalCase.lc || viewModalCase.lcName || '—'}</div>
                  <div><strong>Appearing Advocate:</strong> {viewModalCase.advocateName || viewModalCase.adAdvName || '—'}</div>
                </div>

                {(viewModalCase.notes || viewModalCase.caseDetails) && (
                  <div style={{ marginTop: '12px', background: '#f8fafc', padding: '10px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
                    <strong>Brief &amp; Running Notes:</strong>
                    <p style={{ margin: '4px 0 0', color: '#334155' }}>{viewModalCase.notes || viewModalCase.caseDetails}</p>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
                  <button className="btn-secondary" onClick={() => setViewModalCase(null)}>
                    Close Docket
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================= DELETE CASE MODAL ================= */}
          {showDeleteModal && caseToDelete && (
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
                  <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#fee2e2', color: '#dc2626', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <AlertCircle size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#991b1b' }}>Delete Case Record</h3>
                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>Action cannot be undone.</p>
                  </div>
                </div>
                <p style={{ fontSize: '13px', color: '#334155', lineHeight: '1.5', margin: '0 0 18px' }}>
                  Are you sure you want to permanently delete case <strong>{caseToDelete.caseNumber || caseToDelete.caseNo}</strong> ({caseToDelete.id})?
                </p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
                  <button className="btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                  <button
                    className="btn-primary"
                    style={{ background: '#dc2626', borderColor: '#b91c1c' }}
                    onClick={confirmDeleteCase}
                  >
                    Confirm Delete
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================= Printable Court Docket ================= */}
          {selectedCase && (
            <div className="printable-docket" id="printable-case-docket">
              <div className="print-header">
                <div className="print-chambers">
                  <h2>{OFFICE.name}</h2>
                  <p className="print-address">{OFFICE.address}</p>
                  <p className="print-title">COURT CASE BRIEF &amp; CAUSE LIST DOCKET</p>
                </div>
                <div className="print-meta">
                  <div><b>Case ID:</b> {selectedCase.id}</div>
                  <div><b>Client ID:</b> {selectedCase.clientId}</div>
                  <div><b>Case Number:</b> {selectedCase.caseNumber || selectedCase.caseNo}</div>
                </div>
              </div>

              <div className="print-divider" />

              <table className="print-table">
                <tbody>
                  <tr>
                    <th>Client Name:</th>
                    <td><strong>{selectedCase.clientName}</strong> ({selectedCase.clientId || 'N/A'})</td>
                    <th>Contact Phone:</th>
                    <td>{selectedCase.phone || '—'}</td>
                  </tr>
                  <tr>
                    <th>Advocate on Record:</th>
                    <td>{selectedCase.advocateName || OFFICE.name}</td>
                    <th>L/C (Law Clerk):</th>
                    <td>{selectedCase.lc || selectedCase.lcName || '—'}</td>
                  </tr>
                  <tr>
                    <th>Court Name:</th>
                    <td><strong>{selectedCase.courtName}</strong></td>
                    <th>Versus (Opposite Party):</th>
                    <td>{selectedCase.vsName || selectedCase.versusName || '—'}</td>
                  </tr>
                  <tr>
                    <th>Under Section (U/S):</th>
                    <td>{selectedCase.underSection || selectedCase.us || '—'}</td>
                    <th>Police Station / PS Case:</th>
                    <td>{selectedCase.psCaseNumber || selectedCase.psCaseNo || '—'}</td>
                  </tr>
                  <tr>
                    <th>Appearance Date:</th>
                    <td><strong style={{ fontSize: '13px' }}>{selectedCase.nextDate}</strong></td>
                    <th>For / Hearing Purpose:</th>
                    <td><strong>{selectedCase.purpose || selectedCase.caseFor || selectedCase.for}</strong></td>
                  </tr>
                  <tr>
                    <th>Chamber File Location:</th>
                    <td>Rack: {selectedCase.rackNo || '—'} | Room: {selectedCase.roomNo || '—'}</td>
                    <th>Public Prosecutor:</th>
                    <td>{selectedCase.ppName || '—'}</td>
                  </tr>
                  <tr>
                    <th>Remarks &amp; Notes:</th>
                    <td colSpan={3}>{selectedCase.notes || selectedCase.caseDetails || 'Routine court proceeding scheduled.'}</td>
                  </tr>
                </tbody>
              </table>

              <div className="print-signatures">
                <div className="print-sig-box">
                  <div className="sig-line" />
                  <span>Law Clerk / Advocate Assistant</span>
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