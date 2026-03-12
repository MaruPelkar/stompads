export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; email: string; created_at: string }
        Insert: { id: string; email: string; created_at?: string }
        Update: { email?: string }
        Relationships: []
      }
      campaigns: {
        Row: {
          id: string
          user_id: string
          url: string
          brand_profile: Json | null
          status: 'draft' | 'generating' | 'preview_ready' | 'payment_pending' | 'generating_full' | 'ready' | 'live' | 'paused'
          daily_budget: number | null
          meta_campaign_id: string | null
          meta_adset_id: string | null
          stripe_payment_intent_id: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['campaigns']['Row'], 'id' | 'created_at'>
        Update: Partial<Omit<Database['public']['Tables']['campaigns']['Row'], 'id' | 'user_id'>>
        Relationships: [
          {
            foreignKeyName: 'campaigns_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      ads: {
        Row: {
          id: string
          campaign_id: string
          type: 'image' | 'video'
          is_preview: boolean
          fal_request_id: string | null
          asset_url: string | null
          meta_ad_id: string | null
          meta_creative_id: string | null
          status: 'generating' | 'ready' | 'live' | 'failed'
          prompt_used: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['ads']['Row'], 'id' | 'created_at'>
        Update: Partial<Omit<Database['public']['Tables']['ads']['Row'], 'id' | 'campaign_id'>>
        Relationships: [
          {
            foreignKeyName: 'ads_campaign_id_fkey'
            columns: ['campaign_id']
            isOneToOne: false
            referencedRelation: 'campaigns'
            referencedColumns: ['id']
          }
        ]
      }
      metrics: {
        Row: {
          id: string
          ad_id: string
          campaign_id: string
          impressions: number
          clicks: number
          ctr: number
          cpc: number
          spend: number
          recorded_at: string
        }
        Insert: Omit<Database['public']['Tables']['metrics']['Row'], 'id'>
        Update: never
        Relationships: [
          {
            foreignKeyName: 'metrics_ad_id_fkey'
            columns: ['ad_id']
            isOneToOne: false
            referencedRelation: 'ads'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'metrics_campaign_id_fkey'
            columns: ['campaign_id']
            isOneToOne: false
            referencedRelation: 'campaigns'
            referencedColumns: ['id']
          }
        ]
      }
      ad_library: {
        Row: {
          id: string
          category: string
          prompt: string
          visual_url: string | null
          notes: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['ad_library']['Row'], 'id' | 'created_at'>
        Update: Partial<Omit<Database['public']['Tables']['ad_library']['Row'], 'id'>>
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Campaign = Database['public']['Tables']['campaigns']['Row']
export type Ad = Database['public']['Tables']['ads']['Row']
export type Metrics = Database['public']['Tables']['metrics']['Row']
export type AdLibraryItem = Database['public']['Tables']['ad_library']['Row']

export interface BrandProfile {
  category: string
  tone: string
  target_audience: string
  key_value_props: string[]
  product_name: string
  competitor_ad_examples: string[]
}
