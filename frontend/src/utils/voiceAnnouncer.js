/**
 * Multilingual Real-Time Voice Announcer (Browser-native SpeechSynthesis)
 * Supports Bengali, Hindi, English, Odia, Marathi, Gujarati.
 * Sequential queue with 3x repetition per call event and no overlapping audio.
 */

export const SUPPORTED_LANGUAGES = [
  { code: 'hi-IN', label: 'Hindi', native: 'हिन्दी' },
  { code: 'en-IN', label: 'English', native: 'English' },
  { code: 'bn-IN', label: 'Bengali', native: 'বাংলা' },
  { code: 'or-IN', label: 'Odia', native: 'ଓଡ଼ିଆ' },
  { code: 'mr-IN', label: 'Marathi', native: 'मराठी' },
  { code: 'gu-IN', label: 'Gujarati', native: 'ગુજરાતી' },
]

export const DEFAULT_LANGUAGES = ['hi-IN', 'en-IN']

const TEMPLATES = {
  'bn-IN': {
    withNext: (curTok, curName, nextTok, nextName) =>
      `টোকেন নম্বর ${curTok}, ${curName}, অনুগ্রহ করে অ্যাডভোকেটের চেম্বারে আসুন। পরবর্তী ক্লায়েন্ট, টোকেন নম্বর ${nextTok}, ${nextName}, অনুগ্রহ করে প্রস্তুত থাকুন।`,
    onlyCurrent: (curTok, curName) =>
      `টোকেন নম্বর ${curTok}, ${curName}, অনুগ্রহ করে অ্যাডভোকেটের চেম্বারে আসুন।`,
  },
  'hi-IN': {
    withNext: (curTok, curName, nextTok, nextName) =>
      `टोकन नंबर ${curTok}, ${curName}, कृपया अधिवक्ता के चैंबर में आएं। अगले क्लाइंट, टोकन नंबर ${nextTok}, ${nextName}, कृपया तैयार रहें।`,
    onlyCurrent: (curTok, curName) =>
      `टोकन नंबर ${curTok}, ${curName}, कृपया अधिवक्ता के चैंबर में आएं।`,
  },
  'en-IN': {
    withNext: (curTok, curName, nextTok, nextName) =>
      `Token number ${curTok}, ${curName}, please proceed to the advocate's chamber. Next client, token number ${nextTok}, ${nextName}, please be ready.`,
    onlyCurrent: (curTok, curName) =>
      `Token number ${curTok}, ${curName}, please proceed to the advocate's chamber.`,
  },
  'or-IN': {
    withNext: (curTok, curName, nextTok, nextName) =>
      `ଟୋକନ୍ ନମ୍ବର ${curTok}, ${curName}, ଦୟାକରି ଆଇନଜୀବୀଙ୍କ ଚାମ୍ବରକୁ ଆସନ୍ତୁ। ପରବର୍ତ୍ତୀ କ୍ଲାଏଣ୍ଟ, ଟୋକନ୍ ନମ୍ବର ${nextTok}, ${nextName}, ଦୟାକରି ପ୍ରସ୍ତୁତ ରୁହନ୍ତୁ।`,
    onlyCurrent: (curTok, curName) =>
      `ଟୋକନ୍ ନମ୍ବର ${curTok}, ${curName}, ଦୟାକରି ଆଇନଜୀବୀଙ୍କ ଚାମ୍ବରକୁ ଆସନ୍ତୁ।`,
  },
  'mr-IN': {
    withNext: (curTok, curName, nextTok, nextName) =>
      `टोकन क्रमांक ${curTok}, ${curName}, कृपया वकिलांच्या चेंबरमध्ये या. पुढील क्लायंट, टोकन क्रमांक ${nextTok}, ${nextName}, कृपया तयार राहा.`,
    onlyCurrent: (curTok, curName) =>
      `टोकन क्रमांक ${curTok}, ${curName}, कृपया वकिलांच्या चेंबरमध्ये या.`,
  },
  'gu-IN': {
    withNext: (curTok, curName, nextTok, nextName) =>
      `ટોકન નંબર ${curTok}, ${curName}, કૃપા કરીને વકીલની ચેમ્બરમાં આવો. આગામી ક્લાયન્ટ, ટોકન નંબર ${nextTok}, ${nextName}, કૃપા કરીને તૈયાર રહો.`,
    onlyCurrent: (curTok, curName) =>
      `ટોકન નંબર ${curTok}, ${curName}, કૃપા કરીને વકીલની ચેમ્બરમાં આવો.`,
  },
}

const WORD_PAUSE_MS = 5
const SENTENCE_PAUSE_MS = 5
const LANGUAGE_PAUSE_MS = 5
const SPEECH_RATE = 0.92

function formatTokenForLang(token, langCode) {
  if (!token) return ''
  const str = String(token).trim()
  const match = str.match(/^([A-Za-z]+)(\d+)$/)
  if (!match) return str
  const [, prefix, num] = match
  const upper = prefix.toUpperCase()

  if (langCode === 'hi-IN') {
    const map = { C: 'सी', E: 'ई' }
    return `${map[upper] || upper} ${num}`
  }
  if (langCode === 'bn-IN') {
    const map = { C: 'সি', E: 'ই' }
    return `${map[upper] || upper} ${num}`
  }
  return `${upper} ${num}`
}

function buildSpeechChunks(text) {
  return [{ text, pauseAfterMs: LANGUAGE_PAUSE_MS }]
}

export function buildAnnouncementText(langCode, { currentToken, currentClientName, nextToken, nextClientName }) {
  const tpl = TEMPLATES[langCode] || TEMPLATES['en-IN']
  const spokenCurTok = formatTokenForLang(currentToken, langCode)
  const spokenNextTok = formatTokenForLang(nextToken, langCode)
  if (spokenNextTok && nextClientName) {
    return tpl.withNext(spokenCurTok, currentClientName, spokenNextTok, nextClientName)
  }
  return tpl.onlyCurrent(spokenCurTok, currentClientName)
}

export function getInstalledVoices() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return []
  return window.speechSynthesis.getVoices() || []
}

export function findVoiceForLang(langCode, voices) {
  if (!voices || voices.length === 0) return null
  const exact = voices.find((v) => v.lang.toLowerCase() === langCode.toLowerCase())
  if (exact) return exact
  const prefix = langCode.split('-')[0].toLowerCase()
  return voices.find((v) => v.lang.toLowerCase().startsWith(prefix)) || null
}

export function getLanguageAvailability() {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window
  const voices = getInstalledVoices()
  const report = {}
  SUPPORTED_LANGUAGES.forEach((l) => {
    const voice = findVoiceForLang(l.code, voices)
    report[l.code] = {
      available: Boolean(voice),
      voiceName: voice ? voice.name : null,
      speechSupported: supported,
    }
  })
  return report
}

class SequentialVoiceQueue {
  constructor() {
    this.queue = []
    this.isSpeaking = false
    this.activeClientId = null
    this.pauseTimer = null
    this.audioUnlocked = false
  }

  unlockAudio() {
    this.audioUnlocked = true
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false
    try {
      // Prime SpeechSynthesis on user gesture to satisfy browser autoplay policies
      const utter = new SpeechSynthesisUtterance('')
      utter.volume = 0
      window.speechSynthesis.speak(utter)
      return true
    } catch {
      return false
    }
  }

  enqueueCall({ clientId, currentToken, currentClientName, nextToken, nextClientName, languages, repetitions = 1, onUnavailable, onBlocked }) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    this.onBlocked = onBlocked || null
    const activeLangs = (languages && languages.length > 0 ? languages : DEFAULT_LANGUAGES)
    const voices = getInstalledVoices()
    const unavailable = []

    const playableLangs = activeLangs.filter((code) => {
      if (voices.length === 0) return true // Voices may still be loading; allow browser fallback
      const match = findVoiceForLang(code, voices)
      if (!match) {
        unavailable.push(code)
        return false
      }
      return true
    })

    if (unavailable.length > 0 && onUnavailable) {
      onUnavailable(unavailable)
    }

    const langsToSpeak = playableLangs.length > 0 ? playableLangs : ['en-IN']

    // Remove any stale pending items for this same client to avoid duplicates
    this.cancelClient(clientId)

    for (let rep = 0; rep < repetitions; rep++) {
      for (const langCode of langsToSpeak) {
        const text = buildAnnouncementText(langCode, {
          currentToken,
          currentClientName,
          nextToken,
          nextClientName,
        })
        const chunks = buildSpeechChunks(text)
        chunks.forEach((chunk) => {
          this.queue.push({
            clientId: String(clientId),
            langCode,
            text: chunk.text,
            pauseAfterMs: chunk.pauseAfterMs,
          })
        })
      }
    }

    if (!this.isSpeaking) {
      this._processNext()
    }
  }

  cancelClient(clientId) {
    const idStr = String(clientId)
    this.queue = this.queue.filter((item) => item.clientId !== idStr)
    if (this.activeClientId === idStr && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel()
      } catch {
        // ignore
      }
      this.activeClientId = null
      this.isSpeaking = false
      if (this.pauseTimer) {
        clearTimeout(this.pauseTimer)
        this.pauseTimer = null
      }
      this._processNext()
    }
  }

  clearAll() {
    this.queue = []
    this.activeClientId = null
    this.isSpeaking = false
    if (this.pauseTimer) {
      clearTimeout(this.pauseTimer)
      this.pauseTimer = null
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel()
      } catch {
        // ignore
      }
    }
  }

  _processNext() {
    if (this.isSpeaking || this.queue.length === 0) return
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

    const nextItem = this.queue.shift()
    this.isSpeaking = true
    this.activeClientId = nextItem.clientId

    const utter = new SpeechSynthesisUtterance(nextItem.text)
    utter.lang = nextItem.langCode
    utter.rate = SPEECH_RATE
    utter.pitch = 1.0

    const voices = getInstalledVoices()
    const matchedVoice = findVoiceForLang(nextItem.langCode, voices)
    if (matchedVoice) {
      utter.voice = matchedVoice
    }

    const pauseMs = nextItem.pauseAfterMs ?? LANGUAGE_PAUSE_MS
    const finish = () => {
      this.isSpeaking = false
      this.activeClientId = null
      this.pauseTimer = setTimeout(() => {
        this._processNext()
      }, pauseMs)
    }

    utter.onend = finish
    utter.onerror = (err) => {
      if (err?.error === 'not-allowed') {
        this.isSpeaking = false
        this.activeClientId = null
        this.queue = []
        if (this.pauseTimer) {
          clearTimeout(this.pauseTimer)
          this.pauseTimer = null
        }
        this.onBlocked?.()
        return
      }
      finish()
    }

    try {
      window.speechSynthesis.speak(utter)
    } catch {
      finish()
    }
  }
}

export const voiceQueue = new SequentialVoiceQueue()
