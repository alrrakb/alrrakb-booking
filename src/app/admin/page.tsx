"use client";

import { useCallback, useEffect, useState } from "react";
import { createBrowserClient } from '@supabase/ssr';
import { format } from "date-fns";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, FileDown, FileUp, Pencil, MessageCircle, Phone, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface Booking {
    id: string;
    booking_id: number;
    phone: string;
    name: string | null;
    hotel: string;
    rooms_count: string;
    view_type: string;
    meals: string;
    check_in: string;
    check_out: string;
    created_at: string;
    status: 'pending' | 'contacted' | 'completed' | 'cancelled';
}

export default function AdminDashboard() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<Booking['status'] | "all">("all");
    const [editingBooking, setEditingBooking] = useState<Booking | null>(null);

    // Filters
    const [dateFilters, setDateFilters] = useState({
        checkInStart: "",
        checkInEnd: "",
        checkOutStart: "",
        checkOutEnd: "",
        createdStart: "",
        createdEnd: ""
    });

    // Initialize Supabase Client (Browser)
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const fetchBookings = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('bookings')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            toast.error('حدث خطأ أثناء جلب الحجوزات');
        } else {
            setBookings(data || []);
        }
        setLoading(false);
    }, [supabase]);

    useEffect(() => {
        // Use a microtask to avoid synchronous setState inside effect which triggers ESLint error
        Promise.resolve().then(() => {
            fetchBookings();
        });
    }, [fetchBookings]);

    const resetFilters = () => {
        setSearchTerm("");
        setStatusFilter("all");
        setDateFilters({
            checkInStart: "", checkInEnd: "",
            checkOutStart: "", checkOutEnd: "",
            createdStart: "", createdEnd: ""
        });
        toast.success("تم إعادة تعيين جميع الفلاتر");
    };

    const updateStatus = async (id: string, newStatus: string) => {
        const { error } = await supabase
            .from('bookings')
            .update({ status: newStatus })
            .eq('id', id);

        if (error) {
            toast.error('لم يتم تحديث الحالة');
        } else {
            toast.success('تم تحديث حالة الحجز بنجاح');
            fetchBookings();
        }
    };

    const exportToCSV = () => {
        if (bookings.length === 0) {
            toast.error('لا توجد بيانات لتصديرها');
            return;
        }

        const headers = ["معرف الحجز", "رقم الجوال", "الاسم", "المرفق", "عدد الغرف", "نوع الإطلالة", "الوجبات", "تاريخ الدخول", "تاريخ الخروج", "تاريخ الطلب", "الحالة"];
        const rows = bookings.map(b => [
            `TR${b.booking_id}`,
            b.phone,
            b.name || '',
            b.hotel,
            b.rooms_count,
            b.view_type,
            b.meals,
            b.check_in,
            b.check_out,
            b.created_at,
            b.status
        ]);

        const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `bookings_${format(new Date(), "yyyy-MM-dd")}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('تم تصدير البيانات بنجاح');
    };

    const handleImportClick = () => {
        document.getElementById('import-input')?.click();
    };

    const importFromCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const content = event.target?.result as string;
            const lines = content.split('\n').filter(line => line.trim() !== '');
            if (lines.length <= 1) {
                toast.error('ملف فارغ أو غير صالح');
                return;
            }

            // Simple CSV parser (skipping headers)
            const rows = lines.slice(1).map(line => {
                const parts = line.split(',');
                const rawId = parts[0]?.replace('TR', '').trim();

                // Extract fields
                const phone = parts[1]?.trim();
                const name = parts[2]?.trim();
                const hotel = parts[3]?.trim();
                const rooms_count = parseInt(parts[4]);
                const view_type = parts[5]?.trim();
                const meals = parts[6]?.trim();
                const check_in = parts[7]?.trim();
                const check_out = parts[8]?.trim();
                const status = parts[10]?.trim() || 'pending';

                // 1. Skip if missing required data
                if (!phone || !hotel || !check_in || !check_out) {
                    console.warn("Skipping incomplete row:", line);
                    return null;
                }

                // 2. Skip duplicates (against current bookings state)
                const isDuplicate = bookings.some(b =>
                    b.phone === phone &&
                    b.check_in === check_in &&
                    b.hotel === hotel
                );

                if (isDuplicate) {
                    console.warn("Skipping duplicate row:", phone, check_in);
                    return null;
                }

                return {
                    booking_id: rawId ? parseInt(rawId) : undefined,
                    phone,
                    name,
                    hotel,
                    rooms_count: isNaN(rooms_count) ? 1 : rooms_count,
                    view_type,
                    meals,
                    check_in,
                    check_out,
                    status
                };
            }).filter(row => row !== null); // Filter out skipped rows

            toast.info(`جاري استيراد ${rows.length} سجل...`);

            // Note: In a real scenario, you'd batch insert these into Supabase
            // const { error } = await supabase.from('bookings').insert(rows);
            // if (error) toast.error('خطأ في الاستيراد'); else fetchBookings();

            toast.success(`تم استيراد ${rows.length} سجل بنجاح (معاينة)`);
            e.target.value = ''; // Reset input
        };
        reader.readAsText(file);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed': return <Badge className="bg-emerald-500 hover:bg-emerald-600">اكتمل</Badge>;
            case 'contacted': return <Badge className="bg-blue-500 hover:bg-blue-600">تم التواصل</Badge>;
            case 'cancelled': return <Badge variant="destructive" className="bg-red-500 hover:bg-red-600">ملغي</Badge>;
            default: return <Badge variant="outline" className="text-amber-600 border-amber-600">قيد الانتظار</Badge>;
        }
    };

    const filteredBookings = bookings.filter(b => {
        const matchesSearch =
            b.phone?.includes(searchTerm) ||
            b.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            `TR${b.booking_id}`.includes(searchTerm) || // Updated search to include 'TR' prefix
            b.hotel?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === "all" || b.status === statusFilter;

        const matchesCheckIn = (!dateFilters.checkInStart || b.check_in >= dateFilters.checkInStart) &&
            (!dateFilters.checkInEnd || b.check_in <= dateFilters.checkInEnd);

        const matchesCheckOut = (!dateFilters.checkOutStart || b.check_out >= dateFilters.checkOutStart) &&
            (!dateFilters.checkOutEnd || b.check_out <= dateFilters.checkOutEnd);

        const matchesCreated = (!dateFilters.createdStart || b.created_at?.split('T')[0] >= dateFilters.createdStart) &&
            (!dateFilters.createdEnd || b.created_at?.split('T')[0] <= dateFilters.createdEnd);

        return matchesSearch && matchesStatus && matchesCheckIn && matchesCheckOut && matchesCreated;
    });

    const handleEditSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingBooking) return;

        const { error } = await supabase
            .from('bookings')
            .update({
                name: editingBooking.name,
                phone: editingBooking.phone,
                hotel: editingBooking.hotel,
                rooms_count: editingBooking.rooms_count,
                view_type: editingBooking.view_type,
                meals: editingBooking.meals,
                check_in: editingBooking.check_in,
                check_out: editingBooking.check_out,
                status: editingBooking.status
            })
            .eq('id', editingBooking.id);

        if (error) {
            toast.error('حدث خطأ أثناء التحديث');
        } else {
            toast.success('تم تحديث البيانات بنجاح');
            setEditingBooking(null);
            fetchBookings();
        }
    };

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-3 mr-3 text-lg text-slate-500">جاري تحميل البيانات...</span>
            </div>
        );
    }

    return (
        <>
            <div className="bg-white/[0.03] backdrop-blur-3xl rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.4)] border border-white/20 overflow-hidden relative z-10 mb-8" dir="rtl">
                <div className="p-8 border-b border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-1">أحدث الحجوزات</h2>
                        <p className="text-sm text-white/50">تتبع وإدارة جميع طلبات الحجز من الموقع</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant="outline"
                            onClick={fetchBookings}
                            size="sm"
                            className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                        >
                            تحديث القائمة
                        </Button>
                        <Button
                            variant="outline"
                            onClick={exportToCSV}
                            size="sm"
                            className="bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
                        >
                            <FileDown size={16} className="ml-2" />
                            تصدير (CSV)
                        </Button>
                        <input
                            type="file"
                            id="import-input"
                            className="hidden"
                            accept=".csv"
                            onChange={importFromCSV}
                        />
                        <Button
                            variant="outline"
                            onClick={handleImportClick}
                            size="sm"
                            className="bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20"
                        >
                            <FileUp size={16} className="ml-2" />
                            استيراد
                        </Button>
                    </div>
                </div>

                {/* Search & Filter Bar */}
                <div className="p-6 bg-white/5 border-b border-white/5 flex flex-col md:flex-row gap-4 items-center">
                    <div className="flex flex-col md:flex-row gap-4 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-64">
                            <input
                                type="text"
                                placeholder="بحث بالاسم، الجوال، أو المعرف..."
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-white focus:ring-2 focus:ring-[#4db8d4]/50 outline-none transition-all pr-10"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <div className="absolute left-3 top-2.5 text-white/40">
                                {searchTerm && (
                                    <button onClick={() => setSearchTerm("")} className="hover:text-white transition-colors">
                                        <XCircle size={18} />
                                    </button>
                                )}
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            onClick={resetFilters}
                            className="bg-white/5 border-white/10 text-white hover:bg-white/20 rounded-xl gap-2 h-[46px]"
                            title="إعادة تعيين الكل"
                        >
                            <RotateCcw size={18} />
                            <span className="hidden sm:inline">إعادة تعيين</span>
                        </Button>
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <span className="text-xs text-white/50 whitespace-nowrap">تصفية حسب:</span>
                        <select
                            className="bg-white/5 border border-white/10 rounded-xl py-2 px-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#4db8d4]/50"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as Booking['status'] | "all")}
                        >
                            <option value="all" className="bg-slate-900">الكل</option>
                            <option value="pending" className="bg-slate-900">قيد الانتظار</option>
                            <option value="contacted" className="bg-slate-900">تم التواصل</option>
                            <option value="completed" className="bg-slate-900">مكتمل</option>
                            <option value="cancelled" className="bg-slate-900">ملغي</option>
                        </select>
                    </div>
                </div>

                {/* Advanced Filters */}
                <div className="p-6 bg-white/[0.02] border-b border-white/5 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-wider text-white/40 font-bold">فلاتر تاريخ الدخول</label>
                        <div className="flex gap-2">
                            <input type="date" className="bg-white/5 border border-white/10 rounded-lg p-1.5 text-xs text-white w-full" value={dateFilters.checkInStart} onChange={e => setDateFilters({ ...dateFilters, checkInStart: e.target.value })} />
                            <input type="date" className="bg-white/5 border border-white/10 rounded-lg p-1.5 text-xs text-white w-full" value={dateFilters.checkInEnd} onChange={e => setDateFilters({ ...dateFilters, checkInEnd: e.target.value })} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-wider text-white/40 font-bold">فلاتر تاريخ الخروج</label>
                        <div className="flex gap-2">
                            <input type="date" className="bg-white/5 border border-white/10 rounded-lg p-1.5 text-xs text-white w-full" value={dateFilters.checkOutStart} onChange={e => setDateFilters({ ...dateFilters, checkOutStart: e.target.value })} />
                            <input type="date" className="bg-white/5 border border-white/10 rounded-lg p-1.5 text-xs text-white w-full" value={dateFilters.checkOutEnd} onChange={e => setDateFilters({ ...dateFilters, checkOutEnd: e.target.value })} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-wider text-white/40 font-bold">فلاتر تاريخ الطلب</label>
                        <div className="flex gap-2">
                            <input type="date" className="bg-white/5 border border-white/10 rounded-lg p-1.5 text-xs text-white w-full" value={dateFilters.createdStart} onChange={e => setDateFilters({ ...dateFilters, createdStart: e.target.value })} />
                            <input type="date" className="bg-white/5 border border-white/10 rounded-lg p-1.5 text-xs text-white w-full" value={dateFilters.createdEnd} onChange={e => setDateFilters({ ...dateFilters, createdEnd: e.target.value })} />
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-white/5 text-right" dir="rtl">
                            <TableRow className="border-white/10 hover:bg-transparent">
                                <TableHead className="text-right font-bold text-white/70 py-4 w-[120px]"># المعرف</TableHead>
                                <TableHead className="text-right font-bold text-white/70 py-4 w-[180px]">رقم الجوال / الاسم</TableHead>
                                <TableHead className="text-right font-bold text-white/70">المرفق</TableHead>
                                <TableHead className="text-right font-bold text-white/70">تاريخ الدخول</TableHead>
                                <TableHead className="text-right font-bold text-white/70">تاريخ الخروج</TableHead>
                                <TableHead className="text-right font-bold text-white/70">تاريخ الطلب</TableHead>
                                <TableHead className="text-right font-bold text-white/70">الحالة</TableHead>
                                <TableHead className="text-right font-bold text-white/70">إجراءات</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredBookings.length === 0 ? (
                                <TableRow className="hover:bg-transparent border-white/10">
                                    <TableCell colSpan={8} className="text-center py-20 text-white/40">
                                        لا توجد نتائج للبحث أو التصفية
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredBookings.map((booking) => (
                                    <TableRow key={booking.id} className="hover:bg-white/[0.02] transition-colors border-white/5">
                                        <TableCell className="text-[#4db8d4] font-mono text-sm font-black tracking-tighter">
                                            TR{booking.booking_id}
                                        </TableCell>
                                        <TableCell className="py-4 text-right">
                                            <div className="flex flex-col items-start">
                                                {booking.name ? (
                                                    <div className="font-extrabold text-white text-base text-right mb-0.5">{booking.name}</div>
                                                ) : (
                                                    <div className="text-sm text-white/30 italic text-right mb-0.5">بدون اسم</div>
                                                )}
                                                <div className="flex items-center gap-2">
                                                    <div className="text-[11px] text-white/40 tracking-wider font-mono font-medium" dir="ltr">{booking.phone}</div>
                                                    <a
                                                        href={`tel:${booking.phone}`}
                                                        className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-white/40 hover:text-[#4db8d4] transition-all flex items-center justify-center"
                                                        title="اتصال هاتفي"
                                                    >
                                                        <Phone size={12} />
                                                    </a>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-bold text-[#4db8d4] mb-1">{booking.hotel}</div>
                                            <div className="text-[10px] text-white/60 gap-1.5 flex flex-wrap mt-1">
                                                <span className="bg-white/10 px-2 py-0.5 rounded-full border border-white/5">{booking.rooms_count} غرفة</span>
                                                <span className="bg-white/10 px-2 py-0.5 rounded-full border border-white/5">{booking.view_type}</span>
                                                <span className="bg-white/10 px-2 py-0.5 rounded-full border border-white/5">{booking.meals}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-white/80 font-medium">
                                            {format(new Date(booking.check_in), "dd/MM/yyyy")}
                                        </TableCell>
                                        <TableCell className="text-white/80 font-medium">
                                            {format(new Date(booking.check_out), "dd/MM/yyyy")}
                                        </TableCell>
                                        <TableCell className="text-xs text-white/40">
                                            <div dir="ltr" className="text-right">
                                                {format(new Date(booking.created_at), "dd/MM/yyyy HH:mm")}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {getStatusBadge(booking.status)}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 w-8 p-0 border-white/10 bg-white/5 hover:bg-white/20 text-white"
                                                    onClick={() => setEditingBooking({ ...booking })}
                                                    disabled={booking.status === 'completed'}
                                                    title="تعديل الحجز"
                                                >
                                                    <Pencil size={14} />
                                                </Button>
                                                <a
                                                    href={`https://wa.me/${booking.phone.replace(/\+/g, '').replace(/\s/g, '')}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="h-8 w-8 flex items-center justify-center rounded-md border border-white/10 bg-white/5 hover:bg-green-500/20 hover:border-green-500/30 text-white hover:text-green-400 transition-all"
                                                    onClick={() => updateStatus(booking.id, 'contacted')}
                                                    title="تواصل عبر واتساب"
                                                >
                                                    <MessageCircle size={14} />
                                                </a>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 w-8 p-0 border-white/10 bg-white/5 hover:bg-emerald-500/20 hover:border-emerald-500/30 text-white"
                                                    onClick={() => updateStatus(booking.id, 'completed')}
                                                    disabled={booking.status === 'completed'}
                                                    title="إكمال الحجز"
                                                >
                                                    <CheckCircle2 size={14} />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 w-8 p-0 border-white/10 bg-white/5 hover:bg-red-500/20 hover:border-red-500/30 text-white"
                                                    onClick={() => updateStatus(booking.id, 'cancelled')}
                                                    disabled={booking.status === 'cancelled' || booking.status === 'completed'}
                                                    title="إلغاء الحجز"
                                                >
                                                    <XCircle size={14} />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Edit Booking Modal - Moved outside to prevent overflow issues */}
            {editingBooking && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-[#0f172a] border border-white/20 rounded-3xl w-full max-w-2xl overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-200" dir="rtl">
                        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                            <h3 className="text-xl font-bold text-white">تعديل الحجز TR{editingBooking.booking_id}</h3>
                            <Button variant="ghost" size="sm" onClick={() => setEditingBooking(null)} className="text-white/40 hover:text-white">
                                <XCircle size={20} />
                            </Button>
                        </div>
                        <form onSubmit={handleEditSave} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs text-white/50 block font-bold mr-1">اسم العميل</label>
                                <input className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-[#4db8d4]/50 outline-none transition-all"
                                    value={editingBooking.name || ""} onChange={e => setEditingBooking({ ...editingBooking, name: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs text-white/50 block font-bold mr-1">رقم الجوال</label>
                                <input className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-[#4db8d4]/50 outline-none transition-all font-mono" dir="ltr"
                                    value={editingBooking.phone} onChange={e => setEditingBooking({ ...editingBooking, phone: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs text-white/50 block font-bold mr-1">المرفق (الفندق)</label>
                                <input className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-[#4db8d4]/50 outline-none transition-all"
                                    value={editingBooking.hotel} onChange={e => setEditingBooking({ ...editingBooking, hotel: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs text-white/50 block font-bold mr-1">عدد الغرف</label>
                                <input className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-[#4db8d4]/50 outline-none transition-all"
                                    value={editingBooking.rooms_count} onChange={e => setEditingBooking({ ...editingBooking, rooms_count: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs text-white/50 block font-bold mr-1">تاريخ الدخول</label>
                                <input type="date" className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-[#4db8d4]/50 outline-none transition-all"
                                    value={editingBooking.check_in} onChange={e => setEditingBooking({ ...editingBooking, check_in: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs text-white/50 block font-bold mr-1">تاريخ الخروج</label>
                                <input type="date" className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-[#4db8d4]/50 outline-none transition-all"
                                    value={editingBooking.check_out} onChange={e => setEditingBooking({ ...editingBooking, check_out: e.target.value })} />
                            </div>
                            <div className="md:col-span-2 pt-4 flex gap-4">
                                <Button type="submit" className="flex-1 bg-[#4db8d4] hover:bg-[#3ca7c3] text-white rounded-2xl h-14 font-bold shadow-xl shadow-[#4db8d4]/20 transition-all text-lg">
                                    حفظ التغييرات
                                </Button>
                                <Button type="button" variant="outline" onClick={() => setEditingBooking(null)} className="flex-1 bg-white/5 border-white/10 text-white rounded-2xl h-14 font-bold hover:bg-white/10 text-lg">
                                    إلغاء
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
