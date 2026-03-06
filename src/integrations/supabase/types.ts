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
      accounts_payable: {
        Row: {
          category_id: string | null
          cost_item_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          installment_number: number | null
          installment_total: number | null
          is_recurring: boolean | null
          notes: string | null
          paid_date: string | null
          payment_method: string | null
          recurrence_interval: string | null
          sale_id: string | null
          status: string
          supplier_id: string | null
          updated_at: string
          value: number
        }
        Insert: {
          category_id?: string | null
          cost_item_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          installment_number?: number | null
          installment_total?: number | null
          is_recurring?: boolean | null
          notes?: string | null
          paid_date?: string | null
          payment_method?: string | null
          recurrence_interval?: string | null
          sale_id?: string | null
          status?: string
          supplier_id?: string | null
          updated_at?: string
          value?: number
        }
        Update: {
          category_id?: string | null
          cost_item_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          installment_number?: number | null
          installment_total?: number | null
          is_recurring?: boolean | null
          notes?: string | null
          paid_date?: string | null
          payment_method?: string | null
          recurrence_interval?: string | null
          sale_id?: string | null
          status?: string
          supplier_id?: string | null
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "accounts_payable_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_payable_cost_item_id_fkey"
            columns: ["cost_item_id"]
            isOneToOne: false
            referencedRelation: "cost_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_payable_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_payable_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts_receivable: {
        Row: {
          client_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          fee_percent: number | null
          fee_value: number | null
          gross_value: number
          id: string
          installment_number: number | null
          installment_total: number | null
          net_value: number
          notes: string | null
          payment_method: string | null
          received_date: string | null
          sale_id: string | null
          seller_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          fee_percent?: number | null
          fee_value?: number | null
          gross_value?: number
          id?: string
          installment_number?: number | null
          installment_total?: number | null
          net_value?: number
          notes?: string | null
          payment_method?: string | null
          received_date?: string | null
          sale_id?: string | null
          seller_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          fee_percent?: number | null
          fee_value?: number | null
          gross_value?: number
          id?: string
          installment_number?: number | null
          installment_total?: number | null
          net_value?: number
          notes?: string | null
          payment_method?: string | null
          received_date?: string | null
          sale_id?: string | null
          seller_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_receivable_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_receivable_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_history: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          messages: Json
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          conversation_id?: string
          created_at?: string
          id?: string
          messages?: Json
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          messages?: Json
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_chat_suggestions: {
        Row: {
          action_taken: string | null
          conversation_id: string | null
          created_at: string
          created_by: string | null
          destination_detected: string | null
          edited_text: string | null
          funnel_stage_suggested: string | null
          id: string
          intent_detected: string | null
          message_id: string | null
          suggestion_text: string
          tags_suggested: string[] | null
          urgency_level: string | null
        }
        Insert: {
          action_taken?: string | null
          conversation_id?: string | null
          created_at?: string
          created_by?: string | null
          destination_detected?: string | null
          edited_text?: string | null
          funnel_stage_suggested?: string | null
          id?: string
          intent_detected?: string | null
          message_id?: string | null
          suggestion_text: string
          tags_suggested?: string[] | null
          urgency_level?: string | null
        }
        Update: {
          action_taken?: string | null
          conversation_id?: string | null
          created_at?: string
          created_by?: string | null
          destination_detected?: string | null
          edited_text?: string | null
          funnel_stage_suggested?: string | null
          id?: string
          intent_detected?: string | null
          message_id?: string | null
          suggestion_text?: string
          tags_suggested?: string[] | null
          urgency_level?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_suggestions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_config: {
        Row: {
          config_key: string
          config_value: string
          created_at: string
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          config_key: string
          config_value?: string
          created_at?: string
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          config_key?: string
          config_value?: string
          created_at?: string
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      ai_execution_logs: {
        Row: {
          conversation_id: string | null
          created_at: string
          error_message: string | null
          estimated_cost: number | null
          flow_id: string | null
          id: string
          input_summary: string | null
          integration_id: string | null
          metadata_only: boolean
          model: string | null
          node_id: string | null
          output_summary: string | null
          provider: string
          response_time_ms: number | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          error_message?: string | null
          estimated_cost?: number | null
          flow_id?: string | null
          id?: string
          input_summary?: string | null
          integration_id?: string | null
          metadata_only?: boolean
          model?: string | null
          node_id?: string | null
          output_summary?: string | null
          provider: string
          response_time_ms?: number | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          error_message?: string | null
          estimated_cost?: number | null
          flow_id?: string | null
          id?: string
          input_summary?: string | null
          integration_id?: string | null
          metadata_only?: boolean
          model?: string | null
          node_id?: string | null
          output_summary?: string | null
          provider?: string
          response_time_ms?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_execution_logs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_execution_logs_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "automation_flows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_execution_logs_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "ai_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_execution_logs_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "automation_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_integrations: {
        Row: {
          api_key_encrypted: string | null
          base_url: string | null
          created_at: string
          created_by: string | null
          environment: string
          id: string
          last_test_status: string | null
          last_tested_at: string | null
          model: string | null
          name: string
          notes: string | null
          provider: string
          status: string
          updated_at: string
        }
        Insert: {
          api_key_encrypted?: string | null
          base_url?: string | null
          created_at?: string
          created_by?: string | null
          environment?: string
          id?: string
          last_test_status?: string | null
          last_tested_at?: string | null
          model?: string | null
          name: string
          notes?: string | null
          provider?: string
          status?: string
          updated_at?: string
        }
        Update: {
          api_key_encrypted?: string | null
          base_url?: string | null
          created_at?: string
          created_by?: string | null
          environment?: string
          id?: string
          last_test_status?: string | null
          last_tested_at?: string | null
          model?: string | null
          name?: string
          notes?: string | null
          provider?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_knowledge_base: {
        Row: {
          category: string
          content_text: string | null
          created_at: string
          description: string | null
          file_name: string | null
          file_type: string | null
          file_url: string | null
          id: string
          is_active: boolean | null
          title: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          category?: string
          content_text?: string | null
          created_at?: string
          description?: string | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_active?: boolean | null
          title: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string
          content_text?: string | null
          created_at?: string
          description?: string | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_active?: boolean | null
          title?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
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
      airline_logos: {
        Row: {
          airline_iata: string
          airline_icao: string | null
          airline_name: string | null
          logo_url: string
          source: string
          updated_at: string
        }
        Insert: {
          airline_iata: string
          airline_icao?: string | null
          airline_name?: string | null
          logo_url: string
          source?: string
          updated_at?: string
        }
        Update: {
          airline_iata?: string
          airline_icao?: string | null
          airline_name?: string | null
          logo_url?: string
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
      attachments: {
        Row: {
          category: string
          cost_item_id: string | null
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
          cost_item_id?: string | null
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
          cost_item_id?: string | null
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
            foreignKeyName: "attachments_cost_item_id_fkey"
            columns: ["cost_item_id"]
            isOneToOne: false
            referencedRelation: "cost_items"
            referencedColumns: ["id"]
          },
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
      automation_edges: {
        Row: {
          created_at: string
          flow_id: string
          id: string
          label: string | null
          source_handle: string | null
          source_node_id: string
          target_handle: string | null
          target_node_id: string
        }
        Insert: {
          created_at?: string
          flow_id: string
          id?: string
          label?: string | null
          source_handle?: string | null
          source_node_id: string
          target_handle?: string | null
          target_node_id: string
        }
        Update: {
          created_at?: string
          flow_id?: string
          id?: string
          label?: string | null
          source_handle?: string | null
          source_node_id?: string
          target_handle?: string | null
          target_node_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_edges_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "automation_flows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_edges_source_node_id_fkey"
            columns: ["source_node_id"]
            isOneToOne: false
            referencedRelation: "automation_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_edges_target_node_id_fkey"
            columns: ["target_node_id"]
            isOneToOne: false
            referencedRelation: "automation_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_executions: {
        Row: {
          completed_at: string | null
          conversation_id: string | null
          error_message: string | null
          flow_id: string
          id: string
          started_at: string
          status: string
          trace: Json
          variables: Json
        }
        Insert: {
          completed_at?: string | null
          conversation_id?: string | null
          error_message?: string | null
          flow_id: string
          id?: string
          started_at?: string
          status?: string
          trace?: Json
          variables?: Json
        }
        Update: {
          completed_at?: string | null
          conversation_id?: string | null
          error_message?: string | null
          flow_id?: string
          id?: string
          started_at?: string
          status?: string
          trace?: Json
          variables?: Json
        }
        Relationships: [
          {
            foreignKeyName: "automation_executions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_executions_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "automation_flows"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_flows: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_template: boolean
          name: string
          status: string
          template_category: string | null
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_template?: boolean
          name: string
          status?: string
          template_category?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_template?: boolean
          name?: string
          status?: string
          template_category?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      automation_nodes: {
        Row: {
          config: Json
          created_at: string
          flow_id: string
          id: string
          label: string
          node_type: string
          position_x: number
          position_y: number
        }
        Insert: {
          config?: Json
          created_at?: string
          flow_id: string
          id?: string
          label?: string
          node_type: string
          position_x?: number
          position_y?: number
        }
        Update: {
          config?: Json
          created_at?: string
          flow_id?: string
          id?: string
          label?: string
          node_type?: string
          position_x?: number
          position_y?: number
        }
        Relationships: [
          {
            foreignKeyName: "automation_nodes_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "automation_flows"
            referencedColumns: ["id"]
          },
        ]
      }
      chart_of_accounts: {
        Row: {
          code: string | null
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          parent_id: string | null
          type: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          parent_id?: string | null
          type: string
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          parent_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "chart_of_accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string | null
          conversation_id: string
          created_at: string
          external_message_id: string | null
          id: string
          media_url: string | null
          message_type: string
          metadata: Json | null
          read_status: string
          sender_id: string | null
          sender_type: string
        }
        Insert: {
          content?: string | null
          conversation_id: string
          created_at?: string
          external_message_id?: string | null
          id?: string
          media_url?: string | null
          message_type?: string
          metadata?: Json | null
          read_status?: string
          sender_id?: string | null
          sender_type?: string
        }
        Update: {
          content?: string | null
          conversation_id?: string
          created_at?: string
          external_message_id?: string | null
          id?: string
          media_url?: string | null
          message_type?: string
          metadata?: Json | null
          read_status?: string
          sender_id?: string | null
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
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
      client_contacts: {
        Row: {
          client_id: string
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          role: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          role?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_notes: {
        Row: {
          author_id: string | null
          client_id: string
          content: string
          created_at: string
          id: string
        }
        Insert: {
          author_id?: string | null
          client_id: string
          content: string
          created_at?: string
          id?: string
        }
        Update: {
          author_id?: string | null
          client_id?: string
          content?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          city: string | null
          client_type: string
          country: string | null
          created_at: string
          created_by: string | null
          display_name: string
          email: string | null
          id: string
          observations: string | null
          phone: string | null
          state: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          client_type?: string
          country?: string | null
          created_at?: string
          created_by?: string | null
          display_name: string
          email?: string | null
          id?: string
          observations?: string | null
          phone?: string | null
          state?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          client_type?: string
          country?: string | null
          created_at?: string
          created_by?: string | null
          display_name?: string
          email?: string | null
          id?: string
          observations?: string | null
          phone?: string | null
          state?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      commission_rules: {
        Row: {
          commission_type: string
          commission_value: number
          created_at: string
          id: string
          is_active: boolean | null
          min_margin_percent: number | null
          product_type: string | null
          seller_id: string | null
        }
        Insert: {
          commission_type?: string
          commission_value?: number
          created_at?: string
          id?: string
          is_active?: boolean | null
          min_margin_percent?: number | null
          product_type?: string | null
          seller_id?: string | null
        }
        Update: {
          commission_type?: string
          commission_value?: number
          created_at?: string
          id?: string
          is_active?: boolean | null
          min_margin_percent?: number | null
          product_type?: string | null
          seller_id?: string | null
        }
        Relationships: []
      }
      conversation_transfers: {
        Row: {
          conversation_id: string
          created_at: string
          from_user_id: string | null
          id: string
          notes: string | null
          to_user_id: string | null
        }
        Insert: {
          conversation_id: string
          created_at?: string
          from_user_id?: string | null
          id?: string
          notes?: string | null
          to_user_id?: string | null
        }
        Update: {
          conversation_id?: string
          created_at?: string
          from_user_id?: string | null
          id?: string
          notes?: string | null
          to_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_transfers_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          assigned_to: string | null
          client_id: string | null
          created_at: string
          display_name: string | null
          external_id: string | null
          funnel_stage: string | null
          id: string
          last_message_at: string | null
          last_message_preview: string | null
          phone: string | null
          source: string | null
          status: string
          tags: string[] | null
          unread_count: number | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          client_id?: string | null
          created_at?: string
          display_name?: string | null
          external_id?: string | null
          funnel_stage?: string | null
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          phone?: string | null
          source?: string | null
          status?: string
          tags?: string[] | null
          unread_count?: number | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          client_id?: string | null
          created_at?: string
          display_name?: string | null
          external_id?: string | null
          funnel_stage?: string | null
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          phone?: string | null
          source?: string | null
          status?: string
          tags?: string[] | null
          unread_count?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
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
          product_type: string | null
          reservation_code: string | null
          sale_id: string
          supplier_id: string | null
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
          product_type?: string | null
          reservation_code?: string | null
          sale_id: string
          supplier_id?: string | null
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
          product_type?: string | null
          reservation_code?: string | null
          sale_id?: string
          supplier_id?: string | null
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
          {
            foreignKeyName: "cost_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_card_items: {
        Row: {
          category_id: string | null
          created_at: string
          credit_card_id: string
          description: string | null
          id: string
          installment_number: number | null
          installment_total: number | null
          is_refund: boolean | null
          notes: string | null
          sale_id: string | null
          status: string | null
          supplier_id: string | null
          transaction_date: string
          value: number
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          credit_card_id: string
          description?: string | null
          id?: string
          installment_number?: number | null
          installment_total?: number | null
          is_refund?: boolean | null
          notes?: string | null
          sale_id?: string | null
          status?: string | null
          supplier_id?: string | null
          transaction_date?: string
          value?: number
        }
        Update: {
          category_id?: string | null
          created_at?: string
          credit_card_id?: string
          description?: string | null
          id?: string
          installment_number?: number | null
          installment_total?: number | null
          is_refund?: boolean | null
          notes?: string | null
          sale_id?: string | null
          status?: string | null
          supplier_id?: string | null
          transaction_date?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "credit_card_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_card_items_credit_card_id_fkey"
            columns: ["credit_card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_card_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_card_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_cards: {
        Row: {
          bank: string | null
          card_type: string | null
          closing_day: number | null
          created_at: string
          credit_limit: number | null
          default_fee_percent: number | null
          due_day: number | null
          id: string
          is_active: boolean | null
          last_digits: string | null
          nickname: string
          responsible: string | null
        }
        Insert: {
          bank?: string | null
          card_type?: string | null
          closing_day?: number | null
          created_at?: string
          credit_limit?: number | null
          default_fee_percent?: number | null
          due_day?: number | null
          id?: string
          is_active?: boolean | null
          last_digits?: string | null
          nickname: string
          responsible?: string | null
        }
        Update: {
          bank?: string | null
          card_type?: string | null
          closing_day?: number | null
          created_at?: string
          credit_limit?: number | null
          default_fee_percent?: number | null
          due_day?: number | null
          id?: string
          is_active?: boolean | null
          last_digits?: string | null
          nickname?: string
          responsible?: string | null
        }
        Relationships: []
      }
      employee_documents: {
        Row: {
          created_at: string
          document_type: string
          employee_id: string
          expiry_date: string | null
          file_name: string | null
          file_url: string | null
          id: string
          notes: string | null
          tags: string[] | null
          title: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          document_type?: string
          employee_id: string
          expiry_date?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          tags?: string[] | null
          title: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          document_type?: string
          employee_id?: string
          expiry_date?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          tags?: string[] | null
          title?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          address_cep: string | null
          address_city: string | null
          address_complement: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          avatar_url: string | null
          base_salary: number | null
          birth_date: string | null
          commission_enabled: boolean | null
          commission_percent: number | null
          contract_type: string
          cpf: string | null
          created_at: string
          department: string
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          full_name: string
          hire_date: string
          id: string
          lunch_duration_minutes: number | null
          manager_id: string | null
          observations: string | null
          permissions: Json | null
          phone: string | null
          position: string
          remuneration_type: string | null
          rg: string | null
          status: string
          system_user_id: string | null
          termination_date: string | null
          updated_at: string
          user_id: string | null
          weekly_hours: number | null
          work_days: string[] | null
          work_regime: string | null
          work_schedule_end: string | null
          work_schedule_start: string | null
        }
        Insert: {
          address_cep?: string | null
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          avatar_url?: string | null
          base_salary?: number | null
          birth_date?: string | null
          commission_enabled?: boolean | null
          commission_percent?: number | null
          contract_type?: string
          cpf?: string | null
          created_at?: string
          department?: string
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name: string
          hire_date?: string
          id?: string
          lunch_duration_minutes?: number | null
          manager_id?: string | null
          observations?: string | null
          permissions?: Json | null
          phone?: string | null
          position?: string
          remuneration_type?: string | null
          rg?: string | null
          status?: string
          system_user_id?: string | null
          termination_date?: string | null
          updated_at?: string
          user_id?: string | null
          weekly_hours?: number | null
          work_days?: string[] | null
          work_regime?: string | null
          work_schedule_end?: string | null
          work_schedule_start?: string | null
        }
        Update: {
          address_cep?: string | null
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          avatar_url?: string | null
          base_salary?: number | null
          birth_date?: string | null
          commission_enabled?: boolean | null
          commission_percent?: number | null
          contract_type?: string
          cpf?: string | null
          created_at?: string
          department?: string
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string
          hire_date?: string
          id?: string
          lunch_duration_minutes?: number | null
          manager_id?: string | null
          observations?: string | null
          permissions?: Json | null
          phone?: string | null
          position?: string
          remuneration_type?: string | null
          rg?: string | null
          status?: string
          system_user_id?: string | null
          termination_date?: string | null
          updated_at?: string
          user_id?: string | null
          weekly_hours?: number | null
          work_days?: string[] | null
          work_regime?: string | null
          work_schedule_end?: string | null
          work_schedule_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "employees"
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
      feedbacks: {
        Row: {
          action_plan: string | null
          context: string | null
          created_at: string
          employee_id: string
          feedback_type: string
          given_by: string | null
          id: string
          meeting_date: string
          next_followup: string | null
          points: string
          status: string
        }
        Insert: {
          action_plan?: string | null
          context?: string | null
          created_at?: string
          employee_id: string
          feedback_type?: string
          given_by?: string | null
          id?: string
          meeting_date?: string
          next_followup?: string | null
          points: string
          status?: string
        }
        Update: {
          action_plan?: string | null
          context?: string | null
          created_at?: string
          employee_id?: string
          feedback_type?: string
          given_by?: string | null
          id?: string
          meeting_date?: string
          next_followup?: string | null
          points?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedbacks_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedbacks_given_by_fkey"
            columns: ["given_by"]
            isOneToOne: false
            referencedRelation: "employees"
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
      goals: {
        Row: {
          bonus_on_100: number | null
          bonus_on_120: number | null
          bonus_on_80: number | null
          created_at: string
          current_value: number | null
          department: string | null
          description: string | null
          employee_id: string | null
          id: string
          metric_type: string
          period_end: string
          period_start: string
          status: string
          target_value: number
          title: string
          updated_at: string
        }
        Insert: {
          bonus_on_100?: number | null
          bonus_on_120?: number | null
          bonus_on_80?: number | null
          created_at?: string
          current_value?: number | null
          department?: string | null
          description?: string | null
          employee_id?: string | null
          id?: string
          metric_type?: string
          period_end: string
          period_start: string
          status?: string
          target_value?: number
          title: string
          updated_at?: string
        }
        Update: {
          bonus_on_100?: number | null
          bonus_on_120?: number | null
          bonus_on_80?: number | null
          created_at?: string
          current_value?: number | null
          department?: string | null
          description?: string | null
          employee_id?: string | null
          id?: string
          metric_type?: string
          period_end?: string
          period_start?: string
          status?: string
          target_value?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_contact_directory: {
        Row: {
          created_at: string
          emails: string[] | null
          hotel_name_normalized: string
          id: string
          last_used_at: string | null
          notes: string | null
          phones: string[] | null
          preferred_language: string | null
          reservation_portal_url: string | null
          whatsapp: string[] | null
        }
        Insert: {
          created_at?: string
          emails?: string[] | null
          hotel_name_normalized: string
          id?: string
          last_used_at?: string | null
          notes?: string | null
          phones?: string[] | null
          preferred_language?: string | null
          reservation_portal_url?: string | null
          whatsapp?: string[] | null
        }
        Update: {
          created_at?: string
          emails?: string[] | null
          hotel_name_normalized?: string
          id?: string
          last_used_at?: string | null
          notes?: string | null
          phones?: string[] | null
          preferred_language?: string | null
          reservation_portal_url?: string | null
          whatsapp?: string[] | null
        }
        Relationships: []
      }
      hr_access_log: {
        Row: {
          action: string
          created_at: string
          details: string | null
          employee_id: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: string | null
          employee_id?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: string | null
          employee_id?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_access_log_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      import_jobs: {
        Row: {
          checkpoint_data: Json | null
          contacts_created: number
          conversations_created: number
          conversations_updated: number
          create_contacts: boolean
          created_at: string
          error_message: string | null
          errors: number
          file_names: string[] | null
          finished_at: string | null
          id: string
          messages_created: number
          messages_deduplicated: number
          processed_rows: number
          progress: number
          started_at: string | null
          status: string
          storage_path: string | null
          total_rows: number
          updated_at: string
        }
        Insert: {
          checkpoint_data?: Json | null
          contacts_created?: number
          conversations_created?: number
          conversations_updated?: number
          create_contacts?: boolean
          created_at?: string
          error_message?: string | null
          errors?: number
          file_names?: string[] | null
          finished_at?: string | null
          id?: string
          messages_created?: number
          messages_deduplicated?: number
          processed_rows?: number
          progress?: number
          started_at?: string | null
          status?: string
          storage_path?: string | null
          total_rows?: number
          updated_at?: string
        }
        Update: {
          checkpoint_data?: Json | null
          contacts_created?: number
          conversations_created?: number
          conversations_updated?: number
          create_contacts?: boolean
          created_at?: string
          error_message?: string | null
          errors?: number
          file_names?: string[] | null
          finished_at?: string | null
          id?: string
          messages_created?: number
          messages_deduplicated?: number
          processed_rows?: number
          progress?: number
          started_at?: string | null
          status?: string
          storage_path?: string | null
          total_rows?: number
          updated_at?: string
        }
        Relationships: []
      }
      lodging_confirmation_tasks: {
        Row: {
          assigned_to_user_id: string | null
          confirmed_at: string | null
          confirmed_by_user_id: string | null
          contact_details: string | null
          contact_method: string | null
          created_at: string
          created_by: string
          evidence_attachment_ids: string[] | null
          hotel_checkin_datetime_utc: string | null
          hotel_name: string | null
          hotel_reservation_code: string | null
          id: string
          issue_resolution: string | null
          issue_type: string | null
          last_notified_at: string | null
          milestone: string
          notes: string | null
          sale_id: string
          scheduled_at_utc: string | null
          status: string
          updated_at: string
          urgency_level: string
        }
        Insert: {
          assigned_to_user_id?: string | null
          confirmed_at?: string | null
          confirmed_by_user_id?: string | null
          contact_details?: string | null
          contact_method?: string | null
          created_at?: string
          created_by?: string
          evidence_attachment_ids?: string[] | null
          hotel_checkin_datetime_utc?: string | null
          hotel_name?: string | null
          hotel_reservation_code?: string | null
          id?: string
          issue_resolution?: string | null
          issue_type?: string | null
          last_notified_at?: string | null
          milestone?: string
          notes?: string | null
          sale_id: string
          scheduled_at_utc?: string | null
          status?: string
          updated_at?: string
          urgency_level?: string
        }
        Update: {
          assigned_to_user_id?: string | null
          confirmed_at?: string | null
          confirmed_by_user_id?: string | null
          contact_details?: string | null
          contact_method?: string | null
          created_at?: string
          created_by?: string
          evidence_attachment_ids?: string[] | null
          hotel_checkin_datetime_utc?: string | null
          hotel_name?: string | null
          hotel_reservation_code?: string | null
          id?: string
          issue_resolution?: string | null
          issue_type?: string | null
          last_notified_at?: string | null
          milestone?: string
          notes?: string | null
          sale_id?: string
          scheduled_at_utc?: string | null
          status?: string
          updated_at?: string
          urgency_level?: string
        }
        Relationships: [
          {
            foreignKeyName: "lodging_confirmation_tasks_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      message_queue: {
        Row: {
          conversation_id: string | null
          created_at: string
          error_message: string | null
          id: string
          payload: Json
          retry_count: number
          sent_at: string | null
          status: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          payload?: Json
          retry_count?: number
          sent_at?: string | null
          status?: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          payload?: Json
          retry_count?: number
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_queue_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
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
          categoria: string | null
          cpf: string | null
          created_at: string
          created_by: string | null
          full_name: string
          id: string
          passport_expiry: string | null
          passport_number: string | null
          phone: string | null
          rg: string | null
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
          categoria?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          full_name: string
          id?: string
          passport_expiry?: string | null
          passport_number?: string | null
          phone?: string | null
          rg?: string | null
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
          categoria?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          full_name?: string
          id?: string
          passport_expiry?: string | null
          passport_number?: string | null
          phone?: string | null
          rg?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      payment_fee_rules: {
        Row: {
          acquirer: string | null
          created_at: string
          fee_fixed: number | null
          fee_percent: number
          holder: string | null
          holder_id: string | null
          holder_type: string | null
          id: string
          installments: number | null
          is_active: boolean | null
          notes: string | null
          payment_method: string
        }
        Insert: {
          acquirer?: string | null
          created_at?: string
          fee_fixed?: number | null
          fee_percent?: number
          holder?: string | null
          holder_id?: string | null
          holder_type?: string | null
          id?: string
          installments?: number | null
          is_active?: boolean | null
          notes?: string | null
          payment_method: string
        }
        Update: {
          acquirer?: string | null
          created_at?: string
          fee_fixed?: number | null
          fee_percent?: number
          holder?: string | null
          holder_id?: string | null
          holder_type?: string | null
          id?: string
          installments?: number | null
          is_active?: boolean | null
          notes?: string | null
          payment_method?: string
        }
        Relationships: []
      }
      payroll: {
        Row: {
          advances: number | null
          base_salary: number | null
          bonus_value: number | null
          commission_value: number | null
          created_at: string
          deductions: number | null
          employee_id: string
          id: string
          net_total: number | null
          notes: string | null
          overtime_value: number | null
          paid_date: string | null
          reference_month: string
          reimbursements: number | null
          status: string
          updated_at: string
        }
        Insert: {
          advances?: number | null
          base_salary?: number | null
          bonus_value?: number | null
          commission_value?: number | null
          created_at?: string
          deductions?: number | null
          employee_id: string
          id?: string
          net_total?: number | null
          notes?: string | null
          overtime_value?: number | null
          paid_date?: string | null
          reference_month: string
          reimbursements?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          advances?: number | null
          base_salary?: number | null
          bonus_value?: number | null
          commission_value?: number | null
          created_at?: string
          deductions?: number | null
          employee_id?: string
          id?: string
          net_total?: number | null
          notes?: string | null
          overtime_value?: number | null
          paid_date?: string | null
          reference_month?: string
          reimbursements?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_scores: {
        Row: {
          attendance_score: number | null
          created_at: string
          employee_id: string
          goals_score: number | null
          id: string
          initiative_score: number | null
          notes: string | null
          overall_score: number | null
          period_month: string
          quality_score: number | null
          teamwork_score: number | null
        }
        Insert: {
          attendance_score?: number | null
          created_at?: string
          employee_id: string
          goals_score?: number | null
          id?: string
          initiative_score?: number | null
          notes?: string | null
          overall_score?: number | null
          period_month: string
          quality_score?: number | null
          teamwork_score?: number | null
        }
        Update: {
          attendance_score?: number | null
          created_at?: string
          employee_id?: string
          goals_score?: number | null
          id?: string
          initiative_score?: number | null
          notes?: string | null
          overall_score?: number | null
          period_month?: string
          quality_score?: number | null
          teamwork_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "performance_scores_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
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
      receiving_accounts: {
        Row: {
          account_number: string | null
          account_type: string
          agency: string | null
          bank_name: string | null
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          pix_key: string | null
          pix_key_type: string | null
        }
        Insert: {
          account_number?: string | null
          account_type?: string
          agency?: string | null
          bank_name?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
        }
        Update: {
          account_number?: string | null
          account_type?: string
          agency?: string | null
          bank_name?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
        }
        Relationships: []
      }
      sale_passengers: {
        Row: {
          id: string
          observations: string | null
          passenger_id: string
          role: string
          sale_id: string
        }
        Insert: {
          id?: string
          observations?: string | null
          passenger_id: string
          role?: string
          sale_id: string
        }
        Update: {
          id?: string
          observations?: string | null
          passenger_id?: string
          role?: string
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
      sale_payments: {
        Row: {
          created_at: string
          fee_fixed: number | null
          fee_percent: number | null
          fee_total: number | null
          gateway: string | null
          gross_value: number
          id: string
          installments: number | null
          net_value: number
          notes: string | null
          payment_date: string | null
          payment_method: string
          receiving_account_id: string | null
          sale_id: string
        }
        Insert: {
          created_at?: string
          fee_fixed?: number | null
          fee_percent?: number | null
          fee_total?: number | null
          gateway?: string | null
          gross_value?: number
          id?: string
          installments?: number | null
          net_value?: number
          notes?: string | null
          payment_date?: string | null
          payment_method?: string
          receiving_account_id?: string | null
          sale_id: string
        }
        Update: {
          created_at?: string
          fee_fixed?: number | null
          fee_percent?: number | null
          fee_total?: number | null
          gateway?: string | null
          gross_value?: number
          id?: string
          installments?: number | null
          net_value?: number
          notes?: string | null
          payment_date?: string | null
          payment_method?: string
          receiving_account_id?: string | null
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_payments_receiving_account_id_fkey"
            columns: ["receiving_account_id"]
            isOneToOne: false
            referencedRelation: "receiving_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_payments_sale_id_fkey"
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
          client_id: string | null
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
          hotel_address: string | null
          hotel_checkin_date: string | null
          hotel_checkout_date: string | null
          hotel_city: string | null
          hotel_country: string | null
          hotel_lat: number | null
          hotel_lng: number | null
          hotel_meal_plan: string | null
          hotel_name: string | null
          hotel_place_id: string | null
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
          payer_passenger_id: string | null
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
          client_id?: string | null
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
          hotel_address?: string | null
          hotel_checkin_date?: string | null
          hotel_checkout_date?: string | null
          hotel_city?: string | null
          hotel_country?: string | null
          hotel_lat?: number | null
          hotel_lng?: number | null
          hotel_meal_plan?: string | null
          hotel_name?: string | null
          hotel_place_id?: string | null
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
          payer_passenger_id?: string | null
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
          client_id?: string | null
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
          hotel_address?: string | null
          hotel_checkin_date?: string | null
          hotel_checkout_date?: string | null
          hotel_city?: string | null
          hotel_country?: string | null
          hotel_lat?: number | null
          hotel_lng?: number | null
          hotel_meal_plan?: string | null
          hotel_name?: string | null
          hotel_place_id?: string | null
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
          payer_passenger_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "sales_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_payer_passenger_id_fkey"
            columns: ["payer_passenger_id"]
            isOneToOne: false
            referencedRelation: "passengers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_miles_programs: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          is_liminar: boolean
          max_miles: number | null
          min_miles: number
          notes: string | null
          price_per_thousand: number
          program_name: string
          supplier_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_liminar?: boolean
          max_miles?: number | null
          min_miles?: number
          notes?: string | null
          price_per_thousand?: number
          program_name: string
          supplier_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_liminar?: boolean
          max_miles?: number | null
          min_miles?: number
          notes?: string | null
          price_per_thousand?: number
          program_name?: string
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_miles_programs_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          bank_account: string | null
          bank_agency: string | null
          bank_name: string | null
          bank_pix_key: string | null
          category: string | null
          cnpj: string | null
          contact_name: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          payment_conditions: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          bank_account?: string | null
          bank_agency?: string | null
          bank_name?: string | null
          bank_pix_key?: string | null
          category?: string | null
          cnpj?: string | null
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          payment_conditions?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          bank_account?: string | null
          bank_agency?: string | null
          bank_name?: string | null
          bank_pix_key?: string | null
          category?: string | null
          cnpj?: string | null
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          payment_conditions?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      team_checkins: {
        Row: {
          checkin_date: string
          comment: string | null
          created_at: string
          employee_id: string
          energy_score: number
          id: string
          mood_score: number
        }
        Insert: {
          checkin_date?: string
          comment?: string | null
          created_at?: string
          employee_id: string
          energy_score?: number
          id?: string
          mood_score?: number
        }
        Update: {
          checkin_date?: string
          comment?: string | null
          created_at?: string
          employee_id?: string
          energy_score?: number
          id?: string
          mood_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "team_checkins_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      time_adjustment_requests: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          reason: string
          requested_field: string
          requested_value: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          time_entry_id: string | null
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          reason: string
          requested_field: string
          requested_value: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          time_entry_id?: string | null
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          reason?: string
          requested_field?: string
          requested_value?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          time_entry_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "time_adjustment_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_adjustment_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_adjustment_requests_time_entry_id_fkey"
            columns: ["time_entry_id"]
            isOneToOne: false
            referencedRelation: "time_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          clock_in: string | null
          clock_out: string | null
          created_at: string
          device_info: string | null
          employee_id: string
          entry_date: string
          id: string
          ip_address: string | null
          justification: string | null
          late_minutes: number | null
          lunch_in: string | null
          lunch_out: string | null
          overtime_minutes: number | null
          status: string
          updated_at: string
          worked_minutes: number | null
        }
        Insert: {
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string
          device_info?: string | null
          employee_id: string
          entry_date?: string
          id?: string
          ip_address?: string | null
          justification?: string | null
          late_minutes?: number | null
          lunch_in?: string | null
          lunch_out?: string | null
          overtime_minutes?: number | null
          status?: string
          updated_at?: string
          worked_minutes?: number | null
        }
        Update: {
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string
          device_info?: string | null
          employee_id?: string
          entry_date?: string
          id?: string
          ip_address?: string | null
          justification?: string | null
          late_minutes?: number | null
          lunch_in?: string | null
          lunch_out?: string | null
          overtime_minutes?: number | null
          status?: string
          updated_at?: string
          worked_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      user_locations: {
        Row: {
          city: string
          country: string | null
          created_at: string
          id: string
          lat: number
          lon: number
          state: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          city: string
          country?: string | null
          created_at?: string
          id?: string
          lat: number
          lon: number
          state?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          city?: string
          country?: string | null
          created_at?: string
          id?: string
          lat?: number
          lon?: number
          state?: string | null
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
      warnings: {
        Row: {
          created_at: string
          date_issued: string
          description: string
          employee_id: string
          id: string
          issued_by: string | null
          notes: string | null
          severity: string
          status: string
          warning_type: string
        }
        Insert: {
          created_at?: string
          date_issued?: string
          description: string
          employee_id: string
          id?: string
          issued_by?: string | null
          notes?: string | null
          severity?: string
          status?: string
          warning_type?: string
        }
        Update: {
          created_at?: string
          date_issued?: string
          description?: string
          employee_id?: string
          id?: string
          issued_by?: string | null
          notes?: string | null
          severity?: string
          status?: string
          warning_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "warnings_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warnings_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_logs: {
        Row: {
          error_message: string | null
          event_type: string
          id: string
          payload: Json | null
          received_at: string
          status: string
        }
        Insert: {
          error_message?: string | null
          event_type?: string
          id?: string
          payload?: Json | null
          received_at?: string
          status?: string
        }
        Update: {
          error_message?: string | null
          event_type?: string
          id?: string
          payload?: Json | null
          received_at?: string
          status?: string
        }
        Relationships: []
      }
      whatsapp_config: {
        Row: {
          access_token: string | null
          app_id: string | null
          app_secret: string | null
          configured_by: string | null
          connection_status: string | null
          environment: string
          id: string
          last_error: string | null
          last_event_at: string | null
          phone_number_id: string | null
          updated_at: string
          updated_by: string | null
          verify_token: string | null
          waba_id: string | null
          webhook_url: string | null
        }
        Insert: {
          access_token?: string | null
          app_id?: string | null
          app_secret?: string | null
          configured_by?: string | null
          connection_status?: string | null
          environment?: string
          id?: string
          last_error?: string | null
          last_event_at?: string | null
          phone_number_id?: string | null
          updated_at?: string
          updated_by?: string | null
          verify_token?: string | null
          waba_id?: string | null
          webhook_url?: string | null
        }
        Update: {
          access_token?: string | null
          app_id?: string | null
          app_secret?: string | null
          configured_by?: string | null
          connection_status?: string | null
          environment?: string
          id?: string
          last_error?: string | null
          last_event_at?: string | null
          phone_number_id?: string | null
          updated_at?: string
          updated_by?: string | null
          verify_token?: string | null
          waba_id?: string | null
          webhook_url?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      deduplicate_passengers: { Args: never; Returns: Json }
      deduplicate_sales: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      smart_capitalize_name: { Args: { input_name: string }; Returns: string }
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
