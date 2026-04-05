import { Hono } from "hono"

import { AppError } from "../lib/errors"
import { respondWithError } from "../lib/http"
import { transcriptionService } from "../services/transcription-service"

export const transcriptionsRouter = new Hono()

transcriptionsRouter.post("/", async (c) => {
  try {
    const formData = await c.req.formData()
    const speaker = formData.get("speaker")
    const audio = formData.get("audio")

    if (typeof speaker !== "string") {
      throw new AppError("speaker is required", 400, "MISSING_SPEAKER")
    }

    if (!(audio instanceof File)) {
      throw new AppError("audio file is required", 400, "MISSING_AUDIO")
    }

    const result = await transcriptionService.transcribe(audio, speaker)

    return c.json({
      ok: true,
      result,
    })
  } catch (error) {
    return respondWithError(c, error)
  }
})
