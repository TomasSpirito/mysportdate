import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const FACILITY_ID = "00000000-0000-0000-0000-000000000001";

export interface Sport { id: string; name: string; icon: string; }
export interface Court { id: string; facility_id: string; sport_id: string; name: string; surface: string | null; price_per_hour: number; features: string[]; image: string | null; }
export interface Addon { id: string; facility_id: string; name: string; price: number; icon: string; requires_stock: boolean; }
export interface Booking { id: string; court_id: string; user_id: string | null; user_name: string | null; user_email?: string | null; user_phone?: string | null; start_time: string; end_time: string; total_price: number; deposit_amount: number; status: string; payment_status: string; booking_type: string; created_at: string; }
export interface Expense { id: string; facility_id: string; category: string; description: string | null; amount: number; expense_date: string; created_at: string; }
export interface FacilitySchedule { id: string; facility_id: string; day_of_week: number; is_open: boolean; open_time: string; close_time: string; }

// ── Queries ──

export function useSports() {
  return useQuery({ queryKey: ["sports"], queryFn: async () => { const { data, error } = await supabase.from("sports").select("*"); if (error) throw error; return data as Sport[]; } });
}

export function useCourts(sportId?: string) {
  return useQuery({ queryKey: ["courts", sportId], queryFn: async () => { let q = supabase.from("courts").select("*"); if (sportId) q = q.eq("sport_id", sportId); const { data, error } = await q; if (error) throw error; return data as Court[]; } });
}

export function useCourt(courtId?: string) {
  return useQuery({ queryKey: ["court", courtId], queryFn: async () => { if (!courtId) return null; const { data, error } = await supabase.from("courts").select("*").eq("id", courtId).maybeSingle(); if (error) throw error; return data as Court | null; }, enabled: !!courtId });
}

export function useAddons(facilityId?: string) {
  return useQuery({ queryKey: ["addons", facilityId], queryFn: async () => { let q = supabase.from("addons").select("*"); if (facilityId) q = q.eq("facility_id", facilityId); const { data, error } = await q; if (error) throw error; return data as Addon[]; } });
}

export function useBookings(date?: string) {
  return useQuery({ queryKey: ["bookings", date], queryFn: async () => { let q = supabase.from("bookings").select("*"); if (date) { q = q.gte("start_time", `${date}T00:00:00`).lt("start_time", `${date}T23:59:59`); } const { data, error } = await q; if (error) throw error; return data as Booking[]; } });
}

export function useBookingsRange(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ["bookings-range", startDate, endDate],
    queryFn: async () => {
      if (!startDate || !endDate) return [];
      const { data, error } = await supabase.from("bookings").select("*")
        .gte("start_time", `${startDate}T00:00:00`).lt("start_time", `${endDate}T23:59:59`).neq("status", "cancelled");
      if (error) throw error;
      return data as Booking[];
    },
    enabled: !!startDate && !!endDate,
  });
}

export function useBookingsByCourt(courtId?: string, date?: string) {
  return useQuery({
    queryKey: ["bookings", courtId, date],
    queryFn: async () => {
      if (!courtId || !date) return [];
      const { data, error } = await supabase.from("bookings").select("*").eq("court_id", courtId)
        .gte("start_time", `${date}T00:00:00`).lt("start_time", `${date}T23:59:59`).neq("status", "cancelled");
      if (error) throw error;
      return data as Booking[];
    },
    enabled: !!courtId && !!date,
  });
}

export function generateAvailableSlots(bookings: Booking[], date: string) {
  const occupiedHours = new Set(bookings.map((b) => new Date(b.start_time).getUTCHours()));
  const slots: { time: string; available: boolean }[] = [];
  for (let h = 8; h <= 23; h++) {
    slots.push({ time: `${h.toString().padStart(2, "0")}:00`, available: !occupiedHours.has(h) });
  }
  return slots;
}

// ── Mutations ──

export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      court_id: string; date: string; time: string; user_name: string; user_email: string; user_phone: string;
      total_price: number; deposit_amount: number; payment_status: string; booking_type?: string; addon_ids?: string[];
    }) => {
      const startHour = parseInt(params.time.split(":")[0]);
      const start_time = `${params.date}T${params.time}:00+00:00`;
      const end_time = `${params.date}T${(startHour + 1).toString().padStart(2, "0")}:00:00+00:00`;
      const { data, error } = await supabase.rpc("create_booking" as any, {
        p_court_id: params.court_id, p_start_time: start_time, p_end_time: end_time,
        p_user_name: params.user_name, p_user_email: params.user_email, p_user_phone: params.user_phone,
        p_total_price: params.total_price, p_deposit_amount: params.deposit_amount,
        p_payment_status: params.payment_status, p_booking_type: params.booking_type || "online",
        p_addon_ids: params.addon_ids || [],
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["bookings"] }); },
  });
}

export function useUpdateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Booking> & { id: string }) => {
      const { error } = await supabase.from("bookings").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["bookings"] }); },
  });
}

export function useDeleteBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bookings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["bookings"] }); },
  });
}

// Courts CRUD
export function useCreateCourt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (court: { name: string; sport_id: string; surface: string; price_per_hour: number; features?: string[] }) => {
      const { error } = await supabase.from("courts").insert({ ...court, facility_id: FACILITY_ID, features: court.features || [] });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["courts"] }); },
  });
}

export function useUpdateCourt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; sport_id?: string; surface?: string; price_per_hour?: number; features?: string[] }) => {
      const { error } = await supabase.from("courts").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["courts"] }); },
  });
}

export function useDeleteCourt() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async (id: string) => { const { error } = await supabase.from("courts").delete().eq("id", id); if (error) throw error; }, onSuccess: () => { qc.invalidateQueries({ queryKey: ["courts"] }); } });
}

// Sports CRUD
export function useCreateSport() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async (sport: { name: string; icon: string }) => { const { error } = await supabase.from("sports").insert(sport); if (error) throw error; }, onSuccess: () => { qc.invalidateQueries({ queryKey: ["sports"] }); } });
}

export function useUpdateSport() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async ({ id, ...updates }: { id: string; name?: string; icon?: string }) => { const { error } = await supabase.from("sports").update(updates).eq("id", id); if (error) throw error; }, onSuccess: () => { qc.invalidateQueries({ queryKey: ["sports"] }); } });
}

export function useDeleteSport() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async (id: string) => { const { error } = await supabase.from("sports").delete().eq("id", id); if (error) throw error; }, onSuccess: () => { qc.invalidateQueries({ queryKey: ["sports"] }); } });
}

// Addons CRUD
export function useCreateAddon() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async (addon: { name: string; price: number; icon: string }) => { const { error } = await supabase.from("addons").insert({ ...addon, facility_id: FACILITY_ID }); if (error) throw error; }, onSuccess: () => { qc.invalidateQueries({ queryKey: ["addons"] }); } });
}

export function useUpdateAddon() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async ({ id, ...updates }: { id: string; name?: string; price?: number; icon?: string }) => { const { error } = await supabase.from("addons").update(updates).eq("id", id); if (error) throw error; }, onSuccess: () => { qc.invalidateQueries({ queryKey: ["addons"] }); } });
}

export function useDeleteAddon() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async (id: string) => { const { error } = await supabase.from("addons").delete().eq("id", id); if (error) throw error; }, onSuccess: () => { qc.invalidateQueries({ queryKey: ["addons"] }); } });
}

// Expenses CRUD
export function useExpenses(date?: string) {
  return useQuery({ queryKey: ["expenses", date], queryFn: async () => { let q = supabase.from("expenses").select("*"); if (date) q = q.eq("expense_date", date); const { data, error } = await q; if (error) throw error; return data as Expense[]; } });
}

export function useExpensesRange(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ["expenses-range", startDate, endDate],
    queryFn: async () => {
      if (!startDate || !endDate) return [];
      const { data, error } = await supabase.from("expenses").select("*").gte("expense_date", startDate).lte("expense_date", endDate);
      if (error) throw error;
      return data as Expense[];
    },
    enabled: !!startDate && !!endDate,
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async (expense: { category: string; description?: string; amount: number; expense_date: string }) => { const { error } = await supabase.from("expenses").insert({ ...expense, facility_id: FACILITY_ID }); if (error) throw error; }, onSuccess: () => { qc.invalidateQueries({ queryKey: ["expenses"] }); qc.invalidateQueries({ queryKey: ["expenses-range"] }); } });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async (id: string) => { const { error } = await supabase.from("expenses").delete().eq("id", id); if (error) throw error; }, onSuccess: () => { qc.invalidateQueries({ queryKey: ["expenses"] }); qc.invalidateQueries({ queryKey: ["expenses-range"] }); } });
}

// Facility Schedules
export function useFacilitySchedules() {
  return useQuery({ queryKey: ["facility-schedules"], queryFn: async () => { const { data, error } = await supabase.from("facility_schedules").select("*").eq("facility_id", FACILITY_ID).order("day_of_week"); if (error) throw error; return data as FacilitySchedule[]; } });
}

export function useUpsertFacilitySchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (schedules: { day_of_week: number; is_open: boolean; open_time: string; close_time: string }[]) => {
      for (const s of schedules) {
        const { error } = await supabase.from("facility_schedules").upsert({ facility_id: FACILITY_ID, day_of_week: s.day_of_week, is_open: s.is_open, open_time: s.open_time, close_time: s.close_time }, { onConflict: "facility_id,day_of_week" });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["facility-schedules"] }); },
  });
}
