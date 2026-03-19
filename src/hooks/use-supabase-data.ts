import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFacilityId } from "@/contexts/FacilityContext";

export interface Sport { id: string; name: string; icon: string; }
export interface Court { id: string; facility_id: string; sport_id: string; name: string; surface: string | null; price_per_hour: number; features: string[]; image: string | null; }
export interface Addon { id: string; facility_id: string; name: string; price: number; icon: string; requires_stock: boolean; }
export interface Booking { id: string; court_id: string; user_id: string | null; user_name: string | null; user_email?: string | null; user_phone?: string | null; start_time: string; end_time: string; total_price: number; deposit_amount: number; status: string; payment_status: string; booking_type: string; created_at: string; }
export interface Expense { id: string; facility_id: string; category: string; description: string | null; amount: number; expense_date: string; created_at: string; }
export interface FacilitySchedule { id: string; facility_id: string; day_of_week: number; is_open: boolean; open_time: string; close_time: string; }
export interface BuffetProduct { id: string; facility_id: string; name: string; category: string; price: number; stock: number; image: string | null; created_at: string; }
export interface BuffetSale { id: string; facility_id: string; total: number; created_at: string; }
export interface BuffetSaleItem { id: string; sale_id: string; product_id: string | null; product_name: string; quantity: number; unit_price: number; }
export interface Facility { id: string; name: string; slug?: string | null; location: string | null; open_time: string; close_time: string; owner_id: string | null; phone: string | null; email: string | null; whatsapp: string | null; }

// ── Queries ──

export function useFacility() {
  const facilityId = useFacilityId();
  return useQuery({
    queryKey: ["facility", facilityId],
    queryFn: async () => {
      if (!facilityId) return null;
      const { data, error } = await supabase.from("facilities").select("*").eq("id", facilityId).maybeSingle();
      if (error) throw error;
      return data as Facility | null;
    },
    enabled: !!facilityId,
  });
}

export function useUpdateFacility() {
  const facilityId = useFacilityId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: Partial<Facility>) => {
      if (!facilityId) throw new Error("No facility");
      const { error } = await supabase.from("facilities").update(updates as any).eq("id", facilityId);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["facility"] }); },
  });
}

export function useSports() {
  return useQuery({ queryKey: ["sports"], queryFn: async () => { const { data, error } = await supabase.from("sports").select("*"); if (error) throw error; return data as Sport[]; } });
}

export function useCourts(sportId?: string) {
  const facilityId = useFacilityId();
  return useQuery({
    queryKey: ["courts", facilityId, sportId],
    queryFn: async () => {
      let q = supabase.from("courts").select("*");
      if (facilityId) q = q.eq("facility_id", facilityId);
      if (sportId) q = q.eq("sport_id", sportId);
      const { data, error } = await q;
      if (error) throw error;
      return data as Court[];
    },
    enabled: !!facilityId,
  });
}

export function useCourt(courtId?: string) {
  return useQuery({ queryKey: ["court", courtId], queryFn: async () => { if (!courtId) return null; const { data, error } = await supabase.from("courts").select("*").eq("id", courtId).maybeSingle(); if (error) throw error; return data as Court | null; }, enabled: !!courtId });
}

export function useAddons() {
  const facilityId = useFacilityId();
  return useQuery({
    queryKey: ["addons", facilityId],
    queryFn: async () => {
      let q = supabase.from("addons").select("*");
      if (facilityId) q = q.eq("facility_id", facilityId);
      const { data, error } = await q;
      if (error) throw error;
      return data as Addon[];
    },
    enabled: !!facilityId,
  });
}

export function useBookings(date?: string) {
  const facilityId = useFacilityId();
  return useQuery({
    queryKey: ["bookings", facilityId, date],
    queryFn: async () => {
      if (!facilityId) return [];
      // Get court IDs for this facility
      const { data: fCourts } = await supabase.from("courts").select("id").eq("facility_id", facilityId);
      const courtIds = fCourts?.map(c => c.id) || [];
      if (courtIds.length === 0) return [];
      let q = supabase.from("bookings").select("*").in("court_id", courtIds);
      if (date) { q = q.gte("start_time", `${date}T00:00:00`).lt("start_time", `${date}T23:59:59`); }
      const { data, error } = await q;
      if (error) throw error;
      return data as Booking[];
    },
    enabled: !!facilityId,
  });
}

export function useBookingsRange(startDate?: string, endDate?: string) {
  const facilityId = useFacilityId();
  return useQuery({
    queryKey: ["bookings-range", facilityId, startDate, endDate],
    queryFn: async () => {
      if (!startDate || !endDate || !facilityId) return [];
      const { data: fCourts } = await supabase.from("courts").select("id").eq("facility_id", facilityId);
      const courtIds = fCourts?.map(c => c.id) || [];
      if (courtIds.length === 0) return [];
      const { data, error } = await supabase.from("bookings").select("*")
        .in("court_id", courtIds)
        .gte("start_time", `${startDate}T00:00:00`).lt("start_time", `${endDate}T23:59:59`).neq("status", "cancelled");
      if (error) throw error;
      return data as Booking[];
    },
    enabled: !!startDate && !!endDate && !!facilityId,
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

export function generateAvailableSlots(bookings: Booking[], date: string, openHour = 8, closeHour = 23) {
  const occupiedHours = new Set(bookings.map((b) => new Date(b.start_time).getUTCHours()));
  const slots: { time: string; available: boolean }[] = [];
  
  for (let h = openHour; h < closeHour; h++) {
    // MAGIA VISUAL: Si h es 24, displayH es 0. Si h es 25, displayH es 1.
    const displayH = h % 24; 
    
    slots.push({ 
      time: `${displayH.toString().padStart(2, "0")}:00`, 
      // MAGIA LÓGICA: Buscamos si la hora real (ej: 0, 1) está ocupada, no el 24 o 25
      available: !occupiedHours.has(displayH) 
    });
  }
  return slots;
}

// Fetch schedules by facility_id (for player-side, without FacilityContext)
export function useFacilitySchedulesByFacilityId(facilityId?: string) {
  return useQuery({
    queryKey: ["facility-schedules-public", facilityId],
    queryFn: async () => {
      if (!facilityId) return [];
      const { data, error } = await supabase.from("facility_schedules").select("*").eq("facility_id", facilityId).order("day_of_week");
      if (error) throw error;
      return data as FacilitySchedule[];
    },
    enabled: !!facilityId,
  });
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["bookings"] }); qc.invalidateQueries({ queryKey: ["bookings-range"] }); },
  });
}

export function useUpdateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Booking> & { id: string }) => {
      const { error } = await supabase.from("bookings").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["bookings"] }); qc.invalidateQueries({ queryKey: ["bookings-range"] }); },
  });
}

export function useDeleteBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bookings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["bookings"] }); qc.invalidateQueries({ queryKey: ["bookings-range"] }); },
  });
}

// Courts CRUD
export function useCreateCourt() {
  const facilityId = useFacilityId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (court: { name: string; sport_id: string; surface: string; price_per_hour: number; features?: string[] }) => {
      if (!facilityId) throw new Error("No facility");
      const { error } = await supabase.from("courts").insert({ ...court, facility_id: facilityId, features: court.features || [] });
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
  const facilityId = useFacilityId();
  const qc = useQueryClient();
  return useMutation({ mutationFn: async (addon: { name: string; price: number; icon: string }) => { if (!facilityId) throw new Error("No facility"); const { error } = await supabase.from("addons").insert({ ...addon, facility_id: facilityId }); if (error) throw error; }, onSuccess: () => { qc.invalidateQueries({ queryKey: ["addons"] }); } });
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
  const facilityId = useFacilityId();
  return useQuery({
    queryKey: ["expenses", facilityId, date],
    queryFn: async () => {
      if (!facilityId) return [];
      let q = supabase.from("expenses").select("*").eq("facility_id", facilityId);
      if (date) q = q.eq("expense_date", date);
      const { data, error } = await q;
      if (error) throw error;
      return data as Expense[];
    },
    enabled: !!facilityId,
  });
}

export function useExpensesRange(startDate?: string, endDate?: string) {
  const facilityId = useFacilityId();
  return useQuery({
    queryKey: ["expenses-range", facilityId, startDate, endDate],
    queryFn: async () => {
      if (!startDate || !endDate || !facilityId) return [];
      const { data, error } = await supabase.from("expenses").select("*")
        .eq("facility_id", facilityId)
        .gte("expense_date", startDate).lte("expense_date", endDate);
      if (error) throw error;
      return data as Expense[];
    },
    enabled: !!startDate && !!endDate && !!facilityId,
  });
}

export function useCreateExpense() {
  const facilityId = useFacilityId();
  const qc = useQueryClient();
  return useMutation({ mutationFn: async (expense: { category: string; description?: string; amount: number; expense_date: string }) => { if (!facilityId) throw new Error("No facility"); const { error } = await supabase.from("expenses").insert({ ...expense, facility_id: facilityId }); if (error) throw error; }, onSuccess: () => { qc.invalidateQueries({ queryKey: ["expenses"] }); qc.invalidateQueries({ queryKey: ["expenses-range"] }); } });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async (id: string) => { const { error } = await supabase.from("expenses").delete().eq("id", id); if (error) throw error; }, onSuccess: () => { qc.invalidateQueries({ queryKey: ["expenses"] }); qc.invalidateQueries({ queryKey: ["expenses-range"] }); } });
}

// Facility Schedules
export function useFacilitySchedules() {
  const facilityId = useFacilityId();
  return useQuery({
    queryKey: ["facility-schedules", facilityId],
    queryFn: async () => {
      if (!facilityId) return [];
      const { data, error } = await supabase.from("facility_schedules").select("*").eq("facility_id", facilityId).order("day_of_week");
      if (error) throw error;
      return data as FacilitySchedule[];
    },
    enabled: !!facilityId,
  });
}

export function useUpsertFacilitySchedule() {
  const facilityId = useFacilityId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (schedules: { day_of_week: number; is_open: boolean; open_time: string; close_time: string }[]) => {
      if (!facilityId) throw new Error("No facility");
      // Delete existing schedules for this facility, then insert fresh
      const { error: delError } = await supabase.from("facility_schedules").delete().eq("facility_id", facilityId);
      if (delError) throw delError;
      const rows = schedules.map((s) => ({
        facility_id: facilityId,
        day_of_week: s.day_of_week,
        is_open: s.is_open,
        open_time: s.open_time,
        close_time: s.close_time,
      }));
      const { error: insError } = await supabase.from("facility_schedules").insert(rows);
      if (insError) throw insError;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["facility-schedules"] }); },
  });
}
