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
          admission_year: number | null
          academic_batch: string | null
          section: string
          address: string
          certifications_summary: string
          internship_summary: string
          date_of_birth: string | null
          cgpa: number | null
          active_backlogs: number
          graduation_year: number | null
          placement_status: string
          registered_via_campaign_id: string | null
          profile_completeness: number
          readiness_score: number
          readiness_status: string
          risk_level: string
          is_placement_eligible: boolean
          communication_score: number | null
          communication_grade: string | null
          last_communication_evaluation_at: string | null
          aptitude_score: number | null
          aptitude_grade: string | null
          last_aptitude_at: string | null
          verbal_score: number | null
          verbal_grade: string | null
          last_verbal_at: string | null
          codenow_score: number | null
          codenow_grade: string | null
          last_codenow_at: string | null
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
          admission_year?: number | null
          academic_batch?: string | null
          section?: string
          address?: string
          certifications_summary?: string
          internship_summary?: string
          date_of_birth?: string | null
          cgpa?: number | null
          active_backlogs?: number
          graduation_year?: number | null
          placement_status?: string
          registered_via_campaign_id?: string | null
          profile_completeness?: number
          readiness_score?: number
          readiness_status?: string
          risk_level?: string
          is_placement_eligible?: boolean
          communication_score?: number | null
          communication_grade?: string | null
          last_communication_evaluation_at?: string | null
          aptitude_score?: number | null
          aptitude_grade?: string | null
          last_aptitude_at?: string | null
          verbal_score?: number | null
          verbal_grade?: string | null
          last_verbal_at?: string | null
          codenow_score?: number | null
          codenow_grade?: string | null
          last_codenow_at?: string | null
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
      communication_evaluations: {
        Row: {
          id: string
          student_profile_id: string
          user_id: string | null
          roll_number: string
          student_name: string
          department: string
          email: string
          open_body_posture_smile: number
          gestures_eye_contact: number
          fluency_in_english: number
          rate_of_speech: number
          pronunciation_clarity: number
          voice_modulation: number
          listening_skills: number
          body_language: number
          communication_proficiency_total: number
          explanation_skills: number
          energy_enthusiasm: number
          content_quality_ideas: number
          subject_knowledge: number
          thought_process_creativity: number
          audience_orientation: number
          presentation_skills_total: number
          courtesy_politeness: number
          grooming: number
          confidence: number
          professionalism: number
          initiative: number
          leadership_skills: number
          teamwork: number
          analytical_critical_thinking: number
          problem_solving_ability: number
          persuasiveness: number
          time_management: number
          behavioural_skills_total: number
          total_score: number
          max_score: number
          percentage: number
          grade: string
          evaluator_id: string | null
          evaluator_name: string
          evaluator_role: string
          evaluation_date: string
          source: string
          notes: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          student_profile_id: string
          user_id?: string | null
          roll_number?: string
          student_name?: string
          department?: string
          email?: string
          open_body_posture_smile?: number
          gestures_eye_contact?: number
          fluency_in_english?: number
          rate_of_speech?: number
          pronunciation_clarity?: number
          voice_modulation?: number
          listening_skills?: number
          body_language?: number
          communication_proficiency_total?: number
          explanation_skills?: number
          energy_enthusiasm?: number
          content_quality_ideas?: number
          subject_knowledge?: number
          thought_process_creativity?: number
          audience_orientation?: number
          presentation_skills_total?: number
          courtesy_politeness?: number
          grooming?: number
          confidence?: number
          professionalism?: number
          initiative?: number
          leadership_skills?: number
          teamwork?: number
          analytical_critical_thinking?: number
          problem_solving_ability?: number
          persuasiveness?: number
          time_management?: number
          behavioural_skills_total?: number
          total_score?: number
          max_score?: number
          percentage?: number
          grade?: string
          evaluator_id?: string | null
          evaluator_name?: string
          evaluator_role?: string
          evaluation_date?: string
          source?: string
          notes?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['communication_evaluations']['Insert']>
        Relationships: []
      }
      aptitude_scores: {
        Row: {
          id: string
          student_profile_id: string
          roll_number: string
          score: number
          max_score: number
          percentage: number
          grade: string
          source: string
          test_name: string
          evaluated_at: string
          category_breakdown: Json
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          student_profile_id: string
          roll_number?: string
          score?: number
          max_score?: number
          percentage?: number
          grade?: string
          source?: string
          test_name?: string
          evaluated_at?: string
          category_breakdown?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['aptitude_scores']['Insert']>
        Relationships: []
      }
      verbal_scores: {
        Row: {
          id: string
          student_profile_id: string
          roll_number: string
          score: number
          max_score: number
          percentage: number
          grade: string
          source: string
          test_name: string
          evaluated_at: string
          category_breakdown: Json
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          student_profile_id: string
          roll_number?: string
          score?: number
          max_score?: number
          percentage?: number
          grade?: string
          source?: string
          test_name?: string
          evaluated_at?: string
          category_breakdown?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['verbal_scores']['Insert']>
        Relationships: []
      }
      codenow_profiles: {
        Row: {
          id: string
          student_profile_id: string
          roll_number: string
          email: string
          codenow_username: string
          total_score: number
          max_score: number
          percentage: number
          grade: string
          rank: number | null
          total_challenges: number
          solved_challenges: number
          last_synced_at: string
          source: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          student_profile_id: string
          roll_number?: string
          email?: string
          codenow_username?: string
          total_score?: number
          max_score?: number
          percentage?: number
          grade?: string
          rank?: number | null
          total_challenges?: number
          solved_challenges?: number
          last_synced_at?: string
          source?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['codenow_profiles']['Insert']>
        Relationships: []
      }
      codenow_challenge_scores: {
        Row: {
          id: string
          student_profile_id: string
          roll_number: string
          challenge_id: string
          challenge_name: string
          category: string
          score: number
          max_score: number
          percentage: number
          status: string
          attempted_at: string | null
          source: string
          raw_reference_id: string
          synced_at: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          student_profile_id: string
          roll_number?: string
          challenge_id?: string
          challenge_name?: string
          category?: string
          score?: number
          max_score?: number
          percentage?: number
          status?: string
          attempted_at?: string | null
          source?: string
          raw_reference_id?: string
          synced_at?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['codenow_challenge_scores']['Insert']>
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
      student_update_campaigns: {
        Row: {
          id: string
          title: string
          description: string
          status: string
          filters: Json
          allowlisted_fields: Json
          expires_at: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string
          status?: string
          filters?: Json
          allowlisted_fields?: Json
          expires_at?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['student_update_campaigns']['Insert']>
        Relationships: []
      }
      student_update_tokens: {
        Row: {
          id: string
          campaign_id: string
          student_profile_id: string
          token: string
          is_active: boolean
          opened_at: string | null
          submitted_at: string | null
          last_activity_at: string | null
          expires_at: string
          revoked_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          student_profile_id: string
          token: string
          is_active?: boolean
          opened_at?: string | null
          submitted_at?: string | null
          last_activity_at?: string | null
          expires_at: string
          revoked_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['student_update_tokens']['Insert']>
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
      get_public_student_update_form: { Args: { p_token: string }; Returns: Json }
      get_public_campaign_registration_form: { Args: { p_campaign_id: string }; Returns: Json }
      submit_public_campaign_registration: { Args: { p_campaign_id: string; p_payload: Json }; Returns: Json }
      register_public_campaign_registration_resume: {
        Args: {
          p_campaign_id: string
          p_roll_number: string
          p_file_name: string
          p_storage_path: string
          p_mime_type: string
          p_file_size: number
        }
        Returns: Json
      }
      resolve_public_campaign_student_token: { Args: { p_campaign_id: string; p_roll_number: string }; Returns: string | null }
      submit_public_student_update: { Args: { p_token: string; p_payload: Json }; Returns: Json }
      register_public_campaign_resume: {
        Args: {
          p_token: string
          p_file_name: string
          p_storage_path: string
          p_mime_type: string
          p_file_size: number
        }
        Returns: Json
      }
    }
    Enums: {
      placement_role: PlacementRole
    }
    CompositeTypes: Record<string, never>
  }
}

export type StudentProfile = Database['public']['Tables']['student_profiles']['Row']
