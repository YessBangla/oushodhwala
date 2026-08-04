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
      api_endpoints: {
        Row: {
          active: boolean
          auth_kind: string
          created_at: string
          grp: string
          headers: Json
          id: string
          last_ms: number | null
          last_ok: boolean | null
          last_status: number | null
          last_tested_at: string | null
          method: string
          name: string
          note: string
          sample_body: string
          updated_at: string
          url: string
        }
        Insert: {
          active?: boolean
          auth_kind?: string
          created_at?: string
          grp?: string
          headers?: Json
          id?: string
          last_ms?: number | null
          last_ok?: boolean | null
          last_status?: number | null
          last_tested_at?: string | null
          method?: string
          name: string
          note?: string
          sample_body?: string
          updated_at?: string
          url: string
        }
        Update: {
          active?: boolean
          auth_kind?: string
          created_at?: string
          grp?: string
          headers?: Json
          id?: string
          last_ms?: number | null
          last_ok?: boolean | null
          last_status?: number | null
          last_tested_at?: string | null
          method?: string
          name?: string
          note?: string
          sample_body?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      api_integrations: {
        Row: {
          active: boolean
          api_key: string
          api_secret: string
          base_url: string
          category: string
          config: Json
          created_at: string
          id: string
          last_ok: boolean | null
          last_status: number | null
          last_tested_at: string | null
          name: string
          note: string
          provider: string
          sender_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          api_key?: string
          api_secret?: string
          base_url?: string
          category?: string
          config?: Json
          created_at?: string
          id?: string
          last_ok?: boolean | null
          last_status?: number | null
          last_tested_at?: string | null
          name: string
          note?: string
          provider: string
          sender_id?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          api_key?: string
          api_secret?: string
          base_url?: string
          category?: string
          config?: Json
          created_at?: string
          id?: string
          last_ok?: boolean | null
          last_status?: number | null
          last_tested_at?: string | null
          name?: string
          note?: string
          provider?: string
          sender_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      api_test_logs: {
        Row: {
          actor: string | null
          created_at: string
          duration_ms: number
          endpoint_id: string | null
          error: string
          id: string
          method: string
          name: string
          ok: boolean
          response_excerpt: string
          status_code: number | null
          url: string
        }
        Insert: {
          actor?: string | null
          created_at?: string
          duration_ms?: number
          endpoint_id?: string | null
          error?: string
          id?: string
          method?: string
          name?: string
          ok?: boolean
          response_excerpt?: string
          status_code?: number | null
          url?: string
        }
        Update: {
          actor?: string | null
          created_at?: string
          duration_ms?: number
          endpoint_id?: string | null
          error?: string
          id?: string
          method?: string
          name?: string
          ok?: boolean
          response_excerpt?: string
          status_code?: number | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_test_logs_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "api_endpoints"
            referencedColumns: ["id"]
          },
        ]
      }
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
      appointment_reminders: {
        Row: {
          appointment_id: string
          body: string
          channel: string
          created_at: string
          id: string
          sent_at: string | null
          status: string
          target: string
          user_id: string
        }
        Insert: {
          appointment_id: string
          body?: string
          channel?: string
          created_at?: string
          id?: string
          sent_at?: string | null
          status?: string
          target?: string
          user_id: string
        }
        Update: {
          appointment_id?: string
          body?: string
          channel?: string
          created_at?: string
          id?: string
          sent_at?: string | null
          status?: string
          target?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_reminders_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          cancel_reason: string
          cancelled_at: string | null
          created_at: string
          doctor_id: string
          doctor_name: string
          doctor_spec: string
          fee: number
          id: string
          invoice_no: string
          join_url: string
          mode: string
          note: string
          patient_name: string
          payment_method: string
          payment_ref: string
          payment_status: string
          phone: string
          refund_amount: number
          refund_status: string
          reminder_sent_at: string | null
          scheduled_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_reason?: string
          cancelled_at?: string | null
          created_at?: string
          doctor_id: string
          doctor_name?: string
          doctor_spec?: string
          fee?: number
          id?: string
          invoice_no: string
          join_url?: string
          mode?: string
          note?: string
          patient_name?: string
          payment_method?: string
          payment_ref?: string
          payment_status?: string
          phone?: string
          refund_amount?: number
          refund_status?: string
          reminder_sent_at?: string | null
          scheduled_at: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_reason?: string
          cancelled_at?: string | null
          created_at?: string
          doctor_id?: string
          doctor_name?: string
          doctor_spec?: string
          fee?: number
          id?: string
          invoice_no?: string
          join_url?: string
          mode?: string
          note?: string
          patient_name?: string
          payment_method?: string
          payment_ref?: string
          payment_status?: string
          phone?: string
          refund_amount?: number
          refund_status?: string
          reminder_sent_at?: string | null
          scheduled_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          active: boolean
          address: string
          code: string
          created_at: string
          id: string
          is_main: boolean
          name: string
          name_en: string
          phone: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          address?: string
          code: string
          created_at?: string
          id?: string
          is_main?: boolean
          name: string
          name_en?: string
          phone?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: string
          code?: string
          created_at?: string
          id?: string
          is_main?: boolean
          name?: string
          name_en?: string
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          active: boolean
          base_fee: number
          bn: string
          created_at: string
          description: string
          description_en: string
          emoji: string
          en: string
          eta: string
          eta_en: string
          home_delivery: boolean
          home_service: boolean
          kind: string
          service_route: string
          slug: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          base_fee?: number
          bn: string
          created_at?: string
          description?: string
          description_en?: string
          emoji?: string
          en: string
          eta?: string
          eta_en?: string
          home_delivery?: boolean
          home_service?: boolean
          kind?: string
          service_route?: string
          slug: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          base_fee?: number
          bn?: string
          created_at?: string
          description?: string
          description_en?: string
          emoji?: string
          en?: string
          eta?: string
          eta_en?: string
          home_delivery?: boolean
          home_service?: boolean
          kind?: string
          service_route?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      chart_accounts: {
        Row: {
          active: boolean
          code: string
          created_at: string
          kind: string
          name: string
          name_en: string
          parent_code: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          kind?: string
          name: string
          name_en?: string
          parent_code?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          kind?: string
          name?: string
          name_en?: string
          parent_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      consultation_media: {
        Row: {
          appointment_id: string
          created_at: string
          id: string
          kind: string
          name: string
          transcript: string
          url: string
          user_id: string
        }
        Insert: {
          appointment_id: string
          created_at?: string
          id?: string
          kind?: string
          name?: string
          transcript?: string
          url?: string
          user_id: string
        }
        Update: {
          appointment_id?: string
          created_at?: string
          id?: string
          kind?: string
          name?: string
          transcript?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultation_media_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      consultation_messages: {
        Row: {
          appointment_id: string
          body: string
          created_at: string
          file_name: string
          file_url: string
          id: string
          sender: string
          user_id: string
        }
        Insert: {
          appointment_id: string
          body?: string
          created_at?: string
          file_name?: string
          file_url?: string
          id?: string
          sender?: string
          user_id: string
        }
        Update: {
          appointment_id?: string
          body?: string
          created_at?: string
          file_name?: string
          file_url?: string
          id?: string
          sender?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultation_messages_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      consultation_prescriptions: {
        Row: {
          advice: string
          appointment_id: string
          created_at: string
          diagnosis: string
          doctor_name: string
          follow_up: string | null
          id: string
          items: Json
          patient_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          advice?: string
          appointment_id: string
          created_at?: string
          diagnosis?: string
          doctor_name?: string
          follow_up?: string | null
          id?: string
          items?: Json
          patient_name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          advice?: string
          appointment_id?: string
          created_at?: string
          diagnosis?: string
          doctor_name?: string
          follow_up?: string | null
          id?: string
          items?: Json
          patient_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultation_prescriptions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      deliveries: {
        Row: {
          assigned_at: string | null
          created_at: string
          delivered_at: string | null
          eta_minutes: number
          id: string
          last_lat: number | null
          last_lng: number | null
          last_seen_at: string | null
          note: string
          order_id: string
          order_no: string
          otp: string
          picked_at: string | null
          pod_at: string | null
          pod_photo_url: string
          pod_receiver_name: string
          pod_signature_url: string
          public_token: string
          rider_id: string | null
          status: string
          token_expires_at: string | null
          token_revoked: boolean
          token_scope: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          created_at?: string
          delivered_at?: string | null
          eta_minutes?: number
          id?: string
          last_lat?: number | null
          last_lng?: number | null
          last_seen_at?: string | null
          note?: string
          order_id: string
          order_no?: string
          otp?: string
          picked_at?: string | null
          pod_at?: string | null
          pod_photo_url?: string
          pod_receiver_name?: string
          pod_signature_url?: string
          public_token?: string
          rider_id?: string | null
          status?: string
          token_expires_at?: string | null
          token_revoked?: boolean
          token_scope?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          created_at?: string
          delivered_at?: string | null
          eta_minutes?: number
          id?: string
          last_lat?: number | null
          last_lng?: number | null
          last_seen_at?: string | null
          note?: string
          order_id?: string
          order_no?: string
          otp?: string
          picked_at?: string | null
          pod_at?: string | null
          pod_photo_url?: string
          pod_receiver_name?: string
          pod_signature_url?: string
          public_token?: string
          rider_id?: string | null
          status?: string
          token_expires_at?: string | null
          token_revoked?: boolean
          token_scope?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "riders"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_events: {
        Row: {
          actor: string
          created_at: string
          delivery_id: string
          id: string
          lat: number | null
          lng: number | null
          note: string
          status: string
        }
        Insert: {
          actor?: string
          created_at?: string
          delivery_id: string
          id?: string
          lat?: number | null
          lng?: number | null
          note?: string
          status: string
        }
        Update: {
          actor?: string
          created_at?: string
          delivery_id?: string
          id?: string
          lat?: number | null
          lng?: number | null
          note?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_events_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_notifications: {
        Row: {
          body: string
          channel: string
          created_at: string
          delivery_id: string
          id: string
          order_no: string
          sent_at: string | null
          status: string
          status_key: string
          target: string
          user_id: string
        }
        Insert: {
          body?: string
          channel: string
          created_at?: string
          delivery_id: string
          id?: string
          order_no?: string
          sent_at?: string | null
          status?: string
          status_key?: string
          target?: string
          user_id: string
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string
          delivery_id?: string
          id?: string
          order_no?: string
          sent_at?: string | null
          status?: string
          status_key?: string
          target?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_notifications_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_zones: {
        Row: {
          active: boolean
          created_at: string
          district: string
          eta_minutes: number
          express_fee: number
          fee: number
          free_above: number
          id: string
          min_order: number
          name: string
          name_en: string
          sort_order: number
          thana: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          district?: string
          eta_minutes?: number
          express_fee?: number
          fee?: number
          free_above?: number
          id?: string
          min_order?: number
          name: string
          name_en?: string
          sort_order?: number
          thana?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          district?: string
          eta_minutes?: number
          express_fee?: number
          fee?: number
          free_above?: number
          id?: string
          min_order?: number
          name?: string
          name_en?: string
          sort_order?: number
          thana?: string
          updated_at?: string
        }
        Relationships: []
      }
      diagnostic_bookings: {
        Row: {
          address: string
          area: string
          booking_no: string
          city_zone: string
          collection_fee: number
          collector_name: string
          collector_phone: string
          created_at: string
          discount: number
          district: string
          id: string
          lat: number | null
          lng: number | null
          note: string
          patient_name: string
          payment_method: string
          payment_status: string
          phone: string
          report_url: string
          scheduled_date: string
          slot: string
          status: string
          subtotal: number
          tests: Json
          thana: string
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string
          area?: string
          booking_no: string
          city_zone?: string
          collection_fee?: number
          collector_name?: string
          collector_phone?: string
          created_at?: string
          discount?: number
          district?: string
          id?: string
          lat?: number | null
          lng?: number | null
          note?: string
          patient_name?: string
          payment_method?: string
          payment_status?: string
          phone?: string
          report_url?: string
          scheduled_date: string
          slot?: string
          status?: string
          subtotal?: number
          tests?: Json
          thana?: string
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          area?: string
          booking_no?: string
          city_zone?: string
          collection_fee?: number
          collector_name?: string
          collector_phone?: string
          created_at?: string
          discount?: number
          district?: string
          id?: string
          lat?: number | null
          lng?: number | null
          note?: string
          patient_name?: string
          payment_method?: string
          payment_status?: string
          phone?: string
          report_url?: string
          scheduled_date?: string
          slot?: string
          status?: string
          subtotal?: number
          tests?: Json
          thana?: string
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      doctor_blackouts: {
        Row: {
          created_at: string
          day: string
          doctor_id: string
          id: string
          reason: string
        }
        Insert: {
          created_at?: string
          day: string
          doctor_id: string
          id?: string
          reason?: string
        }
        Update: {
          created_at?: string
          day?: string
          doctor_id?: string
          id?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctor_blackouts_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_reviews: {
        Row: {
          appointment_id: string
          comment: string
          created_at: string
          doctor_id: string
          id: string
          patient_name: string
          rating: number
          user_id: string
        }
        Insert: {
          appointment_id: string
          comment?: string
          created_at?: string
          doctor_id: string
          id?: string
          patient_name?: string
          rating?: number
          user_id: string
        }
        Update: {
          appointment_id?: string
          comment?: string
          created_at?: string
          doctor_id?: string
          id?: string
          patient_name?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctor_reviews_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_reviews_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
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
          online: boolean
          phone: string
          photo_url: string
          slot_minutes: number
          sort_order: number
          spec: string
          updated_at: string
          video_url: string
          whatsapp: string
          work_days: number[]
          work_end: string
          work_start: string
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
          online?: boolean
          phone?: string
          photo_url?: string
          slot_minutes?: number
          sort_order?: number
          spec?: string
          updated_at?: string
          video_url?: string
          whatsapp?: string
          work_days?: number[]
          work_end?: string
          work_start?: string
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
          online?: boolean
          phone?: string
          photo_url?: string
          slot_minutes?: number
          sort_order?: number
          spec?: string
          updated_at?: string
          video_url?: string
          whatsapp?: string
          work_days?: number[]
          work_end?: string
          work_start?: string
        }
        Relationships: []
      }
      erp_audit_log: {
        Row: {
          action: string
          actor: string | null
          changes: Json
          created_at: string
          id: string
          label: string
          record_id: string
          table_name: string
        }
        Insert: {
          action: string
          actor?: string | null
          changes?: Json
          created_at?: string
          id?: string
          label?: string
          record_id?: string
          table_name: string
        }
        Update: {
          action?: string
          actor?: string | null
          changes?: Json
          created_at?: string
          id?: string
          label?: string
          record_id?: string
          table_name?: string
        }
        Relationships: []
      }
      error_logs: {
        Row: {
          created_at: string
          id: string
          message: string
          path: string
          severity: string
          source: string
          stack: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          path?: string
          severity?: string
          source?: string
          stack?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          path?: string
          severity?: string
          source?: string
          stack?: string
          user_id?: string | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          branch_id: string | null
          category: string
          created_at: string
          created_by: string | null
          id: string
          method: string
          note: string
          ref: string
          spent_on: string
          title: string
          updated_at: string
        }
        Insert: {
          amount?: number
          branch_id?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          method?: string
          note?: string
          ref?: string
          spent_on?: string
          title?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          branch_id?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          method?: string
          note?: string
          ref?: string
          spent_on?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      generic_info: {
        Row: {
          contraindications: string
          contraindications_en: string
          created_at: string
          dosage: string
          dosage_en: string
          id: string
          indications: string
          indications_en: string
          interaction: string
          interaction_en: string
          key: string
          name: string
          overdose: string
          overdose_en: string
          pharmacology: string
          pharmacology_en: string
          precautions: string
          precautions_en: string
          pregnancy: string
          pregnancy_en: string
          side_effects: string
          side_effects_en: string
          slug: string
          special_populations: string
          special_populations_en: string
          storage: string
          storage_en: string
          therapeutic_class: string
          therapeutic_class_en: string
          updated_at: string
        }
        Insert: {
          contraindications?: string
          contraindications_en?: string
          created_at?: string
          dosage?: string
          dosage_en?: string
          id?: string
          indications?: string
          indications_en?: string
          interaction?: string
          interaction_en?: string
          key: string
          name?: string
          overdose?: string
          overdose_en?: string
          pharmacology?: string
          pharmacology_en?: string
          precautions?: string
          precautions_en?: string
          pregnancy?: string
          pregnancy_en?: string
          side_effects?: string
          side_effects_en?: string
          slug?: string
          special_populations?: string
          special_populations_en?: string
          storage?: string
          storage_en?: string
          therapeutic_class?: string
          therapeutic_class_en?: string
          updated_at?: string
        }
        Update: {
          contraindications?: string
          contraindications_en?: string
          created_at?: string
          dosage?: string
          dosage_en?: string
          id?: string
          indications?: string
          indications_en?: string
          interaction?: string
          interaction_en?: string
          key?: string
          name?: string
          overdose?: string
          overdose_en?: string
          pharmacology?: string
          pharmacology_en?: string
          precautions?: string
          precautions_en?: string
          pregnancy?: string
          pregnancy_en?: string
          side_effects?: string
          side_effects_en?: string
          slug?: string
          special_populations?: string
          special_populations_en?: string
          storage?: string
          storage_en?: string
          therapeutic_class?: string
          therapeutic_class_en?: string
          updated_at?: string
        }
        Relationships: []
      }
      image_audit_log: {
        Row: {
          action: string
          actor: string | null
          created_at: string
          field: string
          from_url: string
          id: string
          note: string
          product_id: string
          product_name: string
          revision_id: string | null
          to_url: string
        }
        Insert: {
          action: string
          actor?: string | null
          created_at?: string
          field?: string
          from_url?: string
          id?: string
          note?: string
          product_id: string
          product_name?: string
          revision_id?: string | null
          to_url?: string
        }
        Update: {
          action?: string
          actor?: string | null
          created_at?: string
          field?: string
          from_url?: string
          id?: string
          note?: string
          product_id?: string
          product_name?: string
          revision_id?: string | null
          to_url?: string
        }
        Relationships: []
      }
      image_import_failures: {
        Row: {
          attempts: number
          created_at: string
          id: string
          product_id: string
          product_name: string
          reason: string
          resolved: boolean
          run_id: string | null
          source: string
          updated_at: string
          url: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          id?: string
          product_id: string
          product_name?: string
          reason?: string
          resolved?: boolean
          run_id?: string | null
          source?: string
          updated_at?: string
          url?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          id?: string
          product_id?: string
          product_name?: string
          reason?: string
          resolved?: boolean
          run_id?: string | null
          source?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "image_import_failures_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "image_import_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      image_import_runs: {
        Row: {
          created_at: string
          fail_count: number
          finished_at: string | null
          id: string
          mode: string
          note: string
          ok_count: number
          skipped_count: number
          source: string
          status: string
          total: number
        }
        Insert: {
          created_at?: string
          fail_count?: number
          finished_at?: string | null
          id?: string
          mode?: string
          note?: string
          ok_count?: number
          skipped_count?: number
          source?: string
          status?: string
          total?: number
        }
        Update: {
          created_at?: string
          fail_count?: number
          finished_at?: string | null
          id?: string
          mode?: string
          note?: string
          ok_count?: number
          skipped_count?: number
          source?: string
          status?: string
          total?: number
        }
        Relationships: []
      }
      image_revisions: {
        Row: {
          after_url: string
          before_url: string
          created_at: string
          field: string
          id: string
          method: string
          note: string
          product_id: string
          product_name: string
          reviewed_at: string | null
          reviewed_by: string | null
          score: number
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          after_url?: string
          before_url?: string
          created_at?: string
          field?: string
          id?: string
          method?: string
          note?: string
          product_id: string
          product_name?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          score?: number
          source?: string
          status?: string
          updated_at?: string
        }
        Update: {
          after_url?: string
          before_url?: string
          created_at?: string
          field?: string
          id?: string
          method?: string
          note?: string
          product_id?: string
          product_name?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          score?: number
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      journal_entries: {
        Row: {
          created_at: string
          created_by: string | null
          entry_date: string
          entry_no: string
          id: string
          memo: string
          ref: string
          source: string
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          entry_date?: string
          entry_no: string
          id?: string
          memo?: string
          ref?: string
          source?: string
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          entry_date?: string
          entry_no?: string
          id?: string
          memo?: string
          ref?: string
          source?: string
          total?: number
          updated_at?: string
        }
        Relationships: []
      }
      journal_lines: {
        Row: {
          account_code: string
          account_name: string
          created_at: string
          credit: number
          debit: number
          entry_id: string
          id: string
          note: string
          party: string
        }
        Insert: {
          account_code: string
          account_name?: string
          created_at?: string
          credit?: number
          debit?: number
          entry_id: string
          id?: string
          note?: string
          party?: string
        }
        Update: {
          account_code?: string
          account_name?: string
          created_at?: string
          credit?: number
          debit?: number
          entry_id?: string
          id?: string
          note?: string
          party?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_lines_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
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
      loyalty_accounts: {
        Row: {
          balance: number
          created_at: string
          points_earned: number
          points_spent: number
          tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          points_earned?: number
          points_spent?: number
          tier?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          points_earned?: number
          points_spent?: number
          tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      loyalty_transactions: {
        Row: {
          created_at: string
          id: string
          kind: string
          order_no: string
          points: number
          reason: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          order_no?: string
          points: number
          reason?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          order_no?: string
          points?: number
          reason?: string
          user_id?: string
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
      order_returns: {
        Row: {
          admin_note: string | null
          created_at: string
          details: string | null
          id: string
          order_id: string | null
          order_no: string
          photo_urls: string[]
          reason: string
          refund_amount: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          details?: string | null
          id?: string
          order_id?: string | null
          order_no: string
          photo_urls?: string[]
          reason: string
          refund_amount?: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          details?: string | null
          id?: string
          order_id?: string | null
          order_no?: string
          photo_urls?: string[]
          reason?: string
          refund_amount?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_returns_order_id_fkey"
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
          area: string
          city_zone: string
          created_at: string
          customer_name: string
          delivery_fee: number
          discount: number
          district: string
          id: string
          lat: number | null
          lng: number | null
          order_no: string
          payment_method: string
          payment_ref: string
          payment_status: string
          phone: string
          slot: string
          status: string
          subtotal: number
          thana: string
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string
          area?: string
          city_zone?: string
          created_at?: string
          customer_name?: string
          delivery_fee?: number
          discount?: number
          district?: string
          id?: string
          lat?: number | null
          lng?: number | null
          order_no: string
          payment_method?: string
          payment_ref?: string
          payment_status?: string
          phone?: string
          slot?: string
          status?: string
          subtotal?: number
          thana?: string
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          area?: string
          city_zone?: string
          created_at?: string
          customer_name?: string
          delivery_fee?: number
          discount?: number
          district?: string
          id?: string
          lat?: number | null
          lng?: number | null
          order_no?: string
          payment_method?: string
          payment_ref?: string
          payment_status?: string
          phone?: string
          slot?: string
          status?: string
          subtotal?: number
          thana?: string
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pos_sale_items: {
        Row: {
          id: string
          price: number
          product_id: string
          product_name: string
          qty: number
          sale_id: string
        }
        Insert: {
          id?: string
          price?: number
          product_id: string
          product_name?: string
          qty?: number
          sale_id: string
        }
        Update: {
          id?: string
          price?: number
          product_id?: string
          product_name?: string
          qty?: number
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pos_sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "pos_sales"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_sales: {
        Row: {
          branch_id: string | null
          created_at: string
          created_by: string | null
          customer_name: string
          discount: number
          due: number
          id: string
          invoice_no: string
          method: string
          note: string
          paid: number
          phone: string
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_name?: string
          discount?: number
          due?: number
          id?: string
          invoice_no: string
          method?: string
          note?: string
          paid?: number
          phone?: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_name?: string
          discount?: number
          due?: number
          id?: string
          invoice_no?: string
          method?: string
          note?: string
          paid?: number
          phone?: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pos_sales_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      prescription_audit: {
        Row: {
          action: string
          changes: Json
          created_at: string
          id: string
          prescription_id: string
          snapshot: Json
          user_id: string
          version: number
        }
        Insert: {
          action?: string
          changes?: Json
          created_at?: string
          id?: string
          prescription_id: string
          snapshot?: Json
          user_id: string
          version?: number
        }
        Update: {
          action?: string
          changes?: Json
          created_at?: string
          id?: string
          prescription_id?: string
          snapshot?: Json
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "prescription_audit_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      prescription_shares: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          prescription_id: string
          revoked: boolean
          scopes: Json
          token: string
          user_id: string
          views: number
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          prescription_id: string
          revoked?: boolean
          scopes?: Json
          token: string
          user_id: string
          views?: number
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          prescription_id?: string
          revoked?: boolean
          scopes?: Json
          token?: string
          user_id?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "prescription_shares_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      prescriptions: {
        Row: {
          admin_note: string
          created_at: string
          file_urls: string[]
          id: string
          note: string
          parse_note: string
          parsed: Json
          parsed_at: string | null
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
          parse_note?: string
          parsed?: Json
          parsed_at?: string | null
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
          parse_note?: string
          parsed?: Json
          parsed_at?: string | null
          phone?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      product_image_audit: {
        Row: {
          box_url: string
          checked_at: string
          http_status: number
          medicine_url: string
          note: string
          product_id: string
          product_name: string
          source: string
          status: string
        }
        Insert: {
          box_url?: string
          checked_at?: string
          http_status?: number
          medicine_url?: string
          note?: string
          product_id: string
          product_name?: string
          source?: string
          status?: string
        }
        Update: {
          box_url?: string
          checked_at?: string
          http_status?: number
          medicine_url?: string
          note?: string
          product_id?: string
          product_name?: string
          source?: string
          status?: string
        }
        Relationships: []
      }
      product_image_map: {
        Row: {
          created_at: string
          id: string
          medicine_url: string
          product_id: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          medicine_url?: string
          product_id: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          medicine_url?: string
          product_id?: string
          url?: string
        }
        Relationships: []
      }
      product_reviews: {
        Row: {
          author_name: string | null
          comment: string | null
          created_at: string
          id: string
          product_id: string
          rating: number
          status: string
          updated_at: string
          user_id: string
          verified: boolean
        }
        Insert: {
          author_name?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          product_id: string
          rating: number
          status?: string
          updated_at?: string
          user_id: string
          verified?: boolean
        }
        Update: {
          author_name?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          product_id?: string
          rating?: number
          status?: string
          updated_at?: string
          user_id?: string
          verified?: boolean
        }
        Relationships: []
      }
      products: {
        Row: {
          active: boolean
          base_name: string
          brand: string
          category: string
          contraindications: string
          contraindications_en: string
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
          precautions: string
          precautions_en: string
          pregnancy: string
          pregnancy_en: string
          price: number
          rating: number
          reviews: number
          rx: boolean
          side_effects: string
          side_effects_en: string
          stock: number
          storage: string
          storage_en: string
          strength: string
          therapeutic_class: string
          therapeutic_class_en: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          base_name?: string
          brand?: string
          category?: string
          contraindications?: string
          contraindications_en?: string
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
          precautions?: string
          precautions_en?: string
          pregnancy?: string
          pregnancy_en?: string
          price?: number
          rating?: number
          reviews?: number
          rx?: boolean
          side_effects?: string
          side_effects_en?: string
          stock?: number
          storage?: string
          storage_en?: string
          strength?: string
          therapeutic_class?: string
          therapeutic_class_en?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          base_name?: string
          brand?: string
          category?: string
          contraindications?: string
          contraindications_en?: string
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
          precautions?: string
          precautions_en?: string
          pregnancy?: string
          pregnancy_en?: string
          price?: number
          rating?: number
          reviews?: number
          rx?: boolean
          side_effects?: string
          side_effects_en?: string
          stock?: number
          storage?: string
          storage_en?: string
          strength?: string
          therapeutic_class?: string
          therapeutic_class_en?: string
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
      purchase_order_items: {
        Row: {
          batch_no: string
          cost: number
          expiry: string | null
          id: string
          po_id: string
          product_id: string
          product_name: string
          qty: number
          received_qty: number
        }
        Insert: {
          batch_no?: string
          cost?: number
          expiry?: string | null
          id?: string
          po_id: string
          product_id: string
          product_name?: string
          qty?: number
          received_qty?: number
        }
        Update: {
          batch_no?: string
          cost?: number
          expiry?: string | null
          id?: string
          po_id?: string
          product_id?: string
          product_name?: string
          qty?: number
          received_qty?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string
          created_by: string | null
          discount: number
          expected_at: string | null
          id: string
          note: string
          po_no: string
          received_at: string | null
          status: string
          subtotal: number
          supplier_id: string
          supplier_name: string
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          discount?: number
          expected_at?: string | null
          id?: string
          note?: string
          po_no: string
          received_at?: string | null
          status?: string
          subtotal?: number
          supplier_id: string
          supplier_name?: string
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          discount?: number
          expected_at?: string | null
          id?: string
          note?: string
          po_no?: string
          received_at?: string | null
          status?: string
          subtotal?: number
          supplier_id?: string
          supplier_name?: string
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      refill_reminders: {
        Row: {
          active: boolean
          created_at: string
          every_days: number
          id: string
          last_notified_at: string | null
          next_at: string
          product_id: string
          product_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          every_days?: number
          id?: string
          last_notified_at?: string | null
          next_at?: string
          product_id: string
          product_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          every_days?: number
          id?: string
          last_notified_at?: string | null
          next_at?: string
          product_id?: string
          product_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      riders: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          phone: string
          updated_at: string
          user_id: string | null
          vehicle: string
          zone: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          phone?: string
          updated_at?: string
          user_id?: string | null
          vehicle?: string
          zone?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          phone?: string
          updated_at?: string
          user_id?: string | null
          vehicle?: string
          zone?: string
        }
        Relationships: []
      }
      service_requests: {
        Row: {
          address: string
          admin_note: string
          area: string
          assignee_name: string
          assignee_phone: string
          city_zone: string
          created_at: string
          district: string
          duration: string
          fee: number
          id: string
          lat: number | null
          lng: number | null
          note: string
          patient_name: string
          payment_method: string
          payment_status: string
          phone: string
          request_no: string
          scheduled_date: string
          service_name: string
          service_slug: string
          slot: string
          status: string
          thana: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string
          admin_note?: string
          area?: string
          assignee_name?: string
          assignee_phone?: string
          city_zone?: string
          created_at?: string
          district?: string
          duration?: string
          fee?: number
          id?: string
          lat?: number | null
          lng?: number | null
          note?: string
          patient_name?: string
          payment_method?: string
          payment_status?: string
          phone?: string
          request_no: string
          scheduled_date: string
          service_name: string
          service_slug: string
          slot?: string
          status?: string
          thana?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          admin_note?: string
          area?: string
          assignee_name?: string
          assignee_phone?: string
          city_zone?: string
          created_at?: string
          district?: string
          duration?: string
          fee?: number
          id?: string
          lat?: number | null
          lng?: number | null
          note?: string
          patient_name?: string
          payment_method?: string
          payment_status?: string
          phone?: string
          request_no?: string
          scheduled_date?: string
          service_name?: string
          service_slug?: string
          slot?: string
          status?: string
          thana?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      stock_adjustment_items: {
        Row: {
          adj_id: string
          after_qty: number
          before_qty: number
          change: number
          id: string
          note: string
          product_id: string
          product_name: string
        }
        Insert: {
          adj_id: string
          after_qty?: number
          before_qty?: number
          change?: number
          id?: string
          note?: string
          product_id: string
          product_name?: string
        }
        Update: {
          adj_id?: string
          after_qty?: number
          before_qty?: number
          change?: number
          id?: string
          note?: string
          product_id?: string
          product_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_adjustment_items_adj_id_fkey"
            columns: ["adj_id"]
            isOneToOne: false
            referencedRelation: "stock_adjustments"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_adjustments: {
        Row: {
          adj_no: string
          branch_id: string | null
          created_at: string
          created_by: string | null
          id: string
          note: string
          reason: string
          status: string
          updated_at: string
        }
        Insert: {
          adj_no: string
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string
          reason?: string
          status?: string
          updated_at?: string
        }
        Update: {
          adj_no?: string
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string
          reason?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_adjustments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_alerts: {
        Row: {
          created_at: string
          detail: string
          id: string
          kind: string
          product_id: string
          product_name: string
          ref: string
        }
        Insert: {
          created_at?: string
          detail?: string
          id?: string
          kind: string
          product_id?: string
          product_name?: string
          ref: string
        }
        Update: {
          created_at?: string
          detail?: string
          id?: string
          kind?: string
          product_id?: string
          product_name?: string
          ref?: string
        }
        Relationships: []
      }
      stock_batches: {
        Row: {
          batch_no: string
          cost: number
          created_at: string
          expiry: string | null
          id: string
          po_id: string | null
          product_id: string
          product_name: string
          qty: number
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          batch_no?: string
          cost?: number
          created_at?: string
          expiry?: string | null
          id?: string
          po_id?: string | null
          product_id: string
          product_name?: string
          qty?: number
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          batch_no?: string
          cost?: number
          created_at?: string
          expiry?: string | null
          id?: string
          po_id?: string | null
          product_id?: string
          product_name?: string
          qty?: number
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_batches_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_batches_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_count_items: {
        Row: {
          count_id: string
          counted_qty: number
          id: string
          note: string
          product_id: string
          product_name: string
          system_qty: number
        }
        Insert: {
          count_id: string
          counted_qty?: number
          id?: string
          note?: string
          product_id: string
          product_name?: string
          system_qty?: number
        }
        Update: {
          count_id?: string
          counted_qty?: number
          id?: string
          note?: string
          product_id?: string
          product_name?: string
          system_qty?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_count_items_count_id_fkey"
            columns: ["count_id"]
            isOneToOne: false
            referencedRelation: "stock_counts"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_counts: {
        Row: {
          applied_at: string | null
          branch_id: string | null
          count_no: string
          created_at: string
          created_by: string | null
          id: string
          note: string
          status: string
          updated_at: string
        }
        Insert: {
          applied_at?: string | null
          branch_id?: string | null
          count_no: string
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string
          status?: string
          updated_at?: string
        }
        Update: {
          applied_at?: string | null
          branch_id?: string | null
          count_no?: string
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_counts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          actor: string | null
          balance: number
          change: number
          created_at: string
          id: string
          kind: string
          note: string
          product_id: string
          product_name: string
          ref: string
        }
        Insert: {
          actor?: string | null
          balance?: number
          change: number
          created_at?: string
          id?: string
          kind?: string
          note?: string
          product_id: string
          product_name?: string
          ref?: string
        }
        Update: {
          actor?: string | null
          balance?: number
          change?: number
          created_at?: string
          id?: string
          kind?: string
          note?: string
          product_id?: string
          product_name?: string
          ref?: string
        }
        Relationships: []
      }
      stock_transfer_items: {
        Row: {
          id: string
          product_id: string
          product_name: string
          qty: number
          transfer_id: string
        }
        Insert: {
          id?: string
          product_id: string
          product_name?: string
          qty?: number
          transfer_id: string
        }
        Update: {
          id?: string
          product_id?: string
          product_name?: string
          qty?: number
          transfer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_transfer_items_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "stock_transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transfers: {
        Row: {
          created_at: string
          created_by: string | null
          from_branch_id: string | null
          from_branch_name: string
          id: string
          note: string
          received_at: string | null
          sent_at: string | null
          status: string
          to_branch_id: string | null
          to_branch_name: string
          transfer_no: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          from_branch_id?: string | null
          from_branch_name?: string
          id?: string
          note?: string
          received_at?: string | null
          sent_at?: string | null
          status?: string
          to_branch_id?: string | null
          to_branch_name?: string
          transfer_no: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          from_branch_id?: string | null
          from_branch_name?: string
          id?: string
          note?: string
          received_at?: string | null
          sent_at?: string | null
          status?: string
          to_branch_id?: string | null
          to_branch_name?: string
          transfer_no?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_transfers_from_branch_id_fkey"
            columns: ["from_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_to_branch_id_fkey"
            columns: ["to_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          active: boolean
          address: string
          contact_person: string
          created_at: string
          email: string
          id: string
          name: string
          payment_terms: string
          phone: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          address?: string
          contact_person?: string
          created_at?: string
          email?: string
          id?: string
          name: string
          payment_terms?: string
          phone?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: string
          contact_person?: string
          created_at?: string
          email?: string
          id?: string
          name?: string
          payment_terms?: string
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      support_conversations: {
        Row: {
          agent_active: boolean
          agent_id: string | null
          agent_last_seen: string | null
          agent_name: string
          created_at: string
          id: string
          last_message_at: string
          status: string
          title: string
          unread_for_agent: number
          unread_for_user: number
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_active?: boolean
          agent_id?: string | null
          agent_last_seen?: string | null
          agent_name?: string
          created_at?: string
          id?: string
          last_message_at?: string
          status?: string
          title?: string
          unread_for_agent?: number
          unread_for_user?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_active?: boolean
          agent_id?: string | null
          agent_last_seen?: string | null
          agent_name?: string
          created_at?: string
          id?: string
          last_message_at?: string
          status?: string
          title?: string
          unread_for_agent?: number
          unread_for_user?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          agent_name: string
          body: string
          conversation_id: string
          created_at: string
          id: string
          sender: string
          user_id: string
        }
        Insert: {
          agent_name?: string
          body?: string
          conversation_id: string
          created_at?: string
          id?: string
          sender: string
          user_id: string
        }
        Update: {
          agent_name?: string
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "support_conversations"
            referencedColumns: ["id"]
          },
        ]
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
      admin_adjust_loyalty: {
        Args: { _points: number; _reason: string; _user_id: string }
        Returns: {
          balance: number
          created_at: string
          points_earned: number
          points_spent: number
          tier: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "loyalty_accounts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_adjust_stock: {
        Args: { _change: number; _product_id: string; _reason: string }
        Returns: number
      }
      admin_assign_delivery: {
        Args: { _eta?: number; _order_id: string; _rider_id: string }
        Returns: {
          assigned_at: string | null
          created_at: string
          delivered_at: string | null
          eta_minutes: number
          id: string
          last_lat: number | null
          last_lng: number | null
          last_seen_at: string | null
          note: string
          order_id: string
          order_no: string
          otp: string
          picked_at: string | null
          pod_at: string | null
          pod_photo_url: string
          pod_receiver_name: string
          pod_signature_url: string
          public_token: string
          rider_id: string | null
          status: string
          token_expires_at: string | null
          token_revoked: boolean
          token_scope: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "deliveries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_create_purchase_order: {
        Args: {
          _discount: number
          _expected: string
          _items: Json
          _note: string
          _supplier_id: string
        }
        Returns: {
          created_at: string
          created_by: string | null
          discount: number
          expected_at: string | null
          id: string
          note: string
          po_no: string
          received_at: string | null
          status: string
          subtotal: number
          supplier_id: string
          supplier_name: string
          total: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "purchase_orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_exists: { Args: never; Returns: boolean }
      admin_expiring_batches: {
        Args: { _days: number }
        Returns: {
          batch_no: string
          days_left: number
          expiry: string
          id: string
          product_id: string
          product_name: string
          qty: number
        }[]
      }
      admin_list_customers: {
        Args: { _limit?: number; _q?: string }
        Returns: {
          email: string
          is_admin: boolean
          joined_at: string
          name: string
          orders_count: number
          phone: string
          total_spent: number
          user_id: string
        }[]
      }
      admin_list_erp_users: {
        Args: never
        Returns: {
          is_admin: boolean
          is_erp_manager: boolean
          name: string
          phone: string
          user_id: string
        }[]
      }
      admin_list_loyalty: {
        Args: { _limit?: number }
        Returns: {
          balance: number
          name: string
          phone: string
          points_earned: number
          points_spent: number
          tier: string
          user_id: string
        }[]
      }
      admin_list_staff: {
        Args: never
        Returns: {
          email: string
          name: string
          phone: string
          roles: string[]
          user_id: string
        }[]
      }
      admin_receive_purchase_order: {
        Args: { _po_id: string }
        Returns: {
          created_at: string
          created_by: string | null
          discount: number
          expected_at: string | null
          id: string
          note: string
          po_no: string
          received_at: string | null
          status: string
          subtotal: number
          supplier_id: string
          supplier_name: string
          total: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "purchase_orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_set_delivery_eta: {
        Args: { _delivery_id: string; _eta: number }
        Returns: {
          assigned_at: string | null
          created_at: string
          delivered_at: string | null
          eta_minutes: number
          id: string
          last_lat: number | null
          last_lng: number | null
          last_seen_at: string | null
          note: string
          order_id: string
          order_no: string
          otp: string
          picked_at: string | null
          pod_at: string | null
          pod_photo_url: string
          pod_receiver_name: string
          pod_signature_url: string
          public_token: string
          rider_id: string | null
          status: string
          token_expires_at: string | null
          token_revoked: boolean
          token_scope: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "deliveries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_set_diagnostic_status: {
        Args: {
          _booking_id: string
          _collector_name?: string
          _collector_phone?: string
          _report_url?: string
          _status: string
        }
        Returns: {
          address: string
          area: string
          booking_no: string
          city_zone: string
          collection_fee: number
          collector_name: string
          collector_phone: string
          created_at: string
          discount: number
          district: string
          id: string
          lat: number | null
          lng: number | null
          note: string
          patient_name: string
          payment_method: string
          payment_status: string
          phone: string
          report_url: string
          scheduled_date: string
          slot: string
          status: string
          subtotal: number
          tests: Json
          thana: string
          total: number
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "diagnostic_bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_set_erp_manager: {
        Args: { _grant: boolean; _user_id: string }
        Returns: boolean
      }
      admin_set_order_status: {
        Args: { _note?: string; _order_id: string; _status: string }
        Returns: {
          address: string
          area: string
          city_zone: string
          created_at: string
          customer_name: string
          delivery_fee: number
          discount: number
          district: string
          id: string
          lat: number | null
          lng: number | null
          order_no: string
          payment_method: string
          payment_ref: string
          payment_status: string
          phone: string
          slot: string
          status: string
          subtotal: number
          thana: string
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
      admin_set_refund_status: {
        Args: { _appointment_id: string; _status: string }
        Returns: {
          cancel_reason: string
          cancelled_at: string | null
          created_at: string
          doctor_id: string
          doctor_name: string
          doctor_spec: string
          fee: number
          id: string
          invoice_no: string
          join_url: string
          mode: string
          note: string
          patient_name: string
          payment_method: string
          payment_ref: string
          payment_status: string
          phone: string
          refund_amount: number
          refund_status: string
          reminder_sent_at: string | null
          scheduled_at: string
          status: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "appointments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_set_role: {
        Args: {
          _grant: boolean
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      admin_set_service_status: {
        Args: {
          _admin_note?: string
          _assignee_name?: string
          _assignee_phone?: string
          _request_id: string
          _status: string
        }
        Returns: {
          address: string
          admin_note: string
          area: string
          assignee_name: string
          assignee_phone: string
          city_zone: string
          created_at: string
          district: string
          duration: string
          fee: number
          id: string
          lat: number | null
          lng: number | null
          note: string
          patient_name: string
          payment_method: string
          payment_status: string
          phone: string
          request_no: string
          scheduled_date: string
          service_name: string
          service_slug: string
          slot: string
          status: string
          thana: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "service_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_set_track_link: {
        Args: {
          _delivery_id: string
          _hours?: number
          _revoked?: boolean
          _rotate?: boolean
          _scope?: string
        }
        Returns: {
          assigned_at: string | null
          created_at: string
          delivered_at: string | null
          eta_minutes: number
          id: string
          last_lat: number | null
          last_lng: number | null
          last_seen_at: string | null
          note: string
          order_id: string
          order_no: string
          otp: string
          picked_at: string | null
          pod_at: string | null
          pod_photo_url: string
          pod_receiver_name: string
          pod_signature_url: string
          public_token: string
          rider_id: string | null
          status: string
          token_expires_at: string | null
          token_revoked: boolean
          token_scope: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "deliveries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_set_user_admin: {
        Args: { _make_admin: boolean; _user_id: string }
        Returns: boolean
      }
      admin_system_stats: { Args: never; Returns: Json }
      apply_product_image_map: { Args: never; Returns: number }
      apply_stock_adjustment: {
        Args: { _items: Json; _note: string; _reason: string }
        Returns: {
          adj_no: string
          branch_id: string | null
          created_at: string
          created_by: string | null
          id: string
          note: string
          reason: string
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "stock_adjustments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      apply_stock_count: { Args: { _count_id: string }; Returns: number }
      book_appointment: {
        Args: {
          _doctor_id: string
          _mode: string
          _note: string
          _patient_name: string
          _payment_method: string
          _payment_ref: string
          _phone: string
          _scheduled_at: string
        }
        Returns: {
          cancel_reason: string
          cancelled_at: string | null
          created_at: string
          doctor_id: string
          doctor_name: string
          doctor_spec: string
          fee: number
          id: string
          invoice_no: string
          join_url: string
          mode: string
          note: string
          patient_name: string
          payment_method: string
          payment_ref: string
          payment_status: string
          phone: string
          refund_amount: number
          refund_status: string
          reminder_sent_at: string | null
          scheduled_at: string
          status: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "appointments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      book_home_diagnostic: {
        Args: {
          _address: string
          _area: string
          _collection_fee: number
          _discount: number
          _note: string
          _patient_name: string
          _payment_method: string
          _phone: string
          _scheduled_date: string
          _slot: string
          _tests: Json
        }
        Returns: {
          address: string
          area: string
          booking_no: string
          city_zone: string
          collection_fee: number
          collector_name: string
          collector_phone: string
          created_at: string
          discount: number
          district: string
          id: string
          lat: number | null
          lng: number | null
          note: string
          patient_name: string
          payment_method: string
          payment_status: string
          phone: string
          report_url: string
          scheduled_date: string
          slot: string
          status: string
          subtotal: number
          tests: Json
          thana: string
          total: number
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "diagnostic_bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      book_home_service: {
        Args: {
          _address: string
          _area: string
          _duration: string
          _note: string
          _patient_name: string
          _payment_method: string
          _phone: string
          _scheduled_date: string
          _service_slug: string
          _slot: string
        }
        Returns: {
          address: string
          admin_note: string
          area: string
          assignee_name: string
          assignee_phone: string
          city_zone: string
          created_at: string
          district: string
          duration: string
          fee: number
          id: string
          lat: number | null
          lng: number | null
          note: string
          patient_name: string
          payment_method: string
          payment_status: string
          phone: string
          request_no: string
          scheduled_date: string
          service_name: string
          service_slug: string
          slot: string
          status: string
          thana: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "service_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cancel_appointment: {
        Args: { _appointment_id: string; _reason?: string }
        Returns: {
          cancel_reason: string
          cancelled_at: string | null
          created_at: string
          doctor_id: string
          doctor_name: string
          doctor_spec: string
          fee: number
          id: string
          invoice_no: string
          join_url: string
          mode: string
          note: string
          patient_name: string
          payment_method: string
          payment_ref: string
          payment_status: string
          phone: string
          refund_amount: number
          refund_status: string
          reminder_sent_at: string | null
          scheduled_at: string
          status: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "appointments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cancel_my_order: {
        Args: { _order_no: string; _reason?: string }
        Returns: boolean
      }
      claim_first_admin: { Args: never; Returns: boolean }
      day_book: { Args: { _day: string }; Returns: Json }
      demo_cancel_delivery: { Args: { _delivery_id: string }; Returns: boolean }
      demo_reset_deliveries: { Args: never; Returns: number }
      demo_seed_bulk: {
        Args: { _count?: number; _scenario?: string; _zone?: string }
        Returns: number
      }
      demo_seed_delivery: {
        Args: { _zone?: string }
        Returns: {
          assigned_at: string | null
          created_at: string
          delivered_at: string | null
          eta_minutes: number
          id: string
          last_lat: number | null
          last_lng: number | null
          last_seen_at: string | null
          note: string
          order_id: string
          order_no: string
          otp: string
          picked_at: string | null
          pod_at: string | null
          pod_photo_url: string
          pod_receiver_name: string
          pod_signature_url: string
          public_token: string
          rider_id: string | null
          status: string
          token_expires_at: string | null
          token_revoked: boolean
          token_scope: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "deliveries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      doctor_taken_slots: {
        Args: { _doctor_id: string; _from: string; _to: string }
        Returns: {
          scheduled_at: string
        }[]
      }
      finance_summary: { Args: { _from: string; _to: string }; Returns: Json }
      has_erp_access: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_staff_access: { Args: { _user_id: string }; Returns: boolean }
      is_rider: { Args: { _user_id: string }; Returns: boolean }
      loyalty_apply: {
        Args: {
          _kind: string
          _order_no: string
          _points: number
          _reason: string
          _user_id: string
        }
        Returns: {
          balance: number
          created_at: string
          points_earned: number
          points_spent: number
          tier: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "loyalty_accounts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      my_loyalty: {
        Args: never
        Returns: {
          balance: number
          created_at: string
          points_earned: number
          points_spent: number
          tier: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "loyalty_accounts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      my_rider: {
        Args: never
        Returns: {
          active: boolean
          created_at: string
          id: string
          name: string
          phone: string
          updated_at: string
          user_id: string | null
          vehicle: string
          zone: string
        }
        SetofOptions: {
          from: "*"
          to: "riders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      my_roles: { Args: never; Returns: string[] }
      my_support_conversation: {
        Args: never
        Returns: {
          agent_active: boolean
          agent_id: string | null
          agent_last_seen: string | null
          agent_name: string
          created_at: string
          id: string
          last_message_at: string
          status: string
          title: string
          unread_for_agent: number
          unread_for_user: number
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "support_conversations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      party_statement: {
        Args: { _from: string; _kind: string; _party_id: string; _to: string }
        Returns: Json
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
          area: string
          city_zone: string
          created_at: string
          customer_name: string
          delivery_fee: number
          discount: number
          district: string
          id: string
          lat: number | null
          lng: number | null
          order_no: string
          payment_method: string
          payment_ref: string
          payment_status: string
          phone: string
          slot: string
          status: string
          subtotal: number
          thana: string
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
      pos_create_sale: {
        Args: {
          _customer_name: string
          _discount: number
          _items: Json
          _method: string
          _note: string
          _paid: number
          _phone: string
        }
        Returns: {
          branch_id: string | null
          created_at: string
          created_by: string | null
          customer_name: string
          discount: number
          due: number
          id: string
          invoice_no: string
          method: string
          note: string
          paid: number
          phone: string
          subtotal: number
          total: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "pos_sales"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      post_journal: {
        Args: { _date: string; _lines: Json; _memo: string; _ref: string }
        Returns: {
          created_at: string
          created_by: string | null
          entry_date: string
          entry_no: string
          id: string
          memo: string
          ref: string
          source: string
          total: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "journal_entries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      public_track: { Args: { _token: string }; Returns: Json }
      queue_appointment_reminders: {
        Args: { _within_hours?: number }
        Returns: number
      }
      redeem_loyalty: {
        Args: { _points: number }
        Returns: {
          balance: number
          created_at: string
          points_earned: number
          points_spent: number
          tier: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "loyalty_accounts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rider_ping_location: {
        Args: { _delivery_id: string; _lat: number; _lng: number }
        Returns: boolean
      }
      rider_update_delivery:
        | {
            Args: {
              _delivery_id: string
              _lat?: number
              _lng?: number
              _note?: string
              _otp?: string
              _status: string
            }
            Returns: {
              assigned_at: string | null
              created_at: string
              delivered_at: string | null
              eta_minutes: number
              id: string
              last_lat: number | null
              last_lng: number | null
              last_seen_at: string | null
              note: string
              order_id: string
              order_no: string
              otp: string
              picked_at: string | null
              pod_at: string | null
              pod_photo_url: string
              pod_receiver_name: string
              pod_signature_url: string
              public_token: string
              rider_id: string | null
              status: string
              token_expires_at: string | null
              token_revoked: boolean
              token_scope: string
              updated_at: string
              user_id: string
            }
            SetofOptions: {
              from: "*"
              to: "deliveries"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: {
              _delivery_id: string
              _lat?: number
              _lng?: number
              _note?: string
              _otp?: string
              _pod_photo_url?: string
              _pod_receiver_name?: string
              _pod_signature_url?: string
              _status: string
            }
            Returns: {
              assigned_at: string | null
              created_at: string
              delivered_at: string | null
              eta_minutes: number
              id: string
              last_lat: number | null
              last_lng: number | null
              last_seen_at: string | null
              note: string
              order_id: string
              order_no: string
              otp: string
              picked_at: string | null
              pod_at: string | null
              pod_photo_url: string
              pod_receiver_name: string
              pod_signature_url: string
              public_token: string
              rider_id: string | null
              status: string
              token_expires_at: string | null
              token_revoked: boolean
              token_scope: string
              updated_at: string
              user_id: string
            }
            SetofOptions: {
              from: "*"
              to: "deliveries"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      run_stock_alerts: { Args: { _expiry_days?: number }; Returns: number }
      rx_share_hit: { Args: { _token: string }; Returns: undefined }
      rx_share_open: { Args: { _token: string }; Returns: Json }
      save_order_location: {
        Args: {
          _area?: string
          _city_zone?: string
          _district?: string
          _lat: number
          _lng: number
          _order_no: string
          _thana?: string
        }
        Returns: boolean
      }
      support_add_message: {
        Args: {
          _agent_name?: string
          _body: string
          _conv: string
          _sender: string
        }
        Returns: {
          agent_name: string
          body: string
          conversation_id: string
          created_at: string
          id: string
          sender: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "support_messages"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      support_agent_is_live: { Args: { _conv: string }; Returns: boolean }
      support_mark_read: {
        Args: { _conv: string; _side: string }
        Returns: boolean
      }
      support_set_agent: {
        Args: { _active: boolean; _agent_name?: string; _conv: string }
        Returns: {
          agent_active: boolean
          agent_id: string | null
          agent_last_seen: string | null
          agent_name: string
          created_at: string
          id: string
          last_message_at: string
          status: string
          title: string
          unread_for_agent: number
          unread_for_user: number
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "support_conversations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      transfer_set_status: {
        Args: { _status: string; _transfer_id: string }
        Returns: {
          created_at: string
          created_by: string | null
          from_branch_id: string | null
          from_branch_name: string
          id: string
          note: string
          received_at: string | null
          sent_at: string | null
          status: string
          to_branch_id: string | null
          to_branch_name: string
          transfer_no: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "stock_transfers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "user"
        | "erp_manager"
        | "super_admin"
        | "support_agent"
        | "accountant"
        | "pharmacist"
        | "rider"
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
      app_role: [
        "admin",
        "user",
        "erp_manager",
        "super_admin",
        "support_agent",
        "accountant",
        "pharmacist",
        "rider",
      ],
    },
  },
} as const
