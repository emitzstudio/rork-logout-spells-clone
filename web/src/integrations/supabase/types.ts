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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      blog_posts: {
        Row: {
          author_avatar: string
          author_id: string | null
          author_name: string
          author_role: string
          blocks: Json
          category: Database["public"]["Enums"]["blog_category"]
          created_at: string
          created_by: string | null
          deck: string
          featured: boolean
          gallery: string[]
          hero_url: string
          id: string
          published_at: string | null
          read_minutes: number
          seo_description: string
          seo_title: string
          slug: string
          status: Database["public"]["Enums"]["blog_status"]
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          author_avatar?: string
          author_id?: string | null
          author_name?: string
          author_role?: string
          blocks?: Json
          category?: Database["public"]["Enums"]["blog_category"]
          created_at?: string
          created_by?: string | null
          deck?: string
          featured?: boolean
          gallery?: string[]
          hero_url?: string
          id?: string
          published_at?: string | null
          read_minutes?: number
          seo_description?: string
          seo_title?: string
          slug: string
          status?: Database["public"]["Enums"]["blog_status"]
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Update: {
          author_avatar?: string
          author_id?: string | null
          author_name?: string
          author_role?: string
          blocks?: Json
          category?: Database["public"]["Enums"]["blog_category"]
          created_at?: string
          created_by?: string | null
          deck?: string
          featured?: boolean
          gallery?: string[]
          hero_url?: string
          id?: string
          published_at?: string | null
          read_minutes?: number
          seo_description?: string
          seo_title?: string
          slug?: string
          status?: Database["public"]["Enums"]["blog_status"]
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_posts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      form_responses: {
        Row: {
          answers: Json
          created_at: string
          form_id: string
          id: string
          respondent_name: string
          respondent_phone: string
          spell_id: string | null
          spell_name: string
          status: Database["public"]["Enums"]["response_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          answers?: Json
          created_at?: string
          form_id: string
          id?: string
          respondent_name?: string
          respondent_phone?: string
          spell_id?: string | null
          spell_name?: string
          status?: Database["public"]["Enums"]["response_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          answers?: Json
          created_at?: string
          form_id?: string
          id?: string
          respondent_name?: string
          respondent_phone?: string
          spell_id?: string | null
          spell_name?: string
          status?: Database["public"]["Enums"]["response_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_responses_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_responses_spell_id_fkey"
            columns: ["spell_id"]
            isOneToOne: false
            referencedRelation: "spells"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_responses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      forms: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          id: string
          questions: Json
          redirect_url: string
          slug: string
          status: Database["public"]["Enums"]["form_status"]
          style: Database["public"]["Enums"]["form_style"]
          submit_label: string
          success_message: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          questions?: Json
          redirect_url?: string
          slug: string
          status?: Database["public"]["Enums"]["form_status"]
          style?: Database["public"]["Enums"]["form_style"]
          submit_label?: string
          success_message?: string
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          questions?: Json
          redirect_url?: string
          slug?: string
          status?: Database["public"]["Enums"]["form_status"]
          style?: Database["public"]["Enums"]["form_style"]
          submit_label?: string
          success_message?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "forms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inquiries: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          note: string
          ref: string
          spell_id: string | null
          spell_name: string
          spell_slug: string
          status: Database["public"]["Enums"]["inquiry_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          note?: string
          ref: string
          spell_id?: string | null
          spell_name?: string
          spell_slug?: string
          status?: Database["public"]["Enums"]["inquiry_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          note?: string
          ref?: string
          spell_id?: string | null
          spell_name?: string
          spell_slug?: string
          status?: Database["public"]["Enums"]["inquiry_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inquiries_spell_id_fkey"
            columns: ["spell_id"]
            isOneToOne: false
            referencedRelation: "spells"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inquiries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      interests: {
        Row: {
          categories: Database["public"]["Enums"]["spell_category"][]
          created_at: string
          id: string
          is_active: boolean
          keywords: string[]
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          categories?: Database["public"]["Enums"]["spell_category"][]
          created_at?: string
          id: string
          is_active?: boolean
          keywords?: string[]
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          categories?: Database["public"]["Enums"]["spell_category"][]
          created_at?: string
          id?: string
          is_active?: boolean
          keywords?: string[]
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["notification_kind"]
          link: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["notification_kind"]
          link?: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["notification_kind"]
          link?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      previous_spells: {
        Row: {
          caption: string
          category: Database["public"]["Enums"]["spell_category"]
          chapters: Json
          community: Json
          created_at: string
          currency: string | null
          date_label: string | null
          duration_days: number
          end_date: string | null
          gallery: Json
          gradient: string
          hero_url: string
          highlights: string[]
          host_initial: string
          host_name: string
          host_role: string
          id: string
          is_published: boolean
          location: string
          memory_notes: Json
          page_snapshot: Json | null
          price_minor: number | null
          region: string
          season: string
          slug: string
          sort_order: number
          spell_id: string | null
          start_date: string | null
          story: string[]
          symbol: string
          title: string
          travellers: number
          updated_at: string
        }
        Insert: {
          caption?: string
          category: Database["public"]["Enums"]["spell_category"]
          chapters?: Json
          community?: Json
          created_at?: string
          currency?: string | null
          date_label?: string | null
          duration_days?: number
          end_date?: string | null
          gallery?: Json
          gradient?: string
          hero_url?: string
          highlights?: string[]
          host_initial?: string
          host_name?: string
          host_role?: string
          id?: string
          is_published?: boolean
          location?: string
          memory_notes?: Json
          page_snapshot?: Json | null
          price_minor?: number | null
          region?: string
          season?: string
          slug: string
          sort_order?: number
          spell_id?: string | null
          start_date?: string | null
          story?: string[]
          symbol?: string
          title: string
          travellers?: number
          updated_at?: string
        }
        Update: {
          caption?: string
          category?: Database["public"]["Enums"]["spell_category"]
          chapters?: Json
          community?: Json
          created_at?: string
          currency?: string | null
          date_label?: string | null
          duration_days?: number
          end_date?: string | null
          gallery?: Json
          gradient?: string
          hero_url?: string
          highlights?: string[]
          host_initial?: string
          host_name?: string
          host_role?: string
          id?: string
          is_published?: boolean
          location?: string
          memory_notes?: Json
          page_snapshot?: Json | null
          price_minor?: number | null
          region?: string
          season?: string
          slug?: string
          sort_order?: number
          spell_id?: string | null
          start_date?: string | null
          story?: string[]
          symbol?: string
          title?: string
          travellers?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "previous_spells_spell_id_fkey"
            columns: ["spell_id"]
            isOneToOne: false
            referencedRelation: "spells"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string
          bio: string
          birthday: string | null
          category_interests: Database["public"]["Enums"]["spell_category"][]
          city: string
          cover_url: string
          created_at: string
          dietary: string
          email: string
          emergency_name: string
          emergency_phone: string
          emergency_relation: string
          first_name: string
          id: string
          instagram: string
          languages: string[]
          last_name: string
          phone: string
          referral_code: string
          travel_styles: string[]
          updated_at: string
        }
        Insert: {
          avatar_url?: string
          bio?: string
          birthday?: string | null
          category_interests?: Database["public"]["Enums"]["spell_category"][]
          city?: string
          cover_url?: string
          created_at?: string
          dietary?: string
          email?: string
          emergency_name?: string
          emergency_phone?: string
          emergency_relation?: string
          first_name?: string
          id: string
          instagram?: string
          languages?: string[]
          last_name?: string
          phone?: string
          referral_code: string
          travel_styles?: string[]
          updated_at?: string
        }
        Update: {
          avatar_url?: string
          bio?: string
          birthday?: string | null
          category_interests?: Database["public"]["Enums"]["spell_category"][]
          city?: string
          cover_url?: string
          created_at?: string
          dietary?: string
          email?: string
          emergency_name?: string
          emergency_phone?: string
          emergency_relation?: string
          first_name?: string
          id?: string
          instagram?: string
          languages?: string[]
          last_name?: string
          phone?: string
          referral_code?: string
          travel_styles?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      ref_counters: {
        Row: {
          period: string
          scope: string
          value: number
        }
        Insert: {
          period: string
          scope: string
          value?: number
        }
        Update: {
          period?: string
          scope?: string
          value?: number
        }
        Relationships: []
      }
      reviews: {
        Row: {
          author_avatar: string
          author_id: string | null
          author_name: string
          body: string
          created_at: string
          id: string
          previous_spell_id: string
          rating: number
          title: string
          travelled_on: string
          updated_at: string
          verified: boolean
        }
        Insert: {
          author_avatar?: string
          author_id?: string | null
          author_name?: string
          body?: string
          created_at?: string
          id?: string
          previous_spell_id: string
          rating: number
          title?: string
          travelled_on?: string
          updated_at?: string
          verified?: boolean
        }
        Update: {
          author_avatar?: string
          author_id?: string | null
          author_name?: string
          body?: string
          created_at?: string
          id?: string
          previous_spell_id?: string
          rating?: number
          title?: string
          travelled_on?: string
          updated_at?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "reviews_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_previous_spell_id_fkey"
            columns: ["previous_spell_id"]
            isOneToOne: false
            referencedRelation: "previous_spells"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_spells: {
        Row: {
          created_at: string
          spell_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          spell_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          spell_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_spells_spell_id_fkey"
            columns: ["spell_id"]
            isOneToOne: false
            referencedRelation: "spells"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_spells_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      spell_changes: {
        Row: {
          actor_id: string | null
          created_at: string
          detail: string
          id: string
          kind: Database["public"]["Enums"]["change_kind"]
          spell_id: string
          title: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          detail?: string
          id?: string
          kind: Database["public"]["Enums"]["change_kind"]
          spell_id: string
          title?: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          detail?: string
          id?: string
          kind?: Database["public"]["Enums"]["change_kind"]
          spell_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "spell_changes_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spell_changes_spell_id_fkey"
            columns: ["spell_id"]
            isOneToOne: false
            referencedRelation: "spells"
            referencedColumns: ["id"]
          },
        ]
      }
      spell_departures: {
        Row: {
          created_at: string
          date_label: string
          end_date: string | null
          id: string
          price_minor: number | null
          seats_booked: number
          seats_total: number
          spell_id: string
          start_date: string | null
          status: Database["public"]["Enums"]["departure_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_label?: string
          end_date?: string | null
          id?: string
          price_minor?: number | null
          seats_booked?: number
          seats_total?: number
          spell_id: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["departure_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_label?: string
          end_date?: string | null
          id?: string
          price_minor?: number | null
          seats_booked?: number
          seats_total?: number
          spell_id?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["departure_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "spell_departures_spell_id_fkey"
            columns: ["spell_id"]
            isOneToOne: false
            referencedRelation: "spells"
            referencedColumns: ["id"]
          },
        ]
      }
      spells: {
        Row: {
          category: Database["public"]["Enums"]["spell_category"] | null
          cover_url: string
          created_at: string
          created_by: string | null
          currency: string
          duration_days: number
          featured: boolean
          form_id: string | null
          gradient: string
          hero_as_cover: boolean
          hero_url: string
          hook: string
          host_name: string
          host_role: string
          id: string
          inclusions: string[]
          location: string
          mobile_hero_url: string
          name: string
          nights: number
          page: Json | null
          price_minor: number
          published_at: string | null
          region: string
          slug: string
          status: Database["public"]["Enums"]["spell_status"]
          symbol: string
          updated_at: string
          urgency: Database["public"]["Enums"]["spell_urgency"] | null
          views: number
        }
        Insert: {
          category?: Database["public"]["Enums"]["spell_category"] | null
          cover_url?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          duration_days?: number
          featured?: boolean
          form_id?: string | null
          gradient?: string
          hero_as_cover?: boolean
          hero_url?: string
          hook?: string
          host_name?: string
          host_role?: string
          id?: string
          inclusions?: string[]
          location?: string
          mobile_hero_url?: string
          name?: string
          nights?: number
          page?: Json | null
          price_minor?: number
          published_at?: string | null
          region?: string
          slug: string
          status?: Database["public"]["Enums"]["spell_status"]
          symbol?: string
          updated_at?: string
          urgency?: Database["public"]["Enums"]["spell_urgency"] | null
          views?: number
        }
        Update: {
          category?: Database["public"]["Enums"]["spell_category"] | null
          cover_url?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          duration_days?: number
          featured?: boolean
          form_id?: string | null
          gradient?: string
          hero_as_cover?: boolean
          hero_url?: string
          hook?: string
          host_name?: string
          host_role?: string
          id?: string
          inclusions?: string[]
          location?: string
          mobile_hero_url?: string
          name?: string
          nights?: number
          page?: Json | null
          price_minor?: number
          published_at?: string | null
          region?: string
          slug?: string
          status?: Database["public"]["Enums"]["spell_status"]
          symbol?: string
          updated_at?: string
          urgency?: Database["public"]["Enums"]["spell_urgency"] | null
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "spells_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spells_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          contribution: string
          created_at: string
          department: Database["public"]["Enums"]["team_department"]
          designation: string
          featured: boolean
          focus: string
          id: string
          instagram: string
          intro: string
          is_active: boolean
          linkedin: string
          name: string
          photo_url: string
          quote: string
          sort_order: number
          updated_at: string
          user_id: string | null
          youtube: string
        }
        Insert: {
          contribution?: string
          created_at?: string
          department: Database["public"]["Enums"]["team_department"]
          designation?: string
          featured?: boolean
          focus?: string
          id?: string
          instagram?: string
          intro?: string
          is_active?: boolean
          linkedin?: string
          name: string
          photo_url?: string
          quote?: string
          sort_order?: number
          updated_at?: string
          user_id?: string | null
          youtube?: string
        }
        Update: {
          contribution?: string
          created_at?: string
          department?: Database["public"]["Enums"]["team_department"]
          designation?: string
          featured?: boolean
          focus?: string
          id?: string
          instagram?: string
          intro?: string
          is_active?: boolean
          linkedin?: string
          name?: string
          photo_url?: string
          quote?: string
          sort_order?: number
          updated_at?: string
          user_id?: string | null
          youtube?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_interests: {
        Row: {
          created_at: string
          interest_id: string
          sort_order: number
          user_id: string
        }
        Insert: {
          created_at?: string
          interest_id: string
          sort_order?: number
          user_id?: string
        }
        Update: {
          created_at?: string
          interest_id?: string
          sort_order?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_interests_interest_id_fkey"
            columns: ["interest_id"]
            isOneToOne: false
            referencedRelation: "interests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_interests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          brewed_at: string | null
          channel_email: boolean
          channel_whatsapp: boolean
          created_at: string
          notify_offers: boolean
          notify_reminders: boolean
          notify_trips: boolean
          profile_visible: boolean
          show_memories: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          brewed_at?: string | null
          channel_email?: boolean
          channel_whatsapp?: boolean
          created_at?: string
          notify_offers?: boolean
          notify_reminders?: boolean
          notify_trips?: boolean
          profile_visible?: boolean
          show_memories?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          brewed_at?: string | null
          channel_email?: boolean
          channel_whatsapp?: boolean
          created_at?: string
          notify_offers?: boolean
          notify_reminders?: boolean
          notify_trips?: boolean
          profile_visible?: boolean
          show_memories?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      spell_active_departures: {
        Row: {
          created_at: string | null
          date_label: string | null
          end_date: string | null
          id: string | null
          price_minor: number | null
          seats_booked: number | null
          seats_total: number | null
          spell_id: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["departure_status"] | null
          updated_at: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      active_departure: {
        Args: { _spell_id: string }
        Returns: {
          created_at: string
          date_label: string
          end_date: string | null
          id: string
          price_minor: number | null
          seats_booked: number
          seats_total: number
          spell_id: string
          start_date: string | null
          status: Database["public"]["Enums"]["departure_status"]
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "spell_departures"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      generate_referral_code: { Args: { _first_name: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_spell_views: { Args: { _spell_id: string }; Returns: undefined }
      is_staff: { Args: never; Returns: boolean }
      next_ref: { Args: { _prefix: string; _scope: string }; Returns: string }
      spell_wishlist_counts: {
        Args: never
        Returns: {
          spell_id: string
          wishlist_count: number
        }[]
      }
      submit_inquiry: {
        Args: {
          _email: string
          _name: string
          _note: string
          _spell_id: string
          _spell_name: string
          _spell_slug: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "staff"
      blog_category:
        | "travel-guides"
        | "community-stories"
        | "behind-the-scenes"
        | "host-interviews"
        | "spell-recaps"
        | "travel-tips"
        | "founder-letters"
      blog_status: "draft" | "published"
      change_kind:
        | "created"
        | "edited"
        | "published"
        | "price"
        | "booking"
        | "image"
        | "duplicated"
        | "archived"
        | "restored"
      departure_status: "scheduled" | "closed" | "cancelled"
      form_status: "draft" | "published"
      form_style: "conversational" | "traditional"
      inquiry_status: "new" | "contacted" | "closed"
      notification_kind:
        | "trip"
        | "payment"
        | "memory"
        | "offer"
        | "referral"
        | "system"
      response_status: "new" | "viewed"
      spell_category:
        | "gathering"
        | "movement"
        | "making"
        | "wandering"
        | "stillness"
        | "celebration"
      spell_status: "draft" | "published" | "soldout" | "archived"
      spell_urgency: "filling-fast" | "last-seats" | "new" | "early-bird"
      team_department:
        | "founder"
        | "technology"
        | "sales"
        | "social-media"
        | "operations"
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
      app_role: ["admin", "staff"],
      blog_category: [
        "travel-guides",
        "community-stories",
        "behind-the-scenes",
        "host-interviews",
        "spell-recaps",
        "travel-tips",
        "founder-letters",
      ],
      blog_status: ["draft", "published"],
      change_kind: [
        "created",
        "edited",
        "published",
        "price",
        "booking",
        "image",
        "duplicated",
        "archived",
        "restored",
      ],
      departure_status: ["scheduled", "closed", "cancelled"],
      form_status: ["draft", "published"],
      form_style: ["conversational", "traditional"],
      inquiry_status: ["new", "contacted", "closed"],
      notification_kind: [
        "trip",
        "payment",
        "memory",
        "offer",
        "referral",
        "system",
      ],
      response_status: ["new", "viewed"],
      spell_category: [
        "gathering",
        "movement",
        "making",
        "wandering",
        "stillness",
        "celebration",
      ],
      spell_status: ["draft", "published", "soldout", "archived"],
      spell_urgency: ["filling-fast", "last-seats", "new", "early-bird"],
      team_department: [
        "founder",
        "technology",
        "sales",
        "social-media",
        "operations",
      ],
    },
  },
} as const

