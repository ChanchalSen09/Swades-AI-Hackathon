import { AppError } from "../lib/errors"

const MAX_AUDIO_BYTES = 25 * 1024 * 1024
const ALLOWED_SPEAKERS = new Set(["user1", "user2", "user3", "user4"])

type OpenAiTranscriptionResponse = {
  text?: string
  error?: {
    message?: string
  }
}

export type SpeakerId = "user1" | "user2" | "user3" | "user4"

export type TranscriptionResult = {
  speaker: SpeakerId
  text: string
}

const getOpenAiConfig = () => {
  const apiKey = process.env.OPENAI_API_KEY
  const model = process.env.OPENAI_TRANSCRIPTION_MODEL ?? "gpt-4o-mini-transcribe"

  if (!apiKey) {
    throw new AppError("OPENAI_API_KEY is not configured on the server", 500, "OPENAI_NOT_CONFIGURED")
  }

  return { apiKey, model }
}

const parseSpeaker = (speaker: string): SpeakerId => {
  if (!ALLOWED_SPEAKERS.has(speaker)) {
    throw new AppError("Speaker must be user1, user2, user3, or user4", 400, "INVALID_SPEAKER")
  }

  return speaker as SpeakerId
}

export const transcriptionService = {
  async transcribe(audioFile: File, speakerInput: string): Promise<TranscriptionResult> {
    const speaker = parseSpeaker(speakerInput)

    if (audioFile.size === 0) {
      throw new AppError("Audio file must not be empty", 400, "EMPTY_AUDIO")
    }

    if (audioFile.size > MAX_AUDIO_BYTES) {
      throw new AppError("Audio file must be 25 MB or smaller", 400, "AUDIO_TOO_LARGE")
    }

    const { apiKey, model } = getOpenAiConfig()

    const formData = new FormData()
    formData.append("file", audioFile, audioFile.name || "turn.webm")
    formData.append("model", model)

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    })

    const payload = (await response.json()) as OpenAiTranscriptionResponse

    if (!response.ok) {
      throw new AppError(
        payload.error?.message ?? "Transcription request failed",
        502,
        "TRANSCRIPTION_FAILED",
      )
    }

    const text = payload.text?.trim()

    if (!text) {
      throw new AppError("Transcription returned no text", 502, "EMPTY_TRANSCRIPTION")
    }

    return {
      speaker,
      text,
    }
  },
}
