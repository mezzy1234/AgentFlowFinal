import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          role: 'customer' | 'developer' | 'admin'
          plan: string | null
          stripe_customer_id: string | null
          subscription_id: string | null
          active_until: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          role?: 'customer' | 'developer' | 'admin'
          plan?: string | null
          stripe_customer_id?: string | null
          subscription_id?: string | null
          active_until?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          role?: 'customer' | 'developer' | 'admin'
          plan?: string | null
          stripe_customer_id?: string | null
          subscription_id?: string | null
          active_until?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      agents: {
        Row: {
          id: string
          name: string
          description: string
          price_one_time: number | null
          price_monthly: number | null
          webhook_url: string
          tags: string[]
          category: string
          use_case: string
          warnings: string | null
          cover_image: string | null
          published: boolean
          developer_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description: string
          price_one_time?: number | null
          price_monthly?: number | null
          webhook_url: string
          tags?: string[]
          category: string
          use_case: string
          warnings?: string | null
          cover_image?: string | null
          published?: boolean
          developer_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          price_one_time?: number | null
          price_monthly?: number | null
          webhook_url?: string
          tags?: string[]
          category?: string
          use_case?: string
          warnings?: string | null
          cover_image?: string | null
          published?: boolean
          developer_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      integrations: {
        Row: {
          id: string
          name: string
          category: string
          type: string
          auth_method: string
          logo_url: string | null
          description: string | null
          hidden: boolean
          last_synced: string | null
        }
        Insert: {
          id?: string
          name: string
          category: string
          type: string
          auth_method: string
          logo_url?: string | null
          description?: string | null
          hidden?: boolean
          last_synced?: string | null
        }
        Update: {
          id?: string
          name?: string
          category?: string
          type?: string
          auth_method?: string
          logo_url?: string | null
          description?: string | null
          hidden?: boolean
          last_synced?: string | null
        }
      }
      user_agents: {
        Row: {
          id: string
          user_id: string
          agent_id: string
          purchase_date: string
          subscription_id: string | null
          active: boolean
          status: 'pending' | 'ready' | 'running' | 'error'
        }
        Insert: {
          id?: string
          user_id: string
          agent_id: string
          purchase_date?: string
          subscription_id?: string | null
          active?: boolean
          status?: 'pending' | 'ready' | 'running' | 'error'
        }
        Update: {
          id?: string
          user_id?: string
          agent_id?: string
          purchase_date?: string
          subscription_id?: string | null
          active?: boolean
          status?: 'pending' | 'ready' | 'running' | 'error'
        }
      }
      user_credentials: {
        Row: {
          id: string
          user_id: string
          integration_id: string
          key_name: string
          value: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          integration_id: string
          key_name: string
          value: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          integration_id?: string
          key_name?: string
          value?: string
          created_at?: string
          updated_at?: string
        }
      }
      agent_required_integrations: {
        Row: {
          id: string
          agent_id: string
          integration_id: string
          required: boolean
        }
        Insert: {
          id?: string
          agent_id: string
          integration_id: string
          required?: boolean
        }
        Update: {
          id?: string
          agent_id?: string
          integration_id?: string
          required?: boolean
        }
      }
    }
  }
}
