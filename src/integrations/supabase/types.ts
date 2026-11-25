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
      alert_prefs: {
        Row: {
          email_enabled: boolean
          last_weather_alert_at: string | null
          push_enabled: boolean
          updated_at: string
          user_id: string
          wave_m: number
          wind_kn: number
          zones: string[]
        }
        Insert: {
          email_enabled?: boolean
          last_weather_alert_at?: string | null
          push_enabled?: boolean
          updated_at?: string
          user_id: string
          wave_m?: number
          wind_kn?: number
          zones?: string[]
        }
        Update: {
          email_enabled?: boolean
          last_weather_alert_at?: string | null
          push_enabled?: boolean
          updated_at?: string
          user_id?: string
          wave_m?: number
          wind_kn?: number
          zones?: string[]
        }
        Relationships: []
      }
      boats: {
        Row: {
          beam: number
          draft: number
          length: number
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          beam: number
          draft: number
          length: number
          name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          beam?: number
          draft?: number
          length?: number
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fleet_members: {
        Row: {
          created_at: string
          id: string
          member_email: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          member_email: string
          owner_id: string
        }
        Update: {
          created_at?: string
          id?: string
          member_email?: string
          owner_id?: string
        }
        Relationships: []
      }
      listing_events: {
        Row: {
          created_at: string
          id: number
          kind: string
          listing_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          kind: string
          listing_id: string
        }
        Update: {
          created_at?: string
          id?: number
          kind?: string
          listing_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_events_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          availability: string
          created_at: string
          description: string
          email: string
          id: string
          kind: string
          name: string
          owner_id: string
          phone: string
          photos: string[]
          port_id: string | null
          rates: Json
          request_note: string
          status: string
          town: string
          updated_at: string
          website: string
        }
        Insert: {
          availability?: string
          created_at?: string
          description?: string
          email?: string
          id?: string
          kind?: string
          name?: string
          owner_id: string
          phone?: string
          photos?: string[]
          port_id?: string | null
          rates?: Json
          request_note?: string
          status?: string
          town?: string
          updated_at?: string
          website?: string
        }
        Update: {
          availability?: string
          created_at?: string
          description?: string
          email?: string
          id?: string
          kind?: string
          name?: string
          owner_id?: string
          phone?: string
          photos?: string[]
          port_id?: string | null
          rates?: Json
          request_note?: string
          status?: string
          town?: string
          updated_at?: string
          website?: string
        }
        Relationships: []
      }
      notice_sources: {
        Row: {
          country: string
          credits_month: number
          credits_month_key: string | null
          every_hours: number
          id: string
          items_seen: number
          last_checked_at: string | null
          last_error: string | null
          last_ok_at: string | null
          method: string
          name: string
        }
        Insert: {
          country: string
          credits_month?: number
          credits_month_key?: string | null
          every_hours?: number
          id: string
          items_seen?: number
          last_checked_at?: string | null
          last_error?: string | null
          last_ok_at?: string | null
          method: string
          name: string
        }
        Update: {
          country?: string
          credits_month?: number
          credits_month_key?: string | null
          every_hours?: number
          id?: string
          items_seen?: number
          last_checked_at?: string | null
          last_error?: string | null
          last_ok_at?: string | null
          method?: string
          name?: string
        }
        Relationships: []
      }
      notices: {
        Row: {
          body: string
          category: string
          content_hash: string | null
          country: string | null
          created_at: string
          id: string
          issued_at: string | null
          issuer: string | null
          lat: number
          lon: number
          notified_at: string | null
          original_text: string | null
          radius_km: number
          ref: string | null
          source_key: string | null
          source_url: string
          status: string
          title: string
          valid_from: string | null
          valid_until: string
          verified: boolean
          zone: string
        }
        Insert: {
          body?: string
          category?: string
          content_hash?: string | null
          country?: string | null
          created_at?: string
          id?: string
          issued_at?: string | null
          issuer?: string | null
          lat: number
          lon: number
          notified_at?: string | null
          original_text?: string | null
          radius_km?: number
          ref?: string | null
          source_key?: string | null
          source_url?: string
          status?: string
          title: string
          valid_from?: string | null
          valid_until: string
          verified?: boolean
          zone: string
        }
        Update: {
          body?: string
          category?: string
          content_hash?: string | null
          country?: string | null
          created_at?: string
          id?: string
          issued_at?: string | null
          issuer?: string | null
          lat?: number
          lon?: number
          notified_at?: string | null
          original_text?: string | null
          radius_km?: number
          ref?: string | null
          source_key?: string | null
          source_url?: string
          status?: string
          title?: string
          valid_from?: string | null
          valid_until?: string
          verified?: boolean
          zone?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_routes: {
        Row: {
          baseline: Json | null
          created_at: string
          departure: string | null
          from_port: string | null
          id: string
          last_alert_at: string | null
          last_check_at: string | null
          name: string
          points: Json
          speed_kn: number
          to_port: string | null
          user_id: string
          wave_m: number
          wind_kn: number
        }
        Insert: {
          baseline?: Json | null
          created_at?: string
          departure?: string | null
          from_port?: string | null
          id?: string
          last_alert_at?: string | null
          last_check_at?: string | null
          name?: string
          points: Json
          speed_kn?: number
          to_port?: string | null
          user_id: string
          wave_m?: number
          wind_kn?: number
        }
        Update: {
          baseline?: Json | null
          created_at?: string
          departure?: string | null
          from_port?: string | null
          id?: string
          last_alert_at?: string | null
          last_check_at?: string | null
          name?: string
          points?: Json
          speed_kn?: number
          to_port?: string | null
          user_id?: string
          wave_m?: number
          wind_kn?: number
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          price_id: string
          product_id: string
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          price_id: string
          product_id: string
          status?: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          price_id?: string
          product_id?: string
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          updated_at?: string
          user_id?: string
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
      active_price_ids: {
        Args: { _env: string; _uid: string }
        Returns: string[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_listing_event: {
        Args: { _kind: string; _listing_id: string }
        Returns: undefined
      }
      my_plans: { Args: { _env: string }; Returns: string[] }
      plans_for: { Args: { _env: string; _uid: string }; Returns: string[] }
    }
    Enums: {
      app_role: "admin" | "gestore" | "user"
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
      app_role: ["admin", "gestore", "user"],
    },
  },
} as const
