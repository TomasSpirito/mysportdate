import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Types matching DB schema
export interface Sport {
  id: string;
  name: string;
  icon: string;
}

export interface Court {
  id: string;
  facility_id: string;
  sport_id: string;
  name: string;
  surface: string | null;
  price_per_hour: number;
  features: string[];
  image: string | null;
}

export interface Addon {
  id: string;
  facility_id: string;
  name: string;
  price: number;
  icon: string;
  requires_stock: boolean;
}

export interface Booking {
  id: string;
  court_id: string;
  user_id: string | null;
  user_name: string | null;
  start_time: string;
  end_time: string;
  total_price: number;
  deposit_amount: number;
  status: string;
  payment_status: string;
  booking_type: string;
  created_at: string;
}

// Hooks

export function useSports() {
  return useQuery({
    queryKey: ["sports"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sports").select("*");
      if (error) throw error;
      return data as Sport[];
    },
  });
}

export function useCourts(sportId?: string) {
  return useQuery({
    queryKey: ["courts", sportId],
    queryFn: async () => {
      let query = supabase.from("courts").select("*");
      if (sportId) query = query.eq("sport_id", sportId);
      const { data, error } = await query;
      if (error) throw error;
      return data as Court[];
    },
  });
}

export function useCourt(courtId?: string) {
  return useQuery({
    queryKey: ["court", courtId],
    queryFn: async () => {
      if (!courtId) return null;
      const { data, error } = await supabase.from("courts").select("*").eq("id", courtId).maybeSingle();
      if (error) throw error;
      return data as Court | null;
    },
    enabled: !!courtId,
  });
}

export function useAddons(facilityId?: string) {
  return useQuery({
    queryKey: ["addons", facilityId],
    queryFn: async () => {
      let query = supabase.from("addons").select("*");
      if (facilityId) query = query.eq("facility_id", facilityId);
      const { data, error } = await query;
      if (error) throw error;
      return data as Addon[];
    },
  });
}

export function useBookings(date?: string) {
  return useQuery({
    queryKey: ["bookings", date],
    queryFn: async () => {
      let query = supabase.from("bookings").select("*");
      if (date) {
        // Filter bookings for a specific date
        query = query
          .gte("start_time", `${date}T00:00:00`)
          .lt("start_time", `${date}T23:59:59`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as Booking[];
    },
  });
}

export function useBookingsByCourt(courtId?: string, date?: string) {
  return useQuery({
    queryKey: ["bookings", courtId, date],
    queryFn: async () => {
      if (!courtId || !date) return [];
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("court_id", courtId)
        .gte("start_time", `${date}T00:00:00`)
        .lt("start_time", `${date}T23:59:59`)
        .neq("status", "cancelled");
      if (error) throw error;
      return data as Booking[];
    },
    enabled: !!courtId && !!date,
  });
}

// Generate available time slots by subtracting booked hours
export function generateAvailableSlots(bookings: Booking[], date: string) {
  const occupiedHours = new Set(
    bookings.map((b) => new Date(b.start_time).getUTCHours())
  );
  
  const slots: { time: string; available: boolean }[] = [];
  for (let h = 8; h <= 23; h++) {
    const time = `${h.toString().padStart(2, "0")}:00`;
    slots.push({ time, available: !occupiedHours.has(h) });
  }
  return slots;
}
