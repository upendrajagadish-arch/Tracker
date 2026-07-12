export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type PlacementRole =
  | 'admin'
  | 'tpo'
  | 'faculty'
  | 'interviewer'
  | 'hr'
  | 'student'

export interface Database {
  public: {
    Tables: {
      public_profiles: {
        Row: {
          id: string
          username: string
          display_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          display_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          display_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      profile_configs: {
        Row: {
          id: string
          user_id: string
          name: string
          is_primary: boolean
          is_public: boolean
          config: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name?: string
          is_primary?: boolean
          is_public?: boolean
          config: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          is_primary?: boolean
          is_public?: boolean
          config?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      placement_user_profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          role: PlacementRole
          roll_number: string | null
          expertise: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string
          full_name?: string
          role?: PlacementRole
          roll_number?: string | null
          expertise?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['placement_user_profiles']['Insert']>
        Relationships: []
      }
      audit_logs: {
        Row: {
          id: string
          actor_user_id: string | null
          actor_role: string
          action: string
          entity_type: string
          entity_id: string
          description: string
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          actor_user_id?: string | null
          actor_role?: string
          action: string
          entity_type?: string
          entity_id?: string
          description?: string
          metadata?: Json
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['audit_logs']['Insert']>
        Relationships: []
      }
      student_profiles: {
        Row: {
          id: string
          user_id: string | null
          roll_number: string
          full_name: string
          email: string
          phone: string
          branch: string
          batch: string
          date_of_birth: string | null
          cgpa: number | null
          active_backlogs: number
          graduation_year: number | null
          placement_status: string
          profile_completeness: number
          readiness_score: number
          readiness_status: string
          risk_level: string
          is_placement_eligible: boolean
          linkedin_url: string
          github_url: string
          portfolio_url: string
          skills_summary: string
          career_interest: string
          platform_handles: Json
          projects_summary: string
          is_active: boolean
          share_token: string | null
          is_shareable: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          roll_number: string
          full_name: string
          email?: string
          phone?: string
          branch?: string
          batch?: string
          date_of_birth?: string | null
          cgpa?: number | null
          active_backlogs?: number
          graduation_year?: number | null
          placement_status?: string
          profile_completeness?: number
          readiness_score?: number
          readiness_status?: string
          risk_level?: string
          is_placement_eligible?: boolean
          linkedin_url?: string
          github_url?: string
          portfolio_url?: string
          skills_summary?: string
          career_interest?: string
          platform_handles?: Json
          projects_summary?: string
          is_active?: boolean
          share_token?: string | null
          is_shareable?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['student_profiles']['Insert']>
        Relationships: []
      }
      student_coding_snapshots: {
        Row: {
          id: string
          student_profile_id: string
          platform_handles: Json
          cards: Json
          total_solved: number
          linked_count: number
          fetch_status: string
          fetch_error: string | null
          fetched_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          student_profile_id: string
          platform_handles?: Json
          cards?: Json
          total_solved?: number
          linked_count?: number
          fetch_status?: string
          fetch_error?: string | null
          fetched_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['student_coding_snapshots']['Insert']>
        Relationships: []
      }
      student_resumes: {
        Row: {
          id: string
          student_profile_id: string
          user_id: string | null
          file_name: string
          storage_path: string
          mime_type: string
          file_size: number
          is_active: boolean
          review_status: string
          resume_score: number
          ats_friendly: boolean
          reviewer_comments: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          student_profile_id: string
          user_id?: string | null
          file_name: string
          storage_path: string
          mime_type?: string
          file_size?: number
          is_active?: boolean
          review_status?: string
          resume_score?: number
          ats_friendly?: boolean
          reviewer_comments?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['student_resumes']['Insert']>
        Relationships: []
      }
      tech_skills: {
        Row: {
          id: string
          name: string
          name_key: string
          category: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          name_key: string
          category?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['tech_skills']['Insert']>
        Relationships: []
      }
      student_tech_skills: {
        Row: {
          id: string
          student_profile_id: string
          tech_skill_id: string
          proficiency_level: string
          verification_status: string
          evidence_source: string
          notes: string
          added_by_user_id: string | null
          verified_by_user_id: string | null
          verified_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          student_profile_id: string
          tech_skill_id: string
          proficiency_level?: string
          verification_status?: string
          evidence_source?: string
          notes?: string
          added_by_user_id?: string | null
          verified_by_user_id?: string | null
          verified_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['student_tech_skills']['Insert']>
        Relationships: []
      }
      student_role_interests: {
        Row: {
          id: string
          student_profile_id: string
          role_name: string
          interest_level: string
          readiness_level: string
          notes: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          student_profile_id: string
          role_name: string
          interest_level?: string
          readiness_level?: string
          notes?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['student_role_interests']['Insert']>
        Relationships: []
      }
      readiness_snapshots: {
        Row: {
          id: string
          student_profile_id: string
          overall_score: number
          technical_score: number
          communication_score: number
          resume_score: number
          tech_stack_score: number
          profile_score: number
          academic_score: number
          risk_level: string
          readiness_status: string
          score_breakdown: Json
          calculated_at: string
        }
        Insert: {
          id?: string
          student_profile_id: string
          overall_score?: number
          technical_score?: number
          communication_score?: number
          resume_score?: number
          tech_stack_score?: number
          profile_score?: number
          academic_score?: number
          risk_level?: string
          readiness_status?: string
          score_breakdown?: Json
          calculated_at?: string
        }
        Update: Partial<Database['public']['Tables']['readiness_snapshots']['Insert']>
        Relationships: []
      }
      companies: {
        Row: {
          id: string
          name: string
          industry: string
          location: string
          contact_email: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          industry?: string
          location?: string
          contact_email?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['companies']['Insert']>
        Relationships: []
      }
      company_requirements: {
        Row: {
          id: string
          company_id: string
          role_title: string
          eligible_branches: string[]
          eligible_batches: string[]
          min_cgpa: number | null
          required_skills: string[]
          preferred_skills: string[]
          min_readiness_score: number | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          role_title: string
          eligible_branches?: string[]
          eligible_batches?: string[]
          min_cgpa?: number | null
          required_skills?: string[]
          preferred_skills?: string[]
          min_readiness_score?: number | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['company_requirements']['Insert']>
        Relationships: []
      }
      company_match_snapshots: {
        Row: {
          id: string
          company_id: string
          requirement_id: string
          student_profile_id: string
          match_score: number
          match_status: string
          eligibility_status: string
          matched_skills: string[]
          missing_required_skills: string[]
          calculated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          requirement_id: string
          student_profile_id: string
          match_score?: number
          match_status?: string
          eligibility_status?: string
          matched_skills?: string[]
          missing_required_skills?: string[]
          calculated_at?: string
        }
        Update: Partial<Database['public']['Tables']['company_match_snapshots']['Insert']>
        Relationships: []
      }
      placement_interviews: {
        Row: {
          id: string
          roll_number: string
          student_name: string
          technical_score: number
          communication_score: number
          overall_score: number
          level: string
          interviewer_id: string | null
          remarks: string
          created_at: string
        }
        Insert: {
          id?: string
          roll_number: string
          student_name: string
          technical_score?: number
          communication_score?: number
          overall_score?: number
          level?: string
          interviewer_id?: string | null
          remarks?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['placement_interviews']['Insert']>
        Relationships: []
      }
      resume_book_snapshots: {
        Row: {
          id: string
          title: string
          description: string
          filters: Json
          total_students: number
          book_type: string
          status: string
          share_token: string | null
          is_shareable: boolean
          expires_at: string | null
          share_settings: Json
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string
          filters?: Json
          total_students?: number
          book_type?: string
          status?: string
          share_token?: string | null
          is_shareable?: boolean
          expires_at?: string | null
          share_settings?: Json
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['resume_book_snapshots']['Insert']>
        Relationships: []
      }
      resume_book_student_snapshots: {
        Row: {
          id: string
          resume_book_id: string
          student_profile_id: string
          order_index: number
          snapshot: Json
          created_at: string
        }
        Insert: {
          id?: string
          resume_book_id: string
          student_profile_id: string
          order_index?: number
          snapshot?: Json
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['resume_book_student_snapshots']['Insert']>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      get_public_resume_book: { Args: { p_token: string }; Returns: Json }
      get_public_resume_book_students: {
        Args: { p_token: string; p_page?: number; p_limit?: number }
        Returns: Json
      }
      get_public_student_performance: { Args: { p_token: string }; Returns: Json }
    }
    Enums: {
      placement_role: PlacementRole
    }
    CompositeTypes: Record<string, never>
  }
}

export type StudentProfile = Database['public']['Tables']['student_profiles']['Row']
