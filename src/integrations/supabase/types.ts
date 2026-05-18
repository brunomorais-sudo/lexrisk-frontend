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
  public: {
    Tables: {
      client_companies: {
        Row: {
          business_name: string
          cnpj: string
          created_at: string
          id: string
          industry: string
          organization_id: string | null
          responsible_law_firm_id: string | null
          trade_name: string
        }
        Insert: {
          business_name: string
          cnpj: string
          created_at?: string
          id?: string
          industry?: string
          organization_id?: string | null
          responsible_law_firm_id?: string | null
          trade_name: string
        }
        Update: {
          business_name?: string
          cnpj?: string
          created_at?: string
          id?: string
          industry?: string
          organization_id?: string | null
          responsible_law_firm_id?: string | null
          trade_name?: string
        }
        Relationships: []
      }
      import_jobs: {
        Row: {
          chunks_processed: number
          created_at: string
          created_by: string | null
          error_message: string | null
          file_name: string
          file_path: string
          id: string
          partial_results: Json | null
          phase: string
          result_json: Json | null
          status: string
          text_chunks: Json | null
          total_chunks: number
          updated_at: string
        }
        Insert: {
          chunks_processed?: number
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          file_name: string
          file_path: string
          id?: string
          partial_results?: Json | null
          phase?: string
          result_json?: Json | null
          status?: string
          text_chunks?: Json | null
          total_chunks?: number
          updated_at?: string
        }
        Update: {
          chunks_processed?: number
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          file_name?: string
          file_path?: string
          id?: string
          partial_results?: Json | null
          phase?: string
          result_json?: Json | null
          status?: string
          text_chunks?: Json | null
          total_chunks?: number
          updated_at?: string
        }
        Relationships: []
      }
      process_analyses: {
        Row: {
          case_classification: string
          case_value_identified: number
          confidence_level: string
          created_at: string
          executive_summary: string
          financial_impact_summary: string
          id: string
          justification_text: string
          missing_information: Json
          next_steps: Json
          process_id: string
          risk_level: string
          risk_score_numeric: number | null
        }
        Insert: {
          case_classification?: string
          case_value_identified?: number
          confidence_level?: string
          created_at?: string
          executive_summary?: string
          financial_impact_summary?: string
          id?: string
          justification_text?: string
          missing_information?: Json
          next_steps?: Json
          process_id: string
          risk_level?: string
          risk_score_numeric?: number | null
        }
        Update: {
          case_classification?: string
          case_value_identified?: number
          confidence_level?: string
          created_at?: string
          executive_summary?: string
          financial_impact_summary?: string
          id?: string
          justification_text?: string
          missing_information?: Json
          next_steps?: Json
          process_id?: string
          risk_level?: string
          risk_score_numeric?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "process_analyses_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
        ]
      }
      process_arguments: {
        Row: {
          category: string
          created_at: string
          description: string
          evidence_basis: string
          id: string
          legal_basis: string
          process_analysis_id: string
          title: string
          type: string
          weight: number
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string
          evidence_basis?: string
          id?: string
          legal_basis?: string
          process_analysis_id: string
          title?: string
          type: string
          weight?: number
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          evidence_basis?: string
          id?: string
          legal_basis?: string
          process_analysis_id?: string
          title?: string
          type?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "process_arguments_process_analysis_id_fkey"
            columns: ["process_analysis_id"]
            isOneToOne: false
            referencedRelation: "process_analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      processes: {
        Row: {
          area: string
          claim_value: number
          claimant_name: string
          client_company_id: string | null
          created_at: string
          created_by: string | null
          current_status: string
          defendant_name: string
          distribution_date: string | null
          estimated_financial_exposure_base: number | null
          estimated_financial_exposure_max: number | null
          estimated_financial_exposure_min: number | null
          foro: string
          id: string
          import_job_id: string | null
          last_update_at: string
          phase: string
          procedural_pole: string
          process_number: string
          subject_main: string
          subject_tags: Json
          tribunal: string
          vara: string
        }
        Insert: {
          area?: string
          claim_value?: number
          claimant_name?: string
          client_company_id?: string | null
          created_at?: string
          created_by?: string | null
          current_status?: string
          defendant_name?: string
          distribution_date?: string | null
          estimated_financial_exposure_base?: number | null
          estimated_financial_exposure_max?: number | null
          estimated_financial_exposure_min?: number | null
          foro?: string
          id?: string
          import_job_id?: string | null
          last_update_at?: string
          phase?: string
          procedural_pole?: string
          process_number?: string
          subject_main?: string
          subject_tags?: Json
          tribunal?: string
          vara?: string
        }
        Update: {
          area?: string
          claim_value?: number
          claimant_name?: string
          client_company_id?: string | null
          created_at?: string
          created_by?: string | null
          current_status?: string
          defendant_name?: string
          distribution_date?: string | null
          estimated_financial_exposure_base?: number | null
          estimated_financial_exposure_max?: number | null
          estimated_financial_exposure_min?: number | null
          foro?: string
          id?: string
          import_job_id?: string | null
          last_update_at?: string
          phase?: string
          procedural_pole?: string
          process_number?: string
          subject_main?: string
          subject_tags?: Json
          tribunal?: string
          vara?: string
        }
        Relationships: [
          {
            foreignKeyName: "processes_client_company_id_fkey"
            columns: ["client_company_id"]
            isOneToOne: false
            referencedRelation: "client_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processes_import_job_id_fkey"
            columns: ["import_job_id"]
            isOneToOne: false
            referencedRelation: "import_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          consent_updated_at: string | null
          created_at: string
          data_collection_consent: boolean
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          consent_updated_at?: string | null
          created_at?: string
          data_collection_consent?: boolean
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          consent_updated_at?: string | null
          created_at?: string
          data_collection_consent?: boolean
          email?: string | null
          full_name?: string | null
          id?: string
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
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
