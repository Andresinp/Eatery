// Hand-rolled types matching supabase/migrations/0001_init.sql.
// Regenerate with `supabase gen types typescript --project-id <id>` once
// you've applied the migrations against a real project.

type TableDef<Row, RequiredInsert> = {
  Row: Row;
  Insert: Partial<Row> & RequiredInsert;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: TableDef<ProfileRow, { id: string }>;
      listings: TableDef<
        ListingRow,
        {
          host_id: string;
          listing_type: ListingRow["listing_type"];
          title: string;
          description: string;
          price_per_unit: number;
          location_lat: number;
          location_lng: number;
          location_display: string;
        }
      >;
      orders: TableDef<
        OrderRow,
        {
          listing_id: string;
          listing_type: OrderRow["listing_type"];
          guest_id: string;
          quantity: number;
          deposit_paid: number;
          balance_due: number;
        }
      >;
      reviews: TableDef<
        ReviewRow,
        {
          order_id: string;
          reviewer_id: string;
          reviewee_id: string;
          role: ReviewRow["role"];
          rating: number;
        }
      >;
      messages: TableDef<
        MessageRow,
        { order_id: string; sender_id: string; content: string }
      >;
      notifications: TableDef<
        NotificationRow,
        { user_id: string; type: NotificationRow["type"]; title: string }
      >;
      reports: TableDef<
        ReportRow,
        { reporter_id: string; reported_user_id: string; reason: string }
      >;
    };
    Views: { [key: string]: never };
    Functions: { [key: string]: never };
    Enums: { [key: string]: never };
    CompositeTypes: { [key: string]: never };
  };
};

export type ProfileRow = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  email: string | null;
  phone_verified: boolean;
  identity_verified: boolean;
  host_rating: number | null;
  guest_rating: number | null;
  no_show_count: number;
  cancellation_count: number;
  dietary_prefs: string[];
  allergen_exclusions: string[];
  language: string;
  onboarded: boolean;
  created_at: string;
}

export type ListingRow = {
  id: string;
  host_id: string;
  listing_type: "table" | "market";
  title: string;
  description: string;
  photos: string[];
  currency: string;
  cuisine_tags: string[];
  dietary_tags: string[];
  allergen_flags: string[];
  price_per_unit: number;
  booking_fee_rate: number;
  location_lat: number;
  location_lng: number;
  location_display: string;
  exact_address: string | null;
  status: "active" | "full" | "cancelled" | "completed";
  created_at: string;
  meal_time: string | null;
  meal_end_time: string | null;
  seats_total: number | null;
  seats_available: number | null;
  dining_setting: "indoor_table" | "garden" | "terrace" | "rooftop" | "open_kitchen" | null;
  drinks_included: boolean | null;
  drinks: string[] | null;
  product_type_tags: string[];
  quantity_total: number | null;
  quantity_available: number | null;
  pickup_window_start: string | null;
  pickup_window_end: string | null;
  allows_local_delivery: boolean;
  idempotency_key: string | null;
}

export type OrderRow = {
  id: string;
  listing_id: string;
  listing_type: "table" | "market";
  guest_id: string;
  quantity: number;
  deposit_paid: number;
  balance_due: number;
  payment_intent_id: string | null;
  status:
    | "confirmed"
    | "completed"
    | "cancelled_by_guest"
    | "cancelled_by_host"
    | "no_show_guest"
    | "no_show_host";
  host_confirmed: boolean;
  guest_confirmed: boolean;
  created_at: string;
}

export type ReviewRow = {
  id: string;
  order_id: string;
  reviewer_id: string;
  reviewee_id: string;
  role: "guest_reviewing_host" | "host_reviewing_guest";
  rating: number;
  comment: string | null;
  created_at: string;
}

export type MessageRow = {
  id: string;
  order_id: string;
  sender_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

export type NotificationRow = {
  id: string;
  user_id: string;
  type:
    | "booking_confirmed"
    | "booking_received"
    | "order_cancelled"
    | "reminder"
    | "message"
    | "review_request"
    | "no_show"
    | "system";
  title: string;
  body: string | null;
  read: boolean;
  data: Record<string, unknown>;
  created_at: string;
}

export type ReportRow = {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  order_id: string | null;
  reason: string;
  created_at: string;
}
