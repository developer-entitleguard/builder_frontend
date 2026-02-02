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
      activity_updates: {
        Row: {
          activity_id: string
          attachments: Json | null
          builder_id: string
          content: string
          created_at: string
          id: string
          organization_id: string | null
        }
        Insert: {
          activity_id: string
          attachments?: Json | null
          builder_id: string
          content: string
          created_at?: string
          id?: string
          organization_id?: string | null
        }
        Update: {
          activity_id?: string
          attachments?: Json | null
          builder_id?: string
          content?: string
          created_at?: string
          id?: string
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_updates_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "project_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_updates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "builder_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_requests: {
        Row: {
          activity_id: string
          approval_token: string | null
          approval_type: string
          approver_email: string | null
          approver_name: string | null
          builder_id: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_comment: string | null
          description: string | null
          due_by: string | null
          id: string
          organization_id: string | null
          project_id: string
          registration_id: string | null
          requested_at: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          activity_id: string
          approval_token?: string | null
          approval_type?: string
          approver_email?: string | null
          approver_name?: string | null
          builder_id: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_comment?: string | null
          description?: string | null
          due_by?: string | null
          id?: string
          organization_id?: string | null
          project_id: string
          registration_id?: string | null
          requested_at?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          activity_id?: string
          approval_token?: string | null
          approval_type?: string
          approver_email?: string | null
          approver_name?: string | null
          builder_id?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_comment?: string | null
          description?: string | null
          due_by?: string | null
          id?: string
          organization_id?: string | null
          project_id?: string
          registration_id?: string | null
          requested_at?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_requests_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "project_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "builder_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_requests_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "homeowner_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      bill_of_materials: {
        Row: {
          builder_id: string
          created_at: string
          id: string
          name: string
          organization_id: string | null
          project_name: string | null
          updated_at: string
        }
        Insert: {
          builder_id: string
          created_at?: string
          id?: string
          name: string
          organization_id?: string | null
          project_name?: string | null
          updated_at?: string
        }
        Update: {
          builder_id?: string
          created_at?: string
          id?: string
          name?: string
          organization_id?: string | null
          project_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bill_of_materials_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "builder_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      builder_items: {
        Row: {
          bom_id: string | null
          brand: string | null
          builder_id: string | null
          category: string
          created_at: string
          description: string | null
          documentation_url: string | null
          id: string
          make: string | null
          manual_url: string | null
          model: string | null
          name: string
          notes: string | null
          organization_id: string | null
          price: number | null
          purchaser: string | null
          status: string | null
          updated_at: string
          warranty_years: number | null
        }
        Insert: {
          bom_id?: string | null
          brand?: string | null
          builder_id?: string | null
          category: string
          created_at?: string
          description?: string | null
          documentation_url?: string | null
          id?: string
          make?: string | null
          manual_url?: string | null
          model?: string | null
          name: string
          notes?: string | null
          organization_id?: string | null
          price?: number | null
          purchaser?: string | null
          status?: string | null
          updated_at?: string
          warranty_years?: number | null
        }
        Update: {
          bom_id?: string | null
          brand?: string | null
          builder_id?: string | null
          category?: string
          created_at?: string
          description?: string | null
          documentation_url?: string | null
          id?: string
          make?: string | null
          manual_url?: string | null
          model?: string | null
          name?: string
          notes?: string | null
          organization_id?: string | null
          price?: number | null
          purchaser?: string | null
          status?: string | null
          updated_at?: string
          warranty_years?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "builder_items_bom_id_fkey"
            columns: ["bom_id"]
            isOneToOne: false
            referencedRelation: "bill_of_materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "builder_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "builder_organizations"
            referencedColumns: ["id"]
          },
        ]
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
          organization_id: string | null
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
          organization_id?: string | null
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
          organization_id?: string | null
          registration_id?: string
          responded_at?: string | null
          response?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "homeowner_queries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "builder_organizations"
            referencedColumns: ["id"]
          },
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
          consent_method: string | null
          consent_received: boolean | null
          consent_received_at: string | null
          consent_token: string | null
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string | null
          documents_uploaded: Json | null
          entitlement_sent_at: string | null
          id: string
          notes: string | null
          num_bedrooms: number | null
          num_rooms: number | null
          organization_id: string | null
          price: number | null
          project_id: string | null
          project_name: string | null
          property_address: string
          property_city: string
          property_state: string
          property_zip: string
          selected_items: Json | null
          settlement_date: string | null
          status: string
          total_built_up_area: number | null
          updated_at: string
        }
        Insert: {
          builder_id?: string | null
          consent_method?: string | null
          consent_received?: boolean | null
          consent_received_at?: string | null
          consent_token?: string | null
          created_at?: string
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          documents_uploaded?: Json | null
          entitlement_sent_at?: string | null
          id?: string
          notes?: string | null
          num_bedrooms?: number | null
          num_rooms?: number | null
          organization_id?: string | null
          price?: number | null
          project_id?: string | null
          project_name?: string | null
          property_address: string
          property_city: string
          property_state: string
          property_zip: string
          selected_items?: Json | null
          settlement_date?: string | null
          status?: string
          total_built_up_area?: number | null
          updated_at?: string
        }
        Update: {
          builder_id?: string | null
          consent_method?: string | null
          consent_received?: boolean | null
          consent_received_at?: string | null
          consent_token?: string | null
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          documents_uploaded?: Json | null
          entitlement_sent_at?: string | null
          id?: string
          notes?: string | null
          num_bedrooms?: number | null
          num_rooms?: number | null
          organization_id?: string | null
          price?: number | null
          project_id?: string | null
          project_name?: string | null
          property_address?: string
          property_city?: string
          property_state?: string
          property_zip?: string
          selected_items?: Json | null
          settlement_date?: string | null
          status?: string
          total_built_up_area?: number | null
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
          {
            foreignKeyName: "homeowner_registrations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "builder_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homeowner_registrations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          organization_id: string
          role: string
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          organization_id: string
          role?: string
          status?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          organization_id?: string
          role?: string
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "builder_organizations"
            referencedColumns: ["id"]
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
      project_activities: {
        Row: {
          builder_id: string
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          name: string
          order_index: number
          organization_id: string | null
          percentage_complete: number | null
          priority: string
          project_id: string
          status: string
          updated_at: string
        }
        Insert: {
          builder_id: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          name: string
          order_index?: number
          organization_id?: string | null
          percentage_complete?: number | null
          priority?: string
          project_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          builder_id?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          name?: string
          order_index?: number
          organization_id?: string | null
          percentage_complete?: number | null
          priority?: string
          project_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_activities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "builder_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_activities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_cost_items: {
        Row: {
          ai_assumptions: string | null
          category: string
          created_at: string
          description: string | null
          from_bom: boolean
          id: string
          is_ai_generated: boolean
          is_modified: boolean
          linked_activity_id: string | null
          name: string
          pricing_id: string
          quantity: number | null
          total_cost: number
          unit_rate: number | null
          updated_at: string
        }
        Insert: {
          ai_assumptions?: string | null
          category: string
          created_at?: string
          description?: string | null
          from_bom?: boolean
          id?: string
          is_ai_generated?: boolean
          is_modified?: boolean
          linked_activity_id?: string | null
          name: string
          pricing_id: string
          quantity?: number | null
          total_cost: number
          unit_rate?: number | null
          updated_at?: string
        }
        Update: {
          ai_assumptions?: string | null
          category?: string
          created_at?: string
          description?: string | null
          from_bom?: boolean
          id?: string
          is_ai_generated?: boolean
          is_modified?: boolean
          linked_activity_id?: string | null
          name?: string
          pricing_id?: string
          quantity?: number | null
          total_cost?: number
          unit_rate?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_cost_items_linked_activity_id_fkey"
            columns: ["linked_activity_id"]
            isOneToOne: false
            referencedRelation: "project_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_cost_items_pricing_id_fkey"
            columns: ["pricing_id"]
            isOneToOne: false
            referencedRelation: "project_pricing"
            referencedColumns: ["id"]
          },
        ]
      }
      project_pricing: {
        Row: {
          buffer_amount: number | null
          buffer_percentage: number | null
          builder_id: string
          created_at: string
          final_price: number
          id: string
          margin_amount: number | null
          margin_percentage: number | null
          organization_id: string | null
          project_id: string
          total_estimated_cost: number
          updated_at: string
        }
        Insert: {
          buffer_amount?: number | null
          buffer_percentage?: number | null
          builder_id: string
          created_at?: string
          final_price?: number
          id?: string
          margin_amount?: number | null
          margin_percentage?: number | null
          organization_id?: string | null
          project_id: string
          total_estimated_cost?: number
          updated_at?: string
        }
        Update: {
          buffer_amount?: number | null
          buffer_percentage?: number | null
          builder_id?: string
          created_at?: string
          final_price?: number
          id?: string
          margin_amount?: number | null
          margin_percentage?: number | null
          organization_id?: string | null
          project_id?: string
          total_estimated_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_pricing_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "builder_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_pricing_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          activities_visible_to_homeowner: boolean
          actual_end_date: string | null
          address: string
          builder_id: string
          city: string
          created_at: string
          description: string | null
          id: string
          name: string
          organization_id: string | null
          postcode: string
          property_type: string
          start_date: string | null
          state: string
          status: string
          target_end_date: string | null
          updated_at: string
        }
        Insert: {
          activities_visible_to_homeowner?: boolean
          actual_end_date?: string | null
          address: string
          builder_id: string
          city: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          organization_id?: string | null
          postcode: string
          property_type: string
          start_date?: string | null
          state: string
          status?: string
          target_end_date?: string | null
          updated_at?: string
        }
        Update: {
          activities_visible_to_homeowner?: boolean
          actual_end_date?: string | null
          address?: string
          builder_id?: string
          city?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          organization_id?: string | null
          postcode?: string
          property_type?: string
          start_date?: string | null
          state?: string
          status?: string
          target_end_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "builder_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          organization_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string | null
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
      vendors: {
        Row: {
          contact_email: string
          contact_phone: string
          created_at: string
          description: string | null
          id: string
          name: string
          organization_id: string
          type: Database["public"]["Enums"]["vendor_type"]
          updated_at: string
        }
        Insert: {
          contact_email: string
          contact_phone: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          organization_id: string
          type: Database["public"]["Enums"]["vendor_type"]
          updated_at?: string
        }
        Update: {
          contact_email?: string
          contact_phone?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          type?: Database["public"]["Enums"]["vendor_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendors_organization_id_fkey"
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
      ensure_user_profile: { Args: never; Returns: undefined }
      get_user_organization: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_superadmin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user" | "superadmin"
      vendor_type:
        | "Tradesman"
        | "Plumber"
        | "Electrician"
        | "Landscaper"
        | "Sellers"
        | "Others"
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
      app_role: ["admin", "user", "superadmin"],
      vendor_type: [
        "Tradesman",
        "Plumber",
        "Electrician",
        "Landscaper",
        "Sellers",
        "Others",
      ],
    },
  },
} as const
