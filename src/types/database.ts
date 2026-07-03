// Auto-generated types matching the SQL schema.
// Re-run `supabase gen types typescript` to regenerate after schema changes.

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
          email_verified: boolean;
          last_login_at: string | null;
          total_tests: number;
          total_time_typed: number;
          total_keystrokes: number;
          achievements: Json;
          preferences: Json;
        };
        Insert: {
          id: string;
          username: string;
          display_name: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
          email_verified?: boolean;
          last_login_at?: string | null;
          total_tests?: number;
          total_time_typed?: number;
          total_keystrokes?: number;
          achievements?: Json;
          preferences?: Json;
        };
        Update: {
          username?: string;
          display_name?: string;
          avatar_url?: string | null;
          updated_at?: string;
          email_verified?: boolean;
          last_login_at?: string | null;
          total_tests?: number;
          total_time_typed?: number;
          total_keystrokes?: number;
          achievements?: Json;
          preferences?: Json;
        };
      };
      typing_results: {
        Row: {
          id: number;
          user_id: string;
          created_at: string;
          mode: 'time' | 'words';
          duration: number | null;
          word_count: number | null;
          word_set: string;
          wpm: number;
          raw_wpm: number;
          accuracy: number;
          consistency: number | null;
          characters_typed: number;
          words_typed: number;
          correct_chars: number;
          incorrect_chars: number;
          missed_chars: number;
          keystrokes: number;
          time_elapsed: number;
          word_history: Json | null;
        };
        Insert: Omit<Database['public']['Tables']['typing_results']['Row'], 'id' | 'created_at'> & {
          id?: number;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['typing_results']['Insert']>;
      };
      deleted_accounts: {
        Row: {
          id: string;
          original_user_id: string | null;
          email: string | null;
          username: string | null;
          deleted_at: string;
          deletion_reason: string | null;
          data_export_url: string | null;
        };
        Insert: Omit<Database['public']['Tables']['deleted_accounts']['Row'], 'id' | 'deleted_at'> & {
          id?: string;
          deleted_at?: string;
        };
        Update: Partial<Database['public']['Tables']['deleted_accounts']['Insert']>;
      };
    };
    Functions: {
      check_username_available: {
        Args: { username_input: string };
        Returns: boolean;
      };
    };
  };
}
