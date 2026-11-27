import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Scale, Clock, Calendar, Maximize, Minimize, ArrowLeft,
  AlertCircle, Users, BellRing, Sparkles, MapPin, Phone,
  ShieldCheck, CheckCircle2, Briefcase, Flame, Volume2, VolumeX, Globe
} from 'lucide-react'
import { OFFICE } from '../data/menu.js'
import { getCases, getWaitingList, getAnnouncements, onStorageUpdate } from '../services/storageService.js'
import { api } from '../services/api.js'
import {
  SUPPORTED_LANGUAGES, DEFAULT_LANGUAGES, voiceQueue, getLanguageAvailability
} from '../utils/voiceAnnouncer.js'
import './TvDisplayScreen.css'

export default function TvDisplayScreen() {
  const navigate = useNavigate()
  const [cases, setCases] = useState(() => getCases())
  const [waitingList, setWaitingList] = useState(() => getWaitingList())
  const [now, setNow] = useState(new Date())
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement))

  // Multilingual Voice Announcement State (persisted across refresh)
  const [audioEnabled, setAudioEnabled] = useState(() => {
    try {
      return localStorage.getItem('legalcase_tv_audio_enabled') !== 'false'
    } catch {
      return true
    }
  })
  const [selectedLangs, setSelectedLangs] = useState(() => {
    try {
      const saved = localStorage.getItem('legalcase_tv_langs')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch {
      // ignore
    }
    return DEFAULT_LANGUAGES
  })
  const [showLangMenu, setShowLangMenu] = useState(false)
  const [voiceAvail, setVoiceAvail] = useState(() => getLanguageAvailability())
  const [voiceWarning, setVoiceWarning] = useState('')

  const audioEnabledRef = useRef(audioEnabled)
  const selectedLangsRef = useRef(selectedLangs)
  const prevStatusesRef = useRef(null)
  const lastRecallTsRef = useRef(Date.now())
  const lastCallTsRef = useRef(Date.now() - 45000)
  const lastAnnouncedRef = useRef({ id: null, ts: 0 })
  const pendingAnnounceRef = useRef(null)

  useEffect(() => { audioEnabledRef.current = audioEnabled }, [audioEnabled])
  useEffect(() => { selectedLangsRef.current = selectedLangs }, [selectedLangs])

  // Refresh installed voices list when browser finishes loading voices
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    const updateVoices = () => setVoiceAvail(getLanguageAvailability())
    updateVoices()
    window.speechSynthesis.addEventListener?.('voiceschanged', updateVoices)
    return () => window.speechSynthesis.removeEventListener?.('voiceschanged', updateVoices)
  }, [])

  // Helper to announce a called ('In Consultation') client with their next waiting client
  const announceClientCall = useCallback((calledItem, fullList, { force = false } = {}) => {
    if (!audioEnabledRef.current) return
    // If TV Display tab is currently in background, defer announcement until user switches to this tab
    if (typeof document !== 'undefined' && document.hidden) {
      pendingAnnounceRef.current = { calledItem, fullList }
      return
    }
    const nowTs = Date.now()
    if (!force && String(lastAnnouncedRef.current.id) === String(calledItem.id) && nowTs - lastAnnouncedRef.current.ts < 2500) {
      return
    }
    pendingAnnounceRef.current = null
    const active = fullList.filter((w) => w.status === 'Waiting' || w.status === 'In Consultation')
    const isEmergency = calledItem.consultancyType === 'Emergency'
    const queueList = active.filter((w) =>
      isEmergency ? w.consultancyType === 'Emergency' : w.consultancyType !== 'Emergency'
    )
    const prefix = isEmergency ? 'E' : 'C'
    const idx = queueList.findIndex((w) => String(w.id) === String(calledItem.id))
    if (idx === -1) return

    const currentToken = `${prefix}${idx + 1}`
    const currentClientName = calledItem.clientName || calledItem.name || ''

    // Find next eligible Waiting client in the same queue
    let nextIdx = queueList.findIndex((w, i) => i > idx && w.status === 'Waiting')
    if (nextIdx === -1) {
      nextIdx = queueList.findIndex((w, i) => i !== idx && w.status === 'Waiting')
    }
    const nextItem = nextIdx !== -1 ? queueList[nextIdx] : null

    lastAnnouncedRef.current = { id: calledItem.id, ts: nowTs }

    voiceQueue.enqueueCall({
      clientId: calledItem.id,
      currentToken,
      currentClientName,
      nextToken: nextItem ? `${prefix}${nextIdx + 1}` : null,
      nextClientName: nextItem ? (nextItem.clientName || nextItem.name) : null,
      languages: selectedLangsRef.current,
      repetitions: 1,
      onUnavailable: (missingCodes) => {
        const names = missingCodes.map((c) => SUPPORTED_LANGUAGES.find((l) => l.code === c)?.label || c).join(', ')
        setVoiceWarning(`Voice unavailable on this browser for: ${names}`)
        setTimeout(() => setVoiceWarning(''), 5000)
      },
      onBlocked: () => {
        // Browser autoplay blocked speech before first click on this tab; keep pending until click
        pendingAnnounceRef.current = { calledItem, fullList }
        lastAnnouncedRef.current = { id: null, ts: 0 }
        setVoiceWarning('🔊 Click anywhere on TV screen to play voice announcement')
      },
    })
  }, [])

  // Process queue transitions without announcing stale/initial clients
  const processQueueTransitions = useCallback((newList) => {
    if (!Array.isArray(newList)) return

    if (prevStatusesRef.current === null) {
      // First load: record existing statuses without announcing
      const initMap = new Map()
      newList.forEach((w) => initMap.set(String(w.id), w.status))
      prevStatusesRef.current = initMap
      return
    }

    const prevMap = prevStatusesRef.current
    const nextMap = new Map()

    newList.forEach((item) => {
      const idStr = String(item.id)
      const prevStatus = prevMap.get(idStr)
      nextMap.set(idStr, item.status)

      // Trigger ONLY when transitioning into 'In Consultation' (never on initial Waiting add)
      if (item.status === 'In Consultation' && prevStatus !== undefined && prevStatus !== 'In Consultation') {
        announceClientCall(item, newList)
      }

      // Cancel pending announcements if client is no longer In Consultation
      if (prevStatus === 'In Consultation' && item.status !== 'In Consultation') {
        voiceQueue.cancelClient(item.id)
      }
    })

    // Cancel pending announcements for deleted entries
    prevMap.forEach((prevStatus, idStr) => {
      if (!nextMap.has(idStr) && prevStatus === 'In Consultation') {
        voiceQueue.cancelClient(idStr)
      }
    })

    prevStatusesRef.current = nextMap
  }, [announceClientCall])

  // Check intentional recall trigger or recent call event from Advocate Console
  const checkRecallTrigger = useCallback((currentList) => {
    try {
      const raw = localStorage.getItem('legalcase_tv_recall')
      if (raw) {
        const data = JSON.parse(raw)
        if (data && data.ts && data.ts > lastRecallTsRef.current) {
          lastRecallTsRef.current = data.ts
          const target = currentList.find((w) => String(w.id) === String(data.id) && w.status === 'In Consultation')
          if (target) {
            announceClientCall(target, currentList, { force: true })
          }
        }
      }

      const callRaw = localStorage.getItem('legalcase_tv_call_event')
      if (callRaw) {
        const callData = JSON.parse(callRaw)
        if (callData && callData.ts && callData.ts > lastCallTsRef.current) {
          lastCallTsRef.current = callData.ts
          const target = currentList.find((w) => String(w.id) === String(callData.id) && w.status === 'In Consultation')
          if (target) {
            announceClientCall(target, currentList)
          }
        }
      }

      // Cross-device Recall check via backend recalledAt timestamp
      if (Array.isArray(currentList)) {
        const remoteRecalled = currentList.find(
          (w) => w.status === 'In Consultation' && w.recalledAt && w.recalledAt > lastRecallTsRef.current
        )
        if (remoteRecalled) {
          lastRecallTsRef.current = remoteRecalled.recalledAt
          announceClientCall(remoteRecalled, currentList, { force: true })
        }
      }
    } catch {
      // ignore
    }
  }, [announceClientCall])

  // Live Announcements from storageService
  const [announcements, setAnnouncements] = useState(() => getAnnouncements())
  const [annIndex, setAnnIndex] = useState(0)

  // Real-time ticking clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Live storage event + backend polling for separate-device real-time sync
  useEffect(() => {
    const initialList = getWaitingList()
    processQueueTransitions(initialList)
    checkRecallTrigger(initialList)

    const unsub = onStorageUpdate(() => {
      setCases(getCases())
      const latest = getWaitingList()
      setWaitingList(latest)
      processQueueTransitions(latest)
      checkRecallTrigger(latest)
      setAnnouncements(getAnnouncements())
    })

    const onStorageEvt = (e) => {
      if (e.key === 'legalcase_tv_recall' || e.key === 'legalcase_tv_call_event') {
        checkRecallTrigger(getWaitingList())
      } else if (e.key === 'legalcase_waiting_list_v2') {
        const latest = getWaitingList()
        setWaitingList(latest)
        processQueueTransitions(latest)
      }
    }
    window.addEventListener('storage', onStorageEvt)

    // Flush any deferred announcement when user switches back to the TV Display tab
    const flushPendingOnVisible = () => {
      if (typeof document !== 'undefined' && document.hidden) return
      if (pendingAnnounceRef.current && audioEnabledRef.current) {
        const { calledItem, fullList } = pendingAnnounceRef.current
        pendingAnnounceRef.current = null
        setVoiceWarning('')
        // Verify the client is still In Consultation before announcing
        const stillCalled = fullList.find(
          (w) => String(w.id) === String(calledItem.id) && w.status === 'In Consultation'
        )
        if (stillCalled) {
          announceClientCall(stillCalled, fullList, { force: true })
        }
      }
    }
    document.addEventListener('visibilitychange', flushPendingOnVisible)
    window.addEventListener('focus', flushPendingOnVisible)

    // Silently unlock speechSynthesis on any user interaction when audioEnabled is true
    const onFirstClick = () => {
      if (audioEnabledRef.current && !voiceQueue.audioUnlocked) {
        voiceQueue.unlockAudio()
      }
      flushPendingOnVisible()
    }
    window.addEventListener('pointerdown', onFirstClick, { passive: true })

    // Backend polling every 3.5s for cross-device TV display & notices sync
    const pollTimer = setInterval(() => {
      Promise.all([
        api.getWaitingList().catch(() => null),
        api.getAnnouncements().catch(() => null),
      ]).then(([wlData, annData]) => {
        if (Array.isArray(wlData)) {
          setWaitingList(wlData)
          processQueueTransitions(wlData)
          checkRecallTrigger(wlData)
        }
        if (Array.isArray(annData)) {
          setAnnouncements(annData)
        }
      }).catch(() => {})
    }, 3500)

    return () => {
      unsub()
      window.removeEventListener('storage', onStorageEvt)
      document.removeEventListener('visibilitychange', flushPendingOnVisible)
      window.removeEventListener('focus', flushPendingOnVisible)
      window.removeEventListener('pointerdown', onFirstClick)
      clearInterval(pollTimer)
      voiceQueue.clearAll()
    }
  }, [processQueueTransitions, checkRecallTrigger, announceClientCall])

  // Track Fullscreen state changes (button or Esc key)
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  const toggleFullscreen = () => {
    // Reuse Fullscreen TV click to unlock browser audio autoplay
    voiceQueue.unlockAudio()
    setAudioEnabled(true)
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
    } else {
      document.exitFullscreen().catch(() => {})
    }
  }

  const toggleAudio = () => {
    if (!audioEnabled) {
      voiceQueue.unlockAudio()
      setAudioEnabled(true)
      try { localStorage.setItem('legalcase_tv_audio_enabled', 'true') } catch {}
    } else {
      voiceQueue.clearAll()
      setAudioEnabled(false)
      try { localStorage.setItem('legalcase_tv_audio_enabled', 'false') } catch {}
    }
  }

  const toggleLanguage = (code) => {
    setSelectedLangs((prev) => {
      let next
      if (prev.includes(code)) {
        if (prev.length === 1) return prev // Keep at least 1 language active
        next = prev.filter((c) => c !== code)
      } else {
        next = [...prev, code]
      }
      try { localStorage.setItem('legalcase_tv_langs', JSON.stringify(next)) } catch {}
      return next
    })
  }

  // Sort announcements so Urgent notices are shown with higher priority
  const sortedAnnouncements = [...announcements].sort((a, b) => {
    if (a.priority === 'Urgent' && b.priority !== 'Urgent') return -1
    if (a.priority !== 'Urgent' && b.priority === 'Urgent') return 1
    return 0
  })

  const currentAnn = sortedAnnouncements[annIndex % (sortedAnnouncements.length || 1)] || {
    headline: 'Welcome to Advocate Anupam Maity Chambers',
    text: 'Please wait comfortably while consultation slots are prepared.',
    tag: 'Chamber Advisory',
    priority: 'Normal',
    date: 'Today',
  }

  // Smart Priority Auto-Rotation:
  // Urgent announcements get 14,000ms (14s), Normal get 7,500ms (7.5s)
  const currentDuration = currentAnn.priority === 'Urgent' ? 14000 : 7500

  useEffect(() => {
    if (sortedAnnouncements.length <= 1) return
    const timer = setTimeout(() => {
      setAnnIndex((prev) => (prev + 1) % sortedAnnouncements.length)
    }, currentDuration)
    return () => clearTimeout(timer)
  }, [annIndex, sortedAnnouncements.length, currentDuration])

  // Active clients: status is 'Waiting' or 'In Consultation'
  const activeWaiting = waitingList.filter(
    (w) => w.status === 'Waiting' || w.status === 'In Consultation'
  )

  const emergencyList = activeWaiting.filter((w) => w.consultancyType === 'Emergency')
  const conferenceList = activeWaiting.filter((w) => w.consultancyType !== 'Emergency')

  const hasEmergency = emergencyList.length > 0
  const hasConference = conferenceList.length > 0
  const bothEmpty = !hasEmergency && !hasConference

  const todayStr = new Date().toISOString().split('T')[0]
  const todayCases = cases.filter((c) => c.nextDate === todayStr)

  return (
    <div className="tv-root">
      {/* Top Header */}
      <header className="tv-header">
        <div className="tv-brand-row">
          <div className="tv-logo-box">
            <Scale size={34} strokeWidth={2.4} />
          </div>
          <div>
            <h1 className="tv-chambers-name">{OFFICE.name}</h1>
            <div className="tv-chambers-sub">
              <span>Advocate High Court &amp; District Judges Court</span>
              <span>·</span>
              <MapPin size={14} color="#f59e0b" />
              <span>{OFFICE.chamber || OFFICE.address}</span>
              <span>·</span>
              <Phone size={14} color="#f59e0b" />
              <span>{OFFICE.phone}</span>
            </div>
          </div>
        </div>

        <div className="tv-header-actions">
          <div className="tv-clock-box">
            <div className="tv-time">
              {now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="tv-date">
              {now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>

          {/* Fullscreen Toggle Button */}
          <button
            type="button"
            className="tv-fs-btn"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter TV Fullscreen Mode'}
          >
            {isFullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
            <span>{isFullscreen ? 'Exit TV' : 'Fullscreen TV'}</span>
          </button>
        </div>
      </header>

      {/* ==========================================================================
          UPGRADED HERO ANNOUNCEMENT PRESENTATION CARD
          Prominent Headline, Multi-Line Message (Zero Clipping), Date & Smart Progress
          ========================================================================== */}
      <section
        className={`tv-announcement-card ${currentAnn.priority === 'Urgent' ? 'urgent' : 'normal'}`}
        key={currentAnn.id || annIndex}
      >
        <div className="tv-ann-meta-row">
          <div className="tv-ann-meta-left">
            <span className="tv-ann-tag">
              {currentAnn.priority === 'Urgent' ? <Flame size={13} /> : <BellRing size={13} />}
              <span>{currentAnn.tag || (currentAnn.priority === 'Urgent' ? 'Urgent Notice' : 'Chamber Notice')}</span>
            </span>
            <span className="tv-ann-date">📅 {currentAnn.date || 'Today'}</span>
          </div>

          <div className="tv-ann-meta-right">
            <span className="tv-ann-counter">
              Notice {(annIndex % (sortedAnnouncements.length || 1)) + 1} of {sortedAnnouncements.length || 1}
            </span>
            <div className="tv-ann-dots">
              {sortedAnnouncements.map((_, i) => (
                <span key={i} className={`tv-ann-dot ${i === annIndex % sortedAnnouncements.length ? 'active' : ''}`} />
              ))}
            </div>
          </div>
        </div>

        <h2 className="tv-ann-headline">{currentAnn.headline}</h2>
        <p className="tv-ann-message">{currentAnn.text}</p>

        {/* Dynamic Rotation Progress Bar */}
        <div className="tv-progress-track">
          <div
            className="tv-progress-fill"
            key={`${currentAnn.id}-${annIndex}`}
            style={{
              animation: `tvProgress ${currentDuration}ms linear forwards`,
            }}
          />
        </div>
      </section>

      {/* Main Dynamic Display Grid */}
      <main className={`tv-main-grid ${hasEmergency && hasConference ? 'two-cols' : 'single-col'}`}>
        {/* Condition 1: Emergency Consultancy List (Shown ONLY if not empty) */}
        {hasEmergency && (
          <section className="tv-queue-card emergency">
            <div className="tv-qc-header">
              <div className="tv-qc-title-wrap">
                <div className="tv-qc-icon-badge">
                  <AlertCircle size={22} strokeWidth={2.4} />
                </div>
                <div>
                  <h3 className="tv-qc-heading">Emergency Consultancy</h3>
                  <div className="tv-qc-sub">Immediate Priority Chamber Consultations</div>
                </div>
              </div>
              <span className="tv-qc-count-badge">
                {emergencyList.length} {emergencyList.length === 1 ? 'Client' : 'Clients'} Urgent
              </span>
            </div>

            <div className="tv-items-list">
              {emergencyList.map((item, idx) => (
                <div key={item.id} className="tv-item-row">
                  <div className="tv-item-token-name">
                    <div className="tv-token-pill">E{idx + 1}</div>
                    <div>
                      <div className="tv-client-title">{item.clientName}</div>
                      <div className="tv-client-purpose">{item.purpose || item.address || 'Emergency Legal Matter'}</div>
                    </div>
                  </div>
                  <div className="tv-item-slot-wrap">
                    <span className="tv-slot-badge">{item.timeSlot || 'Immediate'}</span>
                    <div className="tv-item-indicator" style={{ color: '#fca5a5' }}>
                      {idx === 0 ? '🔴 In Progress / Next' : '⚡ Priority Queue'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Condition 2: Conference Consultancy List (Shown ONLY if not empty) */}
        {hasConference && (
          <section className="tv-queue-card conference">
            <div className="tv-qc-header">
              <div className="tv-qc-title-wrap">
                <div className="tv-qc-icon-badge">
                  <Users size={22} strokeWidth={2.4} />
                </div>
                <div>
                  <h3 className="tv-qc-heading">Conference Consultancy</h3>
                  <div className="tv-qc-sub">Scheduled Chamber Consultations &amp; Regular Appointments</div>
                </div>
              </div>
              <span className="tv-qc-count-badge">
                {conferenceList.length} {conferenceList.length === 1 ? 'Client' : 'Clients'} In Chamber
              </span>
            </div>

            <div className="tv-items-list">
              {conferenceList.map((item, idx) => (
                <div key={item.id} className="tv-item-row">
                  <div className="tv-item-token-name">
                    <div className="tv-token-pill">C{idx + 1}</div>
                    <div>
                      <div className="tv-client-title">{item.clientName}</div>
                      <div className="tv-client-purpose">{item.purpose || item.address || 'Chamber Legal Consultation'}</div>
                    </div>
                  </div>
                  <div className="tv-item-slot-wrap">
                    <span className="tv-slot-badge">{item.timeSlot || 'Scheduled'}</span>
                    <div className="tv-item-indicator" style={{ color: '#93c5fd' }}>
                      {idx === 0 && !hasEmergency ? '🟢 Next In Line' : `Position #${idx + 1}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Condition 3: Both Queues Empty (Clean Welcome State) */}
        {bothEmpty && (
          <section className="tv-both-empty-card">
            <div className="tv-empty-icon-ring">
              <Sparkles size={36} />
            </div>
            <h2 className="tv-empty-title">Welcome to Chambers</h2>
            <p className="tv-empty-desc">
              All consultation queues are currently clear. Please contact the front desk or receptionist to schedule
              your consultation slot with Advocate Anupam Maity.
            </p>
            <div style={{ marginTop: '16px', display: 'flex', gap: '14px' }}>
              <span className="tv-live-sync-pill">
                <span className="tv-live-dot" />
                <span>Reception Queue Active &amp; Ready</span>
              </span>
            </div>
          </section>
        )}
      </main>

      {/* Footer Navigation & Status Bar */}
      <footer className="tv-footer">
        <div className="tv-footer-left">
          <button
            type="button"
            className="tv-back-btn"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft size={14} />
            <span>Advocate Console</span>
          </button>

          {todayCases.length > 0 && (
            <div className="tv-hearings-tag">
              <Briefcase size={13} />
              <span>Today's Court Hearings: {todayCases.length} Listed</span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative' }}>
          {voiceWarning && (
            <span style={{ fontSize: '11px', color: '#fbbf24', background: 'rgba(245,158,11,0.12)', padding: '4px 10px', borderRadius: '999px', border: '1px solid rgba(245,158,11,0.3)' }}>
              {voiceWarning}
            </span>
          )}

          {/* Minimal Audio Enable/Mute Pill */}
          <button
            type="button"
            onClick={toggleAudio}
            title={audioEnabled ? 'Mute Voice Announcements' : 'Enable Voice Announcements'}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '6px 12px', borderRadius: '999px', cursor: 'pointer', fontSize: '12px', fontWeight: '600',
              background: audioEnabled ? 'rgba(16, 185, 129, 0.16)' : 'rgba(245, 158, 11, 0.16)',
              color: audioEnabled ? '#34d399' : '#fbbf24',
              border: audioEnabled ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(245, 158, 11, 0.4)',
            }}
          >
            {audioEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
            <span>{audioEnabled ? 'Audio On' : 'Enable Audio'}</span>
          </button>

          {/* Minimal Language Selector Pill */}
          <button
            type="button"
            onClick={() => setShowLangMenu((v) => !v)}
            title="Select Announcement Languages"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '6px 12px', borderRadius: '999px', cursor: 'pointer', fontSize: '12px', fontWeight: '600',
              background: 'rgba(255, 255, 255, 0.08)', color: '#e2e8f0',
              border: '1px solid rgba(255, 255, 255, 0.16)',
            }}
          >
            <Globe size={13} />
            <span>{selectedLangs.map((c) => c.split('-')[0].toUpperCase()).join(' · ')}</span>
          </button>

          {showLangMenu && (
            <div style={{
              position: 'absolute', bottom: 'calc(100% + 10px)', right: 0, zIndex: 100,
              background: '#0f172a', border: '1px solid rgba(255,255,255,0.18)', borderRadius: '10px',
              padding: '10px 12px', minWidth: '225px', boxShadow: '0 12px 30px rgba(0,0,0,0.45)',
            }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase' }}>
                Announcement Languages
              </div>
              {SUPPORTED_LANGUAGES.map((lang) => {
                const checked = selectedLangs.includes(lang.code)
                const avail = voiceAvail[lang.code]?.available
                return (
                  <label
                    key={lang.code}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '5px 4px', cursor: 'pointer', fontSize: '12px', color: '#f8fafc',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleLanguage(lang.code)}
                      />
                      <span>{lang.label} ({lang.native})</span>
                    </span>
                    <span style={{ fontSize: '10px', color: avail ? '#34d399' : '#f59e0b' }}>
                      {avail ? 'Ready' : 'No Voice'}
                    </span>
                  </label>
                )
              })}
            </div>
          )}

          <div className="tv-live-sync-pill">
            <span className="tv-live-dot" />
            <span>Real-time Live Sync Active</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
