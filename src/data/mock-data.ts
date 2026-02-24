export interface Sport {
  id: string;
  name: string;
  icon: string;
}

export interface Court {
  id: string;
  facilityId: string;
  sportId: string;
  name: string;
  surface: string;
  pricePerHour: number;
  image?: string;
  features: string[];
}

export interface Addon {
  id: string;
  facilityId: string;
  name: string;
  price: number;
  icon: string;
}

export interface TimeSlot {
  time: string;
  available: boolean;
}

export interface Booking {
  id: string;
  courtId: string;
  courtName: string;
  userName: string;
  date: string;
  startTime: string;
  endTime: string;
  totalPrice: number;
  depositAmount: number;
  status: "pending" | "confirmed" | "cancelled";
  paymentStatus: "partial" | "full" | "none";
  addons: string[];
  type: "online" | "manual" | "fixed";
}

export const sports: Sport[] = [
  { id: "futbol", name: "Fútbol", icon: "⚽" },
  { id: "padel", name: "Pádel", icon: "🏸" },
  { id: "tenis", name: "Tenis", icon: "🎾" },
];

export const courts: Court[] = [
  { id: "c1", facilityId: "f1", sportId: "futbol", name: "Cancha 1 - Techada", surface: "Sintético", pricePerHour: 25000, features: ["Techada", "Iluminación LED", "Vestuarios"] },
  { id: "c2", facilityId: "f1", sportId: "futbol", name: "Cancha 2 - Descubierta", surface: "Césped Natural", pricePerHour: 20000, features: ["Descubierta", "Iluminación", "Estacionamiento"] },
  { id: "c3", facilityId: "f1", sportId: "padel", name: "Pádel Court A", surface: "Cristal", pricePerHour: 18000, features: ["Techada", "Cristal panorámico", "Iluminación LED"] },
  { id: "c4", facilityId: "f1", sportId: "padel", name: "Pádel Court B", surface: "Cristal", pricePerHour: 18000, features: ["Descubierta", "Cristal"] },
  { id: "c5", facilityId: "f1", sportId: "tenis", name: "Tenis - Polvo de Ladrillo", surface: "Polvo de Ladrillo", pricePerHour: 22000, features: ["Iluminación", "Tribuna", "Vestuarios"] },
];

export const addons: Addon[] = [
  { id: "a1", facilityId: "f1", name: "Parrilla", price: 5000, icon: "🔥" },
  { id: "a2", facilityId: "f1", name: "Pelota", price: 2000, icon: "⚽" },
  { id: "a3", facilityId: "f1", name: "Pecheras", price: 1500, icon: "🦺" },
  { id: "a4", facilityId: "f1", name: "Agua (x6)", price: 3000, icon: "💧" },
];

export const generateTimeSlots = (courtId: string, date: string): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  const occupiedHours = getOccupiedHours(courtId, date);
  for (let h = 8; h <= 23; h++) {
    const time = `${h.toString().padStart(2, "0")}:00`;
    slots.push({ time, available: !occupiedHours.includes(h) });
  }
  return slots;
};

const getOccupiedHours = (courtId: string, _date: string): number[] => {
  const occupied: Record<string, number[]> = {
    c1: [10, 11, 15, 16, 20, 21],
    c2: [9, 14, 18, 19],
    c3: [10, 17, 18, 21],
    c4: [11, 12, 16],
    c5: [8, 9, 15, 20, 21],
  };
  return occupied[courtId] || [];
};

export const mockBookings: Booking[] = [
  { id: "b1", courtId: "c1", courtName: "Cancha 1 - Techada", userName: "Martín López", date: "2026-02-24", startTime: "10:00", endTime: "11:00", totalPrice: 25000, depositAmount: 10000, status: "confirmed", paymentStatus: "partial", addons: ["Pelota"], type: "online" },
  { id: "b2", courtId: "c1", courtName: "Cancha 1 - Techada", userName: "Lucía García", date: "2026-02-24", startTime: "15:00", endTime: "16:00", totalPrice: 25000, depositAmount: 25000, status: "confirmed", paymentStatus: "full", addons: [], type: "online" },
  { id: "b3", courtId: "c1", courtName: "Cancha 1 - Techada", userName: "Equipo Fijo Miércoles", date: "2026-02-24", startTime: "20:00", endTime: "21:00", totalPrice: 25000, depositAmount: 25000, status: "confirmed", paymentStatus: "full", addons: ["Parrilla"], type: "fixed" },
  { id: "b4", courtId: "c2", courtName: "Cancha 2 - Descubierta", userName: "Pablo Ruiz", date: "2026-02-24", startTime: "09:00", endTime: "10:00", totalPrice: 20000, depositAmount: 8000, status: "confirmed", paymentStatus: "partial", addons: [], type: "online" },
  { id: "b5", courtId: "c2", courtName: "Cancha 2 - Descubierta", userName: "Admin - Reserva Manual", date: "2026-02-24", startTime: "14:00", endTime: "15:00", totalPrice: 20000, depositAmount: 0, status: "confirmed", paymentStatus: "none", addons: [], type: "manual" },
  { id: "b6", courtId: "c2", courtName: "Cancha 2 - Descubierta", userName: "Carlos Méndez", date: "2026-02-24", startTime: "18:00", endTime: "19:00", totalPrice: 20000, depositAmount: 10000, status: "confirmed", paymentStatus: "partial", addons: ["Pecheras"], type: "online" },
  { id: "b7", courtId: "c3", courtName: "Pádel Court A", userName: "Ana Torres", date: "2026-02-24", startTime: "10:00", endTime: "11:00", totalPrice: 18000, depositAmount: 18000, status: "confirmed", paymentStatus: "full", addons: [], type: "online" },
  { id: "b8", courtId: "c3", courtName: "Pádel Court A", userName: "Grupo Jueves Pádel", date: "2026-02-24", startTime: "17:00", endTime: "18:00", totalPrice: 18000, depositAmount: 18000, status: "confirmed", paymentStatus: "full", addons: [], type: "fixed" },
];

export const dailyStats = {
  totalBookings: 14,
  totalRevenue: 312000,
  totalDeposits: 185000,
  pendingPayments: 127000,
  occupancyRate: 72,
  bookingsByHour: [
    { hour: "08:00", count: 2 },
    { hour: "09:00", count: 3 },
    { hour: "10:00", count: 4 },
    { hour: "11:00", count: 3 },
    { hour: "12:00", count: 1 },
    { hour: "13:00", count: 1 },
    { hour: "14:00", count: 2 },
    { hour: "15:00", count: 3 },
    { hour: "16:00", count: 2 },
    { hour: "17:00", count: 3 },
    { hour: "18:00", count: 4 },
    { hour: "19:00", count: 4 },
    { hour: "20:00", count: 5 },
    { hour: "21:00", count: 4 },
    { hour: "22:00", count: 3 },
    { hour: "23:00", count: 1 },
  ],
  weeklyRevenue: [
    { day: "Lun", revenue: 280000 },
    { day: "Mar", revenue: 310000 },
    { day: "Mié", revenue: 350000 },
    { day: "Jue", revenue: 290000 },
    { day: "Vie", revenue: 420000 },
    { day: "Sáb", revenue: 550000 },
    { day: "Dom", revenue: 480000 },
  ],
  sportBreakdown: [
    { sport: "Fútbol", percentage: 55, color: "hsl(152, 76%, 36%)" },
    { sport: "Pádel", percentage: 30, color: "hsl(24, 95%, 53%)" },
    { sport: "Tenis", percentage: 15, color: "hsl(210, 100%, 52%)" },
  ],
};
