export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      account_types: {
        Row: {
          balance_class: Database["public"]["Enums"]["account_balance_class"]
          code: string
          created_at: string
          is_active: boolean
          is_system: boolean
          sort_order: number
          translation_key: string
        }
        Insert: {
          balance_class: Database["public"]["Enums"]["account_balance_class"]
          code: string
          created_at?: string
          is_active?: boolean
          is_system?: boolean
          sort_order?: number
          translation_key: string
        }
        Update: {
          balance_class?: Database["public"]["Enums"]["account_balance_class"]
          code?: string
          created_at?: string
          is_active?: boolean
          is_system?: boolean
          sort_order?: number
          translation_key?: string
        }
        Relationships: []
      }
      accounts: {
        Row: {
          account_type_code: string
          archived_at: string | null
          color_token: string | null
          created_at: string
          currency_code: string
          icon_name: string | null
          id: string
          name: string
          opening_balance_minor: number
          server_revision: number
          sort_order: number
          status: Database["public"]["Enums"]["account_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          account_type_code: string
          archived_at?: string | null
          color_token?: string | null
          created_at?: string
          currency_code: string
          icon_name?: string | null
          id?: string
          name: string
          opening_balance_minor?: number
          server_revision: number
          sort_order?: number
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          account_type_code?: string
          archived_at?: string | null
          color_token?: string | null
          created_at?: string
          currency_code?: string
          icon_name?: string | null
          id?: string
          name?: string
          opening_balance_minor?: number
          server_revision?: number
          sort_order?: number
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_account_type_code_fkey"
            columns: ["account_type_code"]
            isOneToOne: false
            referencedRelation: "account_types"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "accounts_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      ai_conversations: {
        Row: {
          created_at: string
          id: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id: string
          status?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_messages: {
        Row: {
          content: string
          context_version: string | null
          conversation_id: string
          created_at: string
          id: string
          model: string | null
          provider: string | null
          response_json: Json | null
          role: string
          user_id: string
        }
        Insert: {
          content: string
          context_version?: string | null
          conversation_id: string
          created_at?: string
          id: string
          model?: string | null
          provider?: string | null
          response_json?: Json | null
          role: string
          user_id: string
        }
        Update: {
          content?: string
          context_version?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          model?: string | null
          provider?: string | null
          response_json?: Json | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      badges: {
        Row: {
          code: string
          created_at: string
          criteria_key: string
          criteria_type: string
          criteria_value: number
          description: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          criteria_key: string
          criteria_type: string
          criteria_value: number
          description: string
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          criteria_key?: string
          criteria_type?: string
          criteria_value?: number
          description?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      budget_categories: {
        Row: {
          budget_id: string
          category_id: string
          created_at: string
        }
        Insert: {
          budget_id: string
          category_id: string
          created_at?: string
        }
        Update: {
          budget_id?: string
          category_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_categories_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          created_at: string
          currency_code: string
          deleted_at: string | null
          id: string
          limit_minor: number
          name: string
          period_end: string
          period_start: string
          period_type: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency_code: string
          deleted_at?: string | null
          id: string
          limit_minor: number
          name: string
          period_end: string
          period_start: string
          period_type: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency_code?: string
          deleted_at?: string | null
          id?: string
          limit_minor?: number
          name?: string
          period_end?: string
          period_start?: string
          period_type?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      categories: {
        Row: {
          color_token: string | null
          created_at: string
          default_name: string
          deleted_at: string | null
          icon_name: string | null
          id: string
          is_system: boolean
          kind: Database["public"]["Enums"]["category_kind"]
          server_revision: number
          sort_order: number
          system_key: string | null
          translation_key: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          color_token?: string | null
          created_at?: string
          default_name: string
          deleted_at?: string | null
          icon_name?: string | null
          id?: string
          is_system?: boolean
          kind: Database["public"]["Enums"]["category_kind"]
          server_revision: number
          sort_order?: number
          system_key?: string | null
          translation_key?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          color_token?: string | null
          created_at?: string
          default_name?: string
          deleted_at?: string | null
          icon_name?: string | null
          id?: string
          is_system?: boolean
          kind?: Database["public"]["Enums"]["category_kind"]
          server_revision?: number
          sort_order?: number
          system_key?: string | null
          translation_key?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      challenges: {
        Row: {
          cadence: string
          code: string
          created_at: string
          description: string
          id: string
          is_active: boolean
          is_premium: boolean
          points_reward: number
          target_count: number
          title: string
          updated_at: string
          verification_type: string
        }
        Insert: {
          cadence: string
          code: string
          created_at?: string
          description: string
          id?: string
          is_active?: boolean
          is_premium?: boolean
          points_reward: number
          target_count?: number
          title: string
          updated_at?: string
          verification_type: string
        }
        Update: {
          cadence?: string
          code?: string
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          is_premium?: boolean
          points_reward?: number
          target_count?: number
          title?: string
          updated_at?: string
          verification_type?: string
        }
        Relationships: []
      }
      currencies: {
        Row: {
          code: string
          created_at: string
          is_active: boolean
          minor_unit: number
          name: string
          symbol: string
        }
        Insert: {
          code: string
          created_at?: string
          is_active?: boolean
          minor_unit?: number
          name: string
          symbol: string
        }
        Update: {
          code?: string
          created_at?: string
          is_active?: boolean
          minor_unit?: number
          name?: string
          symbol?: string
        }
        Relationships: []
      }
      financial_insights: {
        Row: {
          body: string
          context_version: string
          expires_at: string | null
          generated_at: string
          id: string
          insight_type: string
          source_period_end: string | null
          source_period_start: string | null
          status: string
          title: string
          user_id: string
        }
        Insert: {
          body: string
          context_version?: string
          expires_at?: string | null
          generated_at?: string
          id?: string
          insight_type: string
          source_period_end?: string | null
          source_period_start?: string | null
          status?: string
          title: string
          user_id: string
        }
        Update: {
          body?: string
          context_version?: string
          expires_at?: string | null
          generated_at?: string
          id?: string
          insight_type?: string
          source_period_end?: string | null
          source_period_start?: string | null
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      gamification_levels: {
        Row: {
          created_at: string
          level: number
          minimum_points: number
          name: string
        }
        Insert: {
          created_at?: string
          level: number
          minimum_points: number
          name: string
        }
        Update: {
          created_at?: string
          level?: number
          minimum_points?: number
          name?: string
        }
        Relationships: []
      }
      gamification_point_rules: {
        Row: {
          description: string
          event_type: string
          is_active: boolean
          points: number
          updated_at: string
        }
        Insert: {
          description: string
          event_type: string
          is_active?: boolean
          points: number
          updated_at?: string
        }
        Update: {
          description?: string
          event_type?: string
          is_active?: boolean
          points?: number
          updated_at?: string
        }
        Relationships: []
      }
      loan_payments: {
        Row: {
          amount_minor: number
          created_at: string
          deleted_at: string | null
          id: string
          loan_id: string
          note: string | null
          payment_date: string
          user_id: string
        }
        Insert: {
          amount_minor: number
          created_at?: string
          deleted_at?: string | null
          id: string
          loan_id: string
          note?: string | null
          payment_date: string
          user_id: string
        }
        Update: {
          amount_minor?: number
          created_at?: string
          deleted_at?: string | null
          id?: string
          loan_id?: string
          note?: string | null
          payment_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loan_payments_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
        ]
      }
      loans: {
        Row: {
          counterparty_name: string
          created_at: string
          currency_code: string
          deleted_at: string | null
          direction: string
          due_date: string | null
          id: string
          interest_rate_basis_points: number | null
          notes: string | null
          payment_frequency: string
          principal_minor: number
          scheduled_payment_minor: number | null
          start_date: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          counterparty_name: string
          created_at?: string
          currency_code: string
          deleted_at?: string | null
          direction: string
          due_date?: string | null
          id: string
          interest_rate_basis_points?: number | null
          notes?: string | null
          payment_frequency?: string
          principal_minor: number
          scheduled_payment_minor?: number | null
          start_date: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          counterparty_name?: string
          created_at?: string
          currency_code?: string
          deleted_at?: string | null
          direction?: string
          due_date?: string | null
          id?: string
          interest_rate_basis_points?: number | null
          notes?: string | null
          payment_frequency?: string
          principal_minor?: number
          scheduled_payment_minor?: number | null
          start_date?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loans_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      notification_devices: {
        Row: {
          active: boolean
          created_at: string
          expo_push_token: string
          id: string
          last_seen_at: string
          platform: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          expo_push_token: string
          id: string
          last_seen_at?: string
          platform: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          expo_push_token?: string
          id?: string
          last_seen_at?: string
          platform?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_events: {
        Row: {
          created_at: string
          device_id: string | null
          error_code: string | null
          event_type: string
          id: string
          provider: string | null
          provider_receipt_id: string | null
          receipt_checked_at: string | null
          scheduled_notification_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          error_code?: string | null
          event_type: string
          id?: string
          provider?: string | null
          provider_receipt_id?: string | null
          receipt_checked_at?: string | null
          scheduled_notification_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_id?: string | null
          error_code?: string | null
          event_type?: string
          id?: string
          provider?: string | null
          provider_receipt_id?: string | null
          receipt_checked_at?: string | null
          scheduled_notification_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_events_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "notification_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_events_scheduled_notification_id_fkey"
            columns: ["scheduled_notification_id"]
            isOneToOne: false
            referencedRelation: "scheduled_notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          ai_insights_enabled: boolean
          bill_reminders_enabled: boolean
          budget_warning_threshold_basis_points: number
          budget_warnings_enabled: boolean
          challenge_reminders_enabled: boolean
          created_at: string
          in_app_enabled: boolean
          loan_payment_reminders_enabled: boolean
          master_enabled: boolean
          motivational_messages_enabled: boolean
          push_enabled: boolean
          quiet_hours_enabled: boolean
          quiet_hours_end: string
          quiet_hours_start: string
          reminder_time_local: string
          rosca_contribution_reminders_enabled: boolean
          savings_reminders_enabled: boolean
          streak_reminder_time_local: string
          streak_reminders_enabled: boolean
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_insights_enabled?: boolean
          bill_reminders_enabled?: boolean
          budget_warning_threshold_basis_points?: number
          budget_warnings_enabled?: boolean
          challenge_reminders_enabled?: boolean
          created_at?: string
          in_app_enabled?: boolean
          loan_payment_reminders_enabled?: boolean
          master_enabled?: boolean
          motivational_messages_enabled?: boolean
          push_enabled?: boolean
          quiet_hours_enabled?: boolean
          quiet_hours_end?: string
          quiet_hours_start?: string
          reminder_time_local?: string
          rosca_contribution_reminders_enabled?: boolean
          savings_reminders_enabled?: boolean
          streak_reminder_time_local?: string
          streak_reminders_enabled?: boolean
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_insights_enabled?: boolean
          bill_reminders_enabled?: boolean
          budget_warning_threshold_basis_points?: number
          budget_warnings_enabled?: boolean
          challenge_reminders_enabled?: boolean
          created_at?: string
          in_app_enabled?: boolean
          loan_payment_reminders_enabled?: boolean
          master_enabled?: boolean
          motivational_messages_enabled?: boolean
          push_enabled?: boolean
          quiet_hours_enabled?: boolean
          quiet_hours_end?: string
          quiet_hours_start?: string
          reminder_time_local?: string
          rosca_contribution_reminders_enabled?: boolean
          savings_reminders_enabled?: boolean
          streak_reminder_time_local?: string
          streak_reminders_enabled?: boolean
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      point_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          idempotency_key: string
          points: number
          source_id: string | null
          source_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          idempotency_key: string
          points: number
          source_id?: string | null
          source_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          idempotency_key?: string
          points?: number
          source_id?: string | null
          source_type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          base_currency_code: string | null
          created_at: string
          date_format: string
          display_name: string | null
          locale: string
          number_format: string
          onboarding_completed: boolean
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          base_currency_code?: string | null
          created_at?: string
          date_format?: string
          display_name?: string | null
          locale?: string
          number_format?: string
          onboarding_completed?: boolean
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          base_currency_code?: string | null
          created_at?: string
          date_format?: string
          display_name?: string | null
          locale?: string
          number_format?: string
          onboarding_completed?: boolean
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_base_currency_code_fkey"
            columns: ["base_currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      rosca_contributions: {
        Row: {
          created_at: string
          cycle_id: string
          group_id: string
          id: string
          linked_transaction_id: string | null
          member_id: string
          note: string | null
          paid_amount_minor: number | null
          paid_date: string | null
          planned_amount_minor: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          cycle_id: string
          group_id: string
          id?: string
          linked_transaction_id?: string | null
          member_id: string
          note?: string | null
          paid_amount_minor?: number | null
          paid_date?: string | null
          planned_amount_minor: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          cycle_id?: string
          group_id?: string
          id?: string
          linked_transaction_id?: string | null
          member_id?: string
          note?: string | null
          paid_amount_minor?: number | null
          paid_date?: string | null
          planned_amount_minor?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rosca_contributions_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "rosca_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rosca_contributions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "rosca_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rosca_contributions_linked_transaction_id_fkey"
            columns: ["linked_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rosca_contributions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "rosca_members"
            referencedColumns: ["id"]
          },
        ]
      }
      rosca_cycles: {
        Row: {
          created_at: string
          cycle_number: number
          due_date: string
          group_id: string
          id: string
          payout_member_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          cycle_number: number
          due_date: string
          group_id: string
          id?: string
          payout_member_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          cycle_number?: number
          due_date?: string
          group_id?: string
          id?: string
          payout_member_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rosca_cycles_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "rosca_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rosca_cycles_payout_member_id_fkey"
            columns: ["payout_member_id"]
            isOneToOne: false
            referencedRelation: "rosca_members"
            referencedColumns: ["id"]
          },
        ]
      }
      rosca_groups: {
        Row: {
          contribution_amount_minor: number
          contribution_frequency: string
          created_at: string
          creator_user_id: string
          currency_code: string
          cycle_count: number
          deleted_at: string | null
          id: string
          join_code: string
          name: string
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          contribution_amount_minor: number
          contribution_frequency: string
          created_at?: string
          creator_user_id: string
          currency_code: string
          cycle_count: number
          deleted_at?: string | null
          id: string
          join_code: string
          name: string
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          contribution_amount_minor?: number
          contribution_frequency?: string
          created_at?: string
          creator_user_id?: string
          currency_code?: string
          cycle_count?: number
          deleted_at?: string | null
          id?: string
          join_code?: string
          name?: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rosca_groups_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      rosca_members: {
        Row: {
          display_name: string
          group_id: string
          id: string
          joined_at: string
          member_order: number
          role: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          display_name: string
          group_id: string
          id: string
          joined_at?: string
          member_order: number
          role?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          display_name?: string
          group_id?: string
          id?: string
          joined_at?: string
          member_order?: number
          role?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rosca_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "rosca_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      rosca_payouts: {
        Row: {
          created_at: string
          cycle_id: string
          group_id: string
          id: string
          linked_transaction_id: string | null
          note: string | null
          paid_amount_minor: number | null
          paid_date: string | null
          planned_amount_minor: number
          recipient_member_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          cycle_id: string
          group_id: string
          id?: string
          linked_transaction_id?: string | null
          note?: string | null
          paid_amount_minor?: number | null
          paid_date?: string | null
          planned_amount_minor: number
          recipient_member_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          cycle_id?: string
          group_id?: string
          id?: string
          linked_transaction_id?: string | null
          note?: string | null
          paid_amount_minor?: number | null
          paid_date?: string | null
          planned_amount_minor?: number
          recipient_member_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rosca_payouts_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: true
            referencedRelation: "rosca_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rosca_payouts_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "rosca_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rosca_payouts_linked_transaction_id_fkey"
            columns: ["linked_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rosca_payouts_recipient_member_id_fkey"
            columns: ["recipient_member_id"]
            isOneToOne: false
            referencedRelation: "rosca_members"
            referencedColumns: ["id"]
          },
        ]
      }
      savings_contributions: {
        Row: {
          amount_minor: number
          contribution_date: string
          created_at: string
          deleted_at: string | null
          goal_id: string
          id: string
          note: string | null
          user_id: string
        }
        Insert: {
          amount_minor: number
          contribution_date: string
          created_at?: string
          deleted_at?: string | null
          goal_id: string
          id: string
          note?: string | null
          user_id: string
        }
        Update: {
          amount_minor?: number
          contribution_date?: string
          created_at?: string
          deleted_at?: string | null
          goal_id?: string
          id?: string
          note?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "savings_contributions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "savings_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      savings_goals: {
        Row: {
          created_at: string
          currency_code: string
          deleted_at: string | null
          goal_type: string
          id: string
          name: string
          notes: string | null
          status: string
          target_amount_minor: number
          target_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency_code: string
          deleted_at?: string | null
          goal_type: string
          id: string
          name: string
          notes?: string | null
          status?: string
          target_amount_minor: number
          target_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency_code?: string
          deleted_at?: string | null
          goal_type?: string
          id?: string
          name?: string
          notes?: string | null
          status?: string
          target_amount_minor?: number
          target_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "savings_goals_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      scheduled_notifications: {
        Row: {
          attempt_count: number
          body: string
          cancelled_at: string | null
          created_at: string
          dedupe_key: string
          deep_link: string | null
          id: string
          last_error: string | null
          notification_type: string
          scheduled_for: string
          sent_at: string | null
          source_id: string | null
          source_type: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attempt_count?: number
          body: string
          cancelled_at?: string | null
          created_at?: string
          dedupe_key: string
          deep_link?: string | null
          id?: string
          last_error?: string | null
          notification_type: string
          scheduled_for: string
          sent_at?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attempt_count?: number
          body?: string
          cancelled_at?: string | null
          created_at?: string
          dedupe_key?: string
          deep_link?: string | null
          id?: string
          last_error?: string | null
          notification_type?: string
          scheduled_for?: string
          sent_at?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      six_jar_allocations: {
        Row: {
          allocation_date: string
          created_at: string
          deleted_at: string | null
          id: string
          jar_category_id: string
          profile_id: string
          source_income_minor: number
          source_label: string | null
          suggested_amount_minor: number
          user_id: string
        }
        Insert: {
          allocation_date: string
          created_at?: string
          deleted_at?: string | null
          id: string
          jar_category_id: string
          profile_id: string
          source_income_minor: number
          source_label?: string | null
          suggested_amount_minor: number
          user_id: string
        }
        Update: {
          allocation_date?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          jar_category_id?: string
          profile_id?: string
          source_income_minor?: number
          source_label?: string | null
          suggested_amount_minor?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "six_jar_allocations_jar_category_id_fkey"
            columns: ["jar_category_id"]
            isOneToOne: false
            referencedRelation: "six_jar_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "six_jar_allocations_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "six_jar_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      six_jar_categories: {
        Row: {
          code: string
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          percentage_basis_points: number
          profile_id: string
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          deleted_at?: string | null
          id: string
          name: string
          percentage_basis_points: number
          profile_id: string
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
          percentage_basis_points?: number
          profile_id?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "six_jar_categories_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "six_jar_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      six_jar_profiles: {
        Row: {
          created_at: string
          currency_code: string
          deleted_at: string | null
          id: string
          name: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency_code: string
          deleted_at?: string | null
          id: string
          name: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency_code?: string
          deleted_at?: string | null
          id?: string
          name?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "six_jar_profiles_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      streaks: {
        Row: {
          best_count: number
          current_count: number
          id: string
          last_activity_date: string | null
          streak_type: string
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          best_count?: number
          current_count?: number
          id?: string
          last_activity_date?: string | null
          streak_type: string
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          best_count?: number
          current_count?: number
          id?: string
          last_activity_date?: string | null
          streak_type?: string
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transaction_transfers: {
        Row: {
          created_at: string
          destination_amount_minor: number
          destination_currency_code: string
          from_account_id: string
          source_amount_minor: number
          source_currency_code: string
          to_account_id: string
          transaction_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          destination_amount_minor: number
          destination_currency_code: string
          from_account_id: string
          source_amount_minor: number
          source_currency_code: string
          to_account_id: string
          transaction_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          destination_amount_minor?: number
          destination_currency_code?: string
          from_account_id?: string
          source_amount_minor?: number
          source_currency_code?: string
          to_account_id?: string
          transaction_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_transfers_destination_account_fk"
            columns: ["to_account_id", "user_id", "destination_currency_code"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id", "user_id", "currency_code"]
          },
          {
            foreignKeyName: "transaction_transfers_source_account_fk"
            columns: ["from_account_id", "user_id", "source_currency_code"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id", "user_id", "currency_code"]
          },
          {
            foreignKeyName: "transaction_transfers_transaction_owner_fk"
            columns: ["transaction_id", "user_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string
          amount_minor: number
          balance_effect: Database["public"]["Enums"]["balance_effect"]
          category_id: string | null
          client_operation_id: string
          created_at: string
          currency_code: string
          deleted_at: string | null
          description: string | null
          id: string
          merchant: string | null
          metadata: Json
          notes: string | null
          server_revision: number
          transaction_date: string
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          account_id: string
          amount_minor: number
          balance_effect: Database["public"]["Enums"]["balance_effect"]
          category_id?: string | null
          client_operation_id?: string
          created_at?: string
          currency_code: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          merchant?: string | null
          metadata?: Json
          notes?: string | null
          server_revision: number
          transaction_date?: string
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          account_id?: string
          amount_minor?: number
          balance_effect?: Database["public"]["Enums"]["balance_effect"]
          category_id?: string | null
          client_operation_id?: string
          created_at?: string
          currency_code?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          merchant?: string | null
          metadata?: Json
          notes?: string | null
          server_revision?: number
          transaction_date?: string
          type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_owner_currency_fk"
            columns: ["account_id", "user_id", "currency_code"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id", "user_id", "currency_code"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          awarded_at: string
          badge_id: string
          id: string
          user_id: string
        }
        Insert: {
          awarded_at?: string
          badge_id: string
          id?: string
          user_id: string
        }
        Update: {
          awarded_at?: string
          badge_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_challenges: {
        Row: {
          challenge_id: string
          completed_at: string | null
          created_at: string
          id: string
          period_end: string
          period_start: string
          progress_count: number
          status: string
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          period_end: string
          period_start: string
          progress_count?: number
          status?: string
          timezone: string
          updated_at?: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          period_end?: string
          period_start?: string
          progress_count?: number
          status?: string
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_challenges_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_points: {
        Row: {
          total_points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          total_points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          total_points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_loan_payment: {
        Args: {
          p_amount_minor: string
          p_loan_id: string
          p_note?: string
          p_payment_date?: string
          p_payment_id: string
        }
        Returns: string
      }
      add_savings_contribution: {
        Args: {
          p_amount_minor: string
          p_contribution_date?: string
          p_contribution_id: string
          p_goal_id: string
          p_note?: string
        }
        Returns: string
      }
      archive_ai_conversation: {
        Args: { p_conversation_id: string }
        Returns: string
      }
      award_gamification_points: {
        Args: {
          p_event_type: string
          p_idempotency_key: string
          p_points_override?: number
          p_source_id: string
          p_source_type: string
          p_user_id: string
        }
        Returns: boolean
      }
      calculate_six_jar_allocation: {
        Args: { p_income_minor: string }
        Returns: Json
      }
      claim_due_notifications: {
        Args: { p_limit?: number }
        Returns: {
          attempt_count: number
          body: string
          cancelled_at: string | null
          created_at: string
          dedupe_key: string
          deep_link: string | null
          id: string
          last_error: string | null
          notification_type: string
          scheduled_for: string
          sent_at: string | null
          source_id: string | null
          source_type: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "scheduled_notifications"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      create_account: {
        Args: {
          p_account_id?: string
          p_account_type_code: string
          p_currency_code: string
          p_name: string
          p_opening_balance_minor?: string
        }
        Returns: string
      }
      create_ai_conversation: {
        Args: { p_conversation_id: string; p_title?: string }
        Returns: string
      }
      create_budget: {
        Args: {
          p_budget_id: string
          p_category_id?: string
          p_currency_code: string
          p_limit_minor: string
          p_name: string
          p_period_end: string
          p_period_start: string
          p_period_type: string
        }
        Returns: string
      }
      create_financial_transaction: {
        Args: {
          p_account_id: string
          p_amount_minor: string
          p_category_id: string
          p_client_operation_id?: string
          p_description?: string
          p_merchant?: string
          p_notes?: string
          p_transaction_date?: string
          p_transaction_id?: string
          p_type: Database["public"]["Enums"]["transaction_type"]
        }
        Returns: string
      }
      create_loan: {
        Args: {
          p_counterparty_name: string
          p_currency_code: string
          p_direction: string
          p_due_date?: string
          p_interest_rate_basis_points?: number
          p_loan_id: string
          p_notes?: string
          p_payment_frequency?: string
          p_principal_minor: string
          p_scheduled_payment_minor?: string
          p_start_date: string
        }
        Returns: string
      }
      create_rosca_group: {
        Args: {
          p_contribution_amount_minor: string
          p_contribution_frequency: string
          p_creator_display_name: string
          p_currency_code: string
          p_cycle_count: number
          p_group_id: string
          p_member_id: string
          p_name: string
          p_start_date: string
        }
        Returns: Json
      }
      create_savings_goal: {
        Args: {
          p_currency_code: string
          p_goal_id: string
          p_goal_type: string
          p_name: string
          p_notes?: string
          p_target_amount_minor: string
          p_target_date?: string
        }
        Returns: string
      }
      create_transfer: {
        Args: {
          p_client_operation_id?: string
          p_description?: string
          p_destination_amount_minor: number
          p_from_account_id: string
          p_notes?: string
          p_source_amount_minor: number
          p_to_account_id: string
          p_transaction_date?: string
          p_transaction_id?: string
        }
        Returns: string
      }
      ensure_notification_preferences: {
        Args: { p_timezone: string; p_user_id: string }
        Returns: {
          ai_insights_enabled: boolean
          bill_reminders_enabled: boolean
          budget_warning_threshold_basis_points: number
          budget_warnings_enabled: boolean
          challenge_reminders_enabled: boolean
          created_at: string
          in_app_enabled: boolean
          loan_payment_reminders_enabled: boolean
          master_enabled: boolean
          motivational_messages_enabled: boolean
          push_enabled: boolean
          quiet_hours_enabled: boolean
          quiet_hours_end: string
          quiet_hours_start: string
          reminder_time_local: string
          rosca_contribution_reminders_enabled: boolean
          savings_reminders_enabled: boolean
          streak_reminder_time_local: string
          streak_reminders_enabled: boolean
          timezone: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "notification_preferences"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      gamification_period: {
        Args: { p_cadence: string; p_timezone: string }
        Returns: Json
      }
      get_account_balance_minor: {
        Args: { p_account_id: string }
        Returns: number
      }
      get_account_summaries: {
        Args: never
        Returns: {
          account_type_code: string
          balance_class: Database["public"]["Enums"]["account_balance_class"]
          currency_code: string
          currency_minor_unit: number
          current_balance_minor: string
          id: string
          name: string
          opening_balance_minor: string
          status: Database["public"]["Enums"]["account_status"]
        }[]
      }
      get_ai_conversations: { Args: { p_limit?: number }; Returns: Json }
      get_ai_financial_context: {
        Args: { p_as_of_date?: string; p_timezone?: string }
        Returns: Json
      }
      get_ai_messages: {
        Args: { p_conversation_id: string; p_limit?: number }
        Returns: Json
      }
      get_budget_status: { Args: { p_as_of?: string }; Returns: Json }
      get_financial_dashboard_summary: {
        Args: { p_as_of?: string }
        Returns: Json
      }
      get_financial_insights: { Args: { p_limit?: number }; Returns: Json }
      get_gamification_summary: { Args: { p_timezone?: string }; Returns: Json }
      get_loan_payment_history: {
        Args: { p_limit?: number; p_loan_id: string }
        Returns: Json
      }
      get_loan_status: { Args: never; Returns: Json }
      get_notification_center: { Args: { p_limit?: number }; Returns: Json }
      get_notification_preferences: {
        Args: { p_timezone?: string }
        Returns: Json
      }
      get_recent_activity: {
        Args: { p_limit?: number }
        Returns: {
          account_id: string
          account_name: string
          amount_minor: string
          category_id: string
          category_name: string
          created_at: string
          currency_code: string
          currency_minor_unit: number
          description: string
          destination_account_id: string
          destination_account_name: string
          destination_amount_minor: string
          destination_currency_code: string
          destination_currency_minor_unit: number
          id: string
          merchant: string
          transaction_date: string
          type: Database["public"]["Enums"]["transaction_type"]
        }[]
      }
      get_rosca_group_detail: { Args: { p_group_id: string }; Returns: Json }
      get_rosca_groups: { Args: never; Returns: Json }
      get_savings_contribution_history: {
        Args: { p_goal_id: string; p_limit?: number }
        Returns: Json
      }
      get_savings_goal_status: { Args: never; Returns: Json }
      get_six_jar_profile: { Args: never; Returns: Json }
      get_sync_delta: {
        Args: {
          p_account_after?: string
          p_category_after?: string
          p_limit?: number
          p_transaction_after?: string
        }
        Returns: Json
      }
      is_rosca_member: { Args: { p_group_id: string }; Returns: boolean }
      is_rosca_owner: { Args: { p_group_id: string }; Returns: boolean }
      is_valid_timezone: { Args: { p_timezone: string }; Returns: boolean }
      join_rosca_group: {
        Args: {
          p_display_name: string
          p_join_code: string
          p_member_id: string
        }
        Returns: string
      }
      mark_notification_opened: {
        Args: { p_notification_id: string }
        Returns: string
      }
      mark_rosca_contribution_paid: {
        Args: {
          p_contribution_id: string
          p_note?: string
          p_paid_date?: string
        }
        Returns: string
      }
      mark_rosca_payout_paid: {
        Args: { p_note?: string; p_paid_date?: string; p_payout_id: string }
        Returns: string
      }
      notification_allowed_at: {
        Args: {
          p_local_date: string
          p_local_time: string
          p_preferences: Database["public"]["Tables"]["notification_preferences"]["Row"]
        }
        Returns: string
      }
      notification_timezone_is_valid: {
        Args: { p_timezone: string }
        Returns: boolean
      }
      notification_type_is_enabled: {
        Args: {
          p_notification_type: string
          p_preferences: Database["public"]["Tables"]["notification_preferences"]["Row"]
        }
        Returns: boolean
      }
      refresh_all_notification_schedules: {
        Args: { p_horizon_days?: number }
        Returns: number
      }
      refresh_gamification_badges: { Args: never; Returns: number }
      refresh_gamification_challenge: {
        Args: { p_user_challenge_id: string }
        Returns: Json
      }
      refresh_gamification_streaks: {
        Args: { p_timezone?: string }
        Returns: Json
      }
      refresh_my_gamification_challenges: { Args: never; Returns: number }
      refresh_my_notification_schedule: {
        Args: { p_horizon_days?: number; p_timezone?: string }
        Returns: number
      }
      refresh_notification_schedule_for_user: {
        Args: { p_horizon_days?: number; p_timezone: string; p_user_id: string }
        Returns: number
      }
      refresh_rosca_progress: {
        Args: { p_group_id: string }
        Returns: undefined
      }
      register_notification_device: {
        Args: {
          p_device_id: string
          p_expo_push_token: string
          p_platform: string
        }
        Returns: string
      }
      release_notification_for_retry: {
        Args: { p_error: string; p_notification_id: string }
        Returns: undefined
      }
      rosca_cycle_date: {
        Args: { p_frequency: string; p_offset: number; p_start_date: string }
        Returns: string
      }
      save_six_jar_profile: {
        Args: {
          p_currency_code: string
          p_jars: Json
          p_name: string
          p_profile_id: string
        }
        Returns: string
      }
      schedule_notification_if_enabled: {
        Args: {
          p_body: string
          p_dedupe_key: string
          p_deep_link: string
          p_local_date: string
          p_local_time: string
          p_notification_type: string
          p_source_id: string
          p_source_type: string
          p_title: string
          p_user_id: string
        }
        Returns: string
      }
      start_gamification_challenge: {
        Args: { p_challenge_id: string; p_timezone?: string }
        Returns: string
      }
      unregister_notification_device: {
        Args: { p_device_id: string }
        Returns: string
      }
      update_notification_preferences: {
        Args: {
          p_ai_insights_enabled: boolean
          p_bill_reminders_enabled: boolean
          p_budget_warning_threshold_basis_points: number
          p_budget_warnings_enabled: boolean
          p_challenge_reminders_enabled: boolean
          p_in_app_enabled: boolean
          p_loan_payment_reminders_enabled: boolean
          p_master_enabled: boolean
          p_motivational_messages_enabled: boolean
          p_push_enabled: boolean
          p_quiet_hours_enabled: boolean
          p_quiet_hours_end: string
          p_quiet_hours_start: string
          p_reminder_time_local: string
          p_rosca_contribution_reminders_enabled: boolean
          p_savings_reminders_enabled: boolean
          p_streak_reminder_time_local: string
          p_streak_reminders_enabled: boolean
          p_timezone: string
        }
        Returns: Json
      }
    }
    Enums: {
      account_balance_class: "asset" | "liability"
      account_status: "active" | "inactive" | "archived"
      balance_effect: "credit" | "debit" | "neutral"
      category_kind: "income" | "expense"
      transaction_type: "income" | "expense" | "transfer" | "adjustment"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      account_balance_class: ["asset", "liability"],
      account_status: ["active", "inactive", "archived"],
      balance_effect: ["credit", "debit", "neutral"],
      category_kind: ["income", "expense"],
      transaction_type: ["income", "expense", "transfer", "adjustment"],
    },
  },
} as const

