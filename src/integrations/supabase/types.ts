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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      no_trade_days: {
        Row: {
          created_at: string
          day: string
          id: string
          reason: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day: string
          id?: string
          reason: string
          user_id: string
        }
        Update: {
          created_at?: string
          day?: string
          id?: string
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          default_market: string | null
          default_risk_pct: number | null
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_market?: string | null
          default_risk_pct?: number | null
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_market?: string | null
          default_risk_pct?: number | null
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      streaks: {
        Row: {
          challenge_started_at: string | null
          current_streak: number
          last_active_day: string | null
          longest_streak: number
          updated_at: string
          user_id: string
        }
        Insert: {
          challenge_started_at?: string | null
          current_streak?: number
          last_active_day?: string | null
          longest_streak?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          challenge_started_at?: string | null
          current_streak?: number
          last_active_day?: string | null
          longest_streak?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trades: {
        Row: {
          asset: string
          closed_at: string | null
          confidence: number
          created_at: string
          direction: string
          emotion_after: string | null
          emotion_before: string
          entry_price: number
          entry_screenshot_path: string | null
          exit_price: number | null
          exit_screenshot_path: string | null
          followed_plan: boolean | null
          id: string
          market: string
          notes: string | null
          pnl: number | null
          position_size: number
          reason: string
          risk_pct: number | null
          session: string | null
          setup: string
          status: string
          stop_loss: number
          strategy: string | null
          tag: string | null
          take_profit: number
          timeframe: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          asset: string
          closed_at?: string | null
          confidence: number
          created_at?: string
          direction: string
          emotion_after?: string | null
          emotion_before: string
          entry_price: number
          entry_screenshot_path?: string | null
          exit_price?: number | null
          exit_screenshot_path?: string | null
          followed_plan?: boolean | null
          id?: string
          market: string
          notes?: string | null
          pnl?: number | null
          position_size: number
          reason: string
          risk_pct?: number | null
          session?: string | null
          setup: string
          status?: string
          stop_loss: number
          strategy?: string | null
          tag?: string | null
          take_profit: number
          timeframe?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          asset?: string
          closed_at?: string | null
          confidence?: number
          created_at?: string
          direction?: string
          emotion_after?: string | null
          emotion_before?: string
          entry_price?: number
          entry_screenshot_path?: string | null
          exit_price?: number | null
          exit_screenshot_path?: string | null
          followed_plan?: boolean | null
          id?: string
          market?: string
          notes?: string | null
          pnl?: number | null
          position_size?: number
          reason?: string
          risk_pct?: number | null
          session?: string | null
          setup?: string
          status?: string
          stop_loss?: number
          strategy?: string | null
          tag?: string | null
          take_profit?: number
          timeframe?: string | null
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
