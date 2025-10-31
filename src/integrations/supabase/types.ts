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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      attachments: {
        Row: {
          created_at: string
          file_url: string | null
          filename: string | null
          id: string
          last_validated_at: string | null
          notes: string | null
          status: Database["public"]["Enums"]["attachment_status"]
          subcontract_id: string
          type: Database["public"]["Enums"]["attachment_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          file_url?: string | null
          filename?: string | null
          id?: string
          last_validated_at?: string | null
          notes?: string | null
          status?: Database["public"]["Enums"]["attachment_status"]
          subcontract_id: string
          type: Database["public"]["Enums"]["attachment_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          file_url?: string | null
          filename?: string | null
          id?: string
          last_validated_at?: string | null
          notes?: string | null
          status?: Database["public"]["Enums"]["attachment_status"]
          subcontract_id?: string
          type?: Database["public"]["Enums"]["attachment_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachments_subcontract_id_fkey"
            columns: ["subcontract_id"]
            isOneToOne: false
            referencedRelation: "subcontracts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          default_filters: Json | null
          email: string
          id: string
          procore_access_token: string | null
          procore_refresh_token: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_filters?: Json | null
          email: string
          id?: string
          procore_access_token?: string | null
          procore_refresh_token?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_filters?: Json | null
          email?: string
          id?: string
          procore_access_token?: string | null
          procore_refresh_token?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          address: string | null
          city: string | null
          completion_date: string | null
          county: string | null
          created_at: string
          estimated_value: number | null
          id: string
          last_sync_at: string | null
          latitude: number | null
          longitude: number | null
          name: string
          number: string | null
          pm_name: string | null
          procore_project_id: string
          project_stage: string | null
          projected_finish_date: string | null
          start_date: string | null
          state_code: string | null
          status: string | null
          total_value: number | null
          updated_at: string
          zip: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          completion_date?: string | null
          county?: string | null
          created_at?: string
          estimated_value?: number | null
          id?: string
          last_sync_at?: string | null
          latitude?: number | null
          longitude?: number | null
          name: string
          number?: string | null
          pm_name?: string | null
          procore_project_id: string
          project_stage?: string | null
          projected_finish_date?: string | null
          start_date?: string | null
          state_code?: string | null
          status?: string | null
          total_value?: number | null
          updated_at?: string
          zip?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          completion_date?: string | null
          county?: string | null
          created_at?: string
          estimated_value?: number | null
          id?: string
          last_sync_at?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          number?: string | null
          pm_name?: string | null
          procore_project_id?: string
          project_stage?: string | null
          projected_finish_date?: string | null
          start_date?: string | null
          state_code?: string | null
          status?: string | null
          total_value?: number | null
          updated_at?: string
          zip?: string | null
        }
        Relationships: []
      }
      reminders: {
        Row: {
          body: string
          created_at: string
          from_email: string | null
          id: string
          last_sent_at: string | null
          send_status: Database["public"]["Enums"]["send_status"]
          subcontract_id: string
          subject: string
          to_email: string
        }
        Insert: {
          body: string
          created_at?: string
          from_email?: string | null
          id?: string
          last_sent_at?: string | null
          send_status?: Database["public"]["Enums"]["send_status"]
          subcontract_id: string
          subject: string
          to_email: string
        }
        Update: {
          body?: string
          created_at?: string
          from_email?: string | null
          id?: string
          last_sent_at?: string | null
          send_status?: Database["public"]["Enums"]["send_status"]
          subcontract_id?: string
          subject?: string
          to_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_subcontract_id_fkey"
            columns: ["subcontract_id"]
            isOneToOne: false
            referencedRelation: "subcontracts"
            referencedColumns: ["id"]
          },
        ]
      }
      subcontracts: {
        Row: {
          contract_date: string | null
          contract_value: number | null
          created_at: string
          executed: boolean | null
          id: string
          last_updated_at: string
          missing_count: number
          number: string | null
          procore_commitment_id: string
          project_id: string
          status: Database["public"]["Enums"]["subcontract_status"]
          subcontractor_email: string | null
          subcontractor_name: string
          title: string | null
        }
        Insert: {
          contract_date?: string | null
          contract_value?: number | null
          created_at?: string
          executed?: boolean | null
          id?: string
          last_updated_at?: string
          missing_count?: number
          number?: string | null
          procore_commitment_id: string
          project_id: string
          status?: Database["public"]["Enums"]["subcontract_status"]
          subcontractor_email?: string | null
          subcontractor_name: string
          title?: string | null
        }
        Update: {
          contract_date?: string | null
          contract_value?: number | null
          created_at?: string
          executed?: boolean | null
          id?: string
          last_updated_at?: string
          missing_count?: number
          number?: string | null
          procore_commitment_id?: string
          project_id?: string
          status?: Database["public"]["Enums"]["subcontract_status"]
          subcontractor_email?: string | null
          subcontractor_name?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subcontracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      validation_flags: {
        Row: {
          attachment_id: string
          code: string
          created_at: string
          id: string
          message: string
          severity: Database["public"]["Enums"]["severity_level"]
        }
        Insert: {
          attachment_id: string
          code: string
          created_at?: string
          id?: string
          message: string
          severity?: Database["public"]["Enums"]["severity_level"]
        }
        Update: {
          attachment_id?: string
          code?: string
          created_at?: string
          id?: string
          message?: string
          severity?: Database["public"]["Enums"]["severity_level"]
        }
        Relationships: [
          {
            foreignKeyName: "validation_flags_attachment_id_fkey"
            columns: ["attachment_id"]
            isOneToOne: false
            referencedRelation: "attachments"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role: "pm" | "admin" | "exec"
      attachment_status: "Missing" | "Pending Review" | "Invalid" | "Complete"
      attachment_type: "F" | "G" | "H" | "COI" | "W9" | "Other"
      send_status: "queued" | "sent" | "bounced" | "failed"
      severity_level: "info" | "warn" | "error"
      subcontract_status: "Draft" | "Out for Signature" | "Executed"
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
      app_role: ["pm", "admin", "exec"],
      attachment_status: ["Missing", "Pending Review", "Invalid", "Complete"],
      attachment_type: ["F", "G", "H", "COI", "W9", "Other"],
      send_status: ["queued", "sent", "bounced", "failed"],
      severity_level: ["info", "warn", "error"],
      subcontract_status: ["Draft", "Out for Signature", "Executed"],
    },
  },
} as const
