// Mirrors supabase/migrations. Regenerate after schema changes with:
//   npm run db:types
// (hand-written for the first version so the app builds before a project is linked)

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      admins: {
        Row: { user_id: string; created_at: string }
        Insert: { user_id: string; created_at?: string }
        Update: { user_id?: string; created_at?: string }
        Relationships: []
      }
      site_settings: {
        Row: {
          id: boolean
          name: string
          headline: string
          bio: string
          email: string | null
          location: string
          resume_url: string | null
          links: Json
          updated_at: string
        }
        Insert: {
          id?: boolean
          name?: string
          headline?: string
          bio?: string
          email?: string | null
          location?: string
          resume_url?: string | null
          links?: Json
          updated_at?: string
        }
        Update: {
          id?: boolean
          name?: string
          headline?: string
          bio?: string
          email?: string | null
          location?: string
          resume_url?: string | null
          links?: Json
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          id: string
          slug: string
          title: string
          summary: string
          client: string
          role: string
          team: string
          timeline: string
          tools: string[]
          problem: string
          solution: string
          status: Database['public']['Enums']['project_status']
          featured: boolean
          sort_order: number
          cover_media_id: string | null
          published_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          title: string
          summary?: string
          client?: string
          role?: string
          team?: string
          timeline?: string
          tools?: string[]
          problem?: string
          solution?: string
          status?: Database['public']['Enums']['project_status']
          featured?: boolean
          sort_order?: number
          cover_media_id?: string | null
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['projects']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'projects_cover_media_fk'
            columns: ['cover_media_id']
            isOneToOne: false
            referencedRelation: 'media'
            referencedColumns: ['id']
          },
        ]
      }
      project_sections: {
        Row: {
          id: string
          project_id: string
          kind: Database['public']['Enums']['section_kind']
          title: string
          body: string
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          kind?: Database['public']['Enums']['section_kind']
          title: string
          body?: string
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['project_sections']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'project_sections_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
        ]
      }
      iterations: {
        Row: {
          id: string
          project_id: string
          section_id: string | null
          label: string
          title: string
          description: string
          feedback: string
          changes: string
          iteration_date: string | null
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          section_id?: string | null
          label: string
          title?: string
          description?: string
          feedback?: string
          changes?: string
          iteration_date?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['iterations']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'iterations_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'iterations_section_id_fkey'
            columns: ['section_id']
            isOneToOne: false
            referencedRelation: 'project_sections'
            referencedColumns: ['id']
          },
        ]
      }
      outcomes: {
        Row: {
          id: string
          project_id: string
          value: string
          label: string
          detail: string
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          value: string
          label: string
          detail?: string
          sort_order?: number
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['outcomes']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'outcomes_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
        ]
      }
      media: {
        Row: {
          id: string
          project_id: string
          section_id: string | null
          iteration_id: string | null
          kind: Database['public']['Enums']['media_kind']
          storage_path: string | null
          embed_url: string | null
          alt_text: string
          caption: string
          width: number | null
          height: number | null
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          section_id?: string | null
          iteration_id?: string | null
          kind?: Database['public']['Enums']['media_kind']
          storage_path?: string | null
          embed_url?: string | null
          alt_text?: string
          caption?: string
          width?: number | null
          height?: number | null
          sort_order?: number
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['media']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'media_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'media_section_id_fkey'
            columns: ['section_id']
            isOneToOne: false
            referencedRelation: 'project_sections'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'media_iteration_id_fkey'
            columns: ['iteration_id']
            isOneToOne: false
            referencedRelation: 'iterations'
            referencedColumns: ['id']
          },
        ]
      }
      tags: {
        Row: { id: string; name: string }
        Insert: { id?: string; name: string }
        Update: { id?: string; name?: string }
        Relationships: []
      }
      project_tags: {
        Row: { project_id: string; tag_id: string }
        Insert: { project_id: string; tag_id: string }
        Update: { project_id?: string; tag_id?: string }
        Relationships: [
          {
            foreignKeyName: 'project_tags_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'project_tags_tag_id_fkey'
            columns: ['tag_id']
            isOneToOne: false
            referencedRelation: 'tags'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean }
      project_is_visible: { Args: { p_project_id: string }; Returns: boolean }
      reorder: { Args: { p_table: string; p_ids: string[] }; Returns: undefined }
      set_project_tags: { Args: { p_project_id: string; p_names: string[] }; Returns: undefined }
    }
    Enums: {
      project_status: 'draft' | 'published' | 'archived'
      section_kind:
        | 'overview'
        | 'problem'
        | 'research'
        | 'define'
        | 'ideate'
        | 'prototype'
        | 'test'
        | 'iterate'
        | 'outcome'
        | 'reflection'
        | 'custom'
      media_kind: 'image' | 'video' | 'embed'
    }
    CompositeTypes: { [_ in never]: never }
  }
}

type PublicSchema = Database['public']
export type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row']
export type TablesInsert<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Update']
export type Enums<T extends keyof PublicSchema['Enums']> = PublicSchema['Enums'][T]
