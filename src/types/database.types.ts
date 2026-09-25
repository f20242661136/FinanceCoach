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
          sort_order?: number
          system_key?: string | null
          translation_key?: string | null
          updated_at?: string
          user_id?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
      get_account_balance_minor: {
        Args: { p_account_id: string }
        Returns: number
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

