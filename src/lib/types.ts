export type ServiceType = "drinking" | "party" | "dj";
export type BillingType = "package" | "hourly";
export type BookingStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "paid"
  | "completed"
  | "cancelled"
  | "expired";

export interface CompanionService {
  id: string;
  companion_id: string;
  service_type: ServiceType;
  billing_type: BillingType;
  base_price: number;
  base_hours: number;
  min_hours: number;
  extra_hour_price: number;
  price_per_hour: number;
  is_active: boolean;
}

export interface Companion {
  id: string;
  user_id: string | null;
  display_name: string;
  tagline: string | null;
  bio: string | null;
  age_range: string | null;
  languages: string[];
  tags: string[];
  genres: string[];
  mix_links: string[];
  equipment_provides: string | null;
  equipment_needs: string | null;
  travel_fee: number;
  areas: string | null;
  is_active: boolean;
  is_verified: boolean;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  companion_services?: CompanionService[];
}

export interface BookingRequest {
  id: string;
  customer_id: string;
  companion_id: string;
  service_type: ServiceType;
  event_date: string;
  start_time: string;
  duration_hours: number;
  extra_hours: number;
  venue_name: string;
  venue_address: string;
  group_size: number;
  event_type: string | null;
  music_requests: string | null;
  venue_equipment: string[];
  party_mode: string | null;
  notes: string | null;
  status: BookingStatus;
  decline_reason: string | null;
  total_amount: number;
  deposit_amount: number;
  created_at: string;
  companions?: { display_name: string } | null;
}

export const SERVICE_LABELS: Record<ServiceType, string> = {
  drinking: "Drinking companion",
  party: "Party companion",
  dj: "DJ",
};
