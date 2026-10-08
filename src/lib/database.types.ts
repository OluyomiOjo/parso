// Generated from the Supabase schema (generate_typescript_types). Regenerate after each migration.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      collections: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_smart: boolean
          name: string
          position: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_smart?: boolean
          name: string
          position?: number | null
          user_id?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_smart?: boolean
          name?: string
          position?: number | null
          user_id?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          created_at: string
          id: number
          kind: string | null
          name: string
          source: string | null
          user_id: string
          via: string | null
        }
        Insert: {
          created_at?: string
          id?: never
          kind?: string | null
          name: string
          source?: string | null
          user_id?: string
          via?: string | null
        }
        Update: {
          created_at?: string
          id?: never
          kind?: string | null
          name?: string
          source?: string | null
          user_id?: string
          via?: string | null
        }
        Relationships: []
      }
      saves: {
        Row: {
          author_handle: string | null
          collection_id: string | null
          created_at: string
          edited_at: string | null
          embedding: string | null
          fts: unknown
          id: string
          kind: string
          note: string | null
          pinned: boolean
          preview_image_url: string | null
          processed_at: string | null
          raw_text: string | null
          reminder_at: string | null
          snippet: string | null
          source: string
          summary: string | null
          tags: string[]
          thumbnail_height: number | null
          thumbnail_path: string | null
          thumbnail_width: number | null
          title: string | null
          url: string | null
          user_id: string
        }
        Insert: {
          author_handle?: string | null
          collection_id?: string | null
          created_at?: string
          edited_at?: string | null
          embedding?: string | null
          fts?: unknown
          id?: string
          kind: string
          note?: string | null
          pinned?: boolean
          preview_image_url?: string | null
          processed_at?: string | null
          raw_text?: string | null
          reminder_at?: string | null
          snippet?: string | null
          source?: string
          summary?: string | null
          tags?: string[]
          thumbnail_height?: number | null
          thumbnail_path?: string | null
          thumbnail_width?: number | null
          title?: string | null
          url?: string | null
          user_id?: string
        }
        Update: {
          author_handle?: string | null
          collection_id?: string | null
          created_at?: string
          edited_at?: string | null
          embedding?: string | null
          fts?: unknown
          id?: string
          kind?: string
          note?: string | null
          pinned?: boolean
          preview_image_url?: string | null
          processed_at?: string | null
          raw_text?: string | null
          reminder_at?: string | null
          snippet?: string | null
          source?: string
          summary?: string | null
          tags?: string[]
          thumbnail_height?: number | null
          thumbnail_path?: string | null
          thumbnail_width?: number | null
          title?: string | null
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saves_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collection_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saves_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      collection_overview: {
        Row: {
          cover_path: string | null
          created_at: string | null
          description: string | null
          id: string | null
          last_saved_at: string | null
          name: string | null
          position: number | null
          recent: Json | null
          save_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      my_plan: { Args: never; Returns: Json }
      reorder_collections: { Args: { ids: string[] }; Returns: undefined }
      tags_to_text: { Args: { tags: string[] }; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database["public"]

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"]
