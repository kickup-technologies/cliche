import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

// POST /api/reviews/upload
// Receives multipart/form-data with files[], returns array of public URLs
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const files = formData.getAll("files") as File[]

    if (!files.length) {
      return NextResponse.json({ error: "No files received" }, { status: 400 })
    }

    const db = createServerClient()
    const urls: string[] = []

    for (const file of files) {
      const ext = file.name.split(".").pop() ?? "bin"
      const path = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
      const buffer = Buffer.from(await file.arrayBuffer())

      const { error } = await db.storage
        .from("review-media")
        .upload(path, buffer, {
          contentType: file.type,
          upsert: false,
        })

      if (error) {
        console.error("[upload] storage error:", error)
        continue
      }

      const { data } = db.storage.from("review-media").getPublicUrl(path)
      urls.push(data.publicUrl)
    }

    return NextResponse.json({ urls })
  } catch (err) {
    console.error("[reviews/upload]", err)
    return NextResponse.json({ error: "Error al subir archivos" }, { status: 500 })
  }
}
