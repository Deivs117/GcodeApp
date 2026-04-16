'use client'
import { useState, useEffect, useCallback } from 'react'
import { ShoppingBag, Plus, Pencil, Trash2, AlertCircle, X, Check } from 'lucide-react'
import {
  listClients,
  listPcbVersions,
  createPcbVersion,
  updatePcbVersion,
  deletePcbVersion,
  type Client,
  type PcbVersion,
} from '@/services/cncApi'

interface OrderFormData {
  orderNumber: string
  version: string
  clientId: string
}

const emptyForm: OrderFormData = { orderNumber: '', version: '', clientId: '' }

export default function OrdersPage() {
  const [orders, setOrders] = useState<PcbVersion[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<PcbVersion | null>(null)
  const [form, setForm] = useState<OrderFormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoadError(null)
      const [o, c] = await Promise.all([listPcbVersions(), listClients()])
      setOrders(o)
      setClients(c)
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load data')
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setFormError(null)
    setFormOpen(true)
  }

  const openEdit = (order: PcbVersion) => {
    setEditing(order)
    setForm({ orderNumber: order.orderNumber, version: order.version, clientId: order.clientId })
    setFormError(null)
    setFormOpen(true)
  }

  const handleSave = async () => {
    if (!form.version.trim()) { setFormError('Version is required'); return }
    if (!form.clientId) { setFormError('Client is required'); return }
    setSaving(true)
    setFormError(null)
    try {
      if (editing) {
        await updatePcbVersion(editing.id, form)
      } else {
        await createPcbVersion(form)
      }
      setFormOpen(false)
      await fetchData()
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this order? Machining sessions linked to it will lose this reference.')) return
    try {
      await deletePcbVersion(id)
      await fetchData()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  const clientName = (id: string) => clients.find((c) => c.id === id)?.name ?? '—'

  return (
    <div className="min-h-screen bg-slate-950 py-8 px-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShoppingBag className="text-amber-400" size={28} />
            <h1 className="text-2xl font-bold text-white">Orders</h1>
          </div>
          <p className="text-slate-400 text-sm">Manage PCB orders linked to clients, with version tracking</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
        >
          <Plus size={15} />
          New Order
        </button>
      </div>

      {/* Error */}
      {loadError && (
        <div className="mb-6 flex items-center gap-2 bg-amber-900/20 border border-amber-700/50 text-amber-300 rounded-xl p-4 text-sm">
          <AlertCircle size={16} />
          <span>{loadError} — Make sure the backend and database are running.</span>
        </div>
      )}

      {/* Orders list */}
      {orders.length === 0 && !loadError ? (
        <div className="text-center py-20">
          <ShoppingBag size={48} className="text-slate-700 mx-auto mb-4" />
          <p className="text-slate-500 text-lg">No orders yet</p>
          <p className="text-slate-600 text-sm mt-1">Click &ldquo;New Order&rdquo; to add one</p>
        </div>
      ) : (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-900/50">
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Order #</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Version</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Client</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Created</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order, idx) => (
                  <tr
                    key={order.id}
                    className={`border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors ${idx % 2 === 0 ? '' : 'bg-slate-800/30'}`}
                  >
                    <td className="px-4 py-3 text-slate-300 font-mono text-xs">
                      {order.orderNumber || <span className="text-slate-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-200 font-medium">
                      <span className="bg-slate-700 text-sky-300 px-2 py-0.5 rounded text-xs font-mono">
                        {order.version}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{clientName(order.clientId)}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{new Date(order.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(order)}
                          title="Edit order"
                          className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(order.id)}
                          title="Delete order"
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
                <ShoppingBag className="text-amber-400" size={20} />
                <h2 className="text-white font-semibold text-lg">{editing ? 'Edit Order' : 'New Order'}</h2>
              </div>
              <button onClick={() => setFormOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {formError && (
                <p className="text-red-400 text-sm bg-red-900/20 border border-red-800/50 rounded-lg px-3 py-2">{formError}</p>
              )}
              {/* Client selector */}
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-1">
                  Client <span className="text-red-400">*</span>
                </label>
                <select
                  value={form.clientId}
                  onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">— Select client —</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}{c.company ? ` · ${c.company}` : ''}</option>
                  ))}
                </select>
              </div>
              {/* Order number */}
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-1">Order Number</label>
                <input
                  type="text"
                  value={form.orderNumber}
                  onChange={(e) => setForm((f) => ({ ...f, orderNumber: e.target.value }))}
                  placeholder="e.g. ORD-2025-001"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              {/* Version */}
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-1">
                  Version <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.version}
                  onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))}
                  placeholder="e.g. V1, V2.1, R3-beta"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
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
                  className="flex-1 flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-900 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
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
