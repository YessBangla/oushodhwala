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
          rider_id: string | null
          status: string
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
          rider_id?: string | null
          status?: string
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
          rider_id?: string | null
          status?: string
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
          rider_id: string | null
          status: string
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
      admin_exists: { Args: never; Returns: boolean }
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
      admin_set_user_admin: {
        Args: { _make_admin: boolean; _user_id: string }
        Returns: boolean
      }
      apply_product_image_map: { Args: never; Returns: number }
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
      claim_first_admin: { Args: never; Returns: boolean }
      doctor_taken_slots: {
        Args: { _doctor_id: string; _from: string; _to: string }
        Returns: {
          scheduled_at: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_rider: { Args: { _user_id: string }; Returns: boolean }
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
      queue_appointment_reminders: {
        Args: { _within_hours?: number }
        Returns: number
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
              rider_id: string | null
              status: string
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
              rider_id: string | null
              status: string
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
