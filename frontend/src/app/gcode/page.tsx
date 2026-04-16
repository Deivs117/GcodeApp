'use client'
import { useState } from 'react'
import { Download, Code2, CheckCircle2, AlertCircle } from 'lucide-react'
import Dropzone from '@/components/Dropzone'
import FileList from '@/components/FileList'
import ProcessToggle from '@/components/ProcessToggle'
import { processFiles, type ProcessResult } from '@/services/api'

export default function GcodePage() {
  const [files, setFiles] = useState<File[]>([])
  const [filterM0M6, setFilterM0M6] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ProcessResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFilesAdded = (newFiles: File[]) => {
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name))
      return [...prev, ...newFiles.filter((f) => !existing.has(f.name))]
    })
  }

  const handleProcess = async () => {
    if (files.length === 0) return
    setLoading(true)
    setResult(null)
    setError(null)
    try {
      const order = files.map((f) => f.name)
      const res = await processFiles(files, order, filterM0M6)
      setResult(res)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = () => {
    if (!result) return
    const blob = new Blob([result.output], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = result.fileName
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-slate-950 py-10 px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Code2 className="text-sky-400" size={32} />
            <h1 className="text-3xl font-bold text-white">G-Code Tool</h1>
          </div>
          <p className="text-slate-400">Concatenate and filter CNC G-Code / NC files</p>
        </div>

        {/* Dropzone */}
        <Dropzone onFilesAdded={handleFilesAdded} />

        {/* File List */}
        <FileList
          files={files}
          onReorder={setFiles}
          onRemove={(idx) => setFiles((prev) => prev.filter((_, i) => i !== idx))}
        />

        {/* Options */}
        {files.length > 0 && (
          <div className="mt-6 space-y-3">
            <h2 className="text-slate-400 text-sm font-semibold uppercase tracking-wider">
              Processing Options
            </h2>
            <ProcessToggle
              label="Filter M0 & M6 commands"
              description="Removes exact M0 (pause) and M6 (tool change) tokens. M03, M04, M06 are preserved."
              checked={filterM0M6}
              onChange={setFilterM0M6}
            />
          </div>
        )}

        {/* Process Button */}
        {files.length > 0 && (
          <button
            onClick={handleProcess}
            disabled={loading}
            className="mt-6 w-full bg-sky-500 hover:bg-sky-400 disabled:bg-sky-800 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                Processing...
              </>
            ) : (
              <>
                <Code2 size={18} />
                Process {files.length} file{files.length !== 1 ? 's' : ''}
              </>
            )}
          </button>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 flex items-center gap-2 bg-red-900/30 border border-red-700 text-red-300 rounded-lg p-4">
            <AlertCircle size={18} />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="mt-6 bg-slate-800 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="text-emerald-400" size={20} />
              <h2 className="text-white font-semibold">Processing Complete</h2>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-slate-700 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-white">{result.totalLines}</p>
                <p className="text-slate-400 text-xs mt-1">Lines processed</p>
              </div>
              <div className="bg-slate-700 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-amber-400">{result.filteredLines}</p>
                <p className="text-slate-400 text-xs mt-1">M0/M6 commands removed</p>
              </div>
            </div>
            <button
              onClick={handleDownload}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Download size={18} />
              Download {result.fileName}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
