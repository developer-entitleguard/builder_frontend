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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      builder_items: {
        Row: {
          brand: string | null
          builder_id: string | null
          category: string
          created_at: string
          description: string | null
          documentation_url: string | null
          id: string
          make: string | null
          model: string | null
          name: string
          notes: string | null
          price: number | null
          purchaser: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          brand?: string | null
          builder_id?: string | null
          category: string
          created_at?: string
          description?: string | null
          documentation_url?: string | null
          id?: string
          make?: string | null
          model?: string | null
          name: string
          notes?: string | null
          price?: number | null
          purchaser?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          brand?: string | null
          builder_id?: string | null
          category?: string
          created_at?: string
          description?: string | null
          documentation_url?: string | null
          id?: string
          make?: string | null
          model?: string | null
          name?: string
          notes?: string | null
          price?: number | null
          purchaser?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      builder_organizations: {
        Row: {
          abn: string | null
          address: string
          contact_email: string
          contact_phone: string
          contact_user_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          status: string | null
          updated_at: string
        }
        Insert: {
          abn?: string | null
          address: string
          contact_email: string
          contact_phone: string
          contact_user_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          abn?: string | null
          address?: string
          contact_email?: string
          contact_phone?: string
          contact_user_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      homeowner_queries: {
        Row: {
          builder_id: string
          created_at: string
          id: string
          message: string
          registration_id: string
          responded_at: string | null
          response: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          builder_id: string
          created_at?: string
          id?: string
          message: string
          registration_id: string
          responded_at?: string | null
          response?: string | null
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          builder_id?: string
          created_at?: string
          id?: string
          message?: string
          registration_id?: string
          responded_at?: string | null
          response?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "homeowner_queries_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "homeowner_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      homeowner_registrations: {
        Row: {
          builder_id: string | null
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string | null
          documents_uploaded: Json | null
          entitlement_sent_at: string | null
          id: string
          notes: string | null
          project_name: string | null
          property_address: string
          property_city: string
          property_state: string
          property_zip: string
          selected_items: Json | null
          settlement_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          builder_id?: string | null
          created_at?: string
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          documents_uploaded?: Json | null
          entitlement_sent_at?: string | null
          id?: string
          notes?: string | null
          project_name?: string | null
          property_address: string
          property_city: string
          property_state: string
          property_zip: string
          selected_items?: Json | null
          settlement_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          builder_id?: string | null
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          documents_uploaded?: Json | null
          entitlement_sent_at?: string | null
          id?: string
          notes?: string | null
          project_name?: string | null
          property_address?: string
          property_city?: string
          property_state?: string
          property_zip?: string
          selected_items?: Json | null
          settlement_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "homeowner_registrations_builder_id_fkey"
            columns: ["builder_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_name: string | null
          contact_person: string | null
          created_at: string
          first_name: string | null
          id: string
          last_login_at: string | null
          last_name: string | null
          password_set_at: string | null
          phone: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_name?: string | null
          contact_person?: string | null
          created_at?: string
          first_name?: string | null
          id?: string
          last_login_at?: string | null
          last_name?: string | null
          password_set_at?: string | null
          phone?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_name?: string | null
          contact_person?: string | null
          created_at?: string
          first_name?: string | null
          id?: string
          last_login_at?: string | null
          last_name?: string | null
          password_set_at?: string | null
          phone?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "builder_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      ensure_user_profile: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_user_organization: {
        Args: { _user_id: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
