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
    PostgrestVersion: "14.17"
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
      booking_change_requests: {
        Row: {
          booking_id: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          details: Json
          id: string
          kind: Database["public"]["Enums"]["change_request_kind"]
          requested_by: string | null
          staff_note: string
          status: Database["public"]["Enums"]["change_request_status"]
          updated_at: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          details?: Json
          id?: string
          kind: Database["public"]["Enums"]["change_request_kind"]
          requested_by?: string | null
          staff_note?: string
          status?: Database["public"]["Enums"]["change_request_status"]
          updated_at?: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          details?: Json
          id?: string
          kind?: Database["public"]["Enums"]["change_request_kind"]
          requested_by?: string | null
          staff_note?: string
          status?: Database["public"]["Enums"]["change_request_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_change_requests_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_report"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_change_requests_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_change_requests_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_change_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_events: {
        Row: {
          actor_id: string | null
          actor_kind: Database["public"]["Enums"]["event_actor"]
          booking_id: string | null
          created_at: string
          data: Json
          departure_id: string | null
          detail: string
          event_type: string
          id: string
        }
        Insert: {
          actor_id?: string | null
          actor_kind?: Database["public"]["Enums"]["event_actor"]
          booking_id?: string | null
          created_at?: string
          data?: Json
          departure_id?: string | null
          detail?: string
          event_type: string
          id?: string
        }
        Update: {
          actor_id?: string | null
          actor_kind?: Database["public"]["Enums"]["event_actor"]
          booking_id?: string | null
          created_at?: string
          data?: Json
          departure_id?: string | null
          detail?: string
          event_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_events_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_report"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_events_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_events_departure_id_fkey"
            columns: ["departure_id"]
            isOneToOne: false
            referencedRelation: "spell_departures"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_participants: {
        Row: {
          accessibility: string
          allergies: string
          booking_id: string
          created_at: string
          date_of_birth: string | null
          dietary: string
          email: string
          emergency_name: string
          emergency_phone: string
          emergency_relation: string
          full_name: string
          id: string
          is_lead: boolean
          phone: string
          removed_at: string | null
          removed_reason: string
          special_requests: string
          status: Database["public"]["Enums"]["participant_status"]
          updated_at: string
        }
        Insert: {
          accessibility?: string
          allergies?: string
          booking_id: string
          created_at?: string
          date_of_birth?: string | null
          dietary?: string
          email?: string
          emergency_name?: string
          emergency_phone?: string
          emergency_relation?: string
          full_name?: string
          id?: string
          is_lead?: boolean
          phone?: string
          removed_at?: string | null
          removed_reason?: string
          special_requests?: string
          status?: Database["public"]["Enums"]["participant_status"]
          updated_at?: string
        }
        Update: {
          accessibility?: string
          allergies?: string
          booking_id?: string
          created_at?: string
          date_of_birth?: string | null
          dietary?: string
          email?: string
          emergency_name?: string
          emergency_phone?: string
          emergency_relation?: string
          full_name?: string
          id?: string
          is_lead?: boolean
          phone?: string
          removed_at?: string | null
          removed_reason?: string
          special_requests?: string
          status?: Database["public"]["Enums"]["participant_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_participants_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_report"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_participants_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_staff_notes: {
        Row: {
          author_id: string | null
          booking_id: string
          created_at: string
          id: string
          note: string
        }
        Insert: {
          author_id?: string | null
          booking_id: string
          created_at?: string
          id?: string
          note: string
        }
        Update: {
          author_id?: string | null
          booking_id?: string
          created_at?: string
          id?: string
          note?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_staff_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_staff_notes_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_report"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_staff_notes_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_terms_acceptances: {
        Row: {
          accepted_at: string
          booking_id: string | null
          id: string
          metadata: Json
          policy_key: string
          policy_version: string
          user_id: string | null
        }
        Insert: {
          accepted_at?: string
          booking_id?: string | null
          id?: string
          metadata?: Json
          policy_key: string
          policy_version: string
          user_id?: string | null
        }
        Update: {
          accepted_at?: string
          booking_id?: string | null
          id?: string
          metadata?: Json
          policy_key?: string
          policy_version?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_terms_acceptances_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_report"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_terms_acceptances_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_terms_acceptances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_waitlist: {
        Row: {
          converted_booking_id: string | null
          created_at: string
          created_by: string | null
          departure_id: string
          email: string
          expires_at: string | null
          id: string
          name: string
          note: string
          offered_at: string | null
          phone: string
          seats_requested: number
          status: Database["public"]["Enums"]["waitlist_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          converted_booking_id?: string | null
          created_at?: string
          created_by?: string | null
          departure_id: string
          email?: string
          expires_at?: string | null
          id?: string
          name?: string
          note?: string
          offered_at?: string | null
          phone?: string
          seats_requested?: number
          status?: Database["public"]["Enums"]["waitlist_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          converted_booking_id?: string | null
          created_at?: string
          created_by?: string | null
          departure_id?: string
          email?: string
          expires_at?: string | null
          id?: string
          name?: string
          note?: string
          offered_at?: string | null
          phone?: string
          seats_requested?: number
          status?: Database["public"]["Enums"]["waitlist_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_waitlist_converted_booking_id_fkey"
            columns: ["converted_booking_id"]
            isOneToOne: false
            referencedRelation: "booking_report"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_waitlist_converted_booking_id_fkey"
            columns: ["converted_booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_waitlist_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_waitlist_departure_id_fkey"
            columns: ["departure_id"]
            isOneToOne: false
            referencedRelation: "spell_departures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_waitlist_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          amount_advance_minor: number
          amount_paid_minor: number
          amount_total_minor: number
          balance_due_date: string | null
          booked_at: string
          cancellation_reason: string
          cancelled_at: string | null
          checklist: Json
          created_at: string
          currency: string
          departure_id: string | null
          duration_days: number
          end_date: string | null
          host_note: string
          id: string
          lead_email: string
          lead_name: string
          lead_phone: string
          meeting_point: string
          payment_method: string
          payment_state: Database["public"]["Enums"]["payment_state"]
          price_per_seat_minor: number
          rating: number | null
          ref: string | null
          refund_amount_minor: number | null
          refunded_at: string | null
          seats: number
          seats_released_at: string | null
          spell_id: string | null
          spell_snapshot: Json
          start_date: string | null
          status: Database["public"]["Enums"]["booking_status"]
          stay_note: string
          timeline_step: Database["public"]["Enums"]["timeline_step"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount_advance_minor?: number
          amount_paid_minor?: number
          amount_total_minor?: number
          balance_due_date?: string | null
          booked_at?: string
          cancellation_reason?: string
          cancelled_at?: string | null
          checklist?: Json
          created_at?: string
          currency?: string
          departure_id?: string | null
          duration_days?: number
          end_date?: string | null
          host_note?: string
          id?: string
          lead_email?: string
          lead_name?: string
          lead_phone?: string
          meeting_point?: string
          payment_method?: string
          payment_state?: Database["public"]["Enums"]["payment_state"]
          price_per_seat_minor?: number
          rating?: number | null
          ref?: string | null
          refund_amount_minor?: number | null
          refunded_at?: string | null
          seats?: number
          seats_released_at?: string | null
          spell_id?: string | null
          spell_snapshot?: Json
          start_date?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          stay_note?: string
          timeline_step?: Database["public"]["Enums"]["timeline_step"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount_advance_minor?: number
          amount_paid_minor?: number
          amount_total_minor?: number
          balance_due_date?: string | null
          booked_at?: string
          cancellation_reason?: string
          cancelled_at?: string | null
          checklist?: Json
          created_at?: string
          currency?: string
          departure_id?: string | null
          duration_days?: number
          end_date?: string | null
          host_note?: string
          id?: string
          lead_email?: string
          lead_name?: string
          lead_phone?: string
          meeting_point?: string
          payment_method?: string
          payment_state?: Database["public"]["Enums"]["payment_state"]
          price_per_seat_minor?: number
          rating?: number | null
          ref?: string | null
          refund_amount_minor?: number | null
          refunded_at?: string | null
          seats?: number
          seats_released_at?: string | null
          spell_id?: string | null
          spell_snapshot?: Json
          start_date?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          stay_note?: string
          timeline_step?: Database["public"]["Enums"]["timeline_step"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_departure_id_fkey"
            columns: ["departure_id"]
            isOneToOne: false
            referencedRelation: "spell_departures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_spell_id_fkey"
            columns: ["spell_id"]
            isOneToOne: false
            referencedRelation: "spells"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      form_responses: {
        Row: {
          answers: Json
          call_date: string | null
          created_at: string
          crm_touched_at: string | null
          form_id: string
          handled_by: string | null
          handled_by_name: string
          id: string
          latest_response: string
          lead_type: Database["public"]["Enums"]["crm_lead_type"] | null
          respondent_name: string
          respondent_phone: string
          source: Database["public"]["Enums"]["crm_source"] | null
          source_creator: string
          spell_id: string | null
          spell_name: string
          status: Database["public"]["Enums"]["response_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          answers?: Json
          call_date?: string | null
          created_at?: string
          crm_touched_at?: string | null
          form_id: string
          handled_by?: string | null
          handled_by_name?: string
          id?: string
          latest_response?: string
          lead_type?: Database["public"]["Enums"]["crm_lead_type"] | null
          respondent_name?: string
          respondent_phone?: string
          source?: Database["public"]["Enums"]["crm_source"] | null
          source_creator?: string
          spell_id?: string | null
          spell_name?: string
          status?: Database["public"]["Enums"]["response_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          answers?: Json
          call_date?: string | null
          created_at?: string
          crm_touched_at?: string | null
          form_id?: string
          handled_by?: string | null
          handled_by_name?: string
          id?: string
          latest_response?: string
          lead_type?: Database["public"]["Enums"]["crm_lead_type"] | null
          respondent_name?: string
          respondent_phone?: string
          source?: Database["public"]["Enums"]["crm_source"] | null
          source_creator?: string
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
            foreignKeyName: "form_responses_handled_by_fkey"
            columns: ["handled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          is_enquiry: boolean
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
          is_enquiry?: boolean
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
          is_enquiry?: boolean
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
          phone: string
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
          phone?: string
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
          phone?: string
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
      memories: {
        Row: {
          booking_id: string | null
          cover_photo_id: string | null
          created_at: string
          end_date: string | null
          highlights: string[]
          id: string
          location: string
          note: string
          photo_limit: number
          start_date: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          booking_id?: string | null
          cover_photo_id?: string | null
          created_at?: string
          end_date?: string | null
          highlights?: string[]
          id?: string
          location?: string
          note?: string
          photo_limit?: number
          start_date?: string | null
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          booking_id?: string | null
          cover_photo_id?: string | null
          created_at?: string
          end_date?: string | null
          highlights?: string[]
          id?: string
          location?: string
          note?: string
          photo_limit?: number
          start_date?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memories_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_report"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memories_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memories_cover_photo_id_fkey"
            columns: ["cover_photo_id"]
            isOneToOne: false
            referencedRelation: "memory_photos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      memory_photos: {
        Row: {
          added_at: string
          id: string
          is_own: boolean
          memory_id: string
          storage_path: string
        }
        Insert: {
          added_at?: string
          id?: string
          is_own?: boolean
          memory_id: string
          storage_path: string
        }
        Update: {
          added_at?: string
          id?: string
          is_own?: boolean
          memory_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "memory_photos_memory_id_fkey"
            columns: ["memory_id"]
            isOneToOne: false
            referencedRelation: "memories"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_outbox: {
        Row: {
          body: string
          booking_id: string | null
          channels: string[]
          created_at: string
          error: string
          event_type: string
          id: string
          link: string
          payload: Json
          processed_at: string | null
          status: string
          title: string
          user_id: string | null
        }
        Insert: {
          body?: string
          booking_id?: string | null
          channels?: string[]
          created_at?: string
          error?: string
          event_type: string
          id?: string
          link?: string
          payload?: Json
          processed_at?: string | null
          status?: string
          title?: string
          user_id?: string | null
        }
        Update: {
          body?: string
          booking_id?: string | null
          channels?: string[]
          created_at?: string
          error?: string
          event_type?: string
          id?: string
          link?: string
          payload?: Json
          processed_at?: string | null
          status?: string
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_outbox_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_report"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_outbox_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_outbox_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      payment_webhook_events: {
        Row: {
          created_at: string
          error: string
          event_type: string
          id: string
          payload: Json
          processed: boolean
          processed_at: string | null
          provider: Database["public"]["Enums"]["payment_provider"]
          provider_event_id: string
        }
        Insert: {
          created_at?: string
          error?: string
          event_type?: string
          id?: string
          payload?: Json
          processed?: boolean
          processed_at?: string | null
          provider: Database["public"]["Enums"]["payment_provider"]
          provider_event_id: string
        }
        Update: {
          created_at?: string
          error?: string
          event_type?: string
          id?: string
          payload?: Json
          processed?: boolean
          processed_at?: string | null
          provider?: Database["public"]["Enums"]["payment_provider"]
          provider_event_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_minor: number
          booking_id: string | null
          captured_at: string | null
          created_at: string
          currency: string
          error_code: string
          error_message: string
          id: string
          kind: Database["public"]["Enums"]["payment_kind"]
          metadata: Json
          method: string
          method_label: string
          note: string
          provider: Database["public"]["Enums"]["payment_provider"]
          provider_order_id: string
          provider_payment_id: string
          provider_refund_id: string
          provider_signature: string
          recorded_by: string | null
          source: Database["public"]["Enums"]["payment_source"]
          status: Database["public"]["Enums"]["payment_status"]
          user_id: string | null
        }
        Insert: {
          amount_minor: number
          booking_id?: string | null
          captured_at?: string | null
          created_at?: string
          currency?: string
          error_code?: string
          error_message?: string
          id?: string
          kind: Database["public"]["Enums"]["payment_kind"]
          metadata?: Json
          method?: string
          method_label?: string
          note?: string
          provider: Database["public"]["Enums"]["payment_provider"]
          provider_order_id?: string
          provider_payment_id?: string
          provider_refund_id?: string
          provider_signature?: string
          recorded_by?: string | null
          source?: Database["public"]["Enums"]["payment_source"]
          status?: Database["public"]["Enums"]["payment_status"]
          user_id?: string | null
        }
        Update: {
          amount_minor?: number
          booking_id?: string | null
          captured_at?: string | null
          created_at?: string
          currency?: string
          error_code?: string
          error_message?: string
          id?: string
          kind?: Database["public"]["Enums"]["payment_kind"]
          metadata?: Json
          method?: string
          method_label?: string
          note?: string
          provider?: Database["public"]["Enums"]["payment_provider"]
          provider_order_id?: string
          provider_payment_id?: string
          provider_refund_id?: string
          provider_signature?: string
          recorded_by?: string | null
          source?: Database["public"]["Enums"]["payment_source"]
          status?: Database["public"]["Enums"]["payment_status"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_report"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_user_id_fkey"
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
      review_collections: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          link_count: number
          spell_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          link_count: number
          spell_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          link_count?: number
          spell_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_collections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_collections_spell_id_fkey"
            columns: ["spell_id"]
            isOneToOne: false
            referencedRelation: "spells"
            referencedColumns: ["id"]
          },
        ]
      }
      review_invitations: {
        Row: {
          collection_id: string
          created_at: string
          id: string
          position: number
          status: Database["public"]["Enums"]["review_invite_status"]
          token: string
          used_at: string | null
        }
        Insert: {
          collection_id: string
          created_at?: string
          id?: string
          position: number
          status?: Database["public"]["Enums"]["review_invite_status"]
          token: string
          used_at?: string | null
        }
        Update: {
          collection_id?: string
          created_at?: string
          id?: string
          position?: number
          status?: Database["public"]["Enums"]["review_invite_status"]
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "review_invitations_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "review_collections"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          author_avatar: string
          author_id: string | null
          author_name: string
          body: string
          booking_id: string | null
          consent_to_publish: boolean
          created_at: string
          id: string
          invitation_id: string | null
          previous_spell_id: string | null
          rating: number
          spell_id: string | null
          status: Database["public"]["Enums"]["review_status"]
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
          booking_id?: string | null
          consent_to_publish?: boolean
          created_at?: string
          id?: string
          invitation_id?: string | null
          previous_spell_id?: string | null
          rating: number
          spell_id?: string | null
          status?: Database["public"]["Enums"]["review_status"]
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
          booking_id?: string | null
          consent_to_publish?: boolean
          created_at?: string
          id?: string
          invitation_id?: string | null
          previous_spell_id?: string | null
          rating?: number
          spell_id?: string | null
          status?: Database["public"]["Enums"]["review_status"]
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
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_report"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: true
            referencedRelation: "review_invitations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_previous_spell_id_fkey"
            columns: ["previous_spell_id"]
            isOneToOne: false
            referencedRelation: "previous_spells"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_spell_id_fkey"
            columns: ["spell_id"]
            isOneToOne: false
            referencedRelation: "spells"
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
      site_settings: {
        Row: {
          data: Json
          key: string
          updated_at: string
        }
        Insert: {
          data?: Json
          key: string
          updated_at?: string
        }
        Update: {
          data?: Json
          key?: string
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
      staff_notification_prefs: {
        Row: {
          created_at: string
          notify_bookings: boolean
          notify_enquiries: boolean
          notify_requests: boolean
          notify_responses: boolean
          notify_reviews: boolean
          notify_waitlist: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          notify_bookings?: boolean
          notify_enquiries?: boolean
          notify_requests?: boolean
          notify_responses?: boolean
          notify_reviews?: boolean
          notify_waitlist?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          notify_bookings?: boolean
          notify_enquiries?: boolean
          notify_requests?: boolean
          notify_responses?: boolean
          notify_reviews?: boolean
          notify_waitlist?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_notification_prefs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
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
      booking_report: {
        Row: {
          amount_advance_minor: number | null
          amount_paid_minor: number | null
          amount_total_minor: number | null
          balance_due_date: string | null
          booked_at: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          currency: string | null
          departure_label: string | null
          departure_status:
            | Database["public"]["Enums"]["departure_status"]
            | null
          end_date: string | null
          id: string | null
          lead_email: string | null
          lead_name: string | null
          lead_phone: string | null
          payment_state: Database["public"]["Enums"]["payment_state"] | null
          price_per_seat_minor: number | null
          ref: string | null
          refund_amount_minor: number | null
          seats: number | null
          spell_name: string | null
          spell_slug: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["booking_status"] | null
          timeline_step: Database["public"]["Enums"]["timeline_step"] | null
        }
        Relationships: []
      }
      spell_active_departures: {
        Row: {
          created_at: string | null
          date_label: string | null
          end_date: string | null
          id: string | null
          price_minor: number | null
          seats_booked: number | null
          seats_on_hold: number | null
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
      admin_cancel_booking: {
        Args: {
          _booking_id: string
          _mode: string
          _reason: string
          _refund_minor?: number
        }
        Returns: Json
      }
      admin_confirm_booking: {
        Args: { _booking_id: string; _reason: string }
        Returns: Json
      }
      admin_create_booking: {
        Args: {
          _departure_id: string
          _note?: string
          _participants?: Json
          _seats: number
          _terms?: Json
          _user_email: string
          _waitlist_entry?: string
        }
        Returns: Json
      }
      create_review_collection: {
        Args: {
          p_expires_at?: string
          p_link_count: number
          p_spell_id: string
        }
        Returns: string
      }
      departure_seats_on_hold: {
        Args: { _departure_id: string }
        Returns: number
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
      is_crm: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      join_waitlist_public: {
        Args: {
          _departure_id: string
          _email: string
          _name: string
          _note: string
          _phone: string
          _seats: number
        }
        Returns: string
      }
      leave_waitlist_public: { Args: { _entry_id: string }; Returns: undefined }
      next_ref: { Args: { _prefix: string; _scope: string }; Returns: string }
      record_manual_payment: {
        Args: {
          _amount_minor: number
          _booking_id: string
          _kind: Database["public"]["Enums"]["payment_kind"]
          _method_label?: string
          _note?: string
          _paid_at?: string
          _reference?: string
        }
        Returns: Json
      }
      release_booking_seats: { Args: { _booking_id: string }; Returns: boolean }
      release_departure_seats: {
        Args: { _departure_id: string; _seats: number }
        Returns: boolean
      }
      reserve_departure_seats: {
        Args: {
          _departure_id: string
          _seats: number
          _waitlist_entry?: string
        }
        Returns: boolean
      }
      review_invite_lookup: { Args: { p_token: string }; Returns: Json }
      review_invite_submit: {
        Args: {
          p_consent: boolean
          p_experience: string
          p_name: string
          p_rating: number
          p_summary: string
          p_token: string
        }
        Returns: Json
      }
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
          _phone: string
          _spell_id: string
          _spell_name: string
          _spell_slug: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "staff" | "sales"
      blog_category:
        | "travel-guides"
        | "community-stories"
        | "behind-the-scenes"
        | "host-interviews"
        | "spell-recaps"
        | "travel-tips"
        | "founder-letters"
      blog_status: "draft" | "published"
      booking_status:
        | "draft"
        | "pending"
        | "confirmed"
        | "completed"
        | "cancelled"
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
      change_request_kind: "seat_change" | "transfer" | "cancellation" | "other"
      change_request_status:
        | "requested"
        | "approved"
        | "rejected"
        | "completed"
        | "withdrawn"
      crm_lead_type:
        | "bingo"
        | "hot"
        | "warm"
        | "mild"
        | "inactive"
        | "dead"
        | "dead_budget"
      crm_source: "logout_spells" | "creator"
      departure_status: "scheduled" | "closed" | "cancelled"
      event_actor: "traveller" | "staff" | "system" | "provider"
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
      participant_status: "active" | "removed"
      payment_kind: "advance" | "balance" | "refund" | "credit" | "adjustment"
      payment_provider: "mock" | "manual" | "razorpay" | "cashfree"
      payment_source: "gateway" | "manual" | "system"
      payment_state: "pending" | "deposit" | "paid" | "refunded"
      payment_status:
        | "created"
        | "authorized"
        | "captured"
        | "failed"
        | "refunded"
      response_status: "new" | "viewed"
      review_invite_status: "pending" | "used"
      review_status: "pending" | "approved" | "rejected"
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
      timeline_step:
        | "booked"
        | "payment"
        | "host"
        | "documents"
        | "begins"
        | "completed"
      waitlist_status:
        | "waiting"
        | "offered"
        | "converted"
        | "expired"
        | "cancelled"
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
      app_role: ["admin", "staff", "sales"],
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
      booking_status: [
        "draft",
        "pending",
        "confirmed",
        "completed",
        "cancelled",
      ],
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
      change_request_kind: ["seat_change", "transfer", "cancellation", "other"],
      change_request_status: [
        "requested",
        "approved",
        "rejected",
        "completed",
        "withdrawn",
      ],
      crm_lead_type: [
        "bingo",
        "hot",
        "warm",
        "mild",
        "inactive",
        "dead",
        "dead_budget",
      ],
      crm_source: ["logout_spells", "creator"],
      departure_status: ["scheduled", "closed", "cancelled"],
      event_actor: ["traveller", "staff", "system", "provider"],
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
      participant_status: ["active", "removed"],
      payment_kind: ["advance", "balance", "refund", "credit", "adjustment"],
      payment_provider: ["mock", "manual", "razorpay", "cashfree"],
      payment_source: ["gateway", "manual", "system"],
      payment_state: ["pending", "deposit", "paid", "refunded"],
      payment_status: [
        "created",
        "authorized",
        "captured",
        "failed",
        "refunded",
      ],
      response_status: ["new", "viewed"],
      review_invite_status: ["pending", "used"],
      review_status: ["pending", "approved", "rejected"],
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
      timeline_step: [
        "booked",
        "payment",
        "host",
        "documents",
        "begins",
        "completed",
      ],
      waitlist_status: [
        "waiting",
        "offered",
        "converted",
        "expired",
        "cancelled",
      ],
    },
  },
} as const
