'use client'
import { ArrowUp, ArrowDown, X, FileCode } from 'lucide-react'

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface FileListProps {
  files: File[]
  onReorder: (files: File[]) => void
  onRemove: (index: number) => void
}

export default function FileList({ files, onReorder, onRemove }: FileListProps) {
  const move = (from: number, to: number) => {
    const arr = [...files]
    const [item] = arr.splice(from, 1)
    arr.splice(to, 0, item)
    onReorder(arr)
  }

  if (files.length === 0) return null

  return (
    <div className="mt-4 space-y-2">
      <h2 className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-2">
        Files to process ({files.length})
      </h2>
      {files.map((file, idx) => (
        <div
          key={`${file.name}-${idx}`}
          className="flex items-center gap-3 bg-slate-800 rounded-lg px-4 py-3"
        >
          <FileCode className="text-sky-400 shrink-0" size={18} />
          <span className="flex-1 text-slate-200 text-sm truncate">{file.name}</span>
          <span className="text-slate-500 text-xs shrink-0">{formatSize(file.size)}</span>
          <div className="flex gap-1 ml-2">
            <button
              onClick={() => move(idx, idx - 1)}
              disabled={idx === 0}
              className="p-1 rounded hover:bg-slate-700 disabled:opacity-30 transition"
              title="Move up"
            >
              <ArrowUp size={14} className="text-slate-400" />
            </button>
            <button
              onClick={() => move(idx, idx + 1)}
              disabled={idx === files.length - 1}
              className="p-1 rounded hover:bg-slate-700 disabled:opacity-30 transition"
              title="Move down"
            >
              <ArrowDown size={14} className="text-slate-400" />
            </button>
            <button
              onClick={() => onRemove(idx)}
              className="p-1 rounded hover:bg-red-900/40 transition"
              title="Remove"
            >
              <X size={14} className="text-red-400" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
