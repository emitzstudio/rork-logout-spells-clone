/* eslint-disable */
// AUTO-GENERATED — DO NOT EDIT
// Run migrations to regenerate.

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
      [_ in never]: never
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
    }
    Enums: {
      app_role: "admin" | "staff"
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
      spell_category:
        | "gathering"
        | "movement"
        | "making"
        | "wandering"
        | "stillness"
        | "celebration"
      spell_status: "draft" | "published" | "soldout" | "archived"
      spell_urgency: "filling-fast" | "last-seats" | "new" | "early-bird"
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
    },
  },
} as const
