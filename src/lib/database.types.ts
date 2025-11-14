export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          avatar_url: string
          bio: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string
          avatar_url?: string
          bio?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          avatar_url?: string
          bio?: string
          created_at?: string
          updated_at?: string
        }
      }
      study_groups: {
        Row: {
          id: string
          name: string
          description: string
          subject: string
          created_by: string | null
          is_public: boolean
          max_members: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string
          subject?: string
          created_by?: string | null
          is_public?: boolean
          max_members?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          subject?: string
          created_by?: string | null
          is_public?: boolean
          max_members?: number
          created_at?: string
          updated_at?: string
        }
      }
      group_memberships: {
        Row: {
          id: string
          group_id: string
          user_id: string
          role: 'admin' | 'moderator' | 'member'
          joined_at: string
          last_active: string
        }
        Insert: {
          id?: string
          group_id: string
          user_id: string
          role?: 'admin' | 'moderator' | 'member'
          joined_at?: string
          last_active?: string
        }
        Update: {
          id?: string
          group_id?: string
          user_id?: string
          role?: 'admin' | 'moderator' | 'member'
          joined_at?: string
          last_active?: string
        }
      }
      study_sessions: {
        Row: {
          id: string
          group_id: string
          title: string
          description: string
          scheduled_at: string
          duration_minutes: number
          created_by: string | null
          status: 'scheduled' | 'active' | 'completed' | 'cancelled'
          created_at: string
        }
        Insert: {
          id?: string
          group_id: string
          title: string
          description?: string
          scheduled_at: string
          duration_minutes?: number
          created_by?: string | null
          status?: 'scheduled' | 'active' | 'completed' | 'cancelled'
          created_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          title?: string
          description?: string
          scheduled_at?: string
          duration_minutes?: number
          created_by?: string | null
          status?: 'scheduled' | 'active' | 'completed' | 'cancelled'
          created_at?: string
        }
      }
      session_participants: {
        Row: {
          id: string
          session_id: string
          user_id: string
          joined_at: string
          left_at: string | null
          duration_minutes: number
        }
        Insert: {
          id?: string
          session_id: string
          user_id: string
          joined_at?: string
          left_at?: string | null
          duration_minutes?: number
        }
        Update: {
          id?: string
          session_id?: string
          user_id?: string
          joined_at?: string
          left_at?: string | null
          duration_minutes?: number
        }
      }
      messages: {
        Row: {
          id: string
          group_id: string
          user_id: string
          content: string
          message_type: 'text' | 'file' | 'system'
          reply_to: string | null
          created_at: string
          edited_at: string | null
        }
        Insert: {
          id?: string
          group_id: string
          user_id: string
          content: string
          message_type?: 'text' | 'file' | 'system'
          reply_to?: string | null
          created_at?: string
          edited_at?: string | null
        }
        Update: {
          id?: string
          group_id?: string
          user_id?: string
          content?: string
          message_type?: 'text' | 'file' | 'system'
          reply_to?: string | null
          created_at?: string
          edited_at?: string | null
        }
      }
      resources: {
        Row: {
          id: string
          group_id: string
          uploaded_by: string
          title: string
          description: string
          file_url: string
          file_type: string
          file_size: number
          created_at: string
        }
        Insert: {
          id?: string
          group_id: string
          uploaded_by: string
          title: string
          description?: string
          file_url: string
          file_type?: string
          file_size?: number
          created_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          uploaded_by?: string
          title?: string
          description?: string
          file_url?: string
          file_type?: string
          file_size?: number
          created_at?: string
        }
      }
      quizzes: {
        Row: {
          id: string
          group_id: string
          created_by: string
          title: string
          description: string
          time_limit_minutes: number | null
          passing_score: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          group_id: string
          created_by: string
          title: string
          description?: string
          time_limit_minutes?: number | null
          passing_score?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          created_by?: string
          title?: string
          description?: string
          time_limit_minutes?: number | null
          passing_score?: number
          is_active?: boolean
          created_at?: string
        }
      }
      quiz_questions: {
        Row: {
          id: string
          quiz_id: string
          question_text: string
          question_type: 'multiple_choice' | 'true_false' | 'short_answer'
          options: Json
          correct_answer: string
          points: number
          order_index: number
        }
        Insert: {
          id?: string
          quiz_id: string
          question_text: string
          question_type?: 'multiple_choice' | 'true_false' | 'short_answer'
          options?: Json
          correct_answer: string
          points?: number
          order_index?: number
        }
        Update: {
          id?: string
          quiz_id?: string
          question_text?: string
          question_type?: 'multiple_choice' | 'true_false' | 'short_answer'
          options?: Json
          correct_answer?: string
          points?: number
          order_index?: number
        }
      }
      quiz_attempts: {
        Row: {
          id: string
          quiz_id: string
          user_id: string
          score: number
          total_points: number
          answers: Json
          started_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          quiz_id: string
          user_id: string
          score?: number
          total_points?: number
          answers?: Json
          started_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          quiz_id?: string
          user_id?: string
          score?: number
          total_points?: number
          answers?: Json
          started_at?: string
          completed_at?: string | null
        }
      }
    }
  }
}
