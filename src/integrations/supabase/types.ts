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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          key: string
          label: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          label?: string
          updated_at?: string
          value?: string
        }
        Update: {
          key?: string
          label?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          active: boolean
          bn: string
          created_at: string
          emoji: string
          en: string
          slug: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          bn: string
          created_at?: string
          emoji?: string
          en: string
          slug: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          bn?: string
          created_at?: string
          emoji?: string
          en?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      doctors: {
        Row: {
          active: boolean
          created_at: string
          degree: string
          emoji: string
          exp: string
          fee: number
          id: string
          name: string
          photo_url: string
          sort_order: number
          spec: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          degree?: string
          emoji?: string
          exp?: string
          fee?: number
          id?: string
          name: string
          photo_url?: string
          sort_order?: number
          spec?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          degree?: string
          emoji?: string
          exp?: string
          fee?: number
          id?: string
          name?: string
          photo_url?: string
          sort_order?: number
          spec?: string
          updated_at?: string
        }
        Relationships: []
      }
      lab_tests: {
        Row: {
          active: boolean
          bn: string
          created_at: string
          en: string
          grp: string
          id: string
          mrp: number
          prep: string
          price: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          bn: string
          created_at?: string
          en?: string
          grp?: string
          id: string
          mrp?: number
          prep?: string
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          bn?: string
          created_at?: string
          en?: string
          grp?: string
          id?: string
          mrp?: number
          prep?: string
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      media_assets: {
        Row: {
          created_at: string
          id: string
          kind: string
          name: string
          path: string
          size: number
          tags: string[]
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          name?: string
          path?: string
          size?: number
          tags?: string[]
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          name?: string
          path?: string
          size?: number
          tags?: string[]
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          kind: string
          order_no: string
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          kind?: string
          order_no?: string
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          kind?: string
          order_no?: string
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      offers: {
        Row: {
          active: boolean
          code: string
          created_at: string
          discount_pct: number
          emoji: string
          expires_at: string | null
          id: string
          max_discount: number
          min_order: number
          subtitle: string
          title: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          discount_pct?: number
          emoji?: string
          expires_at?: string | null
          id?: string
          max_discount?: number
          min_order?: number
          subtitle?: string
          title: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          discount_pct?: number
          emoji?: string
          expires_at?: string | null
          id?: string
          max_discount?: number
          min_order?: number
          subtitle?: string
          title?: string
        }
        Relationships: []
      }
      order_events: {
        Row: {
          created_at: string
          id: string
          note: string
          order_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string
          order_id: string
          status: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string
          order_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          kind: string
          name: string
          order_id: string
          price: number
          product_id: string
          qty: number
        }
        Insert: {
          id?: string
          kind?: string
          name: string
          order_id: string
          price: number
          product_id: string
          qty: number
        }
        Update: {
          id?: string
          kind?: string
          name?: string
          order_id?: string
          price?: number
          product_id?: string
          qty?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address: string
          created_at: string
          customer_name: string
          delivery_fee: number
          discount: number
          id: string
          order_no: string
          payment_method: string
          payment_ref: string
          payment_status: string
          phone: string
          slot: string
          status: string
          subtotal: number
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string
          created_at?: string
          customer_name?: string
          delivery_fee?: number
          discount?: number
          id?: string
          order_no: string
          payment_method?: string
          payment_ref?: string
          payment_status?: string
          phone?: string
          slot?: string
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          created_at?: string
          customer_name?: string
          delivery_fee?: number
          discount?: number
          id?: string
          order_no?: string
          payment_method?: string
          payment_ref?: string
          payment_status?: string
          phone?: string
          slot?: string
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      prescriptions: {
        Row: {
          admin_note: string
          created_at: string
          file_urls: string[]
          id: string
          note: string
          phone: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string
          created_at?: string
          file_urls?: string[]
          id?: string
          note?: string
          phone?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string
          created_at?: string
          file_urls?: string[]
          id?: string
          note?: string
          phone?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          active: boolean
          brand: string
          category: string
          created_at: string
          description: string
          description_en: string
          dosage: string
          dosage_en: string
          emoji: string
          en: string
          form: string
          generic: string
          id: string
          image_url: string
          indications: string
          indications_en: string
          low_stock_threshold: number
          manufacturer: string
          medicine_image_url: string
          mrp: number
          name: string
          pack: string
          price: number
          rating: number
          reviews: number
          rx: boolean
          side_effects: string
          side_effects_en: string
          stock: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          brand?: string
          category?: string
          created_at?: string
          description?: string
          description_en?: string
          dosage?: string
          dosage_en?: string
          emoji?: string
          en?: string
          form?: string
          generic?: string
          id: string
          image_url?: string
          indications?: string
          indications_en?: string
          low_stock_threshold?: number
          manufacturer?: string
          medicine_image_url?: string
          mrp?: number
          name: string
          pack?: string
          price?: number
          rating?: number
          reviews?: number
          rx?: boolean
          side_effects?: string
          side_effects_en?: string
          stock?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          brand?: string
          category?: string
          created_at?: string
          description?: string
          description_en?: string
          dosage?: string
          dosage_en?: string
          emoji?: string
          en?: string
          form?: string
          generic?: string
          id?: string
          image_url?: string
          indications?: string
          indications_en?: string
          low_stock_threshold?: number
          manufacturer?: string
          medicine_image_url?: string
          mrp?: number
          name?: string
          pack?: string
          price?: number
          rating?: number
          reviews?: number
          rx?: boolean
          side_effects?: string
          side_effects_en?: string
          stock?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          name: string
          phone: string
        }
        Insert: {
          created_at?: string
          id: string
          name?: string
          phone?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          phone?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_exists: { Args: never; Returns: boolean }
      admin_set_order_status: {
        Args: { _note?: string; _order_id: string; _status: string }
        Returns: {
          address: string
          created_at: string
          customer_name: string
          delivery_fee: number
          discount: number
          id: string
          order_no: string
          payment_method: string
          payment_ref: string
          payment_status: string
          phone: string
          slot: string
          status: string
          subtotal: number
          total: number
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      claim_first_admin: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      place_order: {
        Args: {
          _address: string
          _customer_name: string
          _delivery_fee: number
          _discount: number
          _items: Json
          _payment_method: string
          _payment_ref: string
          _phone: string
          _slot: string
        }
        Returns: {
          address: string
          created_at: string
          customer_name: string
          delivery_fee: number
          discount: number
          id: string
          order_no: string
          payment_method: string
          payment_ref: string
          payment_status: string
          phone: string
          slot: string
          status: string
          subtotal: number
          total: number
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
