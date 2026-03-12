'use client'

import { useState, useEffect } from 'react'
import type { AdLibraryItem } from '@/types/database'

export default function AdminLibraryPage() {
  const [items, setItems] = useState<AdLibraryItem[]>([])
  const [category, setCategory] = useState('')
  const [prompt, setPrompt] = useState('')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/library')
      .then(r => r.json())
      .then(d => setItems(d.items || []))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const formData = new FormData()
    formData.append('category', category)
    formData.append('prompt', prompt)
    formData.append('notes', notes)
    if (file) formData.append('visual', file)

    const res = await fetch('/api/admin/library', { method: 'POST', body: formData })
    const data = await res.json()

    if (!res.ok) {
      setMessage(`Error: ${data.error}`)
    } else {
      setItems(prev => [data.item, ...prev])
      setCategory('')
      setPrompt('')
      setNotes('')
      setFile(null)
      setMessage('Template saved!')
    }
    setLoading(false)
  }

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-bold">Ad Template Library</h1>

      <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        <h2 className="font-semibold">Add New Template</h2>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Category</label>
          <input
            value={category}
            onChange={e => setCategory(e.target.value)}
            required
            placeholder="e.g. ecommerce, saas, fitness"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Prompt Inspiration</label>
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            required
            rows={4}
            placeholder="Describe the style, format, and feel of this ad template..."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Notes (optional)</label>
          <input
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Why this works, when to use it..."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Reference Visual (optional)</label>
          <input
            type="file"
            accept="image/*,video/*"
            onChange={e => setFile(e.target.files?.[0] || null)}
            className="text-gray-400"
          />
        </div>
        {message && <p className="text-sm text-green-400">{message}</p>}
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold px-6 py-2 rounded-lg transition"
        >
          {loading ? 'Saving...' : 'Save Template'}
        </button>
      </form>

      <div className="space-y-3">
        {items.map(item => (
          <div key={item.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex justify-between">
              <span className="text-xs uppercase text-blue-400 tracking-wide">{item.category}</span>
              <span className="text-xs text-gray-500">{new Date(item.created_at).toLocaleDateString()}</span>
            </div>
            <p className="text-sm text-gray-300 mt-2 line-clamp-2">{item.prompt}</p>
            {item.notes && <p className="text-xs text-gray-500 mt-1">{item.notes}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}
