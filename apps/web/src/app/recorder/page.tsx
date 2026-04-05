"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { LoaderCircle, Mic, ShieldAlert, Square, Trash2, UserRound } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@my-better-t-app/ui/components/card"

type SpeakerId = "user1" | "user2" | "user3" | "user4"

type ConversationTurn = {
  audioUrl: string
  createdAt: number
  deviceLabel: string
  durationSeconds: number
  id: string
  speaker: SpeakerId
  transcript: string
}

type AudioInputOption = {
  deviceId: string
  isBlocked: boolean
  label: string
  reason?: string
}

type SpeechRecognitionResultAlternativeLike = {
  transcript: string
}

type SpeechRecognitionResultLike = {
  isFinal: boolean
  0: SpeechRecognitionResultAlternativeLike
  length: number
}

type SpeechRecognitionEventLike = Event & {
  resultIndex: number
  results: ArrayLike<SpeechRecognitionResultLike>
}

type SpeechRecognitionErrorEventLike = Event & {
  error: string
}

type BrowserSpeechRecognition = {
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives: number
  start: () => void
  stop: () => void
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null
  onend: (() => void) | null
}

type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
}

const speakerMeta: Record<
  SpeakerId,
  {
    label: string
    tone: string
    toneAccent: string
    transcriptTone: string
    subtleText: string
  }
> = {
  user1: {
    label: "User 1",
    tone: "border-sky-500/30 bg-sky-500/12 text-sky-100",
    toneAccent: "text-sky-300",
    transcriptTone: "border-sky-500/20 bg-sky-950/30",
    subtleText: "text-sky-200/80",
  },
  user2: {
    label: "User 2",
    tone: "border-emerald-500/30 bg-emerald-500/12 text-emerald-100",
    toneAccent: "text-emerald-300",
    transcriptTone: "border-emerald-500/20 bg-emerald-950/30",
    subtleText: "text-emerald-200/80",
  },
  user3: {
    label: "User 3",
    tone: "border-amber-500/30 bg-amber-500/12 text-amber-100",
    toneAccent: "text-amber-300",
    transcriptTone: "border-amber-500/20 bg-amber-950/30",
    subtleText: "text-amber-200/80",
  },
  user4: {
    label: "User 4",
    tone: "border-fuchsia-500/30 bg-fuchsia-500/12 text-fuchsia-100",
    toneAccent: "text-fuchsia-300",
    transcriptTone: "border-fuchsia-500/20 bg-fuchsia-950/30",
    subtleText: "text-fuchsia-200/80",
  },
}

const BLOCKED_DEVICE_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /stereo mix/iu, reason: "Looks like loopback/system mix input." },
  { pattern: /what u hear/iu, reason: "Looks like speaker loopback input." },
  { pattern: /loopback/iu, reason: "Looks like loopback/system capture device." },
  { pattern: /monitor of/iu, reason: "Looks like monitor/loopback device." },
  { pattern: /vb-audio/iu, reason: "Looks like virtual cable audio routing." },
  { pattern: /cable output/iu, reason: "Looks like virtual output capture." },
  { pattern: /blackhole/iu, reason: "Looks like virtual loopback device." },
]

const formatElapsed = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`
}

const formatDuration = (seconds: number): string => {
  return `${seconds.toFixed(1)}s`
}

const classifyDevice = (device: MediaDeviceInfo, index: number): AudioInputOption => {
  const label = device.label || `Microphone ${index + 1}`

  for (const blockedPattern of BLOCKED_DEVICE_PATTERNS) {
    if (blockedPattern.pattern.test(label)) {
      return {
        deviceId: device.deviceId,
        isBlocked: true,
        label,
        reason: blockedPattern.reason,
      }
    }
  }

  return {
    deviceId: device.deviceId,
    isBlocked: false,
    label,
  }
}

const getPreferredMimeType = (): string => {
  if (typeof MediaRecorder === "undefined") {
    return ""
  }

  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]

  for (const candidate of candidates) {
    if (MediaRecorder.isTypeSupported(candidate)) {
      return candidate
    }
  }

  return ""
}

const getSpeechRecognitionConstructor = (): SpeechRecognitionConstructor | null => {
  if (typeof window === "undefined") {
    return null
  }

  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null
}

export default function RecorderPage() {
  const [activeSpeaker, setActiveSpeaker] = useState<SpeakerId>("user1")
  const [audioInputs, setAudioInputs] = useState<AudioInputOption[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState("")
  const [turns, setTurns] = useState<ConversationTurn[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [liveTranscript, setLiveTranscript] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isInitializingDevices, setIsInitializingDevices] = useState(true)
  const [permissionGranted, setPermissionGranted] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(true)
  const [speechListening, setSpeechListening] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null)
  const activeStreamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const elapsedRef = useRef(0)
  const activeSpeakerRef = useRef<SpeakerId>("user1")
  const activeDeviceLabelRef = useRef("")
  const finalTranscriptRef = useRef("")
  const liveTranscriptRef = useRef("")

  activeSpeakerRef.current = activeSpeaker

  useEffect(() => {
    setSpeechSupported(Boolean(getSpeechRecognitionConstructor()))
  }, [])

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }

      recognitionRef.current?.stop()
      mediaRecorderRef.current?.stop()
      activeStreamRef.current?.getTracks().forEach((track) => track.stop())
      for (const turn of turns) {
        URL.revokeObjectURL(turn.audioUrl)
      }
    }
  }, [turns])

  const refreshAudioInputs = async (): Promise<void> => {
    const devices = await navigator.mediaDevices.enumerateDevices()
    const inputs = devices
      .filter((device) => device.kind === "audioinput")
      .map(classifyDevice)

    setAudioInputs(inputs)

    const currentlySelected = inputs.find((input) => input.deviceId === selectedDeviceId && !input.isBlocked)
    const firstSafeInput = inputs.find((input) => !input.isBlocked)

    if (currentlySelected) {
      activeDeviceLabelRef.current = currentlySelected.label
      return
    }

    if (firstSafeInput) {
      setSelectedDeviceId(firstSafeInput.deviceId)
      activeDeviceLabelRef.current = firstSafeInput.label
      return
    }

    setSelectedDeviceId("")
    activeDeviceLabelRef.current = ""
  }

  const initializeDevices = async (): Promise<void> => {
    setIsInitializingDevices(true)
    setError(null)

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("This browser does not support microphone capture.")
      }

      const probeStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      setPermissionGranted(true)
      probeStream.getTracks().forEach((track) => track.stop())
      await refreshAudioInputs()
    } catch (caughtError) {
      setPermissionGranted(false)
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to read microphone devices.",
      )
    } finally {
      setIsInitializingDevices(false)
    }
  }

  useEffect(() => {
    void initializeDevices()
  }, [])

  useEffect(() => {
    if (!navigator.mediaDevices?.addEventListener) {
      return
    }

    const handleDeviceChange = () => {
      void refreshAudioInputs()
    }

    navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange)
    return () => {
      navigator.mediaDevices.removeEventListener("devicechange", handleDeviceChange)
    }
  }, [selectedDeviceId])

  const selectedDevice = useMemo(
    () => audioInputs.find((input) => input.deviceId === selectedDeviceId),
    [audioInputs, selectedDeviceId],
  )

  const blockedInputs = useMemo(
    () => audioInputs.filter((input) => input.isBlocked),
    [audioInputs],
  )

  const canRecord = permissionGranted && !isInitializingDevices && Boolean(selectedDeviceId) && !selectedDevice?.isBlocked

  const resetRecorder = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    recognitionRef.current = null
    mediaRecorderRef.current = null
    activeStreamRef.current?.getTracks().forEach((track) => track.stop())
    activeStreamRef.current = null
    chunksRef.current = []
    elapsedRef.current = 0
    finalTranscriptRef.current = ""
    liveTranscriptRef.current = ""
    setElapsed(0)
    setIsRecording(false)
    setSpeechListening(false)
    setLiveTranscript("")
  }

  const startRecording = async () => {
    if (isRecording || !canRecord || !selectedDeviceId) {
      return
    }

    setError(null)

    try {
      finalTranscriptRef.current = ""
      liveTranscriptRef.current = ""
      setLiveTranscript("")

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: { exact: selectedDeviceId },
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
        video: false,
      })

      const currentTrack = stream.getAudioTracks()[0]
      const activeLabel = currentTrack?.label || selectedDevice?.label || "Selected microphone"

      for (const blockedPattern of BLOCKED_DEVICE_PATTERNS) {
        if (blockedPattern.pattern.test(activeLabel)) {
          stream.getTracks().forEach((track) => track.stop())
          throw new Error(`Blocked input device: ${activeLabel}. ${blockedPattern.reason}`)
        }
      }

      const mimeType = getPreferredMimeType()
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)

      activeStreamRef.current = stream
      mediaRecorderRef.current = recorder
      chunksRef.current = []
      activeDeviceLabelRef.current = activeLabel
      elapsedRef.current = 0
      setElapsed(0)
      setIsRecording(true)

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      recorder.onerror = () => {
        setError("Recording failed in the browser.")
        resetRecorder()
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        })
        const transcript = liveTranscriptRef.current.trim()

        if (blob.size > 0) {
          const audioUrl = URL.createObjectURL(blob)
          setTurns((currentTurns) => [
            ...currentTurns,
            {
              id: crypto.randomUUID(),
              speaker: activeSpeakerRef.current,
              createdAt: Date.now(),
              audioUrl,
              durationSeconds: elapsedRef.current,
              deviceLabel: activeDeviceLabelRef.current,
              transcript,
            },
          ])
        }

        resetRecorder()
      }

      timerRef.current = setInterval(() => {
        elapsedRef.current += 1
        setElapsed(elapsedRef.current)
      }, 1000)

      const SpeechRecognition = getSpeechRecognitionConstructor()
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition()
        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = "en-US"
        recognition.maxAlternatives = 1

        recognition.onresult = (event) => {
          let interimTranscript = ""

          for (let index = event.resultIndex; index < event.results.length; index += 1) {
            const result = event.results[index]
            const transcriptPart = result[0]?.transcript?.trim() ?? ""

            if (!transcriptPart) {
              continue
            }

            if (result.isFinal) {
              finalTranscriptRef.current = `${finalTranscriptRef.current} ${transcriptPart}`.trim()
            } else {
              interimTranscript = `${interimTranscript} ${transcriptPart}`.trim()
            }
          }

          const nextTranscript = `${finalTranscriptRef.current} ${interimTranscript}`.trim()
          liveTranscriptRef.current = nextTranscript
          setLiveTranscript(nextTranscript)
        }

        recognition.onerror = (event) => {
          setSpeechListening(false)
          setError((currentError) => currentError ?? `Transcript error: ${event.error}`)
        }

        recognition.onend = () => {
          setSpeechListening(false)
        }

        recognitionRef.current = recognition
        recognition.start()
        setSpeechListening(true)
      }

      recorder.start(1000)
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to start microphone recording.",
      )
      resetRecorder()
    }
  }

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current
    if (!recorder || recorder.state === "inactive") {
      return
    }

    recognitionRef.current?.stop()
    recorder.stop()
  }

  const clearConversation = () => {
    for (const turn of turns) {
      URL.revokeObjectURL(turn.audioUrl)
    }
    setTurns([])
    setError(null)
    setLiveTranscript("")
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Mic-Only Recorder</CardTitle>
            <CardDescription>
              Pick a user and a safe microphone input. Suspicious loopback/system-audio devices are blocked.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-2">
              {(["user1", "user2", "user3", "user4"] as const).map((speaker) => {
                const meta = speakerMeta[speaker]
                const isSelected = activeSpeaker === speaker

                return (
                  <button
                    key={speaker}
                    type="button"
                    className={`flex h-10 w-full items-center gap-2 border px-4 text-left text-sm ${
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground"
                    } ${isRecording ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                    disabled={isRecording}
                    onClick={() => setActiveSpeaker(speaker)}
                  >
                    <UserRound className="size-4" />
                    {meta.label}
                  </button>
                )
              })}
            </div>

            <div className="rounded-sm border border-border/60 bg-muted/20 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Microphone Input
              </div>
              <select
                className="mt-3 h-10 w-full border border-border bg-background px-3 text-sm"
                disabled={isRecording || isInitializingDevices || audioInputs.length === 0}
                value={selectedDeviceId}
                onChange={(event) => {
                  setSelectedDeviceId(event.target.value)
                  const nextInput = audioInputs.find((input) => input.deviceId === event.target.value)
                  activeDeviceLabelRef.current = nextInput?.label ?? ""
                }}
              >
                {audioInputs.length === 0 ? (
                  <option value="">No microphone found</option>
                ) : (
                  audioInputs.map((input) => (
                    <option key={input.deviceId} value={input.deviceId} disabled={input.isBlocked}>
                      {input.label}{input.isBlocked ? " (blocked)" : ""}
                    </option>
                  ))
                )}
              </select>
              <div className="mt-3 text-sm text-muted-foreground">
                {isInitializingDevices
                  ? "Loading microphone devices..."
                  : selectedDevice
                    ? selectedDevice.isBlocked
                      ? `Blocked: ${selectedDevice.reason}`
                      : `Ready to record from ${selectedDevice.label}`
                    : "Choose a microphone input."}
              </div>
            </div>

            {blockedInputs.length > 0 && (
              <div className="rounded-sm border border-amber-300/60 bg-amber-100/70 px-3 py-2 text-sm text-amber-950">
                <div className="flex items-center gap-2 font-medium">
                  <ShieldAlert className="size-4" />
                  Blocked system-audio style inputs
                </div>
                <ul className="mt-2 list-disc pl-5">
                  {blockedInputs.map((input) => (
                    <li key={input.deviceId}>
                      {input.label}: {input.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-sm border border-border/60 bg-muted/20 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Active Speaker
              </div>
              <div className="mt-2 text-2xl font-semibold">
                {speakerMeta[activeSpeaker].label}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {isRecording
                  ? speechListening
                    ? "Recording and transcribing..."
                    : "Recording from selected microphone..."
                  : "Ready"}
              </div>
              <div className="mt-4 font-mono text-3xl">{formatElapsed(elapsed)}</div>
            </div>

            {isRecording && (
              <div className="rounded-sm border border-border/60 bg-background px-3 py-2 text-sm text-foreground">
                <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {speechListening ? <LoaderCircle className="size-3 animate-spin" /> : null}
                  Live Transcript
                </div>
                <div>
                  {liveTranscript || "Listening for speech..."}
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-sm border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            {!speechSupported && (
              <div className="rounded-sm border border-amber-300/60 bg-amber-100/70 px-3 py-2 text-sm text-amber-950">
                Browser speech transcript is not supported here. Audio recording still works.
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                className={`flex h-10 flex-1 items-center justify-center gap-2 border px-4 text-sm ${
                  isRecording || !canRecord
                    ? "cursor-not-allowed opacity-60"
                    : "cursor-pointer bg-primary text-primary-foreground"
                }`}
                disabled={isRecording || !canRecord}
                onClick={startRecording}
              >
                <Mic className="size-4" />
                Start Recording
              </button>

              <button
                type="button"
                className={`flex h-10 flex-1 items-center justify-center gap-2 border px-4 text-sm ${
                  !isRecording
                    ? "cursor-not-allowed opacity-60"
                    : "cursor-pointer border-destructive/40 bg-destructive/10 text-destructive"
                }`}
                disabled={!isRecording}
                onClick={stopRecording}
              >
                <Square className="size-4" />
                Stop
              </button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conversation Audio Turns</CardTitle>
            <CardDescription>
              Each saved turn keeps the speaker, time, device label, and audio preview. This mode is optimized for mic-only capture, not server transcription.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {turns.length === 0 ? (
              <div className="rounded-sm border border-dashed border-border/60 px-4 py-10 text-center text-sm text-muted-foreground">
                No turns yet. Record any user to begin.
              </div>
            ) : (
              turns.map((turn) => {
                const meta = speakerMeta[turn.speaker]

                return (
                  <div key={turn.id} className={`rounded-xl border px-5 py-4 shadow-lg shadow-black/10 ${meta.tone}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className={`text-sm font-semibold ${meta.toneAccent}`}>{meta.label}</div>
                      <div className={`text-xs ${meta.subtleText}`}>
                        {new Date(turn.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                    <div className={`mt-2 text-sm ${meta.toneAccent}`}>
                      Duration: {formatDuration(turn.durationSeconds)}
                    </div>
                    <div className={`mt-1 text-sm ${meta.subtleText}`}>
                      Input: {turn.deviceLabel}
                    </div>
                    <div className={`mt-3 rounded-lg border px-3 py-3 text-sm text-zinc-100 ${meta.transcriptTone}`}>
                      <div className={`mb-1 text-xs uppercase tracking-[0.2em] ${meta.subtleText}`}>
                        Transcript
                      </div>
                      <div className="leading-6 text-zinc-100">
                        {turn.transcript || "No transcript captured for this turn."}
                      </div>
                    </div>
                    <div className="mt-3 rounded-lg border border-white/10 bg-black/25 p-2">
                      <audio className="w-full" controls src={turn.audioUrl}>
                        <track kind="captions" />
                      </audio>
                    </div>
                  </div>
                )
              })
            )}

            {turns.length > 0 && (
              <button
                type="button"
                className="ml-auto flex h-9 items-center gap-2 border border-destructive/30 px-3 text-sm text-destructive"
                onClick={clearConversation}
              >
                <Trash2 className="size-4" />
                Clear conversation
              </button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
