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
    PostgrestVersion: "14.4"
  }
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
      audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json
          entity_id: string
          entity_type: string
          id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json
          entity_id: string
          entity_type: string
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json
          entity_id?: string
          entity_type?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
          storage_location_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          storage_location_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          storage_location_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_storage_location_id_fkey"
            columns: ["storage_location_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_items: {
        Row: {
          checklist_id: string
          created_at: string
          current_stock: string | null
          id: string
          is_checked: boolean
          is_missing: boolean
          is_missing_overridden: boolean
          is_ordered: boolean
          min_stock_max_snapshot: number | null
          min_stock_snapshot: number | null
          missing_amount_calculated: number | null
          missing_amount_final: number | null
          ordered_quantity: number | null
          ordered_recorded_at: string | null
          ordered_supplier_id: string | null
          ordered_supplier_name: string | null
          product_id: string
          product_name: string
          updated_at: string
        }
        Insert: {
          checklist_id: string
          created_at?: string
          current_stock?: string | null
          id?: string
          is_checked?: boolean
          is_missing?: boolean
          is_missing_overridden?: boolean
          is_ordered?: boolean
          min_stock_max_snapshot?: number | null
          min_stock_snapshot?: number | null
          missing_amount_calculated?: number | null
          missing_amount_final?: number | null
          ordered_quantity?: number | null
          ordered_recorded_at?: string | null
          ordered_supplier_id?: string | null
          ordered_supplier_name?: string | null
          product_id: string
          product_name: string
          updated_at?: string
        }
        Update: {
          checklist_id?: string
          created_at?: string
          current_stock?: string | null
          id?: string
          is_checked?: boolean
          is_missing?: boolean
          is_missing_overridden?: boolean
          is_ordered?: boolean
          min_stock_max_snapshot?: number | null
          min_stock_snapshot?: number | null
          missing_amount_calculated?: number | null
          missing_amount_final?: number | null
          ordered_quantity?: number | null
          ordered_recorded_at?: string | null
          ordered_supplier_id?: string | null
          ordered_supplier_name?: string | null
          product_id?: string
          product_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_items_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_items_ordered_supplier_id_fkey"
            columns: ["ordered_supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      checklists: {
        Row: {
          checklist_date: string
          completed_by: string | null
          created_at: string
          created_by: string
          id: string
          iso_week: number
          iso_year: number
          order_generation_error: string | null
          order_generation_finished_at: string | null
          order_generation_orders_created: number
          order_generation_started_at: string | null
          order_generation_status: string
          status: Database["public"]["Enums"]["checklist_status"]
          updated_at: string
        }
        Insert: {
          checklist_date: string
          completed_by?: string | null
          created_at?: string
          created_by: string
          id?: string
          iso_week: number
          iso_year: number
          order_generation_error?: string | null
          order_generation_finished_at?: string | null
          order_generation_orders_created?: number
          order_generation_started_at?: string | null
          order_generation_status?: string
          status?: Database["public"]["Enums"]["checklist_status"]
          updated_at?: string
        }
        Update: {
          checklist_date?: string
          completed_by?: string | null
          created_at?: string
          created_by?: string
          id?: string
          iso_week?: number
          iso_year?: number
          order_generation_error?: string | null
          order_generation_finished_at?: string | null
          order_generation_orders_created?: number
          order_generation_started_at?: string | null
          order_generation_status?: string
          status?: Database["public"]["Enums"]["checklist_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklists_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklists_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          is_delivered: boolean
          is_ordered: boolean
          order_id: string
          ordered_quantity: number | null
          product_id: string
          quantity: number
          unit: Database["public"]["Enums"]["unit_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_delivered?: boolean
          is_ordered?: boolean
          order_id: string
          ordered_quantity?: number | null
          product_id: string
          quantity: number
          unit: Database["public"]["Enums"]["unit_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_delivered?: boolean
          is_ordered?: boolean
          order_id?: string
          ordered_quantity?: number | null
          product_id?: string
          quantity?: number
          unit?: Database["public"]["Enums"]["unit_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          checklist_id: string
          created_at: string
          created_by: string
          delivered_at: string | null
          id: string
          notes: string | null
          order_number: string
          ordered_at: string | null
          status: Database["public"]["Enums"]["order_status"]
          supplier_id: string
          updated_at: string
        }
        Insert: {
          checklist_id: string
          created_at?: string
          created_by: string
          delivered_at?: string | null
          id?: string
          notes?: string | null
          order_number: string
          ordered_at?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          supplier_id: string
          updated_at?: string
        }
        Update: {
          checklist_id?: string
          created_at?: string
          created_by?: string
          delivered_at?: string | null
          id?: string
          notes?: string | null
          order_number?: string
          ordered_at?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      product_suppliers: {
        Row: {
          created_at: string
          id: string
          is_preferred: boolean
          product_id: string
          supplier_id: string
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_preferred?: boolean
          product_id: string
          supplier_id: string
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_preferred?: boolean
          product_id?: string
          supplier_id?: string
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_suppliers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_suppliers_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string
          created_at: string
          id: string
          is_active: boolean
          min_stock: number | null
          min_stock_max: number | null
          name: string
          sort_order: number
          storage_location_id: string
          unit: Database["public"]["Enums"]["unit_type"] | null
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          min_stock?: number | null
          min_stock_max?: number | null
          name: string
          sort_order?: number
          storage_location_id: string
          unit?: Database["public"]["Enums"]["unit_type"] | null
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          min_stock?: number | null
          min_stock_max?: number | null
          name?: string
          sort_order?: number
          storage_location_id?: string
          unit?: Database["public"]["Enums"]["unit_type"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_storage_location_id_fkey"
            columns: ["storage_location_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      storage_locations: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          address: string | null
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      rpc_bootstrap_admin: { Args: { p_user_id: string }; Returns: Json }
      rpc_cleanup_old_data: { Args: { p_months?: number }; Returns: Json }
      rpc_create_checklist_with_snapshot: {
        Args: {
          p_checklist_date?: string
          p_created_by: string
          p_iso_week: number
          p_iso_year: number
        }
        Returns: Json
      }
      rpc_create_order_with_items: {
        Args: {
          p_checklist_id: string
          p_created_by: string
          p_initial_status?: Database["public"]["Enums"]["order_status"]
          p_items: Json
          p_supplier_id: string
        }
        Returns: Json
      }
      rpc_finalize_suggestion_group: {
        Args: {
          p_checklist_id: string
          p_created_by: string
          p_items: Json
          p_supplier_id: string
          p_supplier_name: string
        }
        Returns: Json
      }
      rpc_update_checklist_items_batch: {
        Args: { p_checklist_id: string; p_items: Json }
        Returns: Json
      }
      rpc_update_order_delivery: {
        Args: { p_item_deliveries: Json; p_order_id: string }
        Returns: Json
      }
      rpc_update_order_items_ordered: {
        Args: {
          p_mark_ordered?: boolean
          p_order_id: string
          p_ordered_items?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      checklist_status: "draft" | "in_progress" | "completed"
      order_status:
        | "draft"
        | "ordered"
        | "partially_delivered"
        | "delivered"
        | "cancelled"
      unit_type:
        | "koli"
        | "karton"
        | "kiste"
        | "pack"
        | "stueck"
        | "flasche"
        | "kg"
        | "kuebel"
      user_role: "admin" | "staff"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      checklist_status: ["draft", "in_progress", "completed"],
      order_status: [
        "draft",
        "ordered",
        "partially_delivered",
        "delivered",
        "cancelled",
      ],
      unit_type: [
        "koli",
        "karton",
        "kiste",
        "pack",
        "stueck",
        "flasche",
        "kg",
        "kuebel",
      ],
      user_role: ["admin", "staff"],
    },
  },
} as const
