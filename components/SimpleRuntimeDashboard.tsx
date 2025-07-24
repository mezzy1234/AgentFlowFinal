'use client'

import { useState, useEffect } from 'react'
import { SimpleRuntimeManager } from '@/lib/runtime/simple-manager'

interface Runtime {
  id: number
  runtime_name: string
  status: string
  memory_mb: number
  created_at: string
  data: any
}

interface Metrics {
  total: number
  active: number
  totalMemory: number
  averageMemory: number
}

export default function SimpleRuntimeDashboard() {
  const [runtimes, setRuntimes] = useState<Runtime[]>([])
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newRuntimeName, setNewRuntimeName] = useState('')

  // Initialize runtime manager (you'll need to provide your Supabase credentials)
  const runtimeManager = new SimpleRuntimeManager(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  )

  const loadData = async () => {
    try {
      setLoading(true)
      const [runtimeData, metricsData] = await Promise.all([
        runtimeManager.getRuntimes(),
        runtimeManager.getRuntimeMetrics()
      ])
      setRuntimes(runtimeData)
      setMetrics(metricsData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const createRuntime = async () => {
    if (!newRuntimeName.trim()) return
    
    try {
      setCreating(true)
      await runtimeManager.createRuntime(newRuntimeName)
      setNewRuntimeName('')
      await loadData() // Refresh data
    } catch (error) {
      console.error('Error creating runtime:', error)
    } finally {
      setCreating(false)
    }
  }

  const updateStatus = async (id: number, status: string) => {
    try {
      await runtimeManager.updateRuntimeStatus(id, status)
      await loadData() // Refresh data
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  const deleteRuntime = async (id: number) => {
    if (!confirm('Are you sure you want to delete this runtime?')) return
    
    try {
      await runtimeManager.deleteRuntime(id)
      await loadData() // Refresh data
    } catch (error) {
      console.error('Error deleting runtime:', error)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Agent Runtime Dashboard</h1>
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Agent Runtime Dashboard</h1>

      {/* Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-100 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-800">Total Runtimes</h3>
            <p className="text-2xl font-bold text-blue-900">{metrics.total}</p>
          </div>
          <div className="bg-green-100 p-4 rounded-lg">
            <h3 className="font-semibold text-green-800">Active Runtimes</h3>
            <p className="text-2xl font-bold text-green-900">{metrics.active}</p>
          </div>
          <div className="bg-purple-100 p-4 rounded-lg">
            <h3 className="font-semibold text-purple-800">Total Memory</h3>
            <p className="text-2xl font-bold text-purple-900">{metrics.totalMemory}MB</p>
          </div>
          <div className="bg-orange-100 p-4 rounded-lg">
            <h3 className="font-semibold text-orange-800">Avg Memory</h3>
            <p className="text-2xl font-bold text-orange-900">{metrics.averageMemory}MB</p>
          </div>
        </div>
      )}

      {/* Create New Runtime */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-3">Create New Runtime</h2>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Runtime name..."
            value={newRuntimeName}
            onChange={(e) => setNewRuntimeName(e.target.value)}
            className="flex-1 px-3 py-2 border rounded-md"
            disabled={creating}
          />
          <button
            onClick={createRuntime}
            disabled={creating || !newRuntimeName.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>

      {/* Runtimes List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Active Runtimes</h2>
        </div>
        
        {runtimes.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No runtimes found. Create your first runtime above!
          </div>
        ) : (
          <div className="divide-y">
            {runtimes.map((runtime) => (
              <div key={runtime.id} className="p-4 flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-medium">{runtime.runtime_name}</h3>
                  <p className="text-sm text-gray-500">
                    Memory: {runtime.memory_mb}MB • 
                    Created: {new Date(runtime.created_at).toLocaleString()}
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    runtime.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {runtime.status}
                  </span>
                  
                  <select
                    value={runtime.status}
                    onChange={(e) => updateStatus(runtime.id, e.target.value)}
                    className="text-xs border rounded px-2 py-1"
                  >
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="stopped">Stopped</option>
                  </select>
                  
                  <button
                    onClick={() => deleteRuntime(runtime.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
