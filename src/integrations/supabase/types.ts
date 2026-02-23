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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      airline_checkin_rules: {
        Row: {
          airline_iata: string
          airline_name: string
          app_deeplink: string | null
          checkin_url: string | null
          created_at: string
          default_window_hours: number
          earliest_checkin_hours: number
          id: string
          latest_checkin_minutes_before_departure: number
          notes: string | null
        }
        Insert: {
          airline_iata: string
          airline_name?: string
          app_deeplink?: string | null
          checkin_url?: string | null
          created_at?: string
          default_window_hours?: number
          earliest_checkin_hours?: number
          id?: string
          latest_checkin_minutes_before_departure?: number
          notes?: string | null
        }
        Update: {
          airline_iata?: string
          airline_name?: string
          app_deeplink?: string | null
          checkin_url?: string | null
          created_at?: string
          default_window_hours?: number
          earliest_checkin_hours?: number
          id?: string
          latest_checkin_minutes_before_departure?: number
          notes?: string | null
        }
        Relationships: []
      }
      attachments: {
        Row: {
          category: string
          created_at: string
          file_name: string
          file_type: string | null
          file_url: string
          id: string
          sale_id: string
          uploaded_by: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          file_name: string
          file_type?: string | null
          file_url: string
          id?: string
          sale_id: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          file_name?: string
          file_type?: string | null
          file_url?: string
          id?: string
          sale_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attachments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          details: string | null
          id: string
          new_value: Json | null
          old_value: Json | null
          sale_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          sale_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          sale_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      checkin_tasks: {
        Row: {
          assigned_to_user_id: string | null
          checkin_due_datetime_utc: string | null
          checkin_open_datetime_utc: string | null
          completed_at: string | null
          completed_by_user_id: string | null
          created_at: string
          created_by: string
          departure_datetime_utc: string | null
          direction: string
          evidence_attachment_ids: string[] | null
          id: string
          last_notified_at: string | null
          notes: string | null
          priority_score: number
          sale_id: string
          seat_info: string | null
          segment_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_to_user_id?: string | null
          checkin_due_datetime_utc?: string | null
          checkin_open_datetime_utc?: string | null
          completed_at?: string | null
          completed_by_user_id?: string | null
          created_at?: string
          created_by?: string
          departure_datetime_utc?: string | null
          direction?: string
          evidence_attachment_ids?: string[] | null
          id?: string
          last_notified_at?: string | null
          notes?: string | null
          priority_score?: number
          sale_id: string
          seat_info?: string | null
          segment_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_to_user_id?: string | null
          checkin_due_datetime_utc?: string | null
          checkin_open_datetime_utc?: string | null
          completed_at?: string | null
          completed_by_user_id?: string | null
          created_at?: string
          created_by?: string
          departure_datetime_utc?: string | null
          direction?: string
          evidence_attachment_ids?: string[] | null
          id?: string
          last_notified_at?: string | null
          notes?: string | null
          priority_score?: number
          sale_id?: string
          seat_info?: string | null
          segment_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkin_tasks_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkin_tasks_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "flight_segments"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_items: {
        Row: {
          cash_value: number | null
          category: string
          created_at: string
          description: string | null
          emission_source: string | null
          id: string
          miles_cost_brl: number | null
          miles_price_per_thousand: number | null
          miles_program: string | null
          miles_quantity: number | null
          sale_id: string
          taxes: number | null
          taxes_included_in_cash: boolean | null
          total_item_cost: number | null
        }
        Insert: {
          cash_value?: number | null
          category: string
          created_at?: string
          description?: string | null
          emission_source?: string | null
          id?: string
          miles_cost_brl?: number | null
          miles_price_per_thousand?: number | null
          miles_program?: string | null
          miles_quantity?: number | null
          sale_id: string
          taxes?: number | null
          taxes_included_in_cash?: boolean | null
          total_item_cost?: number | null
        }
        Update: {
          cash_value?: number | null
          category?: string
          created_at?: string
          description?: string | null
          emission_source?: string | null
          id?: string
          miles_cost_brl?: number | null
          miles_price_per_thousand?: number | null
          miles_program?: string | null
          miles_quantity?: number | null
          sale_id?: string
          taxes?: number | null
          taxes_included_in_cash?: boolean | null
          total_item_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      extraction_runs: {
        Row: {
          confidence: number | null
          created_at: string
          created_by: string | null
          extracted_json: Json | null
          id: string
          sale_id: string | null
          source_text: string | null
          status: string | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          created_by?: string | null
          extracted_json?: Json | null
          id?: string
          sale_id?: string | null
          source_text?: string | null
          status?: string | null
        }
        Update: {
          confidence?: number | null
          created_at?: string
          created_by?: string | null
          extracted_json?: Json | null
          id?: string
          sale_id?: string | null
          source_text?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "extraction_runs_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      flight_segments: {
        Row: {
          airline: string | null
          arrival_time: string | null
          cabin_type: string | null
          connection_time_minutes: number | null
          created_at: string
          departure_date: string | null
          departure_time: string | null
          destination_iata: string
          direction: string
          duration_minutes: number | null
          flight_class: string | null
          flight_number: string | null
          id: string
          operated_by: string | null
          origin_iata: string
          sale_id: string
          segment_order: number
          terminal: string | null
        }
        Insert: {
          airline?: string | null
          arrival_time?: string | null
          cabin_type?: string | null
          connection_time_minutes?: number | null
          created_at?: string
          departure_date?: string | null
          departure_time?: string | null
          destination_iata: string
          direction: string
          duration_minutes?: number | null
          flight_class?: string | null
          flight_number?: string | null
          id?: string
          operated_by?: string | null
          origin_iata: string
          sale_id: string
          segment_order?: number
          terminal?: string | null
        }
        Update: {
          airline?: string | null
          arrival_time?: string | null
          cabin_type?: string | null
          connection_time_minutes?: number | null
          created_at?: string
          departure_date?: string | null
          departure_time?: string | null
          destination_iata?: string
          direction?: string
          duration_minutes?: number | null
          flight_class?: string | null
          flight_number?: string | null
          id?: string
          operated_by?: string | null
          origin_iata?: string
          sale_id?: string
          segment_order?: number
          terminal?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flight_segments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      passengers: {
        Row: {
          address_cep: string | null
          address_city: string | null
          address_complement: string | null
          address_country: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          birth_date: string | null
          cpf: string | null
          created_at: string
          created_by: string | null
          full_name: string
          id: string
          passport_expiry: string | null
          passport_number: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address_cep?: string | null
          address_city?: string | null
          address_complement?: string | null
          address_country?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          birth_date?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          full_name: string
          id?: string
          passport_expiry?: string | null
          passport_number?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address_cep?: string | null
          address_city?: string | null
          address_complement?: string | null
          address_country?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          birth_date?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          full_name?: string
          id?: string
          passport_expiry?: string | null
          passport_number?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      sale_passengers: {
        Row: {
          id: string
          passenger_id: string
          sale_id: string
        }
        Insert: {
          id?: string
          passenger_id: string
          sale_id: string
        }
        Update: {
          id?: string
          passenger_id?: string
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_passengers_passenger_id_fkey"
            columns: ["passenger_id"]
            isOneToOne: false
            referencedRelation: "passengers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_passengers_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          adults: number | null
          airline: string | null
          children: number | null
          children_ages: number[] | null
          close_date: string | null
          connections: string[] | null
          created_at: string
          created_by: string | null
          departure_date: string | null
          destination_city: string | null
          destination_iata: string | null
          display_id: string
          emission_date: string | null
          emission_source: string | null
          emission_status: string | null
          flight_class: string | null
          hotel_meal_plan: string | null
          hotel_name: string | null
          hotel_reservation_code: string | null
          hotel_room: string | null
          id: string
          is_international: boolean | null
          link_chat: string | null
          locators: string[] | null
          margin: number | null
          miles_program: string | null
          name: string
          observations: string | null
          origin_city: string | null
          origin_iata: string | null
          other_codes: string[] | null
          payment_method: string | null
          products: string[] | null
          profit: number | null
          received_value: number | null
          return_date: string | null
          score: number | null
          seller_id: string | null
          status: string
          tag_chatguru: string | null
          total_cost: number | null
          updated_at: string
        }
        Insert: {
          adults?: number | null
          airline?: string | null
          children?: number | null
          children_ages?: number[] | null
          close_date?: string | null
          connections?: string[] | null
          created_at?: string
          created_by?: string | null
          departure_date?: string | null
          destination_city?: string | null
          destination_iata?: string | null
          display_id?: string
          emission_date?: string | null
          emission_source?: string | null
          emission_status?: string | null
          flight_class?: string | null
          hotel_meal_plan?: string | null
          hotel_name?: string | null
          hotel_reservation_code?: string | null
          hotel_room?: string | null
          id?: string
          is_international?: boolean | null
          link_chat?: string | null
          locators?: string[] | null
          margin?: number | null
          miles_program?: string | null
          name: string
          observations?: string | null
          origin_city?: string | null
          origin_iata?: string | null
          other_codes?: string[] | null
          payment_method?: string | null
          products?: string[] | null
          profit?: number | null
          received_value?: number | null
          return_date?: string | null
          score?: number | null
          seller_id?: string | null
          status?: string
          tag_chatguru?: string | null
          total_cost?: number | null
          updated_at?: string
        }
        Update: {
          adults?: number | null
          airline?: string | null
          children?: number | null
          children_ages?: number[] | null
          close_date?: string | null
          connections?: string[] | null
          created_at?: string
          created_by?: string | null
          departure_date?: string | null
          destination_city?: string | null
          destination_iata?: string | null
          display_id?: string
          emission_date?: string | null
          emission_source?: string | null
          emission_status?: string | null
          flight_class?: string | null
          hotel_meal_plan?: string | null
          hotel_name?: string | null
          hotel_reservation_code?: string | null
          hotel_room?: string | null
          id?: string
          is_international?: boolean | null
          link_chat?: string | null
          locators?: string[] | null
          margin?: number | null
          miles_program?: string | null
          name?: string
          observations?: string | null
          origin_city?: string | null
          origin_iata?: string | null
          other_codes?: string[] | null
          payment_method?: string | null
          products?: string[] | null
          profit?: number | null
          received_value?: number | null
          return_date?: string | null
          score?: number | null
          seller_id?: string | null
          status?: string
          tag_chatguru?: string | null
          total_cost?: number | null
          updated_at?: string
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
          role?: Database["public"]["Enums"]["app_role"]
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
    }
    Enums: {
      app_role:
        | "admin"
        | "gestor"
        | "vendedor"
        | "operacional"
        | "financeiro"
        | "leitura"
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
      app_role: [
        "admin",
        "gestor",
        "vendedor",
        "operacional",
        "financeiro",
        "leitura",
      ],
    },
  },
} as const
