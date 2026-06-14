// ── Procesamiento de media entrante (audio e imágenes) ────────────────────────
// La media de WhatsApp llega encriptada; primero se desencripta con WaSenderAPI
// (decryptWasenderMedia → URL pública temporal) y luego:
//  - audio  → transcripción con Whisper (Groq)
//  - imagen → descripción con un modelo de visión (Groq Llama-4 Scout)

const GROQ = "https://api.groq.com/openai/v1"

/** Transcribe una nota de voz a texto (español). Devuelve null si falla. */
export async function transcribeAudio(audioUrl: string): Promise<string | null> {
  const key = process.env.GROQ_API_KEY
  if (!key) return null
  try {
    const audioRes = await fetch(audioUrl, { signal: AbortSignal.timeout(15000) })
    if (!audioRes.ok) return null
    const buf = Buffer.from(await audioRes.arrayBuffer())
    const form = new FormData()
    form.append("file", new Blob([buf]), "audio.ogg")
    form.append("model", "whisper-large-v3")
    form.append("language", "es")
    const res = await fetch(`${GROQ}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
      signal: AbortSignal.timeout(30000),
    })
    if (!res.ok) {
      console.warn("[media] whisper", res.status, (await res.text().catch(() => "")).slice(0, 120))
      return null
    }
    const data = await res.json().catch(() => null)
    return (data?.text as string | undefined)?.trim() || null
  } catch (e) {
    console.warn("[media] transcribe falló:", (e as Error).message)
    return null
  }
}

/** Describe lo relevante de una imagen para asesorar. Devuelve null si falla. */
export async function describeImage(imageUrl: string, caption = ""): Promise<string | null> {
  const key = process.env.GROQ_API_KEY
  if (!key) return null
  try {
    const res = await fetch(`${GROQ}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text:
                  `Apoyas a una asesora de aromas/sprays para marcas. En 1-2 frases di QUÉ muestra esta imagen y qué es relevante para asesorar: ¿es un producto, un logo/marca, un espacio o local, una captura/pantallazo, un comprobante de pago? Si hay texto visible, transcríbelo corto. Mensaje del cliente: "${caption}"`,
              },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        max_tokens: 250,
        temperature: 0.2,
      }),
      signal: AbortSignal.timeout(30000),
    })
    if (!res.ok) {
      console.warn("[media] vision", res.status, (await res.text().catch(() => "")).slice(0, 120))
      return null
    }
    const data = await res.json().catch(() => null)
    return (data?.choices?.[0]?.message?.content as string | undefined)?.trim() || null
  } catch (e) {
    console.warn("[media] vision falló:", (e as Error).message)
    return null
  }
}
