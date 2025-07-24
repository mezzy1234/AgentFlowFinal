// Simple Runtime Manager - Works with ultra-simple schema
import { createClient } from '@supabase/supabase-js'

export class SimpleRuntimeManager {
  private supabase: any

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey)
  }

  // Create a new runtime
  async createRuntime(runtimeName: string, memoryMb: number = 256) {
    try {
      const { data, error } = await this.supabase
        .from('runtime_data')
        .insert([
          {
            runtime_name: runtimeName,
            memory_mb: memoryMb,
            status: 'active',
            data: {}
          }
        ])
        .select()

      if (error) throw error
      
      console.log(`✅ Runtime created: ${runtimeName}`)
      return data[0]
    } catch (error) {
      console.error('❌ Error creating runtime:', error)
      throw error
    }
  }

  // Get all runtimes for current user
  async getRuntimes() {
    try {
      const { data, error } = await this.supabase
        .from('runtime_data')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    } catch (error) {
      console.error('❌ Error fetching runtimes:', error)
      throw error
    }
  }

  // Update runtime status
  async updateRuntimeStatus(id: number, status: string) {
    try {
      const { data, error } = await this.supabase
        .from('runtime_data')
        .update({ status })
        .eq('id', id)
        .select()

      if (error) throw error
      
      console.log(`✅ Runtime status updated: ${status}`)
      return data[0]
    } catch (error) {
      console.error('❌ Error updating runtime:', error)
      throw error
    }
  }

  // Delete runtime
  async deleteRuntime(id: number) {
    try {
      const { error } = await this.supabase
        .from('runtime_data')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      console.log(`✅ Runtime deleted: ${id}`)
      return true
    } catch (error) {
      console.error('❌ Error deleting runtime:', error)
      throw error
    }
  }

  // Get runtime metrics
  async getRuntimeMetrics() {
    try {
      const { data, error } = await this.supabase
        .from('runtime_data')
        .select('status, memory_mb, created_at')

      if (error) throw error

      const metrics = {
        total: data.length,
        active: data.filter((r: any) => r.status === 'active').length,
        totalMemory: data.reduce((sum: number, r: any) => sum + r.memory_mb, 0),
        averageMemory: data.length > 0 ? Math.round(data.reduce((sum: number, r: any) => sum + r.memory_mb, 0) / data.length) : 0
      }

      return metrics
    } catch (error) {
      console.error('❌ Error fetching metrics:', error)
      throw error
    }
  }
}
