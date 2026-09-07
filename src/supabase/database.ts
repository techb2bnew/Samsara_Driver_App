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
      alert_rules: {
        Row: {
          channels: Database["public"]["Enums"]["alert_channel"][]
          created_at: string
          deleted_at: string | null
          description: string | null
          event_key: string
          id: string
          is_active: boolean
          name: string
          org_id: string
          recipient_roles: string[]
          thresholds: Json
          updated_at: string
        }
        Insert: {
          channels?: Database["public"]["Enums"]["alert_channel"][]
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          event_key: string
          id?: string
          is_active?: boolean
          name: string
          org_id: string
          recipient_roles?: string[]
          thresholds?: Json
          updated_at?: string
        }
        Update: {
          channels?: Database["public"]["Enums"]["alert_channel"][]
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          event_key?: string
          id?: string
          is_active?: boolean
          name?: string
          org_id?: string
          recipient_roles?: string[]
          thresholds?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_rules_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_driver_id: string | null
          actor_label: string | null
          actor_user_id: string | null
          changes: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: unknown
          org_id: string
          summary: string | null
        }
        Insert: {
          action: string
          actor_driver_id?: string | null
          actor_label?: string | null
          actor_user_id?: string | null
          changes?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: unknown
          org_id: string
          summary?: string | null
        }
        Update: {
          action?: string
          actor_driver_id?: string | null
          actor_label?: string | null
          actor_user_id?: string | null
          changes?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: unknown
          org_id?: string
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_driver_id_fkey"
            columns: ["actor_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      course_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          completed_at: string | null
          course_id: string
          created_at: string
          deleted_at: string | null
          driver_id: string
          due_on: string | null
          id: string
          org_id: string
          safety_event_id: string | null
          score_percent: number | null
          seconds_spent: number
          started_at: string | null
          status: Database["public"]["Enums"]["assignment_status"]
          updated_at: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          completed_at?: string | null
          course_id: string
          created_at?: string
          deleted_at?: string | null
          driver_id: string
          due_on?: string | null
          id?: string
          org_id: string
          safety_event_id?: string | null
          score_percent?: number | null
          seconds_spent?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["assignment_status"]
          updated_at?: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          completed_at?: string | null
          course_id?: string
          created_at?: string
          deleted_at?: string | null
          driver_id?: string
          due_on?: string | null
          id?: string
          org_id?: string
          safety_event_id?: string | null
          score_percent?: number | null
          seconds_spent?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["assignment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_assignments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_assignments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_assignments_safety_event_id_fkey"
            columns: ["safety_event_id"]
            isOneToOne: false
            referencedRelation: "safety_events"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          assigned_fleet_id: string | null
          content_url: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          id: string
          length_minutes: number | null
          org_id: string
          status: Database["public"]["Enums"]["course_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_fleet_id?: string | null
          content_url?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          length_minutes?: number | null
          org_id: string
          status?: Database["public"]["Enums"]["course_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_fleet_id?: string | null
          content_url?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          length_minutes?: number | null
          org_id?: string
          status?: Database["public"]["Enums"]["course_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_assigned_fleet_id_fkey"
            columns: ["assigned_fleet_id"]
            isOneToOne: false
            referencedRelation: "fleets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      defects: {
        Row: {
          area: string
          corrective_action: string | null
          created_at: string
          deleted_at: string | null
          finding: string
          id: string
          org_id: string
          reported_by_driver: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: Database["public"]["Enums"]["defect_severity"]
          status: Database["public"]["Enums"]["defect_status"]
          submission_id: string | null
          updated_at: string
          vehicle_id: string
          work_order_id: string | null
        }
        Insert: {
          area: string
          corrective_action?: string | null
          created_at?: string
          deleted_at?: string | null
          finding: string
          id?: string
          org_id: string
          reported_by_driver?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["defect_severity"]
          status?: Database["public"]["Enums"]["defect_status"]
          submission_id?: string | null
          updated_at?: string
          vehicle_id: string
          work_order_id?: string | null
        }
        Update: {
          area?: string
          corrective_action?: string | null
          created_at?: string
          deleted_at?: string | null
          finding?: string
          id?: string
          org_id?: string
          reported_by_driver?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["defect_severity"]
          status?: Database["public"]["Enums"]["defect_status"]
          submission_id?: string | null
          updated_at?: string
          vehicle_id?: string
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "defects_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "defects_reported_by_driver_fkey"
            columns: ["reported_by_driver"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "defects_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "defects_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "form_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "defects_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "defects_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          category: Database["public"]["Enums"]["document_category"]
          created_at: string
          deleted_at: string | null
          doc_type: string
          driver_id: string | null
          expires_on: string | null
          id: string
          issued_on: string | null
          issuing_authority: string | null
          mime_type: string | null
          notes: string | null
          org_id: string
          reference: string | null
          route_id: string | null
          size_bytes: number | null
          stop_id: string | null
          storage_path: string | null
          title: string | null
          updated_at: string
          uploaded_by_driver: string | null
          uploaded_by_user: string | null
          vehicle_id: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["document_category"]
          created_at?: string
          deleted_at?: string | null
          doc_type: string
          driver_id?: string | null
          expires_on?: string | null
          id?: string
          issued_on?: string | null
          issuing_authority?: string | null
          mime_type?: string | null
          notes?: string | null
          org_id: string
          reference?: string | null
          route_id?: string | null
          size_bytes?: number | null
          stop_id?: string | null
          storage_path?: string | null
          title?: string | null
          updated_at?: string
          uploaded_by_driver?: string | null
          uploaded_by_user?: string | null
          vehicle_id?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["document_category"]
          created_at?: string
          deleted_at?: string | null
          doc_type?: string
          driver_id?: string | null
          expires_on?: string | null
          id?: string
          issued_on?: string | null
          issuing_authority?: string | null
          mime_type?: string | null
          notes?: string | null
          org_id?: string
          reference?: string | null
          route_id?: string | null
          size_bytes?: number | null
          stop_id?: string | null
          storage_path?: string | null
          title?: string | null
          updated_at?: string
          uploaded_by_driver?: string | null
          uploaded_by_user?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_stop_id_fkey"
            columns: ["stop_id"]
            isOneToOne: false
            referencedRelation: "route_stops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_driver_fkey"
            columns: ["uploaded_by_driver"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_user_fkey"
            columns: ["uploaded_by_user"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_devices: {
        Row: {
          app_version: string | null
          created_at: string
          device_name: string | null
          driver_id: string
          id: string
          last_seen_at: string | null
          last_sync_at: string | null
          org_id: string
          os_version: string | null
          platform: Database["public"]["Enums"]["device_platform"]
          push_token: string | null
          revoked_at: string | null
          updated_at: string
        }
        Insert: {
          app_version?: string | null
          created_at?: string
          device_name?: string | null
          driver_id: string
          id?: string
          last_seen_at?: string | null
          last_sync_at?: string | null
          org_id: string
          os_version?: string | null
          platform: Database["public"]["Enums"]["device_platform"]
          push_token?: string | null
          revoked_at?: string | null
          updated_at?: string
        }
        Update: {
          app_version?: string | null
          created_at?: string
          device_name?: string | null
          driver_id?: string
          id?: string
          last_seen_at?: string | null
          last_sync_at?: string | null
          org_id?: string
          os_version?: string | null
          platform?: Database["public"]["Enums"]["device_platform"]
          push_token?: string | null
          revoked_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_devices_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_devices_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_settings: {
        Row: {
          created_at: string
          distance_unit: string
          driver_id: string
          exemptions: Json
          locale: string
          notify_break_reminder: boolean
          notify_email: boolean
          notify_push: boolean
          org_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          distance_unit?: string
          driver_id: string
          exemptions?: Json
          locale?: string
          notify_break_reminder?: boolean
          notify_email?: boolean
          notify_push?: boolean
          org_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          distance_unit?: string
          driver_id?: string
          exemptions?: Json
          locale?: string
          notify_break_reminder?: boolean
          notify_email?: boolean
          notify_push?: boolean
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_settings_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_vehicle_assignments: {
        Row: {
          created_at: string
          driver_id: string
          ended_at: string | null
          id: string
          org_id: string
          started_at: string
          towed_vehicle_id: string | null
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          driver_id: string
          ended_at?: string | null
          id?: string
          org_id: string
          started_at?: string
          towed_vehicle_id?: string | null
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          driver_id?: string
          ended_at?: string | null
          id?: string
          org_id?: string
          started_at?: string
          towed_vehicle_id?: string | null
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_vehicle_assignments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_vehicle_assignments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_vehicle_assignments_towed_vehicle_id_fkey"
            columns: ["towed_vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_vehicle_assignments_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          created_at: string
          deleted_at: string | null
          email: string | null
          employee_number: string | null
          first_name: string
          fleet_id: string | null
          hired_on: string | null
          id: string
          last_name: string
          notes: string | null
          org_id: string
          phone: string | null
          status: Database["public"]["Enums"]["driver_status"]
          terminated_on: string | null
          timezone: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          employee_number?: string | null
          first_name: string
          fleet_id?: string | null
          hired_on?: string | null
          id?: string
          last_name: string
          notes?: string | null
          org_id: string
          phone?: string | null
          status?: Database["public"]["Enums"]["driver_status"]
          terminated_on?: string | null
          timezone?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          employee_number?: string | null
          first_name?: string
          fleet_id?: string | null
          hired_on?: string | null
          id?: string
          last_name?: string
          notes?: string | null
          org_id?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["driver_status"]
          terminated_on?: string | null
          timezone?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drivers_fleet_id_fkey"
            columns: ["fleet_id"]
            isOneToOne: false
            referencedRelation: "fleets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drivers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drivers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      duty_status_events: {
        Row: {
          annotation: string | null
          created_at: string
          driver_id: string
          edit_of_id: string | null
          edit_reason: string | null
          edit_status: Database["public"]["Enums"]["duty_edit_status"] | null
          engine_hours: number | null
          id: string
          latitude: number | null
          location_name: string | null
          longitude: number | null
          odometer_km: number | null
          org_id: string
          proposed_by: string | null
          reviewed_at: string | null
          source: Database["public"]["Enums"]["duty_event_source"]
          started_at: string
          status: Database["public"]["Enums"]["duty_status"]
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          annotation?: string | null
          created_at?: string
          driver_id: string
          edit_of_id?: string | null
          edit_reason?: string | null
          edit_status?: Database["public"]["Enums"]["duty_edit_status"] | null
          engine_hours?: number | null
          id?: string
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          odometer_km?: number | null
          org_id: string
          proposed_by?: string | null
          reviewed_at?: string | null
          source?: Database["public"]["Enums"]["duty_event_source"]
          started_at: string
          status: Database["public"]["Enums"]["duty_status"]
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          annotation?: string | null
          created_at?: string
          driver_id?: string
          edit_of_id?: string | null
          edit_reason?: string | null
          edit_status?: Database["public"]["Enums"]["duty_edit_status"] | null
          engine_hours?: number | null
          id?: string
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          odometer_km?: number | null
          org_id?: string
          proposed_by?: string | null
          reviewed_at?: string | null
          source?: Database["public"]["Enums"]["duty_event_source"]
          started_at?: string
          status?: Database["public"]["Enums"]["duty_status"]
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "duty_status_events_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duty_status_events_edit_of_id_fkey"
            columns: ["edit_of_id"]
            isOneToOne: false
            referencedRelation: "duty_status_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duty_status_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duty_status_events_proposed_by_fkey"
            columns: ["proposed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duty_status_events_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      fleets: {
        Row: {
          address: string | null
          code: string | null
          created_at: string
          deleted_at: string | null
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          org_id: string
          timezone: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          code?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          org_id: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          code?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          org_id?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fleets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      form_submissions: {
        Row: {
          answers: Json
          created_at: string
          driver_id: string | null
          form_id: string
          id: string
          latitude: number | null
          longitude: number | null
          odometer_km: number | null
          org_id: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          signature_path: string | null
          status: Database["public"]["Enums"]["submission_status"]
          submitted_at: string
          towed_vehicle_id: string | null
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          answers?: Json
          created_at?: string
          driver_id?: string | null
          form_id: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          odometer_km?: number | null
          org_id: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          signature_path?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          submitted_at?: string
          towed_vehicle_id?: string | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          answers?: Json
          created_at?: string
          driver_id?: string | null
          form_id?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          odometer_km?: number | null
          org_id?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          signature_path?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          submitted_at?: string
          towed_vehicle_id?: string | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_submissions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_towed_vehicle_id_fkey"
            columns: ["towed_vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      forms: {
        Row: {
          assigned_fleet_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          fields: Json
          id: string
          key: string
          kind: Database["public"]["Enums"]["form_kind"]
          name: string
          org_id: string
          published_at: string | null
          status: Database["public"]["Enums"]["form_status"]
          updated_at: string
          version: number
        }
        Insert: {
          assigned_fleet_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          fields?: Json
          id?: string
          key: string
          kind?: Database["public"]["Enums"]["form_kind"]
          name: string
          org_id: string
          published_at?: string | null
          status?: Database["public"]["Enums"]["form_status"]
          updated_at?: string
          version?: number
        }
        Update: {
          assigned_fleet_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          fields?: Json
          id?: string
          key?: string
          kind?: Database["public"]["Enums"]["form_kind"]
          name?: string
          org_id?: string
          published_at?: string | null
          status?: Database["public"]["Enums"]["form_status"]
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "forms_assigned_fleet_id_fkey"
            columns: ["assigned_fleet_id"]
            isOneToOne: false
            referencedRelation: "fleets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forms_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      hos_daily_logs: {
        Row: {
          certified_at: string | null
          certified_count: number
          created_at: string
          driver_id: string
          id: string
          log_date: string
          org_id: string
          signature_path: string | null
          updated_at: string
        }
        Insert: {
          certified_at?: string | null
          certified_count?: number
          created_at?: string
          driver_id: string
          id?: string
          log_date: string
          org_id: string
          signature_path?: string | null
          updated_at?: string
        }
        Update: {
          certified_at?: string | null
          certified_count?: number
          created_at?: string
          driver_id?: string
          id?: string
          log_date?: string
          org_id?: string
          signature_path?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hos_daily_logs_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hos_daily_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      hos_rule_books: {
        Row: {
          break_length_minutes: number
          created_at: string
          cycle_days: number
          cycle_minutes: number
          daily_driving_minutes: number
          driving_before_break_minutes: number
          duty_window_minutes: number | null
          id: string
          name: string
          org_id: string
          updated_at: string
        }
        Insert: {
          break_length_minutes: number
          created_at?: string
          cycle_days: number
          cycle_minutes: number
          daily_driving_minutes: number
          driving_before_break_minutes: number
          duty_window_minutes?: number | null
          id?: string
          name: string
          org_id: string
          updated_at?: string
        }
        Update: {
          break_length_minutes?: number
          created_at?: string
          cycle_days?: number
          cycle_minutes?: number
          daily_driving_minutes?: number
          driving_before_break_minutes?: number
          duty_window_minutes?: number | null
          id?: string
          name?: string
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hos_rule_books_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          email: string
          expires_at: string
          fleet_id: string | null
          id: string
          invited_by: string | null
          org_id: string
          revoked_at: string | null
          role_id: string
          token_hash: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email: string
          expires_at?: string
          fleet_id?: string | null
          id?: string
          invited_by?: string | null
          org_id: string
          revoked_at?: string | null
          role_id: string
          token_hash: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          fleet_id?: string | null
          id?: string
          invited_by?: string | null
          org_id?: string
          revoked_at?: string | null
          role_id?: string
          token_hash?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_fleet_id_fkey"
            columns: ["fleet_id"]
            isOneToOne: false
            referencedRelation: "fleets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_schedules: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          interval_days: number | null
          interval_km: number | null
          is_active: boolean
          last_service_at: string | null
          last_service_km: number | null
          name: string
          next_due_at: string | null
          next_due_km: number | null
          org_id: string
          trigger_type: Database["public"]["Enums"]["maintenance_trigger"]
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          interval_days?: number | null
          interval_km?: number | null
          is_active?: boolean
          last_service_at?: string | null
          last_service_km?: number | null
          name: string
          next_due_at?: string | null
          next_due_km?: number | null
          org_id: string
          trigger_type: Database["public"]["Enums"]["maintenance_trigger"]
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          interval_days?: number | null
          interval_km?: number | null
          is_active?: boolean
          last_service_at?: string | null
          last_service_km?: number | null
          name?: string
          next_due_at?: string | null
          next_due_km?: number | null
          org_id?: string
          trigger_type?: Database["public"]["Enums"]["maintenance_trigger"]
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_schedules_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_schedules_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_path: string | null
          body: string
          broadcast_id: string | null
          created_at: string
          deleted_at: string | null
          direction: Database["public"]["Enums"]["message_direction"]
          driver_id: string
          id: string
          org_id: string
          read_at: string | null
          sender_user_id: string | null
          sent_at: string
          updated_at: string
        }
        Insert: {
          attachment_path?: string | null
          body: string
          broadcast_id?: string | null
          created_at?: string
          deleted_at?: string | null
          direction: Database["public"]["Enums"]["message_direction"]
          driver_id: string
          id?: string
          org_id: string
          read_at?: string | null
          sender_user_id?: string | null
          sent_at?: string
          updated_at?: string
        }
        Update: {
          attachment_path?: string | null
          body?: string
          broadcast_id?: string | null
          created_at?: string
          deleted_at?: string | null
          direction?: Database["public"]["Enums"]["message_direction"]
          driver_id?: string
          id?: string
          org_id?: string
          read_at?: string | null
          sender_user_id?: string | null
          sent_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_user_id_fkey"
            columns: ["sender_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          country_code: string
          created_at: string
          deleted_at: string | null
          dot_number: string | null
          hos_regulator: string | null
          hos_rule_book_id: string | null
          id: string
          legal_name: string | null
          logo_url: string | null
          mc_number: string | null
          name: string
          primary_color: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          country_code?: string
          created_at?: string
          deleted_at?: string | null
          dot_number?: string | null
          hos_regulator?: string | null
          hos_rule_book_id?: string | null
          id?: string
          legal_name?: string | null
          logo_url?: string | null
          mc_number?: string | null
          name: string
          primary_color?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          country_code?: string
          created_at?: string
          deleted_at?: string | null
          dot_number?: string | null
          hos_regulator?: string | null
          hos_rule_book_id?: string | null
          id?: string
          legal_name?: string | null
          logo_url?: string | null
          mc_number?: string | null
          name?: string
          primary_color?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizations_hos_rule_book_id_fkey"
            columns: ["hos_rule_book_id"]
            isOneToOne: false
            referencedRelation: "hos_rule_books"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          key: string
          module_permissions: Json
          name: string
          org_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          key: string
          module_permissions?: Json
          name: string
          org_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          key?: string
          module_permissions?: Json
          name?: string
          org_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "roles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      route_stops: {
        Row: {
          address: string | null
          arrived_at: string | null
          arrived_distance_m: number | null
          arrived_latitude: number | null
          arrived_longitude: number | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          departed_at: string | null
          distance_from_start_km: number | null
          failure_reason: string | null
          id: string
          instructions: string | null
          latitude: number | null
          longitude: number | null
          name: string
          org_id: string
          route_id: string
          sequence: number
          status: Database["public"]["Enums"]["stop_status"]
          updated_at: string
          window_end_at: string | null
          window_start_at: string | null
        }
        Insert: {
          address?: string | null
          arrived_at?: string | null
          arrived_distance_m?: number | null
          arrived_latitude?: number | null
          arrived_longitude?: number | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          departed_at?: string | null
          distance_from_start_km?: number | null
          failure_reason?: string | null
          id?: string
          instructions?: string | null
          latitude?: number | null
          longitude?: number | null
          name: string
          org_id: string
          route_id: string
          sequence: number
          status?: Database["public"]["Enums"]["stop_status"]
          updated_at?: string
          window_end_at?: string | null
          window_start_at?: string | null
        }
        Update: {
          address?: string | null
          arrived_at?: string | null
          arrived_distance_m?: number | null
          arrived_latitude?: number | null
          arrived_longitude?: number | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          departed_at?: string | null
          distance_from_start_km?: number | null
          failure_reason?: string | null
          id?: string
          instructions?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          org_id?: string
          route_id?: string
          sequence?: number
          status?: Database["public"]["Enums"]["stop_status"]
          updated_at?: string
          window_end_at?: string | null
          window_start_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "route_stops_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_stops_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      routes: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          driver_id: string | null
          fleet_id: string | null
          id: string
          name: string | null
          notes: string | null
          org_id: string
          path_polyline: string | null
          planned_distance_km: number | null
          planned_end_at: string | null
          planned_start_at: string | null
          reference: string
          started_at: string | null
          status: Database["public"]["Enums"]["route_status"]
          towed_vehicle_id: string | null
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          driver_id?: string | null
          fleet_id?: string | null
          id?: string
          name?: string | null
          notes?: string | null
          org_id: string
          path_polyline?: string | null
          planned_distance_km?: number | null
          planned_end_at?: string | null
          planned_start_at?: string | null
          reference: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["route_status"]
          towed_vehicle_id?: string | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          driver_id?: string | null
          fleet_id?: string | null
          id?: string
          name?: string | null
          notes?: string | null
          org_id?: string
          path_polyline?: string | null
          planned_distance_km?: number | null
          planned_end_at?: string | null
          planned_start_at?: string | null
          reference?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["route_status"]
          towed_vehicle_id?: string | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "routes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routes_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routes_fleet_id_fkey"
            columns: ["fleet_id"]
            isOneToOne: false
            referencedRelation: "fleets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routes_towed_vehicle_id_fkey"
            columns: ["towed_vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routes_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      safety_events: {
        Row: {
          coach_user_id: string | null
          coaching_done_at: string | null
          coaching_due_on: string | null
          coaching_note: string | null
          created_at: string
          deleted_at: string | null
          driver_id: string | null
          event_type: Database["public"]["Enums"]["safety_event_type"]
          id: string
          latitude: number | null
          location_name: string | null
          longitude: number | null
          occurred_at: string
          org_id: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          severity: Database["public"]["Enums"]["safety_severity"]
          speed_kph: number | null
          speed_limit_kph: number | null
          status: Database["public"]["Enums"]["safety_event_status"]
          updated_at: string
          vehicle_id: string | null
          video_path: string | null
        }
        Insert: {
          coach_user_id?: string | null
          coaching_done_at?: string | null
          coaching_due_on?: string | null
          coaching_note?: string | null
          created_at?: string
          deleted_at?: string | null
          driver_id?: string | null
          event_type: Database["public"]["Enums"]["safety_event_type"]
          id?: string
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          occurred_at: string
          org_id: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: Database["public"]["Enums"]["safety_severity"]
          speed_kph?: number | null
          speed_limit_kph?: number | null
          status?: Database["public"]["Enums"]["safety_event_status"]
          updated_at?: string
          vehicle_id?: string | null
          video_path?: string | null
        }
        Update: {
          coach_user_id?: string | null
          coaching_done_at?: string | null
          coaching_due_on?: string | null
          coaching_note?: string | null
          created_at?: string
          deleted_at?: string | null
          driver_id?: string | null
          event_type?: Database["public"]["Enums"]["safety_event_type"]
          id?: string
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          occurred_at?: string
          org_id?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: Database["public"]["Enums"]["safety_severity"]
          speed_kph?: number | null
          speed_limit_kph?: number | null
          status?: Database["public"]["Enums"]["safety_event_status"]
          updated_at?: string
          vehicle_id?: string | null
          video_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "safety_events_coach_user_id_fkey"
            columns: ["coach_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_events_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_events_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_events_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          fleet_id: string | null
          granted_at: string
          granted_by: string | null
          id: string
          org_id: string | null
          revoked_at: string | null
          revoked_by: string | null
          role_id: string
          user_id: string
        }
        Insert: {
          fleet_id?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          org_id?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          role_id: string
          user_id: string
        }
        Update: {
          fleet_id?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          org_id?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_fleet_id_fkey"
            columns: ["fleet_id"]
            isOneToOne: false
            referencedRelation: "fleets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          deleted_at: string | null
          email: string
          full_name: string | null
          id: string
          last_seen_at: string | null
          locale: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          email: string
          full_name?: string | null
          id: string
          last_seen_at?: string | null
          locale?: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          last_seen_at?: string | null
          locale?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          created_at: string
          deleted_at: string | null
          fleet_id: string | null
          id: string
          kind: Database["public"]["Enums"]["vehicle_kind"]
          last_heading_deg: number | null
          last_ignition_on: boolean | null
          last_latitude: number | null
          last_longitude: number | null
          last_position_at: string | null
          last_speed_kph: number | null
          make: string | null
          model: string | null
          name: string | null
          notes: string | null
          odometer_at: string | null
          odometer_km: number
          org_id: string
          plate: string
          status: Database["public"]["Enums"]["vehicle_status"]
          updated_at: string
          vin: string | null
          year: number | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          fleet_id?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["vehicle_kind"]
          last_heading_deg?: number | null
          last_ignition_on?: boolean | null
          last_latitude?: number | null
          last_longitude?: number | null
          last_position_at?: string | null
          last_speed_kph?: number | null
          make?: string | null
          model?: string | null
          name?: string | null
          notes?: string | null
          odometer_at?: string | null
          odometer_km?: number
          org_id: string
          plate: string
          status?: Database["public"]["Enums"]["vehicle_status"]
          updated_at?: string
          vin?: string | null
          year?: number | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          fleet_id?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["vehicle_kind"]
          last_heading_deg?: number | null
          last_ignition_on?: boolean | null
          last_latitude?: number | null
          last_longitude?: number | null
          last_position_at?: string | null
          last_speed_kph?: number | null
          make?: string | null
          model?: string | null
          name?: string | null
          notes?: string | null
          odometer_at?: string | null
          odometer_km?: number
          org_id?: string
          plate?: string
          status?: Database["public"]["Enums"]["vehicle_status"]
          updated_at?: string
          vin?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_fleet_id_fkey"
            columns: ["fleet_id"]
            isOneToOne: false
            referencedRelation: "fleets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      work_orders: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          labour_cost_cents: number | null
          labour_hours: number | null
          odometer_km: number | null
          opened_at: string
          opened_by: string | null
          org_id: string
          parts_cost_cents: number | null
          reference: string | null
          requested_by_driver: string | null
          schedule_id: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["work_order_status"]
          title: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          labour_cost_cents?: number | null
          labour_hours?: number | null
          odometer_km?: number | null
          opened_at?: string
          opened_by?: string | null
          org_id: string
          parts_cost_cents?: number | null
          reference?: string | null
          requested_by_driver?: string | null
          schedule_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["work_order_status"]
          title: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          labour_cost_cents?: number | null
          labour_hours?: number | null
          odometer_km?: number | null
          opened_at?: string
          opened_by?: string | null
          org_id?: string
          parts_cost_cents?: number | null
          reference?: string | null
          requested_by_driver?: string | null
          schedule_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["work_order_status"]
          title?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_opened_by_fkey"
            columns: ["opened_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_requested_by_driver_fkey"
            columns: ["requested_by_driver"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "maintenance_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      audit_actor: { Args: never; Returns: string }
      current_driver_fleet_id: { Args: never; Returns: string }
      current_driver_id: { Args: never; Returns: string }
      current_driver_org_id: { Args: never; Returns: string }
      current_org_ids: { Args: never; Returns: string[] }
      has_org_access: { Args: { target_org_id: string }; Returns: boolean }
      has_org_role: {
        Args: { role_keys: string[]; target_org_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: never; Returns: boolean }
      report_position: {
        Args: {
          heading_deg?: number
          ignition_on?: boolean
          latitude: number
          longitude: number
          reported_at?: string
          speed_kph?: number
        }
        Returns: string
      }
      sign_on_to_vehicle: { Args: { p_vehicle_id: string }; Returns: string }
      storage_segment_uuid: {
        Args: { object_name: string; segment: number }
        Returns: string
      }
      taken_vehicle_ids: { Args: never; Returns: string[] }
    }
    Enums: {
      alert_channel: "in_app" | "email" | "sms"
      assignment_status: "assigned" | "in_progress" | "completed" | "overdue"
      course_status: "draft" | "published" | "archived"
      defect_severity: "minor" | "major" | "out_of_service"
      defect_status: "open" | "in_repair" | "resolved" | "dismissed"
      device_platform: "ios" | "android"
      document_category: "compliance" | "trip"
      driver_status: "active" | "inactive" | "terminated"
      duty_edit_status: "pending" | "accepted" | "rejected"
      duty_event_source: "automatic" | "manual" | "carrier_edit"
      duty_status:
        | "off_duty"
        | "sleeper_berth"
        | "driving"
        | "on_duty_not_driving"
        | "personal_conveyance"
        | "yard_move"
      form_kind: "dvir_pre" | "dvir_post" | "custom"
      form_status: "draft" | "published" | "archived"
      maintenance_trigger: "distance" | "time"
      message_direction: "to_driver" | "from_driver"
      route_status:
        | "planned"
        | "dispatched"
        | "in_progress"
        | "completed"
        | "cancelled"
      safety_event_status: "new" | "coachable" | "coached" | "dismissed"
      safety_event_type:
        | "harsh_braking"
        | "harsh_acceleration"
        | "sharp_turn"
        | "speeding"
        | "following_too_close"
        | "collision"
        | "other"
      safety_severity: "low" | "medium" | "high"
      stop_status: "pending" | "arrived" | "completed" | "skipped" | "failed"
      submission_status: "submitted" | "reviewed" | "flagged"
      vehicle_kind: "truck" | "trailer"
      vehicle_status: "active" | "out_of_service" | "in_maintenance" | "retired"
      work_order_status:
        | "open"
        | "assigned"
        | "in_progress"
        | "completed"
        | "cancelled"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      alert_channel: ["in_app", "email", "sms"],
      assignment_status: ["assigned", "in_progress", "completed", "overdue"],
      course_status: ["draft", "published", "archived"],
      defect_severity: ["minor", "major", "out_of_service"],
      defect_status: ["open", "in_repair", "resolved", "dismissed"],
      device_platform: ["ios", "android"],
      document_category: ["compliance", "trip"],
      driver_status: ["active", "inactive", "terminated"],
      duty_edit_status: ["pending", "accepted", "rejected"],
      duty_event_source: ["automatic", "manual", "carrier_edit"],
      duty_status: [
        "off_duty",
        "sleeper_berth",
        "driving",
        "on_duty_not_driving",
        "personal_conveyance",
        "yard_move",
      ],
      form_kind: ["dvir_pre", "dvir_post", "custom"],
      form_status: ["draft", "published", "archived"],
      maintenance_trigger: ["distance", "time"],
      message_direction: ["to_driver", "from_driver"],
      route_status: [
        "planned",
        "dispatched",
        "in_progress",
        "completed",
        "cancelled",
      ],
      safety_event_status: ["new", "coachable", "coached", "dismissed"],
      safety_event_type: [
        "harsh_braking",
        "harsh_acceleration",
        "sharp_turn",
        "speeding",
        "following_too_close",
        "collision",
        "other",
      ],
      safety_severity: ["low", "medium", "high"],
      stop_status: ["pending", "arrived", "completed", "skipped", "failed"],
      submission_status: ["submitted", "reviewed", "flagged"],
      vehicle_kind: ["truck", "trailer"],
      vehicle_status: ["active", "out_of_service", "in_maintenance", "retired"],
      work_order_status: [
        "open",
        "assigned",
        "in_progress",
        "completed",
        "cancelled",
      ],
    },
  },
} as const
