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
      availability: {
        Row: {
          companion_id: string
          date: string
          end_time: string
          id: string
          is_available: boolean
          start_time: string
        }
        Insert: {
          companion_id: string
          date: string
          end_time?: string
          id?: string
          is_available?: boolean
          start_time?: string
        }
        Update: {
          companion_id?: string
          date?: string
          end_time?: string
          id?: string
          is_available?: boolean
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_companion_id_fkey"
            columns: ["companion_id"]
            isOneToOne: false
            referencedRelation: "companions"
            referencedColumns: ["id"]
          },
        ]
      }
      blocks: {
        Row: {
          blocked_user_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_user_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_user_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      booking_requests: {
        Row: {
          companion_id: string
          created_at: string
          customer_id: string
          decline_reason: string | null
          deposit_amount: number
          duration_hours: number
          event_date: string
          event_type: string | null
          extra_hours: number
          group_size: number
          id: string
          music_requests: string | null
          notes: string | null
          party_mode: string | null
          service_type: Database["public"]["Enums"]["service_type"]
          start_time: string
          status: Database["public"]["Enums"]["booking_status"]
          total_amount: number
          updated_at: string
          venue_address: string
          venue_equipment: string[]
          venue_name: string
        }
        Insert: {
          companion_id: string
          created_at?: string
          customer_id: string
          decline_reason?: string | null
          deposit_amount?: number
          duration_hours?: number
          event_date: string
          event_type?: string | null
          extra_hours?: number
          group_size?: number
          id?: string
          music_requests?: string | null
          notes?: string | null
          party_mode?: string | null
          service_type: Database["public"]["Enums"]["service_type"]
          start_time?: string
          status?: Database["public"]["Enums"]["booking_status"]
          total_amount?: number
          updated_at?: string
          venue_address: string
          venue_equipment?: string[]
          venue_name: string
        }
        Update: {
          companion_id?: string
          created_at?: string
          customer_id?: string
          decline_reason?: string | null
          deposit_amount?: number
          duration_hours?: number
          event_date?: string
          event_type?: string | null
          extra_hours?: number
          group_size?: number
          id?: string
          music_requests?: string | null
          notes?: string | null
          party_mode?: string | null
          service_type?: Database["public"]["Enums"]["service_type"]
          start_time?: string
          status?: Database["public"]["Enums"]["booking_status"]
          total_amount?: number
          updated_at?: string
          venue_address?: string
          venue_equipment?: string[]
          venue_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_requests_companion_id_fkey"
            columns: ["companion_id"]
            isOneToOne: false
            referencedRelation: "companions"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          companion_id: string
          created_at: string
          event_date: string
          extra_hours: number
          hours: number
          id: string
          notes: string | null
          party_mode: string | null
          service_type: Database["public"]["Enums"]["service_type"]
          start_time: string
          user_id: string
        }
        Insert: {
          companion_id: string
          created_at?: string
          event_date: string
          extra_hours?: number
          hours?: number
          id?: string
          notes?: string | null
          party_mode?: string | null
          service_type: Database["public"]["Enums"]["service_type"]
          start_time?: string
          user_id: string
        }
        Update: {
          companion_id?: string
          created_at?: string
          event_date?: string
          extra_hours?: number
          hours?: number
          id?: string
          notes?: string | null
          party_mode?: string | null
          service_type?: Database["public"]["Enums"]["service_type"]
          start_time?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_companion_id_fkey"
            columns: ["companion_id"]
            isOneToOne: false
            referencedRelation: "companions"
            referencedColumns: ["id"]
          },
        ]
      }
      companion_photos: {
        Row: {
          companion_id: string
          created_at: string
          id: string
          is_approved: boolean
          sort_order: number
          url: string
        }
        Insert: {
          companion_id: string
          created_at?: string
          id?: string
          is_approved?: boolean
          sort_order?: number
          url: string
        }
        Update: {
          companion_id?: string
          created_at?: string
          id?: string
          is_approved?: boolean
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "companion_photos_companion_id_fkey"
            columns: ["companion_id"]
            isOneToOne: false
            referencedRelation: "companions"
            referencedColumns: ["id"]
          },
        ]
      }
      companion_services: {
        Row: {
          base_hours: number
          base_price: number
          billing_type: Database["public"]["Enums"]["billing_type"]
          companion_id: string
          extra_hour_price: number
          id: string
          is_active: boolean
          min_hours: number
          price_per_hour: number
          service_type: Database["public"]["Enums"]["service_type"]
        }
        Insert: {
          base_hours?: number
          base_price?: number
          billing_type?: Database["public"]["Enums"]["billing_type"]
          companion_id: string
          extra_hour_price?: number
          id?: string
          is_active?: boolean
          min_hours?: number
          price_per_hour?: number
          service_type: Database["public"]["Enums"]["service_type"]
        }
        Update: {
          base_hours?: number
          base_price?: number
          billing_type?: Database["public"]["Enums"]["billing_type"]
          companion_id?: string
          extra_hour_price?: number
          id?: string
          is_active?: boolean
          min_hours?: number
          price_per_hour?: number
          service_type?: Database["public"]["Enums"]["service_type"]
        }
        Relationships: [
          {
            foreignKeyName: "companion_services_companion_id_fkey"
            columns: ["companion_id"]
            isOneToOne: false
            referencedRelation: "companions"
            referencedColumns: ["id"]
          },
        ]
      }
      companions: {
        Row: {
          age_range: string | null
          areas: string | null
          bio: string | null
          created_at: string
          display_name: string
          equipment_needs: string | null
          equipment_provides: string | null
          genres: string[]
          id: string
          is_active: boolean
          is_verified: boolean
          languages: string[]
          mix_links: string[]
          status: Database["public"]["Enums"]["profile_status"]
          tagline: string | null
          tags: string[]
          travel_fee: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          age_range?: string | null
          areas?: string | null
          bio?: string | null
          created_at?: string
          display_name: string
          equipment_needs?: string | null
          equipment_provides?: string | null
          genres?: string[]
          id?: string
          is_active?: boolean
          is_verified?: boolean
          languages?: string[]
          mix_links?: string[]
          status?: Database["public"]["Enums"]["profile_status"]
          tagline?: string | null
          tags?: string[]
          travel_fee?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          age_range?: string | null
          areas?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          equipment_needs?: string | null
          equipment_provides?: string | null
          genres?: string[]
          id?: string
          is_active?: boolean
          is_verified?: boolean
          languages?: string[]
          mix_links?: string[]
          status?: Database["public"]["Enums"]["profile_status"]
          tagline?: string | null
          tags?: string[]
          travel_fee?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          booking_id: string
          created_at: string
          currency: string
          id: string
          provider_session_id: string | null
          status: string
        }
        Insert: {
          amount: number
          booking_id: string
          created_at?: string
          currency?: string
          id?: string
          provider_session_id?: string | null
          status?: string
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string
          currency?: string
          id?: string
          provider_session_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_addons: {
        Row: {
          extra_hours: number
          id: string
          is_active: boolean
          name: string
          price_per_hour: number
        }
        Insert: {
          extra_hours: number
          id?: string
          is_active?: boolean
          name: string
          price_per_hour?: number
        }
        Update: {
          extra_hours?: number
          id?: string
          is_active?: boolean
          name?: string
          price_per_hour?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          id_document_path: string | null
          id_reject_reason: string | null
          id_reviewed_at: string | null
          id_reviewed_by: string | null
          id_verification_status: Database["public"]["Enums"]["id_status"]
          is_suspended: boolean
          phone: string | null
          terms_accepted_at: string | null
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          id_document_path?: string | null
          id_reject_reason?: string | null
          id_reviewed_at?: string | null
          id_reviewed_by?: string | null
          id_verification_status?: Database["public"]["Enums"]["id_status"]
          is_suspended?: boolean
          phone?: string | null
          terms_accepted_at?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          id_document_path?: string | null
          id_reject_reason?: string | null
          id_reviewed_at?: string | null
          id_reviewed_by?: string | null
          id_verification_status?: Database["public"]["Enums"]["id_status"]
          is_suspended?: boolean
          phone?: string | null
          terms_accepted_at?: string | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          booking_id: string | null
          companion_id: string | null
          created_at: string
          id: string
          is_urgent: boolean
          reason: string
          reported_user_id: string | null
          reporter_id: string
          status: string
        }
        Insert: {
          booking_id?: string | null
          companion_id?: string | null
          created_at?: string
          id?: string
          is_urgent?: boolean
          reason: string
          reported_user_id?: string | null
          reporter_id: string
          status?: string
        }
        Update: {
          booking_id?: string | null
          companion_id?: string | null
          created_at?: string
          id?: string
          is_urgent?: boolean
          reason?: string
          reported_user_id?: string | null
          reporter_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_companion_id_fkey"
            columns: ["companion_id"]
            isOneToOne: false
            referencedRelation: "companions"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          booking_id: string
          comment: string | null
          companion_id: string
          created_at: string
          customer_id: string
          id: string
          is_approved: boolean
          rating: number
        }
        Insert: {
          booking_id: string
          comment?: string | null
          companion_id: string
          created_at?: string
          customer_id: string
          id?: string
          is_approved?: boolean
          rating: number
        }
        Update: {
          booking_id?: string
          comment?: string | null
          companion_id?: string
          created_at?: string
          customer_id?: string
          id?: string
          is_approved?: boolean
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "booking_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_companion_id_fkey"
            columns: ["companion_id"]
            isOneToOne: false
            referencedRelation: "companions"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_suspended: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "customer" | "companion" | "admin"
      billing_type: "package" | "hourly"
      booking_status:
        | "pending"
        | "accepted"
        | "declined"
        | "paid"
        | "completed"
        | "cancelled"
        | "expired"
      id_status: "none" | "pending" | "approved" | "rejected"
      profile_status: "pending" | "approved" | "rejected"
      service_type: "drinking" | "party" | "dj"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["customer", "companion", "admin"],
      billing_type: ["package", "hourly"],
      booking_status: [
        "pending",
        "accepted",
        "declined",
        "paid",
        "completed",
        "cancelled",
        "expired",
      ],
      id_status: ["none", "pending", "approved", "rejected"],
      profile_status: ["pending", "approved", "rejected"],
      service_type: ["drinking", "party", "dj"],
    },
  },
} as const
