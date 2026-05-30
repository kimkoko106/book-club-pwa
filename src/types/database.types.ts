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
          username: string
          avatar_url: string | null
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          avatar_url?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          avatar_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      groups: {
        Row: {
          id: string
          title: string
          description: string | null
          invite_code: string | null
          type: 'solo' | 'group'
          visibility: 'private' | 'group' | 'public'
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          invite_code?: string | null
          type?: 'solo' | 'group'
          visibility?: 'private' | 'group' | 'public'
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          invite_code?: string | null
          type?: 'solo' | 'group'
          visibility?: 'private' | 'group' | 'public'
          created_at?: string
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "groups_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      group_members: {
        Row: {
          id: string
          group_id: string
          user_id: string
          joined_at: string
          role: 'admin' | 'member'
        }
        Insert: {
          id?: string
          group_id: string
          user_id: string
          joined_at?: string
          role?: 'admin' | 'member'
        }
        Update: {
          id?: string
          group_id?: string
          user_id?: string
          joined_at?: string
          role?: 'admin' | 'member'
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      books: {
        Row: {
          id: string
          title: string
          author: string
          total_pages: number | null
          cover_url: string | null
          isbn: string | null
          isbn13: string | null
          source: string | null
          source_id: string | null
          publisher: string | null
          description: string | null
          published_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          author: string
          total_pages?: number | null
          cover_url?: string | null
          isbn?: string | null
          isbn13?: string | null
          source?: string | null
          source_id?: string | null
          publisher?: string | null
          description?: string | null
          published_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          author?: string
          total_pages?: number | null
          cover_url?: string | null
          isbn?: string | null
          isbn13?: string | null
          source?: string | null
          source_id?: string | null
          publisher?: string | null
          description?: string | null
          published_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      user_books: {
        Row: {
          id: string
          user_id: string
          book_id: string
          status: 'reading' | 'completed' | 'wished'
          current_page: number
          is_recommended: boolean
          recommend_type: 'read' | 'wish' | null
          recommend_comment: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          book_id: string
          status?: 'reading' | 'completed' | 'wished'
          current_page?: number
          is_recommended?: boolean
          recommend_type?: 'read' | 'wish' | null
          recommend_comment?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          book_id?: string
          status?: 'reading' | 'completed' | 'wished'
          current_page?: number
          is_recommended?: boolean
          recommend_type?: 'read' | 'wish' | null
          recommend_comment?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_books_book_id_fkey"
            columns: ["book_id"]
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_books_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      user_book_memos: {
        Row: {
          id: string
          user_book_id: string
          page: number | null
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          user_book_id: string
          page?: number | null
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          user_book_id?: string
          page?: number | null
          content?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_book_memos_user_book_id_fkey"
            columns: ["user_book_id"]
            referencedRelation: "user_books"
            referencedColumns: ["id"]
          }
        ]
      }
      monthly_books: {
        Row: {
          id: string
          group_id: string
          book_id: string
          month: string
          stage: 'reading' | 'question' | 'discussion' | 'recap'
          timeline_reading: string | null
          timeline_question: string | null
          timeline_discussion: string | null
          created_at: string
        }
        Insert: {
          id?: string
          group_id: string
          book_id: string
          month: string
          stage?: 'reading' | 'question' | 'discussion' | 'recap'
          timeline_reading?: string | null
          timeline_question?: string | null
          timeline_discussion?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          book_id?: string
          month?: string
          stage?: 'reading' | 'question' | 'discussion' | 'recap'
          timeline_reading?: string | null
          timeline_question?: string | null
          timeline_discussion?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_books_book_id_fkey"
            columns: ["book_id"]
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_books_group_id_fkey"
            columns: ["group_id"]
            referencedRelation: "groups"
            referencedColumns: ["id"]
          }
        ]
      }
      questions: {
        Row: {
          id: string
          group_id: string
          book_id: string
          user_id: string | null
          content: string
          status: 'suggested' | 'selected' | 'archived'
          is_spoiler: boolean
          reaction_curious_count: number
          reaction_talk_count: number
          created_at: string
        }
        Insert: {
          id?: string
          group_id: string
          book_id: string
          user_id?: string | null
          content: string
          status?: 'suggested' | 'selected' | 'archived'
          is_spoiler?: boolean
          reaction_curious_count?: number
          reaction_talk_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          book_id?: string
          user_id?: string | null
          content?: string
          status?: 'suggested' | 'selected' | 'archived'
          is_spoiler?: boolean
          reaction_curious_count?: number
          reaction_talk_count?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_book_id_fkey"
            columns: ["book_id"]
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_group_id_fkey"
            columns: ["group_id"]
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      question_feedback: {
        Row: {
          id: string
          question_id: string
          user_id: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          question_id: string
          user_id: string
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          question_id?: string
          user_id?: string
          content?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_feedback_question_id_fkey"
            columns: ["question_id"]
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_feedback_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      discussion_comments: {
        Row: {
          id: string
          question_id: string
          user_id: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          question_id: string
          user_id: string
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          question_id?: string
          user_id?: string
          content?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_comments_question_id_fkey"
            columns: ["question_id"]
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_comments_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      book_recommendations: {
        Row: {
          id: string
          group_id: string
          user_id: string
          book_id: string
          recommend_type: 'read' | 'wish'
          comment: string | null
          reaction_curious_count: number
          reaction_wish_count: number
          created_at: string
        }
        Insert: {
          id?: string
          group_id: string
          user_id: string
          book_id: string
          recommend_type?: 'read' | 'wish'
          comment?: string | null
          reaction_curious_count?: number
          reaction_wish_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          user_id?: string
          book_id?: string
          recommend_type?: 'read' | 'wish'
          comment?: string | null
          reaction_curious_count?: number
          reaction_wish_count?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_recommendations_book_id_fkey"
            columns: ["book_id"]
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_recommendations_group_id_fkey"
            columns: ["group_id"]
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_recommendations_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      archives: {
        Row: {
          id: string
          group_id: string
          book_id: string
          month: string
          total_questions: number
          total_comments: number
          total_reactions: number
          total_members: number
          summary_text: string | null
          created_at: string
        }
        Insert: {
          id?: string
          group_id: string
          book_id: string
          month: string
          total_questions?: number
          total_comments?: number
          total_reactions?: number
          total_members?: number
          summary_text?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          book_id?: string
          month?: string
          total_questions?: number
          total_comments?: number
          total_reactions?: number
          total_members?: number
          summary_text?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "archives_book_id_fkey"
            columns: ["book_id"]
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "archives_group_id_fkey"
            columns: ["group_id"]
            referencedRelation: "groups"
            referencedColumns: ["id"]
          }
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
      [_ in never]: never
    }
  }
}
