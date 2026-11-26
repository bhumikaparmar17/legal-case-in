import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Scale, Clock, Calendar, Maximize, Minimize, ArrowLeft,
  AlertCircle, Users, BellRing, Sparkles, MapPin, Phone,
  ShieldCheck, CheckCircle2, Briefcase, Flame
} from 'lucide-react'
import { OFFICE } from '../data/menu.js'
import { getCases, getWaitingList, getAnnouncements, onStorageUpdate } from '../services/storageService.js'
import './TvDisplayScreen.css'

export default function TvDisplayScreen() {
  const navigate = useNavigate()
  const [cases, setCases] = useState(() => getCases())
  const [waitingList, setWaitingList] = useState(() => getWaitingList())
  const [now, setNow] = useState(new Date())
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement))

  // Live Announcements from storageService
  const [announcements, setAnnouncements] = useState(() => getAnnouncements())
  const [annIndex, setAnnIndex] = useState(0)

  // Real-time ticking clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Live storage event subscription (instant sync on client queue & notice changes)
  useEffect(() => {
    return onStorageUpdate(() => {
      setCases(getCases())
      setWaitingList(getWaitingList())
      setAnnouncements(getAnnouncements())
    })
  }, [])

  // Track Fullscreen state changes (button or Esc key)
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
    } else {
      document.exitFullscreen().catch(() => {})
    }
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

        <div className="tv-live-sync-pill">
          <span className="tv-live-dot" />
          <span>Real-time Live Sync Active</span>
        </div>
      </footer>
    </div>
  )
}
