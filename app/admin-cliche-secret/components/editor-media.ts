"use client"

/**
 * Manejo de imágenes pegadas o arrastradas en los editores Tiptap del panel
 * (blog y páginas de producto). Sin esto, pegar una imagen insertaba un
 * blob:/data: local que muere al guardar (el ícono roto): aquí la imagen se
 * SUBE a Supabase Storage y se inserta su URL pública definitiva.
 */

import type { EditorView } from "@tiptap/pm/view"
import TiptapImage from "@tiptap/extension-image"
import { subirImagen } from "@/lib/admin-upload"

/**
 * Imagen del editor que CONSERVA width/height. La extensión estándar de
 * Tiptap solo guarda src/alt/title: cualquier dimensión que traiga la imagen
 * (pegada, importada de un .docx o escrita en el HTML) se perdía al guardar y
 * la publicación no era fiel al tamaño adjuntado.
 */
export const ImagenFiel = TiptapImage.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: { default: null },
      height: { default: null },
      // Posición de la imagen (izquierda/centro/derecha). Se guarda como
      // clase (blog-img-left/right) para que la publicación la respete tal
      // cual; también se puede arrastrar la imagen dentro del texto.
      align: {
        default: "center",
        parseHTML: (el: HTMLElement) => el.getAttribute("class")?.match(/blog-img-(left|right)/)?.[1] || "center",
        renderHTML: (attrs: { align?: string }) =>
          attrs.align === "left" || attrs.align === "right" ? { class: `blog-img-${attrs.align}` } : {},
      },
    }
  },
}).configure({ HTMLAttributes: { class: "blog-img" } })

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
