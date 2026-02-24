import AdminLayout from "@/components/layout/AdminLayout";

const AdminSchedule = () => {
  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold">Agenda</h1>
        <p className="text-sm text-muted-foreground">Gestión de horarios y turnos fijos</p>
      </div>
      <div className="text-center py-16 bg-muted/50 rounded-2xl">
        <p className="text-4xl mb-3">📅</p>
        <p className="font-semibold">Agenda completa</p>
        <p className="text-sm text-muted-foreground mt-1">Usá el Dashboard para ver y gestionar la agenda diaria</p>
      </div>
    </AdminLayout>
  );
};

export default AdminSchedule;
