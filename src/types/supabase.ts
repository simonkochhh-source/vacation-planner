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
      destinations: {
        Row: {
          id: string
          user_id: string
          trip_id: string | null
          name: string
          location: string
          category: 'restaurant' | 'museum' | 'attraction' | 'hotel' | 'transport' | 'nature' | 'entertainment' | 'shopping' | 'cultural' | 'sports' | 'other'
          start_date: string
          end_date: string
          start_time: string | null
          end_time: string | null
          priority: number | null
          rating: number | null
          budget: number | null
          actual_cost: number | null
          coordinates_lat: number | null
          coordinates_lng: number | null
          notes: string | null
          images: string[] | null
          booking_info: string | null
          status: 'geplant' | 'besucht' | 'uebersprungen' | 'in_bearbeitung' | null
          tags: string[] | null
          color: string | null
          duration: number | null
          weather_info: Json | null
          transport_to_next: Json | null
          accessibility_info: string | null
          opening_hours: Json | null
          contact_info: Json | null
          sort_order: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string
          trip_id?: string | null
          name: string
          location: string
          category: 'restaurant' | 'museum' | 'attraction' | 'hotel' | 'transport' | 'nature' | 'entertainment' | 'shopping' | 'cultural' | 'sports' | 'other'
          start_date: string
          end_date: string
          start_time?: string | null
          end_time?: string | null
          priority?: number | null
          rating?: number | null
          budget?: number | null
          actual_cost?: number | null
          coordinates_lat?: number | null
          coordinates_lng?: number | null
          notes?: string | null
          images?: string[] | null
          booking_info?: string | null
          status?: 'geplant' | 'besucht' | 'uebersprungen' | 'in_bearbeitung' | null
          tags?: string[] | null
          color?: string | null
          duration?: number | null
          weather_info?: Json | null
          transport_to_next?: Json | null
          accessibility_info?: string | null
          opening_hours?: Json | null
          contact_info?: Json | null
          sort_order?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          trip_id?: string | null
          name?: string
          location?: string
          category?: 'restaurant' | 'museum' | 'sehenswuerdigkeit' | 'hotel' | 'aktivitaet' | 'transport' | 'shopping' | 'nachtleben' | 'natur' | 'kultur' | 'sport' | 'wellness' | 'business' | 'sonstiges'
          start_date?: string
          end_date?: string
          start_time?: string | null
          end_time?: string | null
          priority?: number | null
          rating?: number | null
          budget?: number | null
          actual_cost?: number | null
          coordinates_lat?: number | null
          coordinates_lng?: number | null
          notes?: string | null
          images?: string[] | null
          booking_info?: string | null
          status?: 'geplant' | 'besucht' | 'uebersprungen' | 'in_bearbeitung' | null
          tags?: string[] | null
          color?: string | null
          duration?: number | null
          weather_info?: Json | null
          transport_to_next?: Json | null
          accessibility_info?: string | null
          opening_hours?: Json | null
          contact_info?: Json | null
          sort_order?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      trips: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          start_date: string
          end_date: string
          budget: number | null
          participants: string[] | null
          status: 'geplant' | 'aktiv' | 'abgeschlossen' | 'storniert' | null
          tags: string[] | null
          privacy: 'private' | 'public' | null
          owner_id: string | null
          tagged_users: string[] | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string
          name: string
          description?: string | null
          start_date: string
          end_date: string
          budget?: number | null
          participants?: string[] | null
          status?: 'geplant' | 'aktiv' | 'abgeschlossen' | 'storniert' | null
          tags?: string[] | null
          privacy?: 'private' | 'public' | null
          owner_id?: string | null
          tagged_users?: string[] | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          start_date?: string
          end_date?: string
          budget?: number | null
          participants?: string[] | null
          status?: 'geplant' | 'aktiv' | 'abgeschlossen' | 'storniert' | null
          tags?: string[] | null
          privacy?: 'private' | 'public' | null
          owner_id?: string | null
          tagged_users?: string[] | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      destination_category: 'restaurant' | 'museum' | 'attraction' | 'hotel' | 'transport' | 'nature' | 'entertainment' | 'shopping' | 'cultural' | 'sports' | 'other'
      destination_status: 'geplant' | 'besucht' | 'uebersprungen' | 'in_bearbeitung'
      trip_status: 'geplant' | 'aktiv' | 'abgeschlossen' | 'storniert'
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]