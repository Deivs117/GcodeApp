'use client'
import { useState, useEffect, useCallback } from 'react'
import { Users, Plus, Pencil, Trash2, AlertCircle, X, Check } from 'lucide-react'
import {
  listClients,
  createClient,
  updateClient,
  deleteClient,
  type Client,
} from '@/services/cncApi'

interface ClientFormData {
  name: string
  company: string
  contact: string
  email: string
}

const emptyForm: ClientFormData = { name: '', company: '', contact: '', email: '' }

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)
  const [form, setForm] = useState<ClientFormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const fetchClients = useCallback(async () => {
    try {
      setLoadError(null)
      setClients(await listClients())
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load clients')
    }
  }, [])

  useEffect(() => { fetchClients() }, [fetchClients])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setFormError(null)
    setFormOpen(true)
  }

  const openEdit = (client: Client) => {
    setEditing(client)
    setForm({ name: client.name, company: client.company, contact: client.contact, email: client.email })
    setFormError(null)
    setFormOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { setFormError('Name is required'); return }
    setSaving(true)
    setFormError(null)
    try {
      if (editing) {
        await updateClient(editing.id, form)
      } else {
        await createClient(form)
      }
      setFormOpen(false)
      await fetchClients()
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this client? All linked orders and sessions will also be removed.')) return
    try {
      await deleteClient(id)
      await fetchClients()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 py-8 px-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users className="text-emerald-400" size={28} />
            <h1 className="text-2xl font-bold text-white">Clients</h1>
          </div>
          <p className="text-slate-400 text-sm">Manage customer records for production traceability</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
        >
          <Plus size={15} />
          New Client
        </button>
      </div>

      {/* Error */}
      {loadError && (
        <div className="mb-6 flex items-center gap-2 bg-amber-900/20 border border-amber-700/50 text-amber-300 rounded-xl p-4 text-sm">
          <AlertCircle size={16} />
          <span>{loadError} — Make sure the backend and database are running.</span>
        </div>
      )}

      {/* Client list */}
      {clients.length === 0 && !loadError ? (
        <div className="text-center py-20">
          <Users size={48} className="text-slate-700 mx-auto mb-4" />
          <p className="text-slate-500 text-lg">No clients yet</p>
          <p className="text-slate-600 text-sm mt-1">Click &ldquo;New Client&rdquo; to add one</p>
        </div>
      ) : (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-900/50">
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Name</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Company</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Contact</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Email</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Created</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client, idx) => (
                  <tr
                    key={client.id}
                    className={`border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors ${idx % 2 === 0 ? '' : 'bg-slate-800/30'}`}
                  >
                    <td className="px-4 py-3 text-slate-200 font-medium">{client.name}</td>
                    <td className="px-4 py-3 text-slate-400">{client.company || <span className="text-slate-600">—</span>}</td>
                    <td className="px-4 py-3 text-slate-400">{client.contact || <span className="text-slate-600">—</span>}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{client.email || <span className="text-slate-600">—</span>}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{new Date(client.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(client)}
                          title="Edit client"
                          className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(client.id)}
                          title="Delete client"
                          className="p-1.5 rounded-lg bg-red-900/30 hover:bg-red-900/50 text-red-400 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / Edit modal */}
      {formOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && setFormOpen(false)}
        >
          <div className="bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl border border-slate-700">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <Users className="text-emerald-400" size={20} />
                <h2 className="text-white font-semibold text-lg">{editing ? 'Edit Client' : 'New Client'}</h2>
              </div>
              <button onClick={() => setFormOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {formError && (
                <p className="text-red-400 text-sm bg-red-900/20 border border-red-800/50 rounded-lg px-3 py-2">{formError}</p>
              )}
              {(['name', 'company', 'contact', 'email'] as const).map((field) => (
                <div key={field}>
                  <label className="block text-slate-300 text-sm font-medium mb-1 capitalize">
                    {field}{field === 'name' && <span className="text-red-400 ml-0.5">*</span>}
                  </label>
                  <input
                    type={field === 'email' ? 'email' : 'text'}
                    value={form[field]}
                    onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                    placeholder={field === 'name' ? 'Full name' : field === 'company' ? 'Company or organization' : field === 'contact' ? 'Phone or contact info' : 'email@example.com'}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setFormOpen(false)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium py-2.5 rounded-xl text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-900 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
                >
                  <Check size={15} />
                  {saving ? 'Saving…' : editing ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
