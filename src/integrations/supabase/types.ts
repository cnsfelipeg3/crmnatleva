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
      agent_skill_assignments: {
        Row: {
          agent_id: string
          assigned_at: string
          id: string
          is_active: boolean
          skill_id: string
        }
        Insert: {
          agent_id: string
          assigned_at?: string
          id?: string
          is_active?: boolean
          skill_id: string
        }
        Update: {
          agent_id?: string
          assigned_at?: string
          id?: string
          is_active?: boolean
          skill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_skill_assignments_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "agent_skills"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_skills: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          level: string
          name: string
          prompt_instruction: string | null
          source: string | null
          source_improvement_id: string | null
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          level?: string
          name: string
          prompt_instruction?: string | null
          source?: string | null
          source_improvement_id?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          level?: string
          name?: string
          prompt_instruction?: string | null
          source?: string | null
          source_improvement_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_skills_source_improvement_id_fkey"
            columns: ["source_improvement_id"]
            isOneToOne: false
            referencedRelation: "ai_team_improvements"
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
          confidence: number | null
          content_text: string | null
          created_at: string
          description: string | null
          file_name: string | null
          file_type: string | null
          file_url: string | null
          id: string
          is_active: boolean | null
          tags: string[] | null
          taxonomy: Json | null
          title: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          category?: string
          confidence?: number | null
          content_text?: string | null
          created_at?: string
          description?: string | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_active?: boolean | null
          tags?: string[] | null
          taxonomy?: Json | null
          title: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string
          confidence?: number | null
          content_text?: string | null
          created_at?: string
          description?: string | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_active?: boolean | null
          tags?: string[] | null
          taxonomy?: Json | null
          title?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      ai_learned_patterns: {
        Row: {
          category: string
          confidence: number
          created_at: string
          data_source: string | null
          description: string | null
          detected_rule: string
          estimated_impact: string | null
          function_area: string | null
          id: string
          is_active: boolean
          is_promoted: boolean
          metadata: Json | null
          origin_context: string | null
          promoted_to_rule_id: string | null
          related_pattern_ids: string[] | null
          sample_size: number
          subcategory: string | null
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          confidence?: number
          created_at?: string
          data_source?: string | null
          description?: string | null
          detected_rule: string
          estimated_impact?: string | null
          function_area?: string | null
          id?: string
          is_active?: boolean
          is_promoted?: boolean
          metadata?: Json | null
          origin_context?: string | null
          promoted_to_rule_id?: string | null
          related_pattern_ids?: string[] | null
          sample_size?: number
          subcategory?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          confidence?: number
          created_at?: string
          data_source?: string | null
          description?: string | null
          detected_rule?: string
          estimated_impact?: string | null
          function_area?: string | null
          id?: string
          is_active?: boolean
          is_promoted?: boolean
          metadata?: Json | null
          origin_context?: string | null
          promoted_to_rule_id?: string | null
          related_pattern_ids?: string[] | null
          sample_size?: number
          subcategory?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_learned_patterns_promoted_to_rule_id_fkey"
            columns: ["promoted_to_rule_id"]
            isOneToOne: false
            referencedRelation: "ai_strategy_knowledge"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_learning_events: {
        Row: {
          client_id: string | null
          client_opened: boolean | null
          client_profile: string | null
          client_responded: boolean | null
          conversation_id: string | null
          created_at: string
          created_by: string | null
          deal_won: boolean | null
          destination: string | null
          event_type: string
          flight_option_chosen: string | null
          hotel_option_chosen: string | null
          id: string
          loss_reason: string | null
          metadata: Json | null
          observations: string | null
          passenger_count: number | null
          proposal_id: string | null
          proposal_text_summary: string | null
          sale_id: string | null
          strategy_chosen: string | null
          time_to_close_hours: number | null
          time_to_response_hours: number | null
          trip_type: string | null
        }
        Insert: {
          client_id?: string | null
          client_opened?: boolean | null
          client_profile?: string | null
          client_responded?: boolean | null
          conversation_id?: string | null
          created_at?: string
          created_by?: string | null
          deal_won?: boolean | null
          destination?: string | null
          event_type?: string
          flight_option_chosen?: string | null
          hotel_option_chosen?: string | null
          id?: string
          loss_reason?: string | null
          metadata?: Json | null
          observations?: string | null
          passenger_count?: number | null
          proposal_id?: string | null
          proposal_text_summary?: string | null
          sale_id?: string | null
          strategy_chosen?: string | null
          time_to_close_hours?: number | null
          time_to_response_hours?: number | null
          trip_type?: string | null
        }
        Update: {
          client_id?: string | null
          client_opened?: boolean | null
          client_profile?: string | null
          client_responded?: boolean | null
          conversation_id?: string | null
          created_at?: string
          created_by?: string | null
          deal_won?: boolean | null
          destination?: string | null
          event_type?: string
          flight_option_chosen?: string | null
          hotel_option_chosen?: string | null
          id?: string
          loss_reason?: string | null
          metadata?: Json | null
          observations?: string | null
          passenger_count?: number | null
          proposal_id?: string | null
          proposal_text_summary?: string | null
          sale_id?: string | null
          strategy_chosen?: string | null
          time_to_close_hours?: number | null
          time_to_response_hours?: number | null
          trip_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_learning_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_learning_events_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_learning_events_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_learning_events_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_strategy_knowledge: {
        Row: {
          category: string
          confidence: number | null
          context: string | null
          created_at: string
          created_by: string | null
          description: string | null
          estimated_impact: string | null
          example: string | null
          function_area: string | null
          id: string
          is_active: boolean
          origin_type: string | null
          priority: number
          related_rule_ids: string[] | null
          rule: string
          status: string | null
          subcategory: string | null
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          confidence?: number | null
          context?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          estimated_impact?: string | null
          example?: string | null
          function_area?: string | null
          id?: string
          is_active?: boolean
          origin_type?: string | null
          priority?: number
          related_rule_ids?: string[] | null
          rule: string
          status?: string | null
          subcategory?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          confidence?: number | null
          context?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          estimated_impact?: string | null
          example?: string | null
          function_area?: string | null
          id?: string
          is_active?: boolean
          origin_type?: string | null
          priority?: number
          related_rule_ids?: string[] | null
          rule?: string
          status?: string | null
          subcategory?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_suggestions: {
        Row: {
          conversation_id: string | null
          created_at: string
          id: string
          suggested_action: string | null
          suggested_stage: string | null
          suggested_tags: string[] | null
          suggested_text: string | null
          used: boolean | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          id?: string
          suggested_action?: string | null
          suggested_stage?: string | null
          suggested_tags?: string[] | null
          suggested_text?: string | null
          used?: boolean | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          id?: string
          suggested_action?: string | null
          suggested_stage?: string | null
          suggested_tags?: string[] | null
          suggested_text?: string | null
          used?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_suggestions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_team_activity_log: {
        Row: {
          agent_id: string
          created_at: string
          event_type: string
          id: string
          message: string
          metadata: Json | null
          severity: string | null
        }
        Insert: {
          agent_id: string
          created_at?: string
          event_type: string
          id?: string
          message: string
          metadata?: Json | null
          severity?: string | null
        }
        Update: {
          agent_id?: string
          created_at?: string
          event_type?: string
          id?: string
          message?: string
          metadata?: Json | null
          severity?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_team_activity_log_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_team_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_team_agents: {
        Row: {
          behavior_prompt: string | null
          created_at: string
          emoji: string
          id: string
          is_active: boolean
          level: number
          max_xp: number
          name: string
          persona: string | null
          role: string
          skills: string[]
          squad_id: string
          status: string
          success_rate: number | null
          tasks_today: number | null
          updated_at: string
          xp: number
        }
        Insert: {
          behavior_prompt?: string | null
          created_at?: string
          emoji?: string
          id: string
          is_active?: boolean
          level?: number
          max_xp?: number
          name: string
          persona?: string | null
          role: string
          skills?: string[]
          squad_id: string
          status?: string
          success_rate?: number | null
          tasks_today?: number | null
          updated_at?: string
          xp?: number
        }
        Update: {
          behavior_prompt?: string | null
          created_at?: string
          emoji?: string
          id?: string
          is_active?: boolean
          level?: number
          max_xp?: number
          name?: string
          persona?: string | null
          role?: string
          skills?: string[]
          squad_id?: string
          status?: string
          success_rate?: number | null
          tasks_today?: number | null
          updated_at?: string
          xp?: number
        }
        Relationships: []
      }
      ai_team_audit_log: {
        Row: {
          action_type: string
          agent_id: string | null
          agent_name: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          description: string
          details: Json | null
          entity_id: string | null
          entity_name: string | null
          entity_type: string
          id: string
          performed_by: string | null
        }
        Insert: {
          action_type: string
          agent_id?: string | null
          agent_name?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          description: string
          details?: Json | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type: string
          id?: string
          performed_by?: string | null
        }
        Update: {
          action_type?: string
          agent_id?: string | null
          agent_name?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          description?: string
          details?: Json | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string
          id?: string
          performed_by?: string | null
        }
        Relationships: []
      }
      ai_team_improvements: {
        Row: {
          agent_id: string
          approved_at: string | null
          approved_by: string | null
          category: string
          created_at: string
          description: string | null
          id: string
          impact_score: number | null
          status: string
          title: string
        }
        Insert: {
          agent_id: string
          approved_at?: string | null
          approved_by?: string | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          impact_score?: number | null
          status?: string
          title: string
        }
        Update: {
          agent_id?: string
          approved_at?: string | null
          approved_by?: string | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          impact_score?: number | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_team_improvements_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_team_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_team_lab_results: {
        Row: {
          aderencia: number | null
          agent_id: string
          ai_evaluation: string | null
          clareza: number | null
          created_at: string
          id: string
          proatividade: number | null
          profile_id: string
          profile_name: string
          response: string | null
          response_time_ms: number | null
          sentimento: number | null
          total_score: number | null
        }
        Insert: {
          aderencia?: number | null
          agent_id: string
          ai_evaluation?: string | null
          clareza?: number | null
          created_at?: string
          id?: string
          proatividade?: number | null
          profile_id: string
          profile_name: string
          response?: string | null
          response_time_ms?: number | null
          sentimento?: number | null
          total_score?: number | null
        }
        Update: {
          aderencia?: number | null
          agent_id?: string
          ai_evaluation?: string | null
          clareza?: number | null
          created_at?: string
          id?: string
          proatividade?: number | null
          profile_id?: string
          profile_name?: string
          response?: string | null
          response_time_ms?: number | null
          sentimento?: number | null
          total_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_team_lab_results_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_team_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_team_missions: {
        Row: {
          agent_id: string
          completed_at: string | null
          context: string | null
          created_at: string
          description: string | null
          id: string
          priority: string
          status: string
          title: string
          xp_reward: number | null
        }
        Insert: {
          agent_id: string
          completed_at?: string | null
          context?: string | null
          created_at?: string
          description?: string | null
          id?: string
          priority?: string
          status?: string
          title: string
          xp_reward?: number | null
        }
        Update: {
          agent_id?: string
          completed_at?: string | null
          context?: string | null
          created_at?: string
          description?: string | null
          id?: string
          priority?: string
          status?: string
          title?: string
          xp_reward?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_team_missions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_team_agents"
            referencedColumns: ["id"]
          },
        ]
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
      chatbot_sessions: {
        Row: {
          current_node_id: string | null
          flow_id: string | null
          id: string
          last_activity_at: string | null
          phone: string
          session_data: Json | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          current_node_id?: string | null
          flow_id?: string | null
          id?: string
          last_activity_at?: string | null
          phone: string
          session_data?: Json | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          current_node_id?: string | null
          flow_id?: string | null
          id?: string
          last_activity_at?: string | null
          phone?: string
          session_data?: Json | null
          started_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_sessions_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "flows"
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
      client_travel_preferences: {
        Row: {
          cabin_class: string | null
          client_id: string
          created_at: string
          hotel_category: string | null
          id: string
          loyalty_programs: string[] | null
          meal_preference: string | null
          notes: string | null
          preferred_airlines: string[] | null
          preferred_hotel_chains: string[] | null
          seat_preference: string | null
          special_needs: string | null
          travel_pace: string | null
          trip_style: string | null
          updated_at: string
        }
        Insert: {
          cabin_class?: string | null
          client_id: string
          created_at?: string
          hotel_category?: string | null
          id?: string
          loyalty_programs?: string[] | null
          meal_preference?: string | null
          notes?: string | null
          preferred_airlines?: string[] | null
          preferred_hotel_chains?: string[] | null
          seat_preference?: string | null
          special_needs?: string | null
          travel_pace?: string | null
          trip_style?: string | null
          updated_at?: string
        }
        Update: {
          cabin_class?: string | null
          client_id?: string
          created_at?: string
          hotel_category?: string | null
          id?: string
          loyalty_programs?: string[] | null
          meal_preference?: string | null
          notes?: string | null
          preferred_airlines?: string[] | null
          preferred_hotel_chains?: string[] | null
          seat_preference?: string | null
          special_needs?: string | null
          travel_pace?: string | null
          trip_style?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_travel_preferences_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_trip_memory: {
        Row: {
          client_id: string
          confidence_score: string | null
          conversation_id: string | null
          conversation_period: string | null
          detected_at: string
          id: string
          passengers: number | null
          proposal_id: string | null
          sale_id: string | null
          source_summary: string | null
          trip_dates: string | null
          trip_destination: string
          trip_status: string
          trip_subdestinations: string[] | null
          updated_at: string
        }
        Insert: {
          client_id: string
          confidence_score?: string | null
          conversation_id?: string | null
          conversation_period?: string | null
          detected_at?: string
          id?: string
          passengers?: number | null
          proposal_id?: string | null
          sale_id?: string | null
          source_summary?: string | null
          trip_dates?: string | null
          trip_destination: string
          trip_status?: string
          trip_subdestinations?: string[] | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          confidence_score?: string | null
          conversation_id?: string | null
          conversation_period?: string | null
          detected_at?: string
          id?: string
          passengers?: number | null
          proposal_id?: string | null
          sale_id?: string | null
          source_summary?: string | null
          trip_dates?: string | null
          trip_destination?: string
          trip_status?: string
          trip_subdestinations?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_trip_memory_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_trip_memory_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_trip_memory_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
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
      conversation_chunks: {
        Row: {
          chunk_index: number
          created_at: string
          id: string
          lead_id: string
          message_count: number | null
          messages: Json
          simulation_id: string
          summary: string | null
          token_estimate: number | null
        }
        Insert: {
          chunk_index?: number
          created_at?: string
          id?: string
          lead_id: string
          message_count?: number | null
          messages?: Json
          simulation_id: string
          summary?: string | null
          token_estimate?: number | null
        }
        Update: {
          chunk_index?: number
          created_at?: string
          id?: string
          lead_id?: string
          message_count?: number | null
          messages?: Json
          simulation_id?: string
          summary?: string | null
          token_estimate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_chunks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "simulated_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_chunks_simulation_id_fkey"
            columns: ["simulation_id"]
            isOneToOne: false
            referencedRelation: "simulations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          direction: string
          external_message_id: string | null
          id: string
          media_url: string | null
          message_type: string
          metadata: Json | null
          sender_type: string
          status: string | null
          timestamp: string | null
        }
        Insert: {
          content?: string
          conversation_id: string
          created_at?: string
          direction?: string
          external_message_id?: string | null
          id?: string
          media_url?: string | null
          message_type?: string
          metadata?: Json | null
          sender_type?: string
          status?: string | null
          timestamp?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          direction?: string
          external_message_id?: string | null
          id?: string
          media_url?: string | null
          message_type?: string
          metadata?: Json | null
          sender_type?: string
          status?: string | null
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_reconciliation_log: {
        Row: {
          conversation_id: string
          error: string | null
          id: string
          messages_after: number | null
          messages_before: number | null
          messages_inserted: number | null
          metadata: Json | null
          phone: string | null
          processed_at: string | null
          status: string
          zapi_messages_found: number | null
        }
        Insert: {
          conversation_id: string
          error?: string | null
          id?: string
          messages_after?: number | null
          messages_before?: number | null
          messages_inserted?: number | null
          metadata?: Json | null
          phone?: string | null
          processed_at?: string | null
          status?: string
          zapi_messages_found?: number | null
        }
        Update: {
          conversation_id?: string
          error?: string | null
          id?: string
          messages_after?: number | null
          messages_before?: number | null
          messages_inserted?: number | null
          metadata?: Json | null
          phone?: string | null
          processed_at?: string | null
          status?: string
          zapi_messages_found?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_reconciliation_log_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
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
          auto_tags: string[] | null
          client_id: string | null
          close_score: number | null
          contact_name: string | null
          created_at: string
          display_name: string | null
          engagement_level: string | null
          estimated_margin: number | null
          external_conversation_id: string | null
          external_id: string | null
          funnel_stage: string | null
          id: string
          interaction_count: number | null
          is_pinned: boolean | null
          is_vip: boolean | null
          last_message_at: string | null
          last_message_preview: string | null
          last_response_at: string | null
          lead_id: string | null
          payment_method: string | null
          phone: string | null
          price_range: string | null
          proposal_value: number | null
          proposal_viewed_at: string | null
          reconciled_at: string | null
          score_potential: number | null
          score_risk: number | null
          source: string | null
          stage: string | null
          stage_entered_at: string | null
          status: string
          tags: string[] | null
          unread_count: number | null
          updated_at: string
          vehicle_interest: string | null
        }
        Insert: {
          assigned_to?: string | null
          auto_tags?: string[] | null
          client_id?: string | null
          close_score?: number | null
          contact_name?: string | null
          created_at?: string
          display_name?: string | null
          engagement_level?: string | null
          estimated_margin?: number | null
          external_conversation_id?: string | null
          external_id?: string | null
          funnel_stage?: string | null
          id?: string
          interaction_count?: number | null
          is_pinned?: boolean | null
          is_vip?: boolean | null
          last_message_at?: string | null
          last_message_preview?: string | null
          last_response_at?: string | null
          lead_id?: string | null
          payment_method?: string | null
          phone?: string | null
          price_range?: string | null
          proposal_value?: number | null
          proposal_viewed_at?: string | null
          reconciled_at?: string | null
          score_potential?: number | null
          score_risk?: number | null
          source?: string | null
          stage?: string | null
          stage_entered_at?: string | null
          status?: string
          tags?: string[] | null
          unread_count?: number | null
          updated_at?: string
          vehicle_interest?: string | null
        }
        Update: {
          assigned_to?: string | null
          auto_tags?: string[] | null
          client_id?: string | null
          close_score?: number | null
          contact_name?: string | null
          created_at?: string
          display_name?: string | null
          engagement_level?: string | null
          estimated_margin?: number | null
          external_conversation_id?: string | null
          external_id?: string | null
          funnel_stage?: string | null
          id?: string
          interaction_count?: number | null
          is_pinned?: boolean | null
          is_vip?: boolean | null
          last_message_at?: string | null
          last_message_preview?: string | null
          last_response_at?: string | null
          lead_id?: string | null
          payment_method?: string | null
          phone?: string | null
          price_range?: string | null
          proposal_value?: number | null
          proposal_viewed_at?: string | null
          reconciled_at?: string | null
          score_potential?: number | null
          score_risk?: number | null
          source?: string | null
          stage?: string | null
          stage_entered_at?: string | null
          status?: string
          tags?: string[] | null
          unread_count?: number | null
          updated_at?: string
          vehicle_interest?: string | null
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
      flow_edges: {
        Row: {
          created_at: string
          edge_id: string
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
          edge_id: string
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
          edge_id?: string
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
            foreignKeyName: "flow_edges_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "flows"
            referencedColumns: ["id"]
          },
        ]
      }
      flow_execution_logs: {
        Row: {
          completed_at: string | null
          contact_name: string | null
          conversation_id: string | null
          current_node_id: string | null
          error_message: string | null
          execution_data: Json | null
          execution_path: Json | null
          flow_id: string | null
          id: string
          is_simulation: boolean | null
          phone: string | null
          started_at: string | null
          status: string | null
          trigger_type: string | null
          variables_snapshot: Json | null
        }
        Insert: {
          completed_at?: string | null
          contact_name?: string | null
          conversation_id?: string | null
          current_node_id?: string | null
          error_message?: string | null
          execution_data?: Json | null
          execution_path?: Json | null
          flow_id?: string | null
          id?: string
          is_simulation?: boolean | null
          phone?: string | null
          started_at?: string | null
          status?: string | null
          trigger_type?: string | null
          variables_snapshot?: Json | null
        }
        Update: {
          completed_at?: string | null
          contact_name?: string | null
          conversation_id?: string | null
          current_node_id?: string | null
          error_message?: string | null
          execution_data?: Json | null
          execution_path?: Json | null
          flow_id?: string | null
          id?: string
          is_simulation?: boolean | null
          phone?: string | null
          started_at?: string | null
          status?: string | null
          trigger_type?: string | null
          variables_snapshot?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "flow_execution_logs_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "flows"
            referencedColumns: ["id"]
          },
        ]
      }
      flow_nodes: {
        Row: {
          config: Json | null
          created_at: string
          flow_id: string
          id: string
          label: string | null
          node_id: string
          node_type: string
          position_x: number | null
          position_y: number | null
        }
        Insert: {
          config?: Json | null
          created_at?: string
          flow_id: string
          id?: string
          label?: string | null
          node_id: string
          node_type: string
          position_x?: number | null
          position_y?: number | null
        }
        Update: {
          config?: Json | null
          created_at?: string
          flow_id?: string
          id?: string
          label?: string | null
          node_id?: string
          node_type?: string
          position_x?: number | null
          position_y?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "flow_nodes_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "flows"
            referencedColumns: ["id"]
          },
        ]
      }
      flow_router_rules: {
        Row: {
          created_at: string
          flow_id: string
          id: string
          is_active: boolean | null
          keywords: string[] | null
          label: string
          priority: number | null
        }
        Insert: {
          created_at?: string
          flow_id: string
          id?: string
          is_active?: boolean | null
          keywords?: string[] | null
          label: string
          priority?: number | null
        }
        Update: {
          created_at?: string
          flow_id?: string
          id?: string
          is_active?: boolean | null
          keywords?: string[] | null
          label?: string
          priority?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "flow_router_rules_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "flows"
            referencedColumns: ["id"]
          },
        ]
      }
      flow_versions: {
        Row: {
          created_at: string
          edges_snapshot: Json | null
          flow_id: string
          id: string
          nodes_snapshot: Json | null
          version: number | null
        }
        Insert: {
          created_at?: string
          edges_snapshot?: Json | null
          flow_id: string
          id?: string
          nodes_snapshot?: Json | null
          version?: number | null
        }
        Update: {
          created_at?: string
          edges_snapshot?: Json | null
          flow_id?: string
          id?: string
          nodes_snapshot?: Json | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "flow_versions_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "flows"
            referencedColumns: ["id"]
          },
        ]
      }
      flows: {
        Row: {
          created_at: string
          description: string | null
          edges: Json | null
          id: string
          is_active: boolean | null
          name: string
          nodes: Json | null
          status: string | null
          trigger_keyword: string | null
          updated_at: string
          version: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          edges?: Json | null
          id?: string
          is_active?: boolean | null
          name: string
          nodes?: Json | null
          status?: string | null
          trigger_keyword?: string | null
          updated_at?: string
          version?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          edges?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          nodes?: Json | null
          status?: string | null
          trigger_keyword?: string | null
          updated_at?: string
          version?: number | null
        }
        Relationships: []
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
      hotel_media_cache: {
        Row: {
          created_at: string
          domain_confidence: number | null
          hotel_name: string
          hotel_name_normalized: string
          id: string
          official_domain: string | null
          photos_count: number | null
          rooms_found: number | null
          scrape_result: Json
          source_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          domain_confidence?: number | null
          hotel_name: string
          hotel_name_normalized: string
          id?: string
          official_domain?: string | null
          photos_count?: number | null
          rooms_found?: number | null
          scrape_result?: Json
          source_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          domain_confidence?: number | null
          hotel_name?: string
          hotel_name_normalized?: string
          id?: string
          official_domain?: string | null
          photos_count?: number | null
          rooms_found?: number | null
          scrape_result?: Json
          source_url?: string | null
          updated_at?: string
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
      livechat_users: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          role: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          role?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          role?: string | null
          user_id?: string
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
      media_items: {
        Row: {
          created_at: string
          created_by: string | null
          height: number | null
          id: string
          image_type: string | null
          image_url: string
          is_cover: boolean | null
          label: string | null
          place_id: string
          room_name: string | null
          sort_order: number | null
          source: string | null
          status: string | null
          storage_path: string | null
          width: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          height?: number | null
          id?: string
          image_type?: string | null
          image_url: string
          is_cover?: boolean | null
          label?: string | null
          place_id: string
          room_name?: string | null
          sort_order?: number | null
          source?: string | null
          status?: string | null
          storage_path?: string | null
          width?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          height?: number | null
          id?: string
          image_type?: string | null
          image_url?: string
          is_cover?: boolean | null
          label?: string | null
          place_id?: string
          room_name?: string | null
          sort_order?: number | null
          source?: string | null
          status?: string | null
          storage_path?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_items_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "media_places"
            referencedColumns: ["id"]
          },
        ]
      }
      media_places: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          editorial_summary: string | null
          id: string
          location: Json | null
          name: string
          phone: string | null
          place_id: string | null
          place_type: string
          rating: number | null
          types: string[] | null
          updated_at: string
          user_ratings_total: number | null
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          editorial_summary?: string | null
          id?: string
          location?: Json | null
          name: string
          phone?: string | null
          place_id?: string | null
          place_type?: string
          rating?: number | null
          types?: string[] | null
          updated_at?: string
          user_ratings_total?: number | null
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          editorial_summary?: string | null
          id?: string
          location?: Json | null
          name?: string
          phone?: string | null
          place_id?: string | null
          place_type?: string
          rating?: number | null
          types?: string[] | null
          updated_at?: string
          user_ratings_total?: number | null
          website?: string | null
        }
        Relationships: []
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
      messages: {
        Row: {
          conversation_id: string | null
          created_at: string
          external_message_id: string | null
          id: string
          media_url: string | null
          message_type: string
          sender_type: string
          status: string | null
          text: string | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          external_message_id?: string | null
          id?: string
          media_url?: string | null
          message_type?: string
          sender_type?: string
          status?: string | null
          text?: string | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          external_message_id?: string | null
          id?: string
          media_url?: string | null
          message_type?: string
          sender_type?: string
          status?: string | null
          text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      metrics_snapshots: {
        Row: {
          active_leads: number | null
          avg_eficacia: number | null
          avg_humanizacao: number | null
          avg_sentimento: number | null
          avg_tecnica: number | null
          bottleneck_stage: string | null
          closed_leads: number | null
          id: string
          leads_by_stage: Json | null
          lost_leads: number | null
          revenue_so_far: number | null
          simulation_id: string
          snapshot_at: string
        }
        Insert: {
          active_leads?: number | null
          avg_eficacia?: number | null
          avg_humanizacao?: number | null
          avg_sentimento?: number | null
          avg_tecnica?: number | null
          bottleneck_stage?: string | null
          closed_leads?: number | null
          id?: string
          leads_by_stage?: Json | null
          lost_leads?: number | null
          revenue_so_far?: number | null
          simulation_id: string
          snapshot_at?: string
        }
        Update: {
          active_leads?: number | null
          avg_eficacia?: number | null
          avg_humanizacao?: number | null
          avg_sentimento?: number | null
          avg_tecnica?: number | null
          bottleneck_stage?: string | null
          closed_leads?: number | null
          id?: string
          leads_by_stage?: Json | null
          lost_leads?: number | null
          revenue_so_far?: number | null
          simulation_id?: string
          snapshot_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "metrics_snapshots_simulation_id_fkey"
            columns: ["simulation_id"]
            isOneToOne: false
            referencedRelation: "simulations"
            referencedColumns: ["id"]
          },
        ]
      }
      natleva_brain_insights: {
        Row: {
          action_suggested: string | null
          action_taken: boolean | null
          action_taken_at: string | null
          category: string
          client_profile: string | null
          confidence: number
          created_at: string
          description: string | null
          destination: string | null
          expires_at: string | null
          id: string
          impact_level: string | null
          insight_type: string
          is_active: boolean
          metadata: Json | null
          probability_score: number | null
          promoted_at: string | null
          promoted_to_knowledge: boolean
          related_client_id: string | null
          related_proposal_id: string | null
          related_sale_id: string | null
          sample_size: number
          strategy: string | null
          subcategory: string | null
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          action_suggested?: string | null
          action_taken?: boolean | null
          action_taken_at?: string | null
          category?: string
          client_profile?: string | null
          confidence?: number
          created_at?: string
          description?: string | null
          destination?: string | null
          expires_at?: string | null
          id?: string
          impact_level?: string | null
          insight_type: string
          is_active?: boolean
          metadata?: Json | null
          probability_score?: number | null
          promoted_at?: string | null
          promoted_to_knowledge?: boolean
          related_client_id?: string | null
          related_proposal_id?: string | null
          related_sale_id?: string | null
          sample_size?: number
          strategy?: string | null
          subcategory?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          action_suggested?: string | null
          action_taken?: boolean | null
          action_taken_at?: string | null
          category?: string
          client_profile?: string | null
          confidence?: number
          created_at?: string
          description?: string | null
          destination?: string | null
          expires_at?: string | null
          id?: string
          impact_level?: string | null
          insight_type?: string
          is_active?: boolean
          metadata?: Json | null
          probability_score?: number | null
          promoted_at?: string | null
          promoted_to_knowledge?: boolean
          related_client_id?: string | null
          related_proposal_id?: string | null
          related_sale_id?: string | null
          sample_size?: number
          strategy?: string | null
          subcategory?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "natleva_brain_insights_related_client_id_fkey"
            columns: ["related_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "natleva_brain_insights_related_proposal_id_fkey"
            columns: ["related_proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "natleva_brain_insights_related_sale_id_fkey"
            columns: ["related_sale_id"]
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
      pipeline_rebuild_log: {
        Row: {
          batch_number: number
          detail: Json | null
          finished_at: string | null
          id: string
          notes: string | null
          started_at: string | null
          total_errors: number | null
          total_processed: number | null
          total_updated: number | null
        }
        Insert: {
          batch_number: number
          detail?: Json | null
          finished_at?: string | null
          id?: string
          notes?: string | null
          started_at?: string | null
          total_errors?: number | null
          total_processed?: number | null
          total_updated?: number | null
        }
        Update: {
          batch_number?: number
          detail?: Json | null
          finished_at?: string | null
          id?: string
          notes?: string | null
          started_at?: string | null
          total_errors?: number | null
          total_processed?: number | null
          total_updated?: number | null
        }
        Relationships: []
      }
      portal_access: {
        Row: {
          client_id: string
          created_at: string
          first_login_at: string | null
          id: string
          is_active: boolean
          must_change_password: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          first_login_at?: string | null
          id?: string
          is_active?: boolean
          must_change_password?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          first_login_at?: string | null
          id?: string
          is_active?: boolean
          must_change_password?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_access_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_assistant_logs: {
        Row: {
          answer: string
          client_id: string
          created_at: string
          id: string
          question: string
          sale_id: string | null
        }
        Insert: {
          answer: string
          client_id: string
          created_at?: string
          id?: string
          question: string
          sale_id?: string | null
        }
        Update: {
          answer?: string
          client_id?: string
          created_at?: string
          id?: string
          question?: string
          sale_id?: string | null
        }
        Relationships: []
      }
      portal_budget_categories: {
        Row: {
          budget_id: string
          color: string | null
          created_at: string
          icon: string | null
          id: string
          name: string
          planned_amount: number | null
          sort_order: number | null
        }
        Insert: {
          budget_id: string
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          planned_amount?: number | null
          sort_order?: number | null
        }
        Update: {
          budget_id?: string
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          planned_amount?: number | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_budget_categories_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "portal_travel_budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_cash_tracking: {
        Row: {
          budget_id: string
          created_at: string
          currency: string | null
          description: string | null
          id: string
          initial_amount: number | null
        }
        Insert: {
          budget_id: string
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          initial_amount?: number | null
        }
        Update: {
          budget_id?: string
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          initial_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_cash_tracking_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "portal_travel_budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_checklist_items: {
        Row: {
          category: string
          client_id: string
          created_at: string
          description: string | null
          id: string
          is_auto_generated: boolean
          is_mandatory: boolean
          metadata: Json | null
          sale_id: string
          sort_order: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          client_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_auto_generated?: boolean
          is_mandatory?: boolean
          metadata?: Json | null
          sale_id: string
          sort_order?: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          client_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_auto_generated?: boolean
          is_mandatory?: boolean
          metadata?: Json | null
          sale_id?: string
          sort_order?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_checklist_items_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_checklist_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_expense_group_members: {
        Row: {
          avatar_color: string | null
          created_at: string
          group_id: string
          id: string
          name: string
          passenger_id: string | null
        }
        Insert: {
          avatar_color?: string | null
          created_at?: string
          group_id: string
          id?: string
          name: string
          passenger_id?: string | null
        }
        Update: {
          avatar_color?: string | null
          created_at?: string
          group_id?: string
          id?: string
          name?: string
          passenger_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_expense_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "portal_expense_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_expense_group_members_passenger_id_fkey"
            columns: ["passenger_id"]
            isOneToOne: false
            referencedRelation: "passengers"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_expense_groups: {
        Row: {
          client_id: string
          created_at: string
          currency: string
          id: string
          name: string
          sale_id: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          currency?: string
          id?: string
          name: string
          sale_id?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          currency?: string
          id?: string
          name?: string
          sale_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_expense_groups_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_expense_settlements: {
        Row: {
          amount: number
          created_at: string
          currency: string
          from_member_id: string
          group_id: string
          id: string
          is_paid: boolean
          paid_at: string | null
          to_member_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          from_member_id: string
          group_id: string
          id?: string
          is_paid?: boolean
          paid_at?: string | null
          to_member_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          from_member_id?: string
          group_id?: string
          id?: string
          is_paid?: boolean
          paid_at?: string | null
          to_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_expense_settlements_from_member_id_fkey"
            columns: ["from_member_id"]
            isOneToOne: false
            referencedRelation: "portal_expense_group_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_expense_settlements_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "portal_expense_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_expense_settlements_to_member_id_fkey"
            columns: ["to_member_id"]
            isOneToOne: false
            referencedRelation: "portal_expense_group_members"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_expense_splits: {
        Row: {
          amount: number
          created_at: string
          expense_id: string
          id: string
          member_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          expense_id: string
          id?: string
          member_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          expense_id?: string
          id?: string
          member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_expense_splits_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "portal_group_expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_expense_splits_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "portal_expense_group_members"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_expenses: {
        Row: {
          amount: number
          budget_id: string
          card_id: string | null
          category_id: string | null
          converted_amount: number | null
          created_at: string
          currency: string | null
          description: string
          expense_date: string
          id: string
          notes: string | null
          payment_method: string | null
        }
        Insert: {
          amount?: number
          budget_id: string
          card_id?: string | null
          category_id?: string | null
          converted_amount?: number | null
          created_at?: string
          currency?: string | null
          description: string
          expense_date?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
        }
        Update: {
          amount?: number
          budget_id?: string
          card_id?: string | null
          category_id?: string | null
          converted_amount?: number | null
          created_at?: string
          currency?: string | null
          description?: string
          expense_date?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_expenses_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "portal_travel_budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_expenses_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "portal_travel_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "portal_budget_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_group_expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          currency: string
          description: string
          expense_date: string
          group_id: string
          id: string
          notes: string | null
          paid_by_member_id: string
          receipt_url: string | null
          split_type: string
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          currency?: string
          description: string
          expense_date?: string
          group_id: string
          id?: string
          notes?: string | null
          paid_by_member_id: string
          receipt_url?: string | null
          split_type?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          currency?: string
          description?: string
          expense_date?: string
          group_id?: string
          id?: string
          notes?: string | null
          paid_by_member_id?: string
          receipt_url?: string | null
          split_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_group_expenses_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "portal_expense_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_group_expenses_paid_by_member_id_fkey"
            columns: ["paid_by_member_id"]
            isOneToOne: false
            referencedRelation: "portal_expense_group_members"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_notifications: {
        Row: {
          channel: string
          client_id: string
          created_at: string
          id: string
          message: string
          metadata: Json | null
          notification_type: string
          read_at: string | null
          read_status: string
          sale_id: string | null
          scheduled_for: string | null
          sent_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          channel?: string
          client_id: string
          created_at?: string
          id?: string
          message: string
          metadata?: Json | null
          notification_type?: string
          read_at?: string | null
          read_status?: string
          sale_id?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          channel?: string
          client_id?: string
          created_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          notification_type?: string
          read_at?: string | null
          read_status?: string
          sale_id?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_notifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_notifications_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_published_sales: {
        Row: {
          client_id: string
          cover_image_url: string | null
          created_at: string
          custom_title: string | null
          id: string
          is_active: boolean
          notes_for_client: string | null
          published_at: string
          published_by: string | null
          sale_id: string
        }
        Insert: {
          client_id: string
          cover_image_url?: string | null
          created_at?: string
          custom_title?: string | null
          id?: string
          is_active?: boolean
          notes_for_client?: string | null
          published_at?: string
          published_by?: string | null
          sale_id: string
        }
        Update: {
          client_id?: string
          cover_image_url?: string | null
          created_at?: string
          custom_title?: string | null
          id?: string
          is_active?: boolean
          notes_for_client?: string | null
          published_at?: string
          published_by?: string | null
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_published_sales_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_published_sales_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: true
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_quote_requests: {
        Row: {
          adults: number | null
          budget_range: string | null
          cabin_class: string | null
          children: number | null
          client_id: string | null
          created_at: string
          departure_date: string | null
          destination_city: string | null
          destination_iata: string | null
          flexible_dates: boolean | null
          hotel_needed: boolean | null
          hotel_preferences: string | null
          id: string
          infants: number | null
          insurance_needed: boolean | null
          origin_city: string | null
          origin_iata: string | null
          portal_user_id: string
          return_date: string | null
          special_requests: string | null
          status: string
          transfer_needed: boolean | null
          traveler_names: Json | null
          trip_type: string | null
          updated_at: string
        }
        Insert: {
          adults?: number | null
          budget_range?: string | null
          cabin_class?: string | null
          children?: number | null
          client_id?: string | null
          created_at?: string
          departure_date?: string | null
          destination_city?: string | null
          destination_iata?: string | null
          flexible_dates?: boolean | null
          hotel_needed?: boolean | null
          hotel_preferences?: string | null
          id?: string
          infants?: number | null
          insurance_needed?: boolean | null
          origin_city?: string | null
          origin_iata?: string | null
          portal_user_id: string
          return_date?: string | null
          special_requests?: string | null
          status?: string
          transfer_needed?: boolean | null
          traveler_names?: Json | null
          trip_type?: string | null
          updated_at?: string
        }
        Update: {
          adults?: number | null
          budget_range?: string | null
          cabin_class?: string | null
          children?: number | null
          client_id?: string | null
          created_at?: string
          departure_date?: string | null
          destination_city?: string | null
          destination_iata?: string | null
          flexible_dates?: boolean | null
          hotel_needed?: boolean | null
          hotel_preferences?: string | null
          id?: string
          infants?: number | null
          insurance_needed?: boolean | null
          origin_city?: string | null
          origin_iata?: string | null
          portal_user_id?: string
          return_date?: string | null
          special_requests?: string | null
          status?: string
          transfer_needed?: boolean | null
          traveler_names?: Json | null
          trip_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_quote_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_travel_budgets: {
        Row: {
          client_id: string
          created_at: string
          currency: string | null
          exchange_rate: number | null
          foreign_currency: string | null
          id: string
          sale_id: string
          total_budget: number | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          currency?: string | null
          exchange_rate?: number | null
          foreign_currency?: string | null
          id?: string
          sale_id: string
          total_budget?: number | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          currency?: string | null
          exchange_rate?: number | null
          foreign_currency?: string | null
          id?: string
          sale_id?: string
          total_budget?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_travel_budgets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_travel_budgets_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_travel_cards: {
        Row: {
          brand: string | null
          budget_id: string
          card_type: string | null
          created_at: string
          id: string
          last_digits: string | null
          nickname: string
        }
        Insert: {
          brand?: string | null
          budget_id: string
          card_type?: string | null
          created_at?: string
          id?: string
          last_digits?: string | null
          nickname: string
        }
        Update: {
          brand?: string | null
          budget_id?: string
          card_type?: string | null
          created_at?: string
          id?: string
          last_digits?: string | null
          nickname?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_travel_cards_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "portal_travel_budgets"
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
      proposal_interactions: {
        Row: {
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          proposal_id: string
          section_name: string | null
          viewer_id: string
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          proposal_id: string
          section_name?: string | null
          viewer_id: string
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          proposal_id?: string
          section_name?: string | null
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_interactions_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_interactions_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "proposal_viewers"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_items: {
        Row: {
          created_at: string
          data: Json | null
          description: string | null
          id: string
          image_url: string | null
          item_type: string
          position: number
          proposal_id: string
          title: string | null
        }
        Insert: {
          created_at?: string
          data?: Json | null
          description?: string | null
          id?: string
          image_url?: string | null
          item_type: string
          position?: number
          proposal_id: string
          title?: string | null
        }
        Update: {
          created_at?: string
          data?: Json | null
          description?: string | null
          id?: string
          image_url?: string | null
          item_type?: string
          position?: number
          proposal_id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposal_items_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_templates: {
        Row: {
          accent_color: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          font_body: string | null
          font_heading: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          primary_color: string | null
          sections: Json | null
          theme_config: Json | null
          thumbnail_url: string | null
          updated_at: string | null
        }
        Insert: {
          accent_color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          font_body?: string | null
          font_heading?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          primary_color?: string | null
          sections?: Json | null
          theme_config?: Json | null
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Update: {
          accent_color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          font_body?: string | null
          font_heading?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          primary_color?: string | null
          sections?: Json | null
          theme_config?: Json | null
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      proposal_viewers: {
        Row: {
          cta_clicked: boolean
          device_type: string | null
          email: string
          engagement_score: number
          first_viewed_at: string
          id: string
          ip_address: string | null
          last_active_at: string
          metadata: Json | null
          name: string | null
          phone: string | null
          proposal_id: string
          scroll_depth_max: number
          sections_viewed: string[] | null
          total_time_seconds: number
          total_views: number
          user_agent: string | null
          whatsapp_clicked: boolean
        }
        Insert: {
          cta_clicked?: boolean
          device_type?: string | null
          email: string
          engagement_score?: number
          first_viewed_at?: string
          id?: string
          ip_address?: string | null
          last_active_at?: string
          metadata?: Json | null
          name?: string | null
          phone?: string | null
          proposal_id: string
          scroll_depth_max?: number
          sections_viewed?: string[] | null
          total_time_seconds?: number
          total_views?: number
          user_agent?: string | null
          whatsapp_clicked?: boolean
        }
        Update: {
          cta_clicked?: boolean
          device_type?: string | null
          email?: string
          engagement_score?: number
          first_viewed_at?: string
          id?: string
          ip_address?: string | null
          last_active_at?: string
          metadata?: Json | null
          name?: string | null
          phone?: string | null
          proposal_id?: string
          scroll_depth_max?: number
          sections_viewed?: string[] | null
          total_time_seconds?: number
          total_views?: number
          user_agent?: string | null
          whatsapp_clicked?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "proposal_viewers_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_views: {
        Row: {
          device_type: string | null
          duration_seconds: number | null
          id: string
          proposal_id: string
          user_agent: string | null
          viewed_at: string
        }
        Insert: {
          device_type?: string | null
          duration_seconds?: number | null
          id?: string
          proposal_id: string
          user_agent?: string | null
          viewed_at?: string
        }
        Update: {
          device_type?: string | null
          duration_seconds?: number | null
          id?: string
          proposal_id?: string
          user_agent?: string | null
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_views_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          client_id: string | null
          client_name: string | null
          consultant_name: string | null
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          destinations: string[] | null
          id: string
          intro_text: string | null
          last_viewed_at: string | null
          origin: string | null
          passenger_count: number | null
          payment_conditions: Json | null
          proposal_outcome: string | null
          proposal_strategy: string | null
          sale_id: string | null
          slug: string
          status: string
          title: string
          total_value: number | null
          travel_end_date: string | null
          travel_start_date: string | null
          updated_at: string
          value_per_person: number | null
          views_count: number | null
        }
        Insert: {
          client_id?: string | null
          client_name?: string | null
          consultant_name?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          destinations?: string[] | null
          id?: string
          intro_text?: string | null
          last_viewed_at?: string | null
          origin?: string | null
          passenger_count?: number | null
          payment_conditions?: Json | null
          proposal_outcome?: string | null
          proposal_strategy?: string | null
          sale_id?: string | null
          slug: string
          status?: string
          title: string
          total_value?: number | null
          travel_end_date?: string | null
          travel_start_date?: string | null
          updated_at?: string
          value_per_person?: number | null
          views_count?: number | null
        }
        Update: {
          client_id?: string | null
          client_name?: string | null
          consultant_name?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          destinations?: string[] | null
          id?: string
          intro_text?: string | null
          last_viewed_at?: string | null
          origin?: string | null
          passenger_count?: number | null
          payment_conditions?: Json | null
          proposal_outcome?: string | null
          proposal_strategy?: string | null
          sale_id?: string | null
          slug?: string
          status?: string
          title?: string
          total_value?: number | null
          travel_end_date?: string | null
          travel_start_date?: string | null
          updated_at?: string
          value_per_person?: number | null
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
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
          due_date: string | null
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
          status: string
        }
        Insert: {
          created_at?: string
          due_date?: string | null
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
          status?: string
        }
        Update: {
          created_at?: string
          due_date?: string | null
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
          status?: string
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
      simulated_leads: {
        Row: {
          context_summary: Json | null
          created_at: string
          destino: string | null
          estado_emocional: string | null
          etapa_atual: string | null
          id: string
          lead_name: string
          motivo_perda: string | null
          orcamento: string | null
          paciencia: number | null
          pax: number | null
          profile_type: string
          score_eficacia: number | null
          score_humanizacao: number | null
          score_tecnica: number | null
          sentimento_score: number | null
          simulation_id: string
          status: string
          ticket: number | null
          total_chunks: number | null
          total_messages: number | null
          updated_at: string
        }
        Insert: {
          context_summary?: Json | null
          created_at?: string
          destino?: string | null
          estado_emocional?: string | null
          etapa_atual?: string | null
          id?: string
          lead_name: string
          motivo_perda?: string | null
          orcamento?: string | null
          paciencia?: number | null
          pax?: number | null
          profile_type: string
          score_eficacia?: number | null
          score_humanizacao?: number | null
          score_tecnica?: number | null
          sentimento_score?: number | null
          simulation_id: string
          status?: string
          ticket?: number | null
          total_chunks?: number | null
          total_messages?: number | null
          updated_at?: string
        }
        Update: {
          context_summary?: Json | null
          created_at?: string
          destino?: string | null
          estado_emocional?: string | null
          etapa_atual?: string | null
          id?: string
          lead_name?: string
          motivo_perda?: string | null
          orcamento?: string | null
          paciencia?: number | null
          pax?: number | null
          profile_type?: string
          score_eficacia?: number | null
          score_humanizacao?: number | null
          score_tecnica?: number | null
          sentimento_score?: number | null
          simulation_id?: string
          status?: string
          ticket?: number | null
          total_chunks?: number | null
          total_messages?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulated_leads_simulation_id_fkey"
            columns: ["simulation_id"]
            isOneToOne: false
            referencedRelation: "simulations"
            referencedColumns: ["id"]
          },
        ]
      }
      simulation_events: {
        Row: {
          agent_id: string | null
          created_at: string
          event_type: string
          id: string
          lead_id: string | null
          payload: Json | null
          simulation_id: string
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          lead_id?: string | null
          payload?: Json | null
          simulation_id: string
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          lead_id?: string | null
          payload?: Json | null
          simulation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulation_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "simulated_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulation_events_simulation_id_fkey"
            columns: ["simulation_id"]
            isOneToOne: false
            referencedRelation: "simulations"
            referencedColumns: ["id"]
          },
        ]
      }
      simulation_observations: {
        Row: {
          agent_id: string | null
          agent_name: string | null
          converted_at: string | null
          converted_to: string | null
          created_at: string
          created_by: string | null
          id: string
          lead_id: string | null
          lead_name: string | null
          message_content: string | null
          message_role: string | null
          observation_text: string
          scope: string
          simulation_id: string | null
        }
        Insert: {
          agent_id?: string | null
          agent_name?: string | null
          converted_at?: string | null
          converted_to?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id?: string | null
          lead_name?: string | null
          message_content?: string | null
          message_role?: string | null
          observation_text: string
          scope?: string
          simulation_id?: string | null
        }
        Update: {
          agent_id?: string | null
          agent_name?: string | null
          converted_at?: string | null
          converted_to?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id?: string | null
          lead_name?: string | null
          message_content?: string | null
          message_role?: string | null
          observation_text?: string
          scope?: string
          simulation_id?: string | null
        }
        Relationships: []
      }
      simulations: {
        Row: {
          config: Json
          conversion_rate: number | null
          created_at: string
          debrief: Json | null
          duration_seconds: number | null
          finished_at: string | null
          id: string
          leads_closed: number
          leads_lost: number
          score_geral: number | null
          status: string
          total_leads: number
          total_revenue: number | null
        }
        Insert: {
          config?: Json
          conversion_rate?: number | null
          created_at?: string
          debrief?: Json | null
          duration_seconds?: number | null
          finished_at?: string | null
          id?: string
          leads_closed?: number
          leads_lost?: number
          score_geral?: number | null
          status?: string
          total_leads?: number
          total_revenue?: number | null
        }
        Update: {
          config?: Json
          conversion_rate?: number | null
          created_at?: string
          debrief?: Json | null
          duration_seconds?: number | null
          finished_at?: string | null
          id?: string
          leads_closed?: number
          leads_lost?: number
          score_geral?: number | null
          status?: string
          total_leads?: number
          total_revenue?: number | null
        }
        Relationships: []
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
      supplier_settlement_items: {
        Row: {
          card_installments: number | null
          card_invoice_date: string | null
          client_name: string | null
          cost_item_id: string | null
          created_at: string
          credit_card_id: string | null
          emission_date: string
          emission_source: string | null
          emission_value: number
          id: string
          miles_price_per_thousand: number | null
          miles_program: string | null
          miles_quantity: number | null
          notes: string | null
          product_description: string | null
          sale_id: string | null
          settlement_id: string
        }
        Insert: {
          card_installments?: number | null
          card_invoice_date?: string | null
          client_name?: string | null
          cost_item_id?: string | null
          created_at?: string
          credit_card_id?: string | null
          emission_date?: string
          emission_source?: string | null
          emission_value?: number
          id?: string
          miles_price_per_thousand?: number | null
          miles_program?: string | null
          miles_quantity?: number | null
          notes?: string | null
          product_description?: string | null
          sale_id?: string | null
          settlement_id: string
        }
        Update: {
          card_installments?: number | null
          card_invoice_date?: string | null
          client_name?: string | null
          cost_item_id?: string | null
          created_at?: string
          credit_card_id?: string | null
          emission_date?: string
          emission_source?: string | null
          emission_value?: number
          id?: string
          miles_price_per_thousand?: number | null
          miles_program?: string | null
          miles_quantity?: number | null
          notes?: string | null
          product_description?: string | null
          sale_id?: string | null
          settlement_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_settlement_items_cost_item_id_fkey"
            columns: ["cost_item_id"]
            isOneToOne: false
            referencedRelation: "cost_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_settlement_items_credit_card_id_fkey"
            columns: ["credit_card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_settlement_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_settlement_items_settlement_id_fkey"
            columns: ["settlement_id"]
            isOneToOne: false
            referencedRelation: "supplier_settlements"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_settlements: {
        Row: {
          created_at: string
          created_by: string | null
          difference_value: number | null
          emission_count: number
          id: string
          notes: string | null
          payment_account: string | null
          payment_date: string | null
          payment_due_date: string
          payment_method: string | null
          period_end: string
          period_start: string
          status: string
          supplier_id: string | null
          supplier_invoice_value: number | null
          total_value: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          difference_value?: number | null
          emission_count?: number
          id?: string
          notes?: string | null
          payment_account?: string | null
          payment_date?: string | null
          payment_due_date: string
          payment_method?: string | null
          period_end: string
          period_start: string
          status?: string
          supplier_id?: string | null
          supplier_invoice_value?: number | null
          total_value?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          difference_value?: number | null
          emission_count?: number
          id?: string
          notes?: string | null
          payment_account?: string | null
          payment_date?: string | null
          payment_due_date?: string
          payment_method?: string | null
          period_end?: string
          period_start?: string
          status?: string
          supplier_id?: string | null
          supplier_invoice_value?: number | null
          total_value?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_settlements_supplier_id_fkey"
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
      tariff_conditions: {
        Row: {
          alteration_allowed: boolean | null
          alteration_deadline: string | null
          cancellation_allowed: boolean | null
          cancellation_deadline: string | null
          cost_item_id: string | null
          created_at: string
          credit_miles_allowed: boolean | null
          credit_voucher_allowed: boolean | null
          fare_difference_applies: boolean | null
          fare_name: string | null
          id: string
          is_refundable: string | null
          observations: string | null
          penalty_fixed_value: number | null
          penalty_percent: number | null
          penalty_plus_fare_difference: boolean | null
          penalty_type: string | null
          product_label: string | null
          product_type: string
          refund_type: string | null
          sale_id: string
          updated_at: string
        }
        Insert: {
          alteration_allowed?: boolean | null
          alteration_deadline?: string | null
          cancellation_allowed?: boolean | null
          cancellation_deadline?: string | null
          cost_item_id?: string | null
          created_at?: string
          credit_miles_allowed?: boolean | null
          credit_voucher_allowed?: boolean | null
          fare_difference_applies?: boolean | null
          fare_name?: string | null
          id?: string
          is_refundable?: string | null
          observations?: string | null
          penalty_fixed_value?: number | null
          penalty_percent?: number | null
          penalty_plus_fare_difference?: boolean | null
          penalty_type?: string | null
          product_label?: string | null
          product_type?: string
          refund_type?: string | null
          sale_id: string
          updated_at?: string
        }
        Update: {
          alteration_allowed?: boolean | null
          alteration_deadline?: string | null
          cancellation_allowed?: boolean | null
          cancellation_deadline?: string | null
          cost_item_id?: string | null
          created_at?: string
          credit_miles_allowed?: boolean | null
          credit_voucher_allowed?: boolean | null
          fare_difference_applies?: boolean | null
          fare_name?: string | null
          id?: string
          is_refundable?: string | null
          observations?: string | null
          penalty_fixed_value?: number | null
          penalty_percent?: number | null
          penalty_plus_fare_difference?: boolean | null
          penalty_type?: string | null
          product_label?: string | null
          product_type?: string
          refund_type?: string | null
          sale_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tariff_conditions_cost_item_id_fkey"
            columns: ["cost_item_id"]
            isOneToOne: false
            referencedRelation: "cost_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tariff_conditions_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
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
      trip_alteration_attachments: {
        Row: {
          alteration_id: string
          created_at: string
          file_name: string
          file_type: string | null
          file_url: string
          id: string
          uploaded_by: string | null
        }
        Insert: {
          alteration_id: string
          created_at?: string
          file_name: string
          file_type?: string | null
          file_url: string
          id?: string
          uploaded_by?: string | null
        }
        Update: {
          alteration_id?: string
          created_at?: string
          file_name?: string
          file_type?: string | null
          file_url?: string
          id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_alteration_attachments_alteration_id_fkey"
            columns: ["alteration_id"]
            isOneToOne: false
            referencedRelation: "trip_alterations"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_alteration_history: {
        Row: {
          action: string
          alteration_id: string
          created_at: string
          details: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          alteration_id: string
          created_at?: string
          details?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          alteration_id?: string
          created_at?: string
          details?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_alteration_history_alteration_id_fkey"
            columns: ["alteration_id"]
            isOneToOne: false
            referencedRelation: "trip_alterations"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_alterations: {
        Row: {
          affected_passengers: string[] | null
          agency_profit: number | null
          alteration_type: string
          client_refund_value: number | null
          cost_item_id: string | null
          created_at: string
          created_by: string | null
          credit_value: number | null
          description: string | null
          id: string
          miles_penalty: number | null
          miles_program: string | null
          miles_returned: number | null
          miles_used: number | null
          notes: string | null
          original_value: number | null
          penalty_value: number | null
          pix_bank: string | null
          pix_key: string | null
          pix_key_type: string | null
          pix_receiver_name: string | null
          product_cost: number | null
          product_type: string
          profit_impact: number | null
          reason: string | null
          refund_date: string | null
          refund_method: string | null
          refund_notes: string | null
          refund_status: string | null
          refund_value: number | null
          request_date: string
          resolved_at: string | null
          resolved_by: string | null
          sale_id: string
          segment_id: string | null
          status: string
          supplier_refund_date: string | null
          supplier_refund_method: string | null
          supplier_refund_origin: string | null
          supplier_refund_status: string | null
          supplier_refund_value: number | null
          supplier_settlement_ref: string | null
          updated_at: string
        }
        Insert: {
          affected_passengers?: string[] | null
          agency_profit?: number | null
          alteration_type?: string
          client_refund_value?: number | null
          cost_item_id?: string | null
          created_at?: string
          created_by?: string | null
          credit_value?: number | null
          description?: string | null
          id?: string
          miles_penalty?: number | null
          miles_program?: string | null
          miles_returned?: number | null
          miles_used?: number | null
          notes?: string | null
          original_value?: number | null
          penalty_value?: number | null
          pix_bank?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          pix_receiver_name?: string | null
          product_cost?: number | null
          product_type?: string
          profit_impact?: number | null
          reason?: string | null
          refund_date?: string | null
          refund_method?: string | null
          refund_notes?: string | null
          refund_status?: string | null
          refund_value?: number | null
          request_date?: string
          resolved_at?: string | null
          resolved_by?: string | null
          sale_id: string
          segment_id?: string | null
          status?: string
          supplier_refund_date?: string | null
          supplier_refund_method?: string | null
          supplier_refund_origin?: string | null
          supplier_refund_status?: string | null
          supplier_refund_value?: number | null
          supplier_settlement_ref?: string | null
          updated_at?: string
        }
        Update: {
          affected_passengers?: string[] | null
          agency_profit?: number | null
          alteration_type?: string
          client_refund_value?: number | null
          cost_item_id?: string | null
          created_at?: string
          created_by?: string | null
          credit_value?: number | null
          description?: string | null
          id?: string
          miles_penalty?: number | null
          miles_program?: string | null
          miles_returned?: number | null
          miles_used?: number | null
          notes?: string | null
          original_value?: number | null
          penalty_value?: number | null
          pix_bank?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          pix_receiver_name?: string | null
          product_cost?: number | null
          product_type?: string
          profit_impact?: number | null
          reason?: string | null
          refund_date?: string | null
          refund_method?: string | null
          refund_notes?: string | null
          refund_status?: string | null
          refund_value?: number | null
          request_date?: string
          resolved_at?: string | null
          resolved_by?: string | null
          sale_id?: string
          segment_id?: string | null
          status?: string
          supplier_refund_date?: string | null
          supplier_refund_method?: string | null
          supplier_refund_origin?: string | null
          supplier_refund_status?: string | null
          supplier_refund_value?: number | null
          supplier_settlement_ref?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_alterations_cost_item_id_fkey"
            columns: ["cost_item_id"]
            isOneToOne: false
            referencedRelation: "cost_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_alterations_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_alterations_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "flight_segments"
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
      whatsapp_cloud_config: {
        Row: {
          access_token: string | null
          connected_at: string | null
          created_at: string
          id: string
          is_active: boolean | null
          phone_number_id: string | null
          verify_token: string | null
          waba_id: string | null
        }
        Insert: {
          access_token?: string | null
          connected_at?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          phone_number_id?: string | null
          verify_token?: string | null
          waba_id?: string | null
        }
        Update: {
          access_token?: string | null
          connected_at?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          phone_number_id?: string | null
          verify_token?: string | null
          waba_id?: string | null
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
      whatsapp_dispatch_logs: {
        Row: {
          client_id: string | null
          client_name: string | null
          client_phone: string | null
          created_at: string
          dispatched_by: string | null
          error_message: string | null
          id: string
          message_sent: string | null
          status: string | null
          template_id: string | null
          template_name: string | null
          trigger_event: string | null
          vehicle_description: string | null
          vehicle_id: string | null
        }
        Insert: {
          client_id?: string | null
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          dispatched_by?: string | null
          error_message?: string | null
          id?: string
          message_sent?: string | null
          status?: string | null
          template_id?: string | null
          template_name?: string | null
          trigger_event?: string | null
          vehicle_description?: string | null
          vehicle_id?: string | null
        }
        Update: {
          client_id?: string | null
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          dispatched_by?: string | null
          error_message?: string | null
          id?: string
          message_sent?: string | null
          status?: string | null
          template_id?: string | null
          template_name?: string | null
          trigger_event?: string | null
          vehicle_description?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_dispatch_logs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_events_raw: {
        Row: {
          conversation_id: string | null
          error: string | null
          event_type: string
          external_message_id: string | null
          from_me: boolean | null
          id: string
          payload: Json
          phone: string | null
          processed: boolean | null
          processed_at: string | null
          received_at: string | null
        }
        Insert: {
          conversation_id?: string | null
          error?: string | null
          event_type?: string
          external_message_id?: string | null
          from_me?: boolean | null
          id?: string
          payload: Json
          phone?: string | null
          processed?: boolean | null
          processed_at?: string | null
          received_at?: string | null
        }
        Update: {
          conversation_id?: string | null
          error?: string | null
          event_type?: string
          external_message_id?: string | null
          from_me?: boolean | null
          id?: string
          payload?: Json
          phone?: string | null
          processed?: boolean | null
          processed_at?: string | null
          received_at?: string | null
        }
        Relationships: []
      }
      whatsapp_qr_sessions: {
        Row: {
          connected_phone: string | null
          created_at: string
          id: string
          last_check: string | null
          qr_code: string | null
          status: string | null
        }
        Insert: {
          connected_phone?: string | null
          created_at?: string
          id?: string
          last_check?: string | null
          qr_code?: string | null
          status?: string | null
        }
        Update: {
          connected_phone?: string | null
          created_at?: string
          id?: string
          last_check?: string | null
          qr_code?: string | null
          status?: string | null
        }
        Relationships: []
      }
      whatsapp_templates: {
        Row: {
          created_at: string
          delay_minutes: number | null
          id: string
          is_active: boolean | null
          message_body: string | null
          name: string
          notes: string | null
          trigger_event: string | null
          variables: Json | null
        }
        Insert: {
          created_at?: string
          delay_minutes?: number | null
          id?: string
          is_active?: boolean | null
          message_body?: string | null
          name: string
          notes?: string | null
          trigger_event?: string | null
          variables?: Json | null
        }
        Update: {
          created_at?: string
          delay_minutes?: number | null
          id?: string
          is_active?: boolean | null
          message_body?: string | null
          name?: string
          notes?: string | null
          trigger_event?: string | null
          variables?: Json | null
        }
        Relationships: []
      }
      zapi_contacts: {
        Row: {
          id: string
          lid: string | null
          name: string | null
          phone: string
          profile_picture_url: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          lid?: string | null
          name?: string | null
          phone: string
          profile_picture_url?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          lid?: string | null
          name?: string | null
          phone?: string
          profile_picture_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      zapi_messages: {
        Row: {
          created_at: string
          from_me: boolean | null
          id: string
          media_url: string | null
          message_id: string | null
          message_type: string | null
          phone: string
          raw_data: Json | null
          sender_name: string | null
          sender_photo: string | null
          status: string | null
          text: string | null
          timestamp: number | null
          type: string | null
        }
        Insert: {
          created_at?: string
          from_me?: boolean | null
          id?: string
          media_url?: string | null
          message_id?: string | null
          message_type?: string | null
          phone: string
          raw_data?: Json | null
          sender_name?: string | null
          sender_photo?: string | null
          status?: string | null
          text?: string | null
          timestamp?: number | null
          type?: string | null
        }
        Update: {
          created_at?: string
          from_me?: boolean | null
          id?: string
          media_url?: string | null
          message_id?: string | null
          message_type?: string | null
          phone?: string
          raw_data?: Json | null
          sender_name?: string | null
          sender_photo?: string | null
          status?: string | null
          text?: string | null
          timestamp?: number | null
          type?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_client_names: { Args: never; Returns: Json }
      dashboard_kpis: {
        Args: {
          p_destination?: string
          p_period?: string
          p_seller_id?: string
          p_status?: string
        }
        Returns: Json
      }
      deduplicate_passengers: { Args: never; Returns: Json }
      deduplicate_sales: { Args: never; Returns: Json }
      extract_person_name: { Args: { raw_name: string }; Returns: string }
      get_portal_client_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      reindex_conversation: { Args: { conv_id: string }; Returns: undefined }
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
