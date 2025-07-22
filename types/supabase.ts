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
          role: 'customer' | 'developer'
          subscription_plan: string | null
          subscription_active: boolean
          subscription_id: string | null
          credits: number
          total_spent: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          role?: 'customer' | 'developer'
          subscription_plan?: string | null
          subscription_active?: boolean
          subscription_id?: string | null
          credits?: number
          total_spent?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          role?: 'customer' | 'developer'
          subscription_plan?: string | null
          subscription_active?: boolean
          subscription_id?: string | null
          credits?: number
          total_spent?: number
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
          cover_image: string | null
          published: boolean
          featured: boolean
          download_count: number
          rating_avg: number
          rating_count: number
          developer_id: string
          bundle_eligible: boolean
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
          cover_image?: string | null
          published?: boolean
          featured?: boolean
          download_count?: number
          rating_avg?: number
          rating_count?: number
          developer_id: string
          bundle_eligible?: boolean
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
          cover_image?: string | null
          published?: boolean
          featured?: boolean
          download_count?: number
          rating_avg?: number
          rating_count?: number
          developer_id?: string
          bundle_eligible?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      integrations: {
        Row: {
          id: string
          name: string
          category: string
          type: 'trigger' | 'action' | 'both'
          auth_method: 'oauth' | 'api_key' | 'none'
          description: string
          logo_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          category: string
          type: 'trigger' | 'action' | 'both'
          auth_method: 'oauth' | 'api_key' | 'none'
          description: string
          logo_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          category?: string
          type?: 'trigger' | 'action' | 'both'
          auth_method?: 'oauth' | 'api_key' | 'none'
          description?: string
          logo_url?: string | null
          created_at?: string
        }
      }
      user_agents: {
        Row: {
          id: string
          user_id: string
          agent_id: string
          active: boolean
          webhook_id: string | null
          purchased_at: string
          last_run: string | null
          run_count: number
        }
        Insert: {
          id?: string
          user_id: string
          agent_id: string
          active?: boolean
          webhook_id?: string | null
          purchased_at?: string
          last_run?: string | null
          run_count?: number
        }
        Update: {
          id?: string
          user_id?: string
          agent_id?: string
          active?: boolean
          webhook_id?: string | null
          purchased_at?: string
          last_run?: string | null
          run_count?: number
        }
      }
      user_credentials: {
        Row: {
          id: string
          user_id: string
          integration_id: string
          credential_name: string
          encrypted_data: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          integration_id: string
          credential_name: string
          encrypted_data: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          integration_id?: string
          credential_name?: string
          encrypted_data?: string
          created_at?: string
          updated_at?: string
        }
      }
      agent_required_integrations: {
        Row: {
          id: string
          agent_id: string
          integration_id: string
          field_name: string
          instructions: string | null
        }
        Insert: {
          id?: string
          agent_id: string
          integration_id: string
          field_name: string
          instructions?: string | null
        }
        Update: {
          id?: string
          agent_id?: string
          integration_id?: string
          field_name?: string
          instructions?: string | null
        }
      }
      agent_reviews: {
        Row: {
          id: string
          agent_id: string
          user_id: string
          rating: number
          comment: string | null
          created_at: string
        }
        Insert: {
          id?: string
          agent_id: string
          user_id: string
          rating: number
          comment?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          agent_id?: string
          user_id?: string
          rating?: number
          comment?: string | null
          created_at?: string
        }
      }
      agent_logs: {
        Row: {
          id: string
          user_agent_id: string
          status: 'success' | 'error' | 'running'
          message: string | null
          execution_time: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_agent_id: string
          status: 'success' | 'error' | 'running'
          message?: string | null
          execution_time?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_agent_id?: string
          status?: 'success' | 'error' | 'running'
          message?: string | null
          execution_time?: number | null
          created_at?: string
        }
      }
    }
  }
}

export type Agent = Database['public']['Tables']['agents']['Row']
export type AgentInsert = Database['public']['Tables']['agents']['Insert']
export type AgentUpdate = Database['public']['Tables']['agents']['Update']

export type User = Database['public']['Tables']['users']['Row']
export type UserInsert = Database['public']['Tables']['users']['Insert']
export type UserUpdate = Database['public']['Tables']['users']['Update']

export type Integration = Database['public']['Tables']['integrations']['Row']
export type UserAgent = Database['public']['Tables']['user_agents']['Row']
export type UserCredential = Database['public']['Tables']['user_credentials']['Row']
export type AgentReview = Database['public']['Tables']['agent_reviews']['Row']
export type AgentLog = Database['public']['Tables']['agent_logs']['Row']

// Extended types with relations
export interface AgentWithDeveloper extends Agent {
  developer: {
    email: string
  }
  reviews: AgentReview[]
  required_integrations: Array<{
    integration: Integration
    field_name: string
    instructions: string | null
  }>
}

export interface UserAgentWithDetails extends UserAgent {
  agent: AgentWithDeveloper
  logs: AgentLog[]
}
