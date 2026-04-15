'use client'
import { useRef } from 'react'
import { UploadCloud } from 'lucide-react'

interface DropzoneProps {
  onFilesAdded: (files: File[]) => void
}

export default function Dropzone({ onFilesAdded }: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files).filter(
      (f) => f.name.endsWith('.nc') || f.name.endsWith('.gcode')
    )
    if (files.length > 0) onFilesAdded(files)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onFilesAdded(Array.from(e.target.files))
    }
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      onClick={() => inputRef.current?.click()}
      className="border-2 border-dashed border-sky-500 rounded-xl p-10 text-center cursor-pointer hover:border-sky-400 hover:bg-sky-950/30 transition-all"
    >
      <UploadCloud className="mx-auto mb-3 text-sky-400" size={48} />
      <p className="text-slate-300 font-medium">Drag &amp; drop your .nc / .gcode files here</p>
      <p className="text-slate-500 text-sm mt-1">or click to browse</p>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".nc,.gcode"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  )
}
