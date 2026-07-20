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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          ip: unknown
          metadata: Json
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          user_agent?: string | null
        }
        Relationships: []
      }
      bookmarks: {
        Row: {
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["bookmark_kind"]
          ref_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["bookmark_kind"]
          ref_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["bookmark_kind"]
          ref_id?: string
          user_id?: string
        }
        Relationships: []
      }
      branding: {
        Row: {
          accent_color: string | null
          created_at: string
          favicon_url: string | null
          font_body: string | null
          font_heading: string | null
          footer_text: string | null
          id: number
          logo_text: string | null
          logo_url: string | null
          og_image_url: string | null
          primary_color: string | null
          radius_rem: number | null
          secondary_color: string | null
          seo_description: string | null
          seo_title: string | null
          site_name: string
          social_links: Json
          support_email: string | null
          tagline: string | null
          theme_dark: Json | null
          theme_light: Json | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          accent_color?: string | null
          created_at?: string
          favicon_url?: string | null
          font_body?: string | null
          font_heading?: string | null
          footer_text?: string | null
          id?: number
          logo_text?: string | null
          logo_url?: string | null
          og_image_url?: string | null
          primary_color?: string | null
          radius_rem?: number | null
          secondary_color?: string | null
          seo_description?: string | null
          seo_title?: string | null
          site_name?: string
          social_links?: Json
          support_email?: string | null
          tagline?: string | null
          theme_dark?: Json | null
          theme_light?: Json | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          accent_color?: string | null
          created_at?: string
          favicon_url?: string | null
          font_body?: string | null
          font_heading?: string | null
          footer_text?: string | null
          id?: number
          logo_text?: string | null
          logo_url?: string | null
          og_image_url?: string | null
          primary_color?: string | null
          radius_rem?: number | null
          secondary_color?: string | null
          seo_description?: string | null
          seo_title?: string | null
          site_name?: string
          social_links?: Json
          support_email?: string | null
          tagline?: string | null
          theme_dark?: Json | null
          theme_light?: Json | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          course_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          icon: string | null
          id: string
          is_published: boolean
          name: string
          order_index: number
          parent_id: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_published?: boolean
          name: string
          order_index?: number
          parent_id?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_published?: boolean
          name?: string
          order_index?: number
          parent_id?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          status: string
          subject: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          status?: string
          subject?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          status?: string
          subject?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      content_items: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          download_count: number
          file_bucket: string | null
          file_mime: string | null
          file_path: string | null
          file_size_bytes: number | null
          file_url: string | null
          id: string
          publish_at: string | null
          status: string
          subject_id: string | null
          tags: string[]
          thumbnail_path: string | null
          title: string
          type: Database["public"]["Enums"]["content_type"]
          unit_id: string | null
          updated_at: string
          view_count: number
          visibility: Database["public"]["Enums"]["content_visibility"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          download_count?: number
          file_bucket?: string | null
          file_mime?: string | null
          file_path?: string | null
          file_size_bytes?: number | null
          file_url?: string | null
          id?: string
          publish_at?: string | null
          status?: string
          subject_id?: string | null
          tags?: string[]
          thumbnail_path?: string | null
          title: string
          type?: Database["public"]["Enums"]["content_type"]
          unit_id?: string | null
          updated_at?: string
          view_count?: number
          visibility?: Database["public"]["Enums"]["content_visibility"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          download_count?: number
          file_bucket?: string | null
          file_mime?: string | null
          file_path?: string | null
          file_size_bytes?: number | null
          file_url?: string | null
          id?: string
          publish_at?: string | null
          status?: string
          subject_id?: string | null
          tags?: string[]
          thumbnail_path?: string | null
          title?: string
          type?: Database["public"]["Enums"]["content_type"]
          unit_id?: string | null
          updated_at?: string
          view_count?: number
          visibility?: Database["public"]["Enums"]["content_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "content_items_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_items_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          code: string
          cover_url: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          duration_years: number | null
          id: string
          slug: string
          sort_order: number
          status: string
          title: string
          total_semesters: number
          updated_at: string
        }
        Insert: {
          code: string
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          duration_years?: number | null
          id?: string
          slug: string
          sort_order?: number
          status?: string
          title: string
          total_semesters?: number
          updated_at?: string
        }
        Update: {
          code?: string
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          duration_years?: number | null
          id?: string
          slug?: string
          sort_order?: number
          status?: string
          title?: string
          total_semesters?: number
          updated_at?: string
        }
        Relationships: []
      }
      developer_achievements: {
        Row: {
          created_at: string
          date_awarded: string | null
          description: string | null
          enabled: boolean
          id: string
          image_url: string | null
          issuer: string | null
          kind: string
          sort_order: number
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          created_at?: string
          date_awarded?: string | null
          description?: string | null
          enabled?: boolean
          id?: string
          image_url?: string | null
          issuer?: string | null
          kind?: string
          sort_order?: number
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          created_at?: string
          date_awarded?: string | null
          description?: string | null
          enabled?: boolean
          id?: string
          image_url?: string | null
          issuer?: string | null
          kind?: string
          sort_order?: number
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      developer_profile: {
        Row: {
          bio: string | null
          career_objective: string | null
          created_at: string
          current_goal: string | null
          education: string | null
          email: string | null
          enabled: boolean
          full_name: string | null
          github_username: string | null
          hero_cta_primary_label: string | null
          hero_cta_secondary_label: string | null
          id: number
          interests: string | null
          photo_url: string | null
          professional_title: string | null
          resume_url: string | null
          short_intro: string | null
          updated_at: string
        }
        Insert: {
          bio?: string | null
          career_objective?: string | null
          created_at?: string
          current_goal?: string | null
          education?: string | null
          email?: string | null
          enabled?: boolean
          full_name?: string | null
          github_username?: string | null
          hero_cta_primary_label?: string | null
          hero_cta_secondary_label?: string | null
          id?: number
          interests?: string | null
          photo_url?: string | null
          professional_title?: string | null
          resume_url?: string | null
          short_intro?: string | null
          updated_at?: string
        }
        Update: {
          bio?: string | null
          career_objective?: string | null
          created_at?: string
          current_goal?: string | null
          education?: string | null
          email?: string | null
          enabled?: boolean
          full_name?: string | null
          github_username?: string | null
          hero_cta_primary_label?: string | null
          hero_cta_secondary_label?: string | null
          id?: number
          interests?: string | null
          photo_url?: string | null
          professional_title?: string | null
          resume_url?: string | null
          short_intro?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      developer_projects: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          featured: boolean
          github_url: string | null
          id: string
          images: Json
          live_url: string | null
          name: string
          slug: string | null
          sort_order: number
          status: string
          tech_stack: string[]
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          featured?: boolean
          github_url?: string | null
          id?: string
          images?: Json
          live_url?: string | null
          name: string
          slug?: string | null
          sort_order?: number
          status?: string
          tech_stack?: string[]
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          featured?: boolean
          github_url?: string | null
          id?: string
          images?: Json
          live_url?: string | null
          name?: string
          slug?: string | null
          sort_order?: number
          status?: string
          tech_stack?: string[]
          thumbnail_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      developer_skills: {
        Row: {
          category: string
          created_at: string
          enabled: boolean
          icon: string | null
          id: string
          name: string
          proficiency: number | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          enabled?: boolean
          icon?: string | null
          id?: string
          name: string
          proficiency?: number | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          enabled?: boolean
          icon?: string | null
          id?: string
          name?: string
          proficiency?: number | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      developer_social_links: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          label: string | null
          platform: string
          sort_order: number
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          label?: string | null
          platform: string
          sort_order?: number
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          label?: string | null
          platform?: string
          sort_order?: number
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          audience: Json
          created_at: string
          description: string | null
          enabled: boolean
          key: string
          kill_switch: boolean
          module: string
          rollout_pct: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          audience?: Json
          created_at?: string
          description?: string | null
          enabled?: boolean
          key: string
          kill_switch?: boolean
          module: string
          rollout_pct?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          audience?: Json
          created_at?: string
          description?: string | null
          enabled?: boolean
          key?: string
          kill_switch?: boolean
          module?: string
          rollout_pct?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      homepage_sections: {
        Row: {
          content: Json
          created_at: string
          created_by: string | null
          enabled: boolean
          id: string
          position: number
          props: Json
          published_at: string | null
          published_content: Json
          published_style: Json
          slug: string | null
          status: string
          style: Json
          title: string | null
          type: Database["public"]["Enums"]["homepage_section_type"]
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          id?: string
          position: number
          props?: Json
          published_at?: string | null
          published_content?: Json
          published_style?: Json
          slug?: string | null
          status?: string
          style?: Json
          title?: string | null
          type: Database["public"]["Enums"]["homepage_section_type"]
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          id?: string
          position?: number
          props?: Json
          published_at?: string | null
          published_content?: Json
          published_style?: Json
          slug?: string | null
          status?: string
          style?: Json
          title?: string | null
          type?: Database["public"]["Enums"]["homepage_section_type"]
          updated_at?: string
        }
        Relationships: []
      }
      homepage_testimonials: {
        Row: {
          author_name: string
          author_role: string | null
          avatar_url: string | null
          created_at: string
          enabled: boolean
          id: string
          position: number
          quote: string
          rating: number | null
          updated_at: string
        }
        Insert: {
          author_name: string
          author_role?: string | null
          avatar_url?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          position?: number
          quote: string
          rating?: number | null
          updated_at?: string
        }
        Update: {
          author_name?: string
          author_role?: string | null
          avatar_url?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          position?: number
          quote?: string
          rating?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      maintenance: {
        Row: {
          allowed_roles: Database["public"]["Enums"]["app_role"][]
          enabled: boolean
          id: number
          message: string | null
          scheduled_end: string | null
          scheduled_start: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          allowed_roles?: Database["public"]["Enums"]["app_role"][]
          enabled?: boolean
          id?: number
          message?: string | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          allowed_roles?: Database["public"]["Enums"]["app_role"][]
          enabled?: boolean
          id?: number
          message?: string | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      media_assets: {
        Row: {
          alt_text: string | null
          bucket: string
          byte_size: number | null
          caption: string | null
          checksum: string | null
          created_at: string
          deleted_at: string | null
          duration_seconds: number | null
          filename: string
          height: number | null
          id: string
          kind: Database["public"]["Enums"]["media_kind"]
          metadata: Json
          mime_type: string | null
          object_key: string
          updated_at: string
          uploaded_by: string | null
          width: number | null
        }
        Insert: {
          alt_text?: string | null
          bucket: string
          byte_size?: number | null
          caption?: string | null
          checksum?: string | null
          created_at?: string
          deleted_at?: string | null
          duration_seconds?: number | null
          filename: string
          height?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["media_kind"]
          metadata?: Json
          mime_type?: string | null
          object_key: string
          updated_at?: string
          uploaded_by?: string | null
          width?: number | null
        }
        Update: {
          alt_text?: string | null
          bucket?: string
          byte_size?: number | null
          caption?: string | null
          checksum?: string | null
          created_at?: string
          deleted_at?: string | null
          duration_seconds?: number | null
          filename?: string
          height?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["media_kind"]
          metadata?: Json
          mime_type?: string | null
          object_key?: string
          updated_at?: string
          uploaded_by?: string | null
          width?: number | null
        }
        Relationships: []
      }
      note_views: {
        Row: {
          created_at: string
          id: string
          kind: string
          note_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          note_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          note_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "note_views_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          body: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          download_count: number
          file_bucket: string | null
          file_mime: string | null
          file_path: string | null
          file_size_bytes: number | null
          id: string
          slug: string
          sort_order: number
          status: string
          summary: string | null
          title: string
          unit_id: string
          updated_at: string
          view_count: number
          visibility: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          download_count?: number
          file_bucket?: string | null
          file_mime?: string | null
          file_path?: string | null
          file_size_bytes?: number | null
          id?: string
          slug: string
          sort_order?: number
          status?: string
          summary?: string | null
          title: string
          unit_id: string
          updated_at?: string
          view_count?: number
          visibility?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          download_count?: number
          file_bucket?: string | null
          file_mime?: string | null
          file_path?: string | null
          file_size_bytes?: number | null
          id?: string
          slug?: string
          sort_order?: number
          status?: string
          summary?: string | null
          title?: string
          unit_id?: string
          updated_at?: string
          view_count?: number
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          kind: Database["public"]["Enums"]["notification_kind"]
          link: string | null
          published_at: string | null
          read_at: string | null
          status: Database["public"]["Enums"]["notification_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["notification_kind"]
          link?: string | null
          published_at?: string | null
          read_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["notification_kind"]
          link?: string | null
          published_at?: string | null
          read_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      paper_downloads: {
        Row: {
          created_at: string
          id: string
          paper_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          paper_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          paper_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "paper_downloads_paper_id_fkey"
            columns: ["paper_id"]
            isOneToOne: false
            referencedRelation: "papers"
            referencedColumns: ["id"]
          },
        ]
      }
      papers: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          download_count: number
          exam_type: string
          file_bucket: string | null
          file_mime: string | null
          file_path: string | null
          file_size_bytes: number | null
          id: string
          paper_number: string | null
          status: string
          subject_id: string
          title: string
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          download_count?: number
          exam_type?: string
          file_bucket?: string | null
          file_mime?: string | null
          file_path?: string | null
          file_size_bytes?: number | null
          id?: string
          paper_number?: string | null
          status?: string
          subject_id: string
          title: string
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          download_count?: number
          exam_type?: string
          file_bucket?: string | null
          file_mime?: string | null
          file_path?: string | null
          file_size_bytes?: number | null
          id?: string
          paper_number?: string | null
          status?: string
          subject_id?: string
          title?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "papers_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          created_at: string
          description: string
          key: string
        }
        Insert: {
          created_at?: string
          description: string
          key: string
        }
        Update: {
          created_at?: string
          description?: string
          key?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          current_course_id: string | null
          current_semester_id: string | null
          display_name: string | null
          full_name: string | null
          locale: string
          onboarded_at: string | null
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          current_course_id?: string | null
          current_semester_id?: string | null
          display_name?: string | null
          full_name?: string | null
          locale?: string
          onboarded_at?: string | null
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          current_course_id?: string | null
          current_semester_id?: string | null
          display_name?: string | null
          full_name?: string | null
          locale?: string
          onboarded_at?: string | null
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      progress_tracking: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          last_activity_at: string
          progress_pct: number
          status: Database["public"]["Enums"]["progress_status"]
          unit_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          last_activity_at?: string
          progress_pct?: number
          status?: Database["public"]["Enums"]["progress_status"]
          unit_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          last_activity_at?: string
          progress_pct?: number
          status?: Database["public"]["Enums"]["progress_status"]
          unit_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "progress_tracking_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempt_answers: {
        Row: {
          attempt_id: string
          created_at: string
          id: string
          is_correct: boolean | null
          points_awarded: number | null
          question_id: string
          selected_option_ids: string[]
        }
        Insert: {
          attempt_id: string
          created_at?: string
          id?: string
          is_correct?: boolean | null
          points_awarded?: number | null
          question_id: string
          selected_option_ids?: string[]
        }
        Update: {
          attempt_id?: string
          created_at?: string
          id?: string
          is_correct?: boolean | null
          points_awarded?: number | null
          question_id?: string
          selected_option_ids?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempt_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "quiz_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempt_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          created_at: string
          id: string
          max_score: number | null
          passed: boolean | null
          pct: number | null
          quiz_id: string
          score: number | null
          started_at: string
          submitted_at: string | null
          time_spent_seconds: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          max_score?: number | null
          passed?: boolean | null
          pct?: number | null
          quiz_id: string
          score?: number | null
          started_at?: string
          submitted_at?: string | null
          time_spent_seconds?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          max_score?: number | null
          passed?: boolean | null
          pct?: number | null
          quiz_id?: string
          score?: number | null
          started_at?: string
          submitted_at?: string | null
          time_spent_seconds?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_options: {
        Row: {
          created_at: string
          id: string
          is_correct: boolean
          order_index: number
          question_id: string
          text: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_correct?: boolean
          order_index?: number
          question_id: string
          text: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_correct?: boolean
          order_index?: number
          question_id?: string
          text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          created_at: string
          difficulty: string | null
          exam_name: string | null
          explanation: string | null
          id: string
          image_url: string | null
          negative_marks: number
          order_index: number
          points: number
          prompt: string
          quiz_id: string
          tags: string[]
          type: Database["public"]["Enums"]["quiz_question_type"]
          university: string | null
          updated_at: string
          year: number | null
        }
        Insert: {
          created_at?: string
          difficulty?: string | null
          exam_name?: string | null
          explanation?: string | null
          id?: string
          image_url?: string | null
          negative_marks?: number
          order_index?: number
          points?: number
          prompt: string
          quiz_id: string
          tags?: string[]
          type?: Database["public"]["Enums"]["quiz_question_type"]
          university?: string | null
          updated_at?: string
          year?: number | null
        }
        Update: {
          created_at?: string
          difficulty?: string | null
          exam_name?: string | null
          explanation?: string | null
          id?: string
          image_url?: string | null
          negative_marks?: number
          order_index?: number
          points?: number
          prompt?: string
          quiz_id?: string
          tags?: string[]
          type?: Database["public"]["Enums"]["quiz_question_type"]
          university?: string | null
          updated_at?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          end_date: string | null
          id: string
          instructions: string | null
          is_public: boolean
          max_attempts: number
          negative_marking: boolean
          order_index: number
          passing_marks: number | null
          passing_pct: number
          published_at: string | null
          shuffle_options: boolean
          shuffle_questions: boolean
          slug: string
          start_date: string | null
          status: Database["public"]["Enums"]["quiz_status"]
          time_limit_minutes: number | null
          title: string
          unit_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          instructions?: string | null
          is_public?: boolean
          max_attempts?: number
          negative_marking?: boolean
          order_index?: number
          passing_marks?: number | null
          passing_pct?: number
          published_at?: string | null
          shuffle_options?: boolean
          shuffle_questions?: boolean
          slug: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["quiz_status"]
          time_limit_minutes?: number | null
          title: string
          unit_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          instructions?: string | null
          is_public?: boolean
          max_attempts?: number
          negative_marking?: boolean
          order_index?: number
          passing_marks?: number | null
          passing_pct?: number
          published_at?: string | null
          shuffle_options?: boolean
          shuffle_questions?: boolean
          slug?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["quiz_status"]
          time_limit_minutes?: number | null
          title?: string
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          bucket_key: string
          count: number
          created_at: string
          id: number
          identifier: string
          window_start: string
        }
        Insert: {
          bucket_key: string
          count?: number
          created_at?: string
          id?: number
          identifier: string
          window_start?: string
        }
        Update: {
          bucket_key?: string
          count?: number
          created_at?: string
          id?: number
          identifier?: string
          window_start?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          permission_key: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          permission_key: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          permission_key?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["key"]
          },
        ]
      }
      semesters: {
        Row: {
          course_id: string
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          number: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          number: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          number?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "semesters_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_meta: {
        Row: {
          canonical: string | null
          created_at: string
          description: string | null
          id: string
          keywords: string | null
          og_image: string | null
          path: string
          robots: string | null
          title: string | null
          twitter_card: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          canonical?: string | null
          created_at?: string
          description?: string | null
          id?: string
          keywords?: string | null
          og_image?: string | null
          path: string
          robots?: string | null
          title?: string | null
          twitter_card?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          canonical?: string | null
          created_at?: string
          description?: string | null
          id?: string
          keywords?: string | null
          og_image?: string | null
          path?: string
          robots?: string | null
          title?: string | null
          twitter_card?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      subjects: {
        Row: {
          code: string
          cover_url: string | null
          created_at: string
          credits: number | null
          deleted_at: string | null
          description: string | null
          id: string
          instructor_id: string | null
          semester_id: string
          slug: string
          sort_order: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          code: string
          cover_url?: string | null
          created_at?: string
          credits?: number | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          instructor_id?: string | null
          semester_id: string
          slug: string
          sort_order?: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          code?: string
          cover_url?: string | null
          created_at?: string
          credits?: number | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          instructor_id?: string | null
          semester_id?: string
          slug?: string
          sort_order?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
        ]
      }
      taggables: {
        Row: {
          created_at: string
          entity_id: string
          entity_kind: Database["public"]["Enums"]["taggable_kind"]
          id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_kind: Database["public"]["Enums"]["taggable_kind"]
          id?: string
          tag_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_kind?: Database["public"]["Enums"]["taggable_kind"]
          id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "taggables_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      units: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          number: number
          sort_order: number
          status: string
          subject_id: string
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          number: number
          sort_order?: number
          status?: string
          subject_id: string
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          number?: number
          sort_order?: number
          status?: string
          subject_id?: string
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          granted_at: string
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          device_kind: string
          id: string
          ip: unknown
          last_seen_at: string
          refresh_jti: string | null
          revoked_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          device_kind?: string
          id?: string
          ip?: unknown
          last_seen_at?: string
          refresh_jti?: string | null
          revoked_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          device_kind?: string
          id?: string
          ip?: unknown
          last_seen_at?: string
          refresh_jti?: string | null
          revoked_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      quiz_options_public: {
        Row: {
          id: string | null
          order_index: number | null
          question_id: string | null
          text: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_create_mcq: {
        Args: {
          _difficulty?: string
          _exam_name?: string
          _explanation?: string
          _negative_marks?: number
          _options: Json
          _points?: number
          _prompt: string
          _quiz_id: string
          _tags?: string[]
          _year?: number
        }
        Returns: string
      }
      admin_dashboard_stats: { Args: never; Returns: Json }
      admin_recent_activity: {
        Args: { _limit?: number }
        Returns: {
          at: string
          kind: string
          ref_id: string
          title: string
          user_id: string
        }[]
      }
      admin_recent_uploads: {
        Args: { _limit?: number }
        Returns: {
          created_at: string
          id: string
          kind: string
          title: string
        }[]
      }
      bootstrap_grant_super_admin: {
        Args: { _target_user_id: string }
        Returns: undefined
      }
      bootstrap_status: { Args: never; Returns: boolean }
      check_and_increment_rate_limit: {
        Args: {
          _bucket_key: string
          _identifier: string
          _max_per_minute: number
        }
        Returns: boolean
      }
      duplicate_homepage_section: {
        Args: { _id: string }
        Returns: {
          content: Json
          created_at: string
          created_by: string | null
          enabled: boolean
          id: string
          position: number
          props: Json
          published_at: string | null
          published_content: Json
          published_style: Json
          slug: string | null
          status: string
          style: Json
          title: string | null
          type: Database["public"]["Enums"]["homepage_section_type"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "homepage_sections"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_public_branding: {
        Args: never
        Returns: {
          accent_color: string | null
          created_at: string
          favicon_url: string | null
          font_body: string | null
          font_heading: string | null
          footer_text: string | null
          id: number
          logo_text: string | null
          logo_url: string | null
          og_image_url: string | null
          primary_color: string | null
          radius_rem: number | null
          secondary_color: string | null
          seo_description: string | null
          seo_title: string | null
          site_name: string
          social_links: Json
          support_email: string | null
          tagline: string | null
          theme_dark: Json | null
          theme_light: Json | null
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "branding"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_quiz_options: {
        Args: { _quiz_id: string }
        Returns: {
          id: string
          order_index: number
          question_id: string
          text: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_feature_enabled: {
        Args: { _key: string; _user_id?: string }
        Returns: boolean
      }
      list_homepage_sections_admin: {
        Args: never
        Returns: {
          content: Json
          created_at: string
          created_by: string | null
          enabled: boolean
          id: string
          position: number
          props: Json
          published_at: string | null
          published_content: Json
          published_style: Json
          slug: string | null
          status: string
          style: Json
          title: string | null
          type: Database["public"]["Enums"]["homepage_section_type"]
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "homepage_sections"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      list_homepage_sections_public: {
        Args: never
        Returns: {
          content: Json
          id: string
          position: number
          style: Json
          title: string
          type: string
        }[]
      }
      student_bookmarks: {
        Args: { _limit?: number }
        Returns: {
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["bookmark_kind"]
          ref_id: string
          title: string
        }[]
      }
      student_progress: {
        Args: { _limit?: number }
        Returns: {
          id: string
          last_activity_at: string
          progress_pct: number
          status: Database["public"]["Enums"]["progress_status"]
          subject_title: string
          unit_id: string
          unit_title: string
        }[]
      }
      student_search: {
        Args: { _max_results?: number; _query: string }
        Returns: {
          description: string
          id: string
          kind: string
          rank: number
          slug: string
          title: string
        }[]
      }
      submit_quiz_attempt: {
        Args: { _answers: Json; _attempt_id: string }
        Returns: {
          created_at: string
          id: string
          max_score: number | null
          passed: boolean | null
          pct: number | null
          quiz_id: string
          score: number | null
          started_at: string
          submitted_at: string | null
          time_spent_seconds: number | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "quiz_attempts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "instructor" | "student"
      bookmark_kind: "note" | "paper" | "quiz" | "unit"
      content_type: "note" | "pdf" | "ppt" | "video" | "assignment" | "link"
      content_visibility: "public" | "students" | "private"
      homepage_section_type:
        | "hero"
        | "trust_bar"
        | "features"
        | "journey"
        | "semester_overview"
        | "benefits"
        | "testimonials"
        | "faq"
        | "cta"
        | "stats"
        | "custom_richtext"
        | "about"
        | "why_us"
        | "universities"
        | "popular_courses"
        | "categories"
        | "statistics"
        | "faculty"
        | "learning_process"
        | "blog"
        | "contact"
        | "newsletter"
        | "footer"
      media_kind: "image" | "pdf" | "video" | "audio" | "document" | "other"
      notification_kind: "system" | "content" | "quiz" | "announcement"
      notification_status: "draft" | "published"
      progress_status: "not_started" | "in_progress" | "completed"
      quiz_question_type: "single" | "multiple" | "true_false"
      quiz_status: "draft" | "published" | "archived"
      taggable_kind:
        | "note"
        | "video"
        | "paper"
        | "quiz"
        | "assignment"
        | "unit"
        | "subject"
        | "announcement"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["super_admin", "admin", "instructor", "student"],
      bookmark_kind: ["note", "paper", "quiz", "unit"],
      content_type: ["note", "pdf", "ppt", "video", "assignment", "link"],
      content_visibility: ["public", "students", "private"],
      homepage_section_type: [
        "hero",
        "trust_bar",
        "features",
        "journey",
        "semester_overview",
        "benefits",
        "testimonials",
        "faq",
        "cta",
        "stats",
        "custom_richtext",
        "about",
        "why_us",
        "universities",
        "popular_courses",
        "categories",
        "statistics",
        "faculty",
        "learning_process",
        "blog",
        "contact",
        "newsletter",
        "footer",
      ],
      media_kind: ["image", "pdf", "video", "audio", "document", "other"],
      notification_kind: ["system", "content", "quiz", "announcement"],
      notification_status: ["draft", "published"],
      progress_status: ["not_started", "in_progress", "completed"],
      quiz_question_type: ["single", "multiple", "true_false"],
      quiz_status: ["draft", "published", "archived"],
      taggable_kind: [
        "note",
        "video",
        "paper",
        "quiz",
        "assignment",
        "unit",
        "subject",
        "announcement",
      ],
    },
  },
} as const
