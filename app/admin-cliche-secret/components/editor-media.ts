"use client"

/**
 * Manejo de imágenes pegadas o arrastradas en los editores Tiptap del panel
 * (blog y páginas de producto). Sin esto, pegar una imagen insertaba un
 * blob:/data: local que muere al guardar (el ícono roto): aquí la imagen se
 * SUBE a Supabase Storage y se inserta su URL pública definitiva.
 */

import type { EditorView } from "@tiptap/pm/view"
import { subirImagen } from "@/lib/admin-upload"

async function uploadAndInsert(view: EditorView, files: File[], onError: (msg: string) => void) {
  for (const f of files) {
    const r = await subirImagen(f)
    if ("error" in r) { onError(r.error); continue }
    const { schema } = view.state
    const node = schema.nodes.image?.create({ src: r.url })
    if (node) view.dispatch(view.state.tr.replaceSelectionWith(node).scrollIntoView())
  }
}

function imageFiles(list: FileList | undefined | null): File[] {
  return Array.from(list || []).filter((f) => f.type.startsWith("image/"))
}

/** editorProps con pegado y arrastre de imágenes que suben al servidor. */
export function imagePasteDropProps(onError: (msg: string) => void) {
  return {
    handlePaste(view: EditorView, event: ClipboardEvent): boolean {
      const files = imageFiles(event.clipboardData?.files)
      if (!files.length) return false
      event.preventDefault()
      void uploadAndInsert(view, files, onError)
      return true
    },
    handleDrop(view: EditorView, event: DragEvent): boolean {
      const files = imageFiles(event.dataTransfer?.files)
      if (!files.length) return false
      event.preventDefault()
      void uploadAndInsert(view, files, onError)
      return true
    },
  }
}

/** base64 → File, para subir las imágenes embebidas de un .docx importado. */
export function base64ToFile(base64: string, contentType: string): File {
  const bin = atob(base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  const ext = (contentType.split("/")[1] || "png").split("+")[0]
  return new File([bytes], `importada-${Date.now()}.${ext}`, { type: contentType })
}
