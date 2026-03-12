"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { createBrowserClient } from '@supabase/ssr';
import { getFormFields, FormField } from "@/actions/form-builder.actions";
import { useSearchParams, useRouter } from "next/navigation";
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
import { Loader2, CheckCircle2, XCircle, FileDown, FileUp, Pencil, Phone, RotateCcw, CalendarCheck, Settings, ExternalLink, Filter } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { FormBuilderModal } from "@/components/admin/form-builder-modal";
import SocialLinksModal from "@/components/admin/social-links-modal";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
    AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
    AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel
} from "@/components/ui/alert-dialog";
import { ShieldAlert } from "lucide-react";

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
    status: 'pending' | 'contacted' | 'confirmed' | 'completed' | 'cancelled';
    payload?: Record<string, unknown>;
}

// Arabic month name → month index (0-based) mapping for import parsing
const ARABIC_MONTHS: Record<string, number> = {
    'يناير': 0, 'فبراير': 1, 'مارس': 2, 'أبريل': 3, 'مايو': 4, 'يونيو': 5,
    'يوليو': 6, 'أغسطس': 7, 'سبتمبر': 8, 'أكتوبر': 9, 'نوفمبر': 10, 'ديسمبر': 11,
};

/**
 * Parse a localized Arabic date string (e.g. "12 مارس 2026") to ISO "YYYY-MM-DD".
 * Returns null if parsing fails.
 */
function parseArabicDate(str: string): string | null {
    if (!str) return null;
    // Remove Arabic-Indic digits and normalise commas/spaces
    const normalised = str.trim().replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660));
    // Try to split by space — expected: [day, monthName, year]
    const parts = normalised.split(' ').map(p => p.trim()).filter(Boolean);
    if (parts.length >= 3) {
        const day = parseInt(parts[0]);
        const month = ARABIC_MONTHS[parts[1]];
        const year = parseInt(parts[parts.length - 1]);
        if (!isNaN(day) && month !== undefined && !isNaN(year)) {
            return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
    }
    // Fallback: maybe already ISO
    const iso = new Date(str);
    if (!isNaN(iso.getTime())) return iso.toISOString().split('T')[0];
    return null;
}

const FMT_DATE = new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });
const FMT_DATETIME = new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });

function AdminDashboardContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<Booking['status'] | "all">("all");
    const [editingBooking, setEditingBooking] = useState<Booking | null>(null);

    const [pendingAction, setPendingAction] = useState<{
        bookingId: string;
        status: Booking['status'];
        label: string;
        variant: 'green' | 'red';
    } | null>(null);

    // Toggle advanced filters on mobile
    const [showFilters, setShowFilters] = useState(false);

    // Filters
    const [dateFilters, setDateFilters] = useState({
        checkInStart: "",
        checkInEnd: "",
        checkOutStart: "",
        checkOutEnd: "",
        createdStart: "",
        createdEnd: ""
    });

    // Form Builder State
    const [isOptionsModalOpen, setIsOptionsModalOpen] = useState(false);

    useEffect(() => {
        if (searchParams.get('settings') === 'true') {
            setIsOptionsModalOpen(true);
        } else {
            setIsOptionsModalOpen(false);
        }
    }, [searchParams]);

    const closeOptionsModal = () => {
        setIsOptionsModalOpen(false);
        // Clear query param
        router.push('/admin');
    };

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

    const exportToCSV = async () => {
        if (bookings.length === 0) {
            toast.error('لا توجد بيانات لتصديرها');
            return;
        }

        // Fetch dynamic form fields to build column headers
        let formFields: FormField[] = [];
        try {
            formFields = await getFormFields();
        } catch {
            toast.error('تعذّر تحميل حقول النموذج، سيتم التصدير بالحقول الافتراضية.');
        }

        // Helper to safely quote a CSV cell (wraps in quotes and escapes internal quotes)
        const csvCell = (value: unknown): string => {
            const str = value === null || value === undefined ? '' : String(value);
            return `"${str.replace(/"/g, '""')}"`;
        };

        // Force phone numbers to be treated as text in Excel (prevents scientific notation)
        const phoneCell = (phone: string) => csvCell(`'${phone}`);

        // Strip "اختر " prefix from field labels for cleaner column headers
        const sanitizeLabel = (label: string) => label.replace(/^اختر\s+/, '').replace(/^اختيار\s+/, '');

        const statusMap: Record<string, string> = {
            pending: 'قيد الانتظار', contacted: 'تم التواصل', confirmed: 'تم التأكيد',
            completed: 'مكتمل', cancelled: 'ملغي',
        };

        // ── Key helper: safely reads payload[field.id], falls back to a direct DB column ──
        // Handles BOTH new bookings (payload keyed by UUID) and legacy bookings (payload null).
        const fromPayloadOrColumn = (b: Booking, field: FormField | undefined, fallback: unknown): unknown => {
            if (field) {
                const payloadVal = b.payload?.[field.id];
                if (payloadVal !== null && payloadVal !== undefined && payloadVal !== '') return payloadVal;
            }
            return fallback;
        };

        // Pre-resolve field references once (avoids repeated find() inside every row)
        const nameField = formFields.find(f => sanitizeLabel(f.label) === 'الاسم');
        const phoneField = formFields.find(f => f.type === 'phone' || sanitizeLabel(f.label).includes('جوال'));
        const hotelField = formFields.find(f => sanitizeLabel(f.label).includes('فندق'));
        const roomsField = formFields.find(f => sanitizeLabel(f.label).includes('غرف') || sanitizeLabel(f.label).includes('غرفة'));
        const viewField = formFields.find(f => sanitizeLabel(f.label).includes('إطلالة') || sanitizeLabel(f.label).includes('اطلالة'));
        const mealsField = formFields.find(f => sanitizeLabel(f.label).includes('وجبة') || sanitizeLabel(f.label).includes('وجبات'));
        const checkInField = formFields.find(f => sanitizeLabel(f.label).includes('دخول'));
        const checkOutField = formFields.find(f => sanitizeLabel(f.label).includes('خروج'));

        // ── Debug log: verify payload keys vs resolved field IDs ──
        if (bookings.length > 0) {
            const b0 = bookings[0];
            console.group('[Export Debug] First booking payload mapping:');
            console.log('payload keys:', b0.payload ? Object.keys(b0.payload) : 'null / empty');
            console.log('name   :', nameField?.id, '→', fromPayloadOrColumn(b0, nameField, b0.name));
            console.log('phone  :', phoneField?.id, '→', fromPayloadOrColumn(b0, phoneField, b0.phone));
            console.log('hotel  :', hotelField?.id, '→', fromPayloadOrColumn(b0, hotelField, b0.hotel));
            console.log('rooms  :', roomsField?.id, '→', fromPayloadOrColumn(b0, roomsField, b0.rooms_count));
            console.log('view   :', viewField?.id, '→', fromPayloadOrColumn(b0, viewField, b0.view_type));
            console.log('meals  :', mealsField?.id, '→', fromPayloadOrColumn(b0, mealsField, b0.meals));
            console.groupEnd();
        }

        // ── Fixed 11-column layout ───────────────────────────────────────────────
        const FIXED_COLUMNS: { header: string; getValue: (b: Booking) => string }[] = [
            {
                header: 'معرف الحجز',
                getValue: b => csvCell(`TR${b.booking_id}`),
            },
            {
                header: 'الاسم',
                getValue: b => csvCell(fromPayloadOrColumn(b, nameField, b.name) ?? ''),
            },
            {
                header: 'رقم الجوال',
                getValue: b => phoneCell(String(fromPayloadOrColumn(b, phoneField, b.phone) || b.phone || '')),
            },
            {
                header: 'اسم الفندق',
                getValue: b => csvCell(fromPayloadOrColumn(b, hotelField, b.hotel) ?? ''),
            },
            {
                header: 'عدد الغرف',
                getValue: b => csvCell(fromPayloadOrColumn(b, roomsField, b.rooms_count) ?? ''),
            },
            {
                header: 'نوع الإطلالة',
                getValue: b => csvCell(fromPayloadOrColumn(b, viewField, b.view_type) ?? ''),
            },
            {
                header: 'الوجبات',
                getValue: b => {
                    const val = fromPayloadOrColumn(b, mealsField, b.meals);
                    if (Array.isArray(val)) return csvCell(val.join('، '));
                    return csvCell(val ?? '');
                },
            },
            {
                header: 'تاريخ الدخول',
                getValue: b => {
                    const rawVal = String(fromPayloadOrColumn(b, checkInField, b.check_in) || b.check_in || '');
                    try { return csvCell(FMT_DATE.format(new Date(rawVal))); }
                    catch { return csvCell(rawVal); }
                },
            },
            {
                header: 'تاريخ الخروج',
                getValue: b => {
                    const rawVal = String(fromPayloadOrColumn(b, checkOutField, b.check_out) || b.check_out || '');
                    try { return csvCell(FMT_DATE.format(new Date(rawVal))); }
                    catch { return csvCell(rawVal); }
                },
            },
            {
                header: 'تاريخ الطلب',
                getValue: b => {
                    try { return csvCell(FMT_DATETIME.format(new Date(b.created_at))); }
                    catch { return csvCell(b.created_at || ''); }
                },
            },
            {
                header: 'حالة الطلب',
                getValue: b => csvCell(statusMap[b.status] || b.status),
            },
        ];

        // Identify the set of field IDs already covered by the fixed columns
        // (to avoid appending them again as "extra" columns)
        const coveredKeywords = ['فندق', 'غرف', 'غرفة', 'إطلالة', 'اطلالة', 'وجبة', 'وجبات', 'دخول', 'خروج', 'جوال', 'الاسم'];
        const extraFields = formFields.filter(f => {
            const clean = sanitizeLabel(f.label);
            return !coveredKeywords.some(k => clean.includes(k));
        });

        // Build header row
        const allHeaders = [
            ...FIXED_COLUMNS.map(c => csvCell(c.header)),
            ...extraFields.map(f => csvCell(sanitizeLabel(f.label))),
        ].join(',');

        // Build data rows
        const rows = bookings.map(b => {
            const fixedCells = FIXED_COLUMNS.map(c => c.getValue(b));
            const extraCells = extraFields.map(f => {
                const val = b.payload?.[f.id];
                if (Array.isArray(val)) return csvCell(val.join('، '));
                if (typeof val === 'string' && f.type === 'date') {
                    try { return csvCell(FMT_DATE.format(new Date(val))); } catch { return csvCell(val); }
                }
                return csvCell(val);
            });
            return [...fixedCells, ...extraCells].join(',');
        });

        const today = new Intl.DateTimeFormat('en-CA').format(new Date()); // YYYY-MM-DD
        const csvContent = '\uFEFF' + [allHeaders, ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `bookings_${today}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success('تم تصدير البيانات بنجاح');
    };

    const handleImportClick = () => {
        document.getElementById('import-input')?.click();
    };

    const importFromCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Fetch current form_fields so we can map labels → field IDs
        let formFields: FormField[] = [];
        try {
            formFields = await getFormFields();
        } catch {
            toast.error('تعذّر تحميل حقول النموذج للاستيراد.');
        }

        const reader = new FileReader();
        reader.onload = async (event) => {
            const raw = event.target?.result as string;
            // Strip BOM if present
            const content = raw.startsWith('\uFEFF') ? raw.slice(1) : raw;
            const lines = content.split('\n').filter(l => l.trim() !== '');
            if (lines.length <= 1) {
                toast.error('ملف فارغ أو غير صالح');
                return;
            }

            // CSV row parser that handles quoted fields
            const parseCSVLine = (line: string): string[] => {
                const result: string[] = [];
                let inQuote = false;
                let cell = '';
                for (let i = 0; i < line.length; i++) {
                    const ch = line[i];
                    if (ch === '"') {
                        if (inQuote && line[i + 1] === '"') { cell += '"'; i++; }
                        else inQuote = !inQuote;
                    } else if (ch === ',' && !inQuote) {
                        result.push(cell.trim());
                        cell = '';
                    } else {
                        cell += ch;
                    }
                }
                result.push(cell.trim());
                return result;
            };

            // ── Smart Arabic Normalizer ────────────────────────────────────────
            // Strips label prefixes, normalizes alef variants and tah-marbuta
            const normalizeAr = (s: string) =>
                s.trim()
                    .replace(/^اختر\s+/g, '').replace(/^اختيار\s+/g, '')
                    .replace(/[أإآ]/g, 'ا')
                    .replace(/ة/g, 'ه')
                    .toLowerCase();

            // ── Smart Header Matcher ────────────────────────────────────────────
            // 1. Tries exact match on normalized labels
            // 2. Falls back to substring match (header ⊆ label OR label ⊆ header)
            const smartMatchField = (header: string): FormField | undefined => {
                const nh = normalizeAr(header);
                return (
                    formFields.find(f => normalizeAr(f.label) === nh) ||
                    formFields.find(f => {
                        const nl = normalizeAr(f.label);
                        return nl.includes(nh) || nh.includes(nl);
                    })
                );
            };

            const fileHeaders = parseCSVLine(lines[0]);

            // Build column-index lookup
            const colIndex: Record<string, number> = {};
            fileHeaders.forEach((h, i) => { colIndex[h] = i; });

            // Build smart "header → FormField" map for every incoming column
            const headerToField: Record<string, FormField | undefined> = {};
            fileHeaders.forEach(h => { headerToField[h] = smartMatchField(h); });

            // Helper: get cell by exact column header, stripping leading ' (Excel phone artifact)
            const getByHeader = (parts: string[], col: string) =>
                (colIndex[col] !== undefined ? parts[colIndex[col]] || '' : '').replace(/^'+/, '');

            // Core column constants (match our exported headers)
            const COL_ID = 'معرف الحجز';
            const COL_PHONE = 'رقم الجوال';
            const COL_NAME = 'الاسم';
            const COL_CHECKIN = 'تاريخ الدخول';
            const COL_CHECKOUT = 'تاريخ الخروج';
            const COL_STATUS = 'حالة الطلب';
            const COL_STATUS_ALT = 'الحالة'; // Legacy fallback

            const statusReverseMap: Record<string, string> = {
                'قيد الانتظار': 'pending', 'تم التواصل': 'contacted',
                'تم التأكيد': 'confirmed', 'مكتمل': 'completed', 'ملغي': 'cancelled',
            };

            // Validate required columns exist
            const hasPhone = colIndex[COL_PHONE] !== undefined || fileHeaders.some(h => normalizeAr(h).includes('جوال'));
            const hasCheckIn = colIndex[COL_CHECKIN] !== undefined;
            const hasCheckOut = colIndex[COL_CHECKOUT] !== undefined;
            if (!hasPhone || !hasCheckIn || !hasCheckOut) {
                const missing = [!hasPhone && 'رقم الجوال', !hasCheckIn && 'تاريخ الدخول', !hasCheckOut && 'تاريخ الخروج'].filter(Boolean).join('، ');
                toast.error(`أعمدة مطلوبة مفقودة: ${missing}`);
                return;
            }

            // Fuzzy finders for structured booking fields (from form_fields)
            const findF = (kw: string) => formFields.find(f => normalizeAr(f.label).includes(kw));
            const hotelField = findF('فندق');
            const roomsField = findF('غرف') || findF('غرفه');
            const viewField = findF('اطلاله');
            const mealsField = findF('وجبه') || findF('وجبات');
            const nameField = formFields.find(f => normalizeAr(f.label) === 'الاسم' || normalizeAr(f.label) === 'الاسمه');
            const phoneField = formFields.find(f => f.type === 'phone' || normalizeAr(f.label).includes('جوال'));

            let successCount = 0;
            const failedRows: string[] = [];

            const validRows = lines.slice(1).map((line, rowNum) => {
                const parts = parseCSVLine(line);
                if (parts.every(p => !p)) return null; // blank line

                const phone = getByHeader(parts, COL_PHONE) || (phoneField ? (parts[fileHeaders.findIndex(h => smartMatchField(h) === phoneField)] || '').replace(/^'+/, '') : '');
                const name = getByHeader(parts, COL_NAME);
                const rawIn = getByHeader(parts, COL_CHECKIN);
                const rawOut = getByHeader(parts, COL_CHECKOUT);
                const rawStat = getByHeader(parts, COL_STATUS) || getByHeader(parts, COL_STATUS_ALT);
                const rawId = getByHeader(parts, COL_ID).replace('TR', '').trim();

                const check_in = parseArabicDate(rawIn);
                const check_out = parseArabicDate(rawOut);

                if (!phone || !check_in || !check_out) {
                    failedRows.push(`صف ${rowNum + 2}: بيانات مطلوبة مفقودة (جوال/تاريخ)`);
                    return null;
                }

                if (bookings.some(b => b.phone === phone && b.check_in === check_in)) {
                    failedRows.push(`صف ${rowNum + 2}: تكرار — ${phone} / ${check_in}`);
                    return null;
                }

                // Build payload: smart-match every header to its FormField
                const payload: Record<string, unknown> = {};
                fileHeaders.forEach((header, i) => {
                    const field = headerToField[header];
                    if (field) payload[field.id] = parts[i] || '';
                });

                // Extract structured columns from smart-matched payload
                const hotel = hotelField ? (payload[hotelField.id] || '') : '';
                const rooms_count = roomsField ? (payload[roomsField.id] || '') : '';
                const view_type = viewField ? (payload[viewField.id] || '') : '';
                const meals = mealsField ? (payload[mealsField.id] || '') : '';

                successCount++;
                return {
                    booking_id: rawId ? parseInt(rawId) || undefined : undefined,
                    phone,
                    name: nameField ? (payload[nameField.id] || name || null) : (name || null),
                    hotel,
                    rooms_count,
                    view_type,
                    meals,
                    check_in,
                    check_out,
                    status: statusReverseMap[rawStat] || 'pending',
                    payload,
                };
            }).filter(Boolean);

            if (validRows.length === 0) {
                toast.error('لم يتم العثور على سجلات صالحة للاستيراد.');
                if (failedRows.length > 0) console.error('[Import] Failed rows:\n' + failedRows.join('\n'));
                return;
            }

            toast.info(`جاري استيراد ${validRows.length} سجل...`);
            const { error } = await supabase.from('bookings').insert(validRows as Record<string, unknown>[]);
            if (error) {
                toast.error(`فشل الاستيراد: ${error.message}`);
            } else {
                const summary = failedRows.length > 0
                    ? `نجح: ${successCount} · فشل/تخطي: ${failedRows.length}`
                    : `تم استيراد ${successCount} سجل بنجاح ✅`;
                toast.success(summary);
                if (failedRows.length > 0) console.warn('[Import] Skipped rows:\n' + failedRows.join('\n'));
                fetchBookings();
            }
            e.target.value = '';
        };
        reader.readAsText(file, 'UTF-8');
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed': return <Badge className="bg-emerald-500 hover:bg-emerald-600">اكتمل</Badge>;
            case 'confirmed': return <Badge className="bg-indigo-500 hover:bg-indigo-600">تم التأكيد</Badge>;
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
            {/* Header / Nav Section */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full mb-6 gap-4 bg-white/5 p-4 sm:p-6 lg:p-8 rounded-[2rem] lg:rounded-[2.5rem] border border-white/20 shadow-2xl backdrop-blur-xl relative overflow-hidden">
                {/* Decorative background glow */}
                <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-500/10 blur-[100px] -translate-x-1/2 -translate-y-1/2" />

                {/* Welcome Text */}
                <div className="flex flex-col items-start gap-1 relative z-10">
                    <h1 className="text-2xl sm:text-3xl lg:text-5xl font-black text-white tracking-tight">إدارة الحجوزات</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)] animate-pulse" />
                        <p className="text-xs sm:text-sm font-bold text-emerald-400 drop-shadow-md">لوحة التحكم النشطة</p>
                    </div>
                </div>

                {/* Buttons — flex-wrap so they never overflow */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 relative z-10">
                    <TooltipProvider delayDuration={200}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Link
                                    href="/"
                                    target="_blank"
                                    className="flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-[1.1rem] transition-all bg-white/10 text-white shadow-xl border border-white/20 hover:bg-white/20 active:scale-95 group backdrop-blur-md"
                                >
                                    <ExternalLink size={22} className="text-emerald-400 group-hover:scale-110 transition-transform duration-300" />
                                </Link>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="font-cairo text-sm/none py-2.5 px-3 bg-slate-900 border-white/10 text-white font-semibold">
                                عرض الموقع
                            </TooltipContent>
                        </Tooltip>

                        <SocialLinksModal />

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Link
                                    href="/admin?settings=true"
                                    className="flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-[1.1rem] transition-all bg-indigo-600/90 text-white shadow-xl shadow-indigo-600/40 border border-indigo-400/30 hover:bg-indigo-600 active:scale-95 group backdrop-blur-md"
                                >
                                    <Settings size={20} className="group-hover:rotate-90 transition-transform duration-500" />
                                </Link>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="font-cairo text-sm/none py-2.5 px-3 bg-indigo-900 border-indigo-400/30 text-white font-semibold shadow-xl shadow-indigo-900/20">
                                إعدادات الخيارات
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </div>

            <div className="bg-white/[0.03] backdrop-blur-3xl rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.4)] border border-white/20 overflow-hidden relative z-10 mb-8" dir="rtl">
                <div className="p-4 sm:p-6 border-b border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-lg sm:text-2xl font-bold text-white mb-1">أحدث الحجوزات</h2>
                        <p className="text-xs sm:text-sm text-white/50">تتبع وإدارة جميع طلبات الحجز من الموقع</p>
                    </div>
                    <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                        <Button
                            variant="outline"
                            onClick={fetchBookings}
                            size="sm"
                            className="bg-white/5 border-white/10 text-white hover:bg-white/10 h-10 text-xs sm:text-sm"
                        >
                            تحديث القائمة
                        </Button>
                        <Button
                            variant="outline"
                            onClick={exportToCSV}
                            size="sm"
                            className="bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 h-10 text-xs sm:text-sm"
                        >
                            <FileDown size={15} className="ml-1.5" />
                            تصدير
                        </Button>
                        <input type="file" id="import-input" className="hidden" accept=".csv" onChange={importFromCSV} />
                        <Button
                            variant="outline"
                            onClick={handleImportClick}
                            size="sm"
                            className="bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20 h-10 text-xs sm:text-sm"
                        >
                            <FileUp size={15} className="ml-1.5" />
                            استيراد
                        </Button>
                    </div>
                </div>

                {/* Search & Filter Bar */}
                <div className="p-4 sm:p-6 bg-white/5 border-b border-white/5">
                    {/* Top row: search + status + filters toggle */}
                    <div className="flex flex-col sm:flex-row gap-3 w-full">
                        {/* Search */}
                        <div className="relative flex-1">
                            <input
                                type="text"
                                placeholder="بحث بالاسم، الجوال، أو المعرف..."
                                className="w-full bg-white/5 border border-white/10 rounded-xl h-11 px-4 text-white text-[16px] sm:text-sm focus:ring-2 focus:ring-[#4db8d4]/50 outline-none transition-all pr-10"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <div className="absolute left-3 top-3 text-white/40">
                                {searchTerm && (
                                    <button onClick={() => setSearchTerm("")} className="hover:text-white transition-colors">
                                        <XCircle size={18} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Status filter */}
                        <select
                            className="bg-white/5 border border-white/10 rounded-xl h-11 px-4 text-white text-[16px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#4db8d4]/50 w-full sm:w-auto"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as Booking['status'] | "all")}
                        >
                            <option value="all" className="bg-slate-900">الكل</option>
                            <option value="pending" className="bg-slate-900">قيد الانتظار</option>
                            <option value="contacted" className="bg-slate-900">تم التواصل</option>
                            <option value="confirmed" className="bg-slate-900">تم التأكيد</option>
                            <option value="completed" className="bg-slate-900">مكتمل</option>
                            <option value="cancelled" className="bg-slate-900">ملغي</option>
                        </select>

                        {/* Row 2 buttons: reset + filter toggle */}
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={resetFilters}
                                className="bg-white/5 border-white/10 text-white hover:bg-white/20 rounded-xl gap-2 h-11 flex-1 sm:flex-none"
                            >
                                <RotateCcw size={16} />
                                <span className="sm:inline">إعادة تعيين</span>
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setShowFilters(v => !v)}
                                className={cn(
                                    "border-white/10 rounded-xl gap-2 h-11 flex-1 sm:flex-none",
                                    showFilters
                                        ? "bg-[#4db8d4]/20 border-[#4db8d4]/40 text-[#4db8d4]"
                                        : "bg-white/5 text-white hover:bg-white/10"
                                )}
                            >
                                <Filter size={15} />
                                <span>فلاتر التاريخ</span>
                            </Button>
                        </div>
                    </div>

                    {/* Collapsible Advanced Filters */}
                    {showFilters && (
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 border-t border-white/10 pt-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] uppercase tracking-wider text-white/40 font-bold">فلاتر تاريخ الدخول</label>
                                <div className="flex gap-2">
                                    <input type="date" className="bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white w-full h-10" value={dateFilters.checkInStart} onChange={e => setDateFilters({ ...dateFilters, checkInStart: e.target.value })} />
                                    <input type="date" className="bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white w-full h-10" value={dateFilters.checkInEnd} onChange={e => setDateFilters({ ...dateFilters, checkInEnd: e.target.value })} />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] uppercase tracking-wider text-white/40 font-bold">فلاتر تاريخ الخروج</label>
                                <div className="flex gap-2">
                                    <input type="date" className="bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white w-full h-10" value={dateFilters.checkOutStart} onChange={e => setDateFilters({ ...dateFilters, checkOutStart: e.target.value })} />
                                    <input type="date" className="bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white w-full h-10" value={dateFilters.checkOutEnd} onChange={e => setDateFilters({ ...dateFilters, checkOutEnd: e.target.value })} />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] uppercase tracking-wider text-white/40 font-bold">فلاتر تاريخ الطلب</label>
                                <div className="flex gap-2">
                                    <input type="date" className="bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white w-full h-10" value={dateFilters.createdStart} onChange={e => setDateFilters({ ...dateFilters, createdStart: e.target.value })} />
                                    <input type="date" className="bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white w-full h-10" value={dateFilters.createdEnd} onChange={e => setDateFilters({ ...dateFilters, createdEnd: e.target.value })} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── MOBILE CARD VIEW (< md) ── */}
                <div className="md:hidden divide-y divide-white/5">
                    {filteredBookings.length === 0 ? (
                        <div className="py-16 text-center text-white/40">لا توجد نتائج للبحث أو التصفية</div>
                    ) : (
                        filteredBookings.map((booking) => (
                            <div key={booking.id} className="p-4 hover:bg-white/[0.02] transition-colors" dir="rtl">
                                {/* Card header row */}
                                <div className="flex items-start justify-between gap-2 mb-3">
                                    <div>
                                        <span className="text-[#4db8d4] font-mono text-xs font-black">TR{booking.booking_id}</span>
                                        <div className="font-extrabold text-white text-base mt-0.5">{booking.name || <span className="text-white/30 italic text-sm">بدون اسم</span>}</div>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <span className="text-[11px] text-white/40 font-mono" dir="ltr">{booking.phone}</span>
                                            <a href={`tel:${booking.phone}`} className="p-1.5 rounded-md bg-white/5 text-white/40 hover:text-[#4db8d4]">
                                                <Phone size={11} />
                                            </a>
                                        </div>
                                    </div>
                                    <div className="shrink-0">{getStatusBadge(booking.status)}</div>
                                </div>

                                {/* Detail rows */}
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-3">
                                    <div>
                                        <span className="text-white/40 text-[11px] block mb-0.5">المرفق</span>
                                        <span className="font-bold text-[#4db8d4] text-sm">{booking.hotel}</span>
                                    </div>
                                    <div>
                                        <span className="text-white/40 text-[11px] block mb-0.5">الغرف</span>
                                        <span className="text-white text-sm">{booking.rooms_count} غرفة</span>
                                    </div>
                                    <div>
                                        <span className="text-white/40 text-[11px] block mb-0.5">تاريخ الدخول</span>
                                        <span className="text-white text-xs">{new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(booking.check_in))}</span>
                                    </div>
                                    <div>
                                        <span className="text-white/40 text-[11px] block mb-0.5">تاريخ الخروج</span>
                                        <span className="text-white text-xs">{new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(booking.check_out))}</span>
                                    </div>
                                    <div className="col-span-2">
                                        <span className="text-white/40 text-[11px] block mb-0.5">الإطلالة / الوجبات</span>
                                        <div className="flex flex-wrap gap-1">
                                            <span className="bg-white/10 text-white/70 text-[10px] px-2 py-0.5 rounded-full">{booking.view_type}</span>
                                            <span className="bg-white/10 text-white/70 text-[10px] px-2 py-0.5 rounded-full">{booking.meals}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Action buttons */}
                                <div className="flex items-center gap-2 flex-wrap border-t border-white/10 pt-3">
                                    <Button size="sm" variant="outline"
                                        className="h-10 px-3 border-white/10 bg-white/5 hover:bg-white/20 text-white text-xs gap-1.5"
                                        onClick={() => setEditingBooking({ ...booking })}
                                        disabled={booking.status === 'completed' || booking.status === 'cancelled'}
                                    >
                                        <Pencil size={13} /> تعديل
                                    </Button>
                                    <a
                                        href={`https://wa.me/${booking.phone.replace(/\+/g, '').replace(/\s/g, '')}`}
                                        target="_blank" rel="noopener noreferrer"
                                        className="h-10 px-3 flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 hover:bg-green-500/20 text-white/70 text-xs transition-all"
                                        onClick={() => updateStatus(booking.id, 'contacted')}
                                    >
                                        <Image src="/whatsapp-svgrepo-com.svg" alt="WhatsApp" width={14} height={14} className="invert opacity-70" />
                                        واتساب
                                    </a>
                                    <Button size="sm" variant="outline"
                                        className="h-10 px-3 border-white/10 bg-white/5 hover:bg-indigo-500/20 text-white text-xs gap-1.5"
                                        onClick={() => setPendingAction({ bookingId: booking.id, status: 'confirmed', label: 'تم التأكيد', variant: 'green' })}
                                        disabled={['confirmed', 'completed', 'cancelled'].includes(booking.status)}
                                    >
                                        <CalendarCheck size={13} className="text-indigo-400" /> تأكيد
                                    </Button>
                                    <Button size="sm" variant="outline"
                                        className="h-10 px-3 border-white/10 bg-white/5 hover:bg-emerald-500/20 text-white text-xs gap-1.5"
                                        onClick={() => setPendingAction({ bookingId: booking.id, status: 'completed', label: 'مكتمل', variant: 'green' })}
                                        disabled={booking.status === 'completed'}
                                    >
                                        <CheckCircle2 size={13} className="text-emerald-400" /> اكتمال
                                    </Button>
                                    <Button size="sm" variant="outline"
                                        className="h-10 px-3 border-white/10 bg-white/5 hover:bg-red-500/20 text-white text-xs gap-1.5"
                                        onClick={() => setPendingAction({ bookingId: booking.id, status: 'cancelled', label: 'ملغي', variant: 'red' })}
                                        disabled={booking.status === 'cancelled' || booking.status === 'completed'}
                                    >
                                        <XCircle size={13} className="text-red-400" /> إلغاء
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* ── DESKTOP TABLE VIEW (≥ md) ── */}
                <div className="hidden md:block overflow-x-auto">
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
                                                    <a href={`tel:${booking.phone}`} className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-white/40 hover:text-[#4db8d4] transition-all flex items-center justify-center" title="اتصال هاتفي">
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
                                            {new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(booking.check_in))}
                                        </TableCell>
                                        <TableCell className="text-white/80 font-medium">
                                            {new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(booking.check_out))}
                                        </TableCell>
                                        <TableCell className="text-xs text-white/40">
                                            <div className="text-right">
                                                {new Intl.DateTimeFormat('ar-EG', {
                                                    day: 'numeric', month: 'long', year: 'numeric',
                                                    hour: '2-digit', minute: '2-digit', hour12: true
                                                }).format(new Date(booking.created_at))}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {getStatusBadge(booking.status)}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5">
                                                <Button size="sm" variant="outline"
                                                    className="h-8 w-8 p-0 border-white/10 bg-white/5 hover:bg-white/20 text-white"
                                                    onClick={() => setEditingBooking({ ...booking })}
                                                    disabled={booking.status === 'completed' || booking.status === 'cancelled'}
                                                    title="تعديل الحجز"
                                                >
                                                    <Pencil size={14} />
                                                </Button>
                                                <a
                                                    href={`https://wa.me/${booking.phone.replace(/\+/g, '').replace(/\s/g, '')}`}
                                                    target="_blank" rel="noopener noreferrer"
                                                    className="h-8 w-8 flex items-center justify-center rounded-md border border-white/10 bg-white/5 hover:bg-green-500/20 hover:border-green-500/30 transition-all group"
                                                    onClick={() => updateStatus(booking.id, 'contacted')}
                                                    title="تواصل عبر واتساب"
                                                >
                                                    <Image src="/whatsapp-svgrepo-com.svg" alt="WhatsApp" width={14} height={14} className="invert opacity-80 group-hover:opacity-100 transition-opacity" />
                                                </a>
                                                <Button size="sm" variant="outline"
                                                    className="h-8 w-8 p-0 border-white/10 bg-white/5 hover:bg-indigo-500/20 hover:border-indigo-500/30 text-white"
                                                    onClick={() => setPendingAction({ bookingId: booking.id, status: 'confirmed', label: 'تم التأكيد', variant: 'green' })}
                                                    disabled={['confirmed', 'completed', 'cancelled'].includes(booking.status)}
                                                    title="تأكيد الحجز"
                                                >
                                                    <CalendarCheck size={14} className="text-indigo-400" />
                                                </Button>
                                                <Button size="sm" variant="outline"
                                                    className="h-8 w-8 p-0 border-white/10 bg-white/5 hover:bg-emerald-500/20 hover:border-emerald-500/30 text-white"
                                                    onClick={() => setPendingAction({ bookingId: booking.id, status: 'completed', label: 'مكتمل', variant: 'green' })}
                                                    disabled={booking.status === 'completed'}
                                                    title="إكمال الحجز"
                                                >
                                                    <CheckCircle2 size={14} className="text-emerald-400" />
                                                </Button>
                                                <Button size="sm" variant="outline"
                                                    className="h-8 w-8 p-0 border-white/10 bg-white/5 hover:bg-red-500/20 hover:border-red-500/30 text-white"
                                                    onClick={() => setPendingAction({ bookingId: booking.id, status: 'cancelled', label: 'ملغي', variant: 'red' })}
                                                    disabled={booking.status === 'cancelled' || booking.status === 'completed'}
                                                    title="إلغاء الحجز"
                                                >
                                                    <XCircle size={14} className="text-red-400" />
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

            {/* Edit Booking Modal */}
            {editingBooking && (
                <div className="fixed inset-0 z-[10000] flex items-start sm:items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md overflow-y-auto animate-in fade-in duration-300">
                    <div
                        className="bg-[#0f172a] border border-white/20 rounded-3xl w-full max-w-2xl shadow-[0_0_100px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-200 flex flex-col my-4 sm:my-0"
                        style={{ maxHeight: 'min(95dvh, 780px)' }}
                        dir="rtl"
                    >
                        {/* ── Sticky Header ── */}
                        <div className="shrink-0 px-4 py-4 sm:p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02] rounded-t-3xl">
                            <h3 className="text-base sm:text-xl font-bold text-white">تعديل الحجز TR{editingBooking.booking_id}</h3>
                            <button
                                onClick={() => setEditingBooking(null)}
                                className="h-10 w-10 flex items-center justify-center rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                                aria-label="إغلاق"
                            >
                                <XCircle size={20} />
                            </button>
                        </div>

                        {/* ── Scrollable Form Body ── */}
                        <form id="edit-booking-form" onSubmit={handleEditSave} className="flex-1 overflow-y-auto">
                            <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 pb-6">
                                <div className="space-y-2">
                                    <label className="text-xs text-white/50 block font-bold mr-1">اسم العميل</label>
                                    <input
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-[#4db8d4]/50 outline-none transition-all"
                                        value={editingBooking.name || ""}
                                        onChange={e => setEditingBooking({ ...editingBooking, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs text-white/50 block font-bold mr-1">رقم الجوال</label>
                                    <input
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-[#4db8d4]/50 outline-none transition-all font-mono"
                                        dir="ltr"
                                        value={editingBooking.phone}
                                        onChange={e => setEditingBooking({ ...editingBooking, phone: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs text-white/50 block font-bold mr-1">المرفق (الفندق)</label>
                                    <input
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-[#4db8d4]/50 outline-none transition-all"
                                        value={editingBooking.hotel}
                                        onChange={e => setEditingBooking({ ...editingBooking, hotel: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs text-white/50 block font-bold mr-1">عدد الغرف</label>
                                    <input
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-[#4db8d4]/50 outline-none transition-all"
                                        value={editingBooking.rooms_count}
                                        onChange={e => setEditingBooking({ ...editingBooking, rooms_count: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs text-white/50 block font-bold mr-1">تاريخ الدخول</label>
                                    <input
                                        type="date"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-[#4db8d4]/50 outline-none transition-all"
                                        value={editingBooking.check_in}
                                        onChange={e => setEditingBooking({ ...editingBooking, check_in: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs text-white/50 block font-bold mr-1">تاريخ الخروج</label>
                                    <input
                                        type="date"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-[#4db8d4]/50 outline-none transition-all"
                                        value={editingBooking.check_out}
                                        onChange={e => setEditingBooking({ ...editingBooking, check_out: e.target.value })}
                                    />
                                </div>
                            </div>
                        </form>

                        {/* ── Sticky Footer ── */}
                        <div className="shrink-0 px-4 pb-4 pt-3 sm:px-6 sm:pb-6 border-t border-white/10 bg-[#0f172a] rounded-b-3xl flex gap-3">
                            <Button
                                type="submit"
                                form="edit-booking-form"
                                className="flex-1 bg-[#4db8d4] hover:bg-[#3ca7c3] text-white rounded-2xl h-12 sm:h-14 font-bold shadow-xl shadow-[#4db8d4]/20 transition-all text-base sm:text-lg"
                            >
                                حفظ التغييرات
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setEditingBooking(null)}
                                className="flex-1 bg-white/5 border-white/10 text-white rounded-2xl h-12 sm:h-14 font-bold hover:bg-white/10 text-base sm:text-lg"
                            >
                                إلغاء
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Booking Action Confirmation AlertDialog ── */}
            <AlertDialog open={!!pendingAction} onOpenChange={(open) => { if (!open) setPendingAction(null); }}>
                <AlertDialogContent dir="rtl" className="font-cairo">
                    <AlertDialogHeader>
                        <div className="flex items-center gap-3 mb-1">
                            <div className={`p-2.5 rounded-xl ${pendingAction?.variant === 'red' ? 'bg-red-500/20' : 'bg-emerald-500/20'}`}>
                                <ShieldAlert size={22} className={pendingAction?.variant === 'red' ? 'text-red-400' : 'text-emerald-400'} />
                            </div>
                            <AlertDialogTitle className="text-right">تأكيد الإجراء</AlertDialogTitle>
                        </div>
                        <AlertDialogDescription className="text-right">
                            هل أنت متأكد من تغيير حالة هذا الحجز إلى{' '}
                            <span className={`font-bold ${pendingAction?.variant === 'red' ? 'text-red-400' : 'text-emerald-400'}`}>
                                {pendingAction?.label}
                            </span>
                            ؟ لا يمكن التراجع عن بعض هذه الإجراءات لاحقاً.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction
                            className={
                                pendingAction?.variant === 'red'
                                    ? 'bg-red-600 hover:bg-red-700 text-white border-0'
                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white border-0'
                            }
                            onClick={() => {
                                if (pendingAction) {
                                    updateStatus(pendingAction.bookingId, pendingAction.status);
                                    setPendingAction(null);
                                }
                            }}
                        >
                            تأكيد
                        </AlertDialogAction>
                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <FormBuilderModal isOpen={isOptionsModalOpen} onClose={closeOptionsModal} />
        </>

    );
}

export default function AdminDashboard() {
    return (
        <Suspense fallback={
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-3 mr-3 text-lg text-slate-500">جاري التحميل...</span>
            </div>
        }>
            <AdminDashboardContent />
        </Suspense>
    );
}
