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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      addons: {
        Row: {
          facility_id: string
          icon: string
          id: string
          name: string
          price: number
          requires_stock: boolean
        }
        Insert: {
          facility_id: string
          icon?: string
          id?: string
          name: string
          price?: number
          requires_stock?: boolean
        }
        Update: {
          facility_id?: string
          icon?: string
          id?: string
          name?: string
          price?: number
          requires_stock?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "addons_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_addons: {
        Row: {
          addon_id: string
          booking_id: string
          id: string
        }
        Insert: {
          addon_id: string
          booking_id: string
          id?: string
        }
        Update: {
          addon_id?: string
          booking_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_addons_addon_id_fkey"
            columns: ["addon_id"]
            isOneToOne: false
            referencedRelation: "addons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_addons_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          booking_type: string
          court_id: string
          created_at: string
          deposit_amount: number
          end_time: string
          id: string
          payment_status: string
          start_time: string
          status: string
          total_price: number
          user_email: string | null
          user_id: string | null
          user_name: string | null
          user_phone: string | null
        }
        Insert: {
          booking_type?: string
          court_id: string
          created_at?: string
          deposit_amount?: number
          end_time: string
          id?: string
          payment_status?: string
          start_time: string
          status?: string
          total_price?: number
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
          user_phone?: string | null
        }
        Update: {
          booking_type?: string
          court_id?: string
          created_at?: string
          deposit_amount?: number
          end_time?: string
          id?: string
          payment_status?: string
          start_time?: string
          status?: string
          total_price?: number
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
          user_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
        ]
      }
      buffet_products: {
        Row: {
          category: string
          created_at: string
          facility_id: string
          id: string
          image: string | null
          name: string
          price: number
          stock: number
        }
        Insert: {
          category?: string
          created_at?: string
          facility_id?: string
          id?: string
          image?: string | null
          name: string
          price?: number
          stock?: number
        }
        Update: {
          category?: string
          created_at?: string
          facility_id?: string
          id?: string
          image?: string | null
          name?: string
          price?: number
          stock?: number
        }
        Relationships: []
      }
      buffet_sale_items: {
        Row: {
          id: string
          product_id: string | null
          product_name: string
          quantity: number
          sale_id: string
          unit_price: number
        }
        Insert: {
          id?: string
          product_id?: string | null
          product_name: string
          quantity?: number
          sale_id: string
          unit_price?: number
        }
        Update: {
          id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          sale_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "buffet_sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "buffet_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buffet_sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "buffet_sales"
            referencedColumns: ["id"]
          },
        ]
      }
      buffet_sales: {
        Row: {
          created_at: string
          facility_id: string
          id: string
          total: number
        }
        Insert: {
          created_at?: string
          facility_id?: string
          id?: string
          total?: number
        }
        Update: {
          created_at?: string
          facility_id?: string
          id?: string
          total?: number
        }
        Relationships: []
      }
      courts: {
        Row: {
          created_at: string
          facility_id: string
          features: string[] | null
          id: string
          image: string | null
          name: string
          price_per_hour: number
          sport_id: string
          surface: string | null
        }
        Insert: {
          created_at?: string
          facility_id: string
          features?: string[] | null
          id?: string
          image?: string | null
          name: string
          price_per_hour?: number
          sport_id: string
          surface?: string | null
        }
        Update: {
          created_at?: string
          facility_id?: string
          features?: string[] | null
          id?: string
          image?: string | null
          name?: string
          price_per_hour?: number
          sport_id?: string
          surface?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "courts_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courts_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sports"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string | null
          expense_date: string
          facility_id: string
          id: string
        }
        Insert: {
          amount?: number
          category: string
          created_at?: string
          description?: string | null
          expense_date?: string
          facility_id?: string
          id?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string | null
          expense_date?: string
          facility_id?: string
          id?: string
        }
        Relationships: []
      }
      facilities: {
        Row: {
          close_time: string
          created_at: string
          email: string | null
          id: string
          location: string | null
          name: string
          open_time: string
          owner_id: string | null
          phone: string | null
          slug: string | null
          whatsapp: string | null
        }
        Insert: {
          close_time?: string
          created_at?: string
          email?: string | null
          id?: string
          location?: string | null
          name: string
          open_time?: string
          owner_id?: string | null
          phone?: string | null
          slug?: string | null
          whatsapp?: string | null
        }
        Update: {
          close_time?: string
          created_at?: string
          email?: string | null
          id?: string
          location?: string | null
          name?: string
          open_time?: string
          owner_id?: string | null
          phone?: string | null
          slug?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      facility_schedules: {
        Row: {
          close_time: string
          day_of_week: number
          facility_id: string
          id: string
          is_open: boolean
          open_time: string
        }
        Insert: {
          close_time?: string
          day_of_week: number
          facility_id?: string
          id?: string
          is_open?: boolean
          open_time?: string
        }
        Update: {
          close_time?: string
          day_of_week?: number
          facility_id?: string
          id?: string
          is_open?: boolean
          open_time?: string
        }
        Relationships: []
      }
      sports: {
        Row: {
          icon: string
          id: string
          name: string
        }
        Insert: {
          icon?: string
          id?: string
          name: string
        }
        Update: {
          icon?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          facility_id: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          facility_id?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          facility_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_booking: {
        Args: {
          p_addon_ids?: string[]
          p_booking_type?: string
          p_court_id: string
          p_deposit_amount: number
          p_end_time: string
          p_payment_status: string
          p_start_time: string
          p_total_price: number
          p_user_email: string
          p_user_name: string
          p_user_phone: string
        }
        Returns: string
      }
      create_facility_for_user: { Args: { p_name: string }; Returns: string }
      generate_slug: { Args: { input: string }; Returns: string }
      get_user_facility_id: { Args: { p_user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_facility_admin: {
        Args: { _facility_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "player"
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
      app_role: ["admin", "player"],
    },
  },
} as const
