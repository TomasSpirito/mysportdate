import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFacilityId } from "@/contexts/FacilityContext";
import { useState } from "react";

export interface Sport { id: string; name: string; icon: string; }
export interface Court { id: string; facility_id: string; sport_id: string; name: string; surface: string | null; price_per_hour: number; features: string[]; image: string | null; image_url?: string; shared_group_id?: string; is_event?: boolean; duration_minutes?: number; }
export interface Addon { id: string; facility_id: string; name: string; price: number; icon: string; requires_stock: boolean; }
export interface Booking { id: string; court_id: string; user_id: string | null; user_name: string | null; user_email?: string | null; user_phone?: string | null; start_time: string; end_time: string; total_price: number; deposit_amount: number; status: string; payment_status: string; booking_type: string; created_at: string; cancellation_token?: string; cancelled_at?: string | null; }
export interface Expense { id: string; facility_id: string; category: string; description: string | null; amount: number; expense_date: string; created_at: string; }
export interface FacilitySchedule { id: string; facility_id: string; day_of_week: number; is_open: boolean; open_time: string; close_time: string; }
export interface BuffetProduct { id: string; facility_id: string; name: string; category: string; price: number; stock: number; image: string | null; image_url?: string; created_at: string; }
export interface BuffetSale { id: string; facility_id: string; total: number; created_at: string; }
export interface BuffetSaleItem { id: string; sale_id: string; product_id: string | null; product_name: string; quantity: number; unit_price: number; }
export interface Facility { id: string; name: string; slug?: string | null; location: string | null; open_time: string; close_time: string; owner_id: string | null; phone: string | null; email: string | null; whatsapp: string | null;description?: string | null; maps_url?: string | null; instagram_url?: string | null; logo_url?: string | null; cover_url?: string | null; amenities?: string[]; cancellation_window_hours?: number; default_event_duration?: number; default_event_includes?: string;  }
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
      const { data: fCourts } = await supabase.from("courts").select("id").eq("facility_id", facilityId);
      const courtIds = fCourts?.map(c => c.id) || [];
      if (courtIds.length === 0) return [];
      
      // ESTA LÍNEA ES LA CLAVE: Ignora las canceladas
      let q = supabase.from("bookings").select("*").in("court_id", courtIds).neq("status", "cancelled");
      
      if (date) { q = q.gte("start_time", `${date}T00:00:00`).lt("start_time", `${date}T23:59:59`); }
      const { data, error } = await q;
      if (error) throw error;
      return data as Booking[];
    },
    enabled: !!facilityId,
  });
}

// NUEVA FUNCIÓN: Solo trae las canceladas para el registro del admin
export function useCancelledBookings(date?: string) {
  const facilityId = useFacilityId();
  return useQuery({
    queryKey: ["cancelled-bookings", facilityId, date],
    queryFn: async () => {
      if (!facilityId) return [];
      const { data: fCourts } = await supabase.from("courts").select("id").eq("facility_id", facilityId);
      const courtIds = fCourts?.map(c => c.id) || [];
      if (courtIds.length === 0) return [];
      
      // SOLO TRAE LAS CANCELADAS
      let q = supabase.from("bookings").select("*").in("court_id", courtIds).eq("status", "cancelled");
      
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

// NUEVO HOOK EXCLUSIVO PARA LA PESTAÑA JUGADORES (Trae todo, incluye canceladas)
export function useAllBookingsForPlayers(startDate: string, endDate: string) {
  const facilityId = useFacilityId();
  return useQuery({
    queryKey: ["all-bookings-players", facilityId, startDate, endDate],
    queryFn: async () => {
      if (!facilityId) return [];
      const { data: fCourts } = await supabase.from("courts").select("id").eq("facility_id", facilityId);
      const courtIds = fCourts?.map(c => c.id) || [];
      if (courtIds.length === 0) return [];
      
      // LA CLAVE: No filtramos por status. Queremos TODAS para el CRM.
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .in("court_id", courtIds)
        .gte("start_time", `${startDate}T00:00:00`)
        .lte("start_time", `${endDate}T23:59:59`);
        
      if (error) throw error;
      return data as Booking[];
    },
    enabled: !!facilityId,
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
  // Usamos getHours() para obtener la hora local exacta
  const occupiedHours = new Set(bookings.map((b) => new Date(b.start_time).getHours()));
  
  const slots: { time: string; available: boolean }[] = [];
  
  for (let h = openHour; h < closeHour; h++) {
    const displayH = h % 24; 
    
    slots.push({ 
      time: `${displayH.toString().padStart(2, "0")}:00`, 
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
      end_time?: string; // <-- NUEVO: Le avisamos que ahora puede recibir la hora de fin
    }) => {
      // Mantenemos el start_time con tu zona horaria
      const start_time = `${params.date}T${params.time}:00-03:00`;
      
      // NUEVO: Si el formulario nos manda el end_time real, lo usamos. 
      // Si no (por ejemplo, desde otra parte de la app), le sumamos 1 hora por defecto para que no se rompa.
      let final_end_time;
      if (params.end_time) {
          final_end_time = params.end_time;
      } else {
          const startHour = parseInt(params.time.split(":")[0]);
          final_end_time = `${params.date}T${(startHour + 1).toString().padStart(2, "0")}:00:00-03:00`;
      }

      const { data, error } = await supabase.rpc("create_booking" as any, {
        p_court_id: params.court_id, 
        p_start_time: start_time, 
        p_end_time: final_end_time, // <-- Pasamos el end_time correcto a Supabase
        p_user_name: params.user_name, 
        p_user_email: params.user_email, 
        p_user_phone: params.user_phone,
        p_total_price: params.total_price, 
        p_deposit_amount: params.deposit_amount,
        p_payment_status: params.payment_status, 
        p_booking_type: params.booking_type || "online",
        p_addon_ids: params.addon_ids || [],
      });
      
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: ["bookings"] }); 
      qc.invalidateQueries({ queryKey: ["bookings-range"] }); 
    },
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

// --- Courts uploads ---
export function useUploadCourtImage() {
  const facilityId = useFacilityId();
  const [uploadingImage, setUploadingImage] = useState(false);

  const uploadImage = async (file: File) => {
    if (!facilityId) throw new Error("No facility");
    setUploadingImage(true);
    
    try {
      const fileName = `${facilityId}/${Date.now()}_${file.name}`;

      const { data, error } = await supabase.storage
        .from('courts') // Apuntamos al nuevo bucket
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from('courts')
        .getPublicUrl(fileName);

      return publicUrlData.publicUrl;
    } catch (error) {
      console.error("Error subiendo imagen de cancha:", error);
      throw error;
    } finally {
      setUploadingImage(false);
    }
  };

  return { uploadImage, uploadingImage };
}

// --- Facility uploads ---
export function useUploadFacilityImage() {
  const facilityId = useFacilityId();
  const [uploadingImage, setUploadingImage] = useState(false);

  const uploadImage = async (file: File, type: 'logo' | 'cover') => {
    if (!facilityId) throw new Error("No facility");
    setUploadingImage(true);
    
    try {
      const fileName = `${facilityId}/${type}_${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from('facilities').upload(fileName, file, { cacheControl: '3600', upsert: true });
      if (error) throw error;
      const { data: publicUrlData } = supabase.storage.from('facilities').getPublicUrl(fileName);
      return publicUrlData.publicUrl;
    } catch (error) {
      console.error("Error subiendo imagen del predio:", error);
      throw error;
    } finally {
      setUploadingImage(false);
    }
  };

  return { uploadImage, uploadingImage };
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
// --- Expenses ---
export function useCreateExpense() {
  const facilityId = useFacilityId();
  const qc = useQueryClient();
  return useMutation({ 
    mutationFn: async (expense: { category: string; description?: string; amount: number; expense_date: string; payment_method: string }) => { 
        if (!facilityId) throw new Error("No facility"); 
        const { error } = await supabase.from("expenses").insert({ ...expense, facility_id: facilityId }); 
        if (error) throw error; 
    }, 
    onSuccess: () => { 
        qc.invalidateQueries({ queryKey: ["expenses"] }); 
        qc.invalidateQueries({ queryKey: ["expenses-range"] }); 
    } 
  });
}

export function useUpdateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; category?: string; description?: string; amount?: number; expense_date?: string; payment_method?: string }) => {
      const { error } = await supabase.from("expenses").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["expenses"] }); },
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({ 
      mutationFn: async (id: string) => { 
          const { error } = await supabase.from("expenses").delete().eq("id", id); 
          if (error) throw error; 
      }, 
      onSuccess: () => { 
          qc.invalidateQueries({ queryKey: ["expenses"] }); 
          qc.invalidateQueries({ queryKey: ["expenses-range"] }); 
      } 
  });
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

// ── Buffet ──

export function useBuffetProducts() {
  const facilityId = useFacilityId();
  return useQuery({
    queryKey: ["buffet-products", facilityId],
    queryFn: async () => {
      if (!facilityId) return [];
      const { data, error } = await supabase.from("buffet_products").select("*").eq("facility_id", facilityId).order("name");
      if (error) throw error;
      return data as BuffetProduct[];
    },
    enabled: !!facilityId,
  });
}

export function useCreateBuffetProduct() {
  const facilityId = useFacilityId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (product: { name: string; category: string; price: number; stock: number; image_url?: string }) => {
      if (!facilityId) throw new Error("No facility");
      const { data, error } = await supabase
        .from("buffet_products")
        .insert({ ...product, facility_id: facilityId } as any)
        .select() // <-- PEDIMOS QUE NOS DEVUELVA EL REGISTRO
        .single(); // <-- COMO ES UNO SOLO, USAMOS SINGLE
      if (error) throw error;
      return data; // <-- DEVOLVEMOS LA DATA PARA USAR SU ID
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["buffet-products"] }); },
  });
}

export function useUpdateBuffetProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; category?: string; price?: number; stock?: number }) => {
      const { error } = await supabase.from("buffet_products").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["buffet-products"] }); },
  });
}

export function useDeleteBuffetProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("buffet_products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["buffet-products"] }); },
  });
}

export function useBuffetSales(date?: string) {
  const facilityId = useFacilityId();
  return useQuery({
    queryKey: ["buffet-sales", facilityId, date],
    queryFn: async () => {
      if (!facilityId) return [];
      let q = supabase.from("buffet_sales").select("*").eq("facility_id", facilityId).order("created_at", { ascending: false });
      if (date) {
        q = q.gte("created_at", `${date}T00:00:00`).lt("created_at", `${date}T23:59:59`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data as BuffetSale[];
    },
    enabled: !!facilityId,
  });
}

export function useBuffetSalesRange(startDate?: string, endDate?: string) {
  const facilityId = useFacilityId();
  return useQuery({
    queryKey: ["buffet-sales-range", facilityId, startDate, endDate],
    queryFn: async () => {
      if (!startDate || !endDate || !facilityId) return [];
      const { data, error } = await supabase.from("buffet_sales").select("*")
        .eq("facility_id", facilityId)
        .gte("created_at", `${startDate}T00:00:00`).lt("created_at", `${endDate}T23:59:59`);
      if (error) throw error;
      return data as BuffetSale[];
    },
    enabled: !!startDate && !!endDate && !!facilityId,
  });
}

export function useCreateBuffetSale() {
  const facilityId = useFacilityId();
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: { 
        total: number; 
        items: { product_id: string; product_name: string; quantity: number; unit_price: number }[];
        payment_method: string; // <-- NUEVO: Recibimos el método de pago
    }) => {
      if (!facilityId) throw new Error("No facility");
      
      // NUEVO: Pasamos el payment_method a la base de datos
      const { data: sale, error: saleError } = await supabase
        .from("buffet_sales")
        .insert({ 
            facility_id: facilityId, 
            total: params.total,
            payment_method: params.payment_method 
        } as any)
        .select("id")
        .single();
        
      if (saleError) throw saleError;
      
      const saleItems = params.items.map((item) => ({ sale_id: sale.id, ...item }));
      const { error: itemsError } = await supabase.from("buffet_sale_items").insert(saleItems as any);
      if (itemsError) throw itemsError;
      
      // Decrease stock for each product
      for (const item of params.items) {
        const { data: product } = await supabase.from("buffet_products").select("stock").eq("id", item.product_id).single();
        if (product) {
          await supabase.from("buffet_products").update({ stock: Math.max(0, product.stock - item.quantity) } as any).eq("id", item.product_id);
        }
      }
      
      return sale.id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["buffet-products"] });
      qc.invalidateQueries({ queryKey: ["buffet-sales"] });
      qc.invalidateQueries({ queryKey: ["buffet-sales-range"] });
    },
  });
}

// --- Buffet uploads ---

export function useUploadBuffetImage() {
  const facilityId = useFacilityId();
  const [uploadingImage, setUploadingImage] = useState(false);

  // mutationFn simplificada para manejar la subida
  const uploadImage = async (file: File) => {
    if (!facilityId) throw new Error("No facility");
    setUploadingImage(true);
    
    try {
      // Creamos un nombre de archivo único: facility_id / timestamp_nombreoriginal
      const fileExt = file.name.split('.').pop();
      const fileName = `${facilityId}/${Date.now()}_${file.name}`;

      const { data, error } = await supabase.storage
        .from('buffet') // El bucket que creamos en SQL
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true, // Si ya existe, lo pisa (el timestamp evita esto)
        });

      if (error) throw error;

      // Obtenemos la URL pública final
      const { data: publicUrlData } = supabase.storage
        .from('buffet')
        .getPublicUrl(fileName);

      return publicUrlData.publicUrl;
    } catch (error) {
      console.error("Error subiendo imagen:", error);
      throw error;
    } finally {
      setUploadingImage(false);
    }
  };

  return { uploadImage, uploadingImage };
}
// --- Buffet Purchases ---
export function useCreateBuffetPurchase() {
  const queryClient = useQueryClient();
  const facilityId = useFacilityId();
  return useMutation({
    mutationFn: async (purchase: { product_id: string; quantity: number; unit_price: number; total_price: number; payment_method: string }) => {
      if (!facilityId) throw new Error("No facility");
      const { data, error } = await supabase
        .from('buffet_purchases')
        .insert([{ ...purchase, facility_id: facilityId }]);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Refrescamos el buffet y los gastos para que se actualice todo mágicamente
      queryClient.invalidateQueries({ queryKey: ['buffet_products'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    }
  });
}

// --- HOOKS PARA FERIADOS ---
export interface Holiday {
    id: string;
    facility_id: string;
    date: string;
    label: string;
    is_closed: boolean;
    custom_open_time?: string;
    custom_close_time?: string;
}

export const useHolidays = () => {
    const { data: facility } = useFacility();
    return useQuery({
        queryKey: ['holidays', facility?.id],
        queryFn: async () => {
            if (!facility?.id) return [];
            const { data, error } = await supabase.from('holidays').select('*').eq('facility_id', facility.id).order('date', { ascending: true });
            if (error) throw error;
            return data as Holiday[];
        },
        enabled: !!facility?.id
    });
};

export const useCreateHoliday = () => {
    const queryClient = useQueryClient();
    const { data: facility } = useFacility();
    return useMutation({
        mutationFn: async (newHoliday: Partial<Holiday>) => {
            if (!facility?.id) throw new Error("No hay predio");
            const { data, error } = await supabase.from('holidays').insert([{ ...newHoliday, facility_id: facility.id }]).select().single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['holidays', facility?.id] })
    });
};

export const useDeleteHoliday = () => {
    const queryClient = useQueryClient();
    const { data: facility } = useFacility();
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('holidays').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['holidays', facility?.id] })
    });
};