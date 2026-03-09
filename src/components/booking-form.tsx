"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { CalendarIcon, Loader2, CheckCircle2, XCircle, MessageCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { submitBooking, getBookingOptions } from "@/app/actions";
import { cn } from "@/lib/utils";

const formSchema = z.object({
    hotel: z.string({
        required_error: "الرجاء اختيار الفندق.",
    }),
    rooms_count: z.string({
        required_error: "الرجاء اختيار عدد الغرف.",
    }),
    view_type: z.string({
        required_error: "الرجاء اختيار نوع الإطلالة.",
    }),
    meals: z.string({
        required_error: "الرجاء اختيار الوجبات.",
    }),
    check_in: z.date({
        required_error: "الرجاء اختيار تاريخ الدخول.",
    }),
    check_out: z.date({
        required_error: "الرجاء اختيار تاريخ الخروج.",
    }),
    phone: z.string().min(10, {
        message: "رقم الجوال يجب أن يتكون من 10 أرقام على الأقل.",
    }),
    name: z.string().min(2, {
        message: "الرجاء إدخال الاسم (حرفان على الأقل).",
    }),
});

interface BookingOption {
    id: string;
    type: 'hotel' | 'rooms_count' | 'view_type' | 'meals';
    label: string;
    order_index: number;
}

export default function BookingForm() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [statusModal, setStatusModal] = useState<{ show: boolean, success: boolean, message: string } | null>(null);
    const [lastBookingData, setLastBookingData] = useState<z.infer<typeof formSchema> | null>(null);
    const [mounted, setMounted] = useState(false);

    const [options, setOptions] = useState<BookingOption[]>([]);
    const [isLoadingOptions, setIsLoadingOptions] = useState(true);

    useEffect(() => {
        setMounted(true);
        const fetchOptions = async () => {
            const data = await getBookingOptions();
            setOptions(data as BookingOption[]);
            setIsLoadingOptions(false);
        };
        fetchOptions();
    }, []);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            phone: "",
            hotel: "",
            rooms_count: "",
            view_type: "",
            meals: "",
            check_in: undefined,
            check_out: undefined,
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsSubmitting(true);
        try {
            // 1. Save to database via server action
            const result = await submitBooking(values);

            if (result.success) {
                setLastBookingData(values);
                setStatusModal({
                    show: true,
                    success: true,
                    message: "تم استلام طلب حجزك بنجاح! يسعدنا خدمتك وسنقوم بالتواصل معك قريباً لتأكيد كافة التفاصيل."
                });
                form.reset();
            } else {
                setStatusModal({
                    show: true,
                    success: false,
                    message: result.error || "حدث خطأ أثناء إرسال الطلب. يرجى المحاولة مرة أخرى."
                });
            }
        } catch {
            setStatusModal({
                show: true,
                success: false,
                message: "حدث خطأ غير متوقع. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى."
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* Hotel */}
                        <FormField
                            control={form.control}
                            name="hotel"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="font-semibold text-white">اختر الفندق <span className="text-destructive">*</span></FormLabel>
                                    <Select key={field.name} onValueChange={field.onChange} defaultValue={field.value || ""} value={field.value || ""}>
                                        <FormControl>
                                            <SelectTrigger className="bg-white/[0.05] border-white/30 text-white focus:ring-[#8b4fb8] w-full [&>span]:whitespace-normal [&>span]:text-right [&>span]:break-words min-h-[2.5rem] h-auto py-2">
                                                <SelectValue placeholder={isLoadingOptions ? "جاري التحميل..." : "اختر الفندق"} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent className="bg-slate-900/90 backdrop-blur-xl border-white/20 text-white min-w-[200px]">
                                            {options.filter(o => o.type === 'hotel').map((opt) => (
                                                <SelectItem key={opt.id} value={opt.label}>{opt.label}</SelectItem>
                                            ))}
                                            {!isLoadingOptions && options.filter(o => o.type === 'hotel').length === 0 && (
                                                <div className="p-2 text-xs text-center text-white/40 italic">لا توجد خيارات متاحة</div>
                                            )}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Rooms Count */}
                        <FormField
                            control={form.control}
                            name="rooms_count"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="font-semibold text-white">عدد الغرف <span className="text-destructive">*</span></FormLabel>
                                    <Select key={field.name} onValueChange={field.onChange} defaultValue={field.value || ""} value={field.value || ""}>
                                        <FormControl>
                                            <SelectTrigger className="bg-white/[0.05] border-white/30 text-white focus:ring-[#8b4fb8] w-full [&>span]:whitespace-normal [&>span]:text-right [&>span]:break-words min-h-[2.5rem] h-auto py-2">
                                                <SelectValue placeholder={isLoadingOptions ? "جاري التحميل..." : "حدد عدد الغرف"} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent className="bg-slate-900/90 backdrop-blur-xl border-white/20 text-white min-w-[200px]">
                                            {options.filter(o => o.type === 'rooms_count').map((opt) => (
                                                <SelectItem key={opt.id} value={opt.label}>{opt.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* View Type */}
                        <FormField
                            control={form.control}
                            name="view_type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="font-semibold text-white">نوع الإطلالة <span className="text-destructive">*</span></FormLabel>
                                    <Select key={field.name} onValueChange={field.onChange} defaultValue={field.value || ""} value={field.value || ""}>
                                        <FormControl>
                                            <SelectTrigger className="bg-white/[0.05] border-white/30 text-white focus:ring-[#8b4fb8] w-full [&>span]:whitespace-normal [&>span]:text-right [&>span]:break-words min-h-[2.5rem] h-auto py-2">
                                                <SelectValue placeholder={isLoadingOptions ? "جاري التحميل..." : "اختر نوع الإطلالة"} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent className="bg-slate-900/90 backdrop-blur-xl border-white/20 text-white min-w-[200px]">
                                            {options.filter(o => o.type === 'view_type').map((opt) => (
                                                <SelectItem key={opt.id} value={opt.label}>{opt.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Meals */}
                        <FormField
                            control={form.control}
                            name="meals"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="font-semibold text-white">اختيار الوجبات <span className="text-destructive">*</span></FormLabel>
                                    <Select key={field.name} onValueChange={field.onChange} defaultValue={field.value || ""} value={field.value || ""}>
                                        <FormControl>
                                            <SelectTrigger className="bg-white/[0.05] border-white/30 text-white focus:ring-[#8b4fb8] w-full [&>span]:whitespace-normal [&>span]:text-right [&>span]:break-words min-h-[2.5rem] h-auto py-2">
                                                <SelectValue placeholder={isLoadingOptions ? "جاري التحميل..." : "اختر الوجبات"} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent className="bg-slate-900/90 backdrop-blur-xl border-white/20 text-white min-w-[200px]">
                                            {options.filter(o => o.type === 'meals').map((opt) => (
                                                <SelectItem key={opt.id} value={opt.label}>{opt.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Check-in Date */}
                        <FormField
                            control={form.control}
                            name="check_in"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel className="font-semibold text-white">تاريخ الدخول <span className="text-destructive">*</span></FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-full justify-between text-right font-normal bg-white/[0.05] border-white/30 text-white hover:bg-white/10 hover:border-[#4db8d4]/50 transition-colors",
                                                        !field.value && "text-white/70"
                                                    )}
                                                >
                                                    {field.value ? (
                                                        format(field.value, "d MMMM yyyy", { locale: ar })
                                                    ) : (
                                                        <span>اختر تاريخاً</span>
                                                    )}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0 bg-slate-900/90 backdrop-blur-xl border-white/20" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={field.value}
                                                onSelect={field.onChange}
                                                disabled={(date) =>
                                                    date < new Date(new Date().setHours(0, 0, 0, 0))
                                                }
                                                locale={ar}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Check-out Date */}
                        <FormField
                            control={form.control}
                            name="check_out"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel className="font-semibold text-white">تاريخ الخروج <span className="text-destructive">*</span></FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-full justify-between text-right font-normal bg-white/[0.05] border-white/30 text-white hover:bg-white/10 hover:border-[#4db8d4]/50 transition-colors",
                                                        !field.value && "text-white/70"
                                                    )}
                                                >
                                                    {field.value ? (
                                                        format(field.value, "d MMMM yyyy", { locale: ar })
                                                    ) : (
                                                        <span>اختر تاريخاً</span>
                                                    )}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0 bg-slate-900/90 backdrop-blur-xl border-white/20" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={field.value}
                                                onSelect={field.onChange}
                                                disabled={(date) =>
                                                    date < new Date(new Date().setHours(0, 0, 0, 0)) ||
                                                    (form.getValues('check_in') && date <= form.getValues('check_in'))
                                                }
                                                locale={ar}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Name — now mandatory */}
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="font-semibold text-white">الاسم <span className="text-destructive">*</span></FormLabel>
                                    <FormControl>
                                        <Input placeholder="أدخل اسمك الكريم" {...field} className="bg-white/[0.05] border-white/30 text-white placeholder:text-white/70 focus-visible:ring-[#8b4fb8]" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Phone */}
                        <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="font-semibold text-white">رقم الجوال <span className="text-destructive">*</span></FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="966501234567"
                                            {...field}
                                            dir="ltr"
                                            className="text-right bg-white/[0.05] border-white/30 text-white placeholder:text-white/70 focus-visible:ring-[#8b4fb8]"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                    </div>

                    <Button
                        type="submit"
                        size="lg"
                        className="w-full text-lg h-14 font-bold shadow-lg transition-all rounded-xl mt-8 text-white border-0"
                        style={{ backgroundImage: "linear-gradient(135deg, #4db8d4 0%, #2d3a6b 50%, #8b4fb8 100%)" }}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <><Loader2 className="ml-2 h-5 w-5 animate-spin" /> جاري إرسال الطلب...</>
                        ) : (
                            "احجز الآن 🕌"
                        )}
                    </Button>
                </form>
            </Form>

            {/* Premium Feedback Modal - Rendered via Portal to Body */}
            {
                mounted && statusModal && createPortal(
                    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
                        <div className="bg-slate-900 border border-white/20 rounded-[2rem] w-full max-w-md shadow-[0_0_80px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-200 text-right relative max-h-[95vh] overflow-y-auto" dir="rtl">
                            <div className="p-6 pt-14 pb-8 flex flex-col items-center text-center">
                                <div className={cn(
                                    "w-16 h-16 rounded-full flex items-center justify-center -mt-10 mb-4 animate-in slide-in-from-bottom-4 duration-700 shadow-2xl relative z-10",
                                    statusModal.success ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-red-500/20 text-red-400 border border-red-500/30"
                                )}>
                                    {statusModal.success ? <CheckCircle2 size={32} className="drop-shadow-[0_0_15px_rgba(74,222,128,0.5)]" /> : <XCircle size={32} className="drop-shadow-[0_0_15px_rgba(248,113,113,0.5)]" />}
                                </div>

                                <h3 className={cn(
                                    "text-2xl font-black mb-2",
                                    statusModal.success ? "text-green-400" : "text-red-400"
                                )}>
                                    {statusModal.success ? "تم بنجاح!" : "تنبيه"}
                                </h3>

                                <p className="text-white/70 text-base leading-relaxed mb-6 font-medium px-4">
                                    {statusModal.message}
                                </p>

                                {statusModal.success && lastBookingData && (
                                    <div className="w-full bg-white/[0.03] border border-white/10 rounded-[1.5rem] p-4 mb-6 text-right ring-1 ring-white/5">
                                        <h4 className="text-[#4db8d4] font-bold text-sm mb-3 border-b border-white/10 pb-1.5">ملخص الحجز:</h4>
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center text-xs border-b border-white/5 pb-1.5 last:border-0"><span className="font-bold text-white">{lastBookingData.name}</span> <span className="text-white/40">الاسم</span></div>
                                            <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2 last:border-0"><span className="font-bold text-white">{lastBookingData.hotel}</span> <span className="text-white/40">الفندق</span></div>
                                            <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2 last:border-0"><span className="font-bold text-white">{format(lastBookingData.check_in, 'dd MMMM yyyy', { locale: ar })}</span> <span className="text-white/40">الدخول</span></div>
                                        </div>
                                    </div>
                                )}

                                <div className="flex flex-col w-full gap-3 px-2">
                                    {statusModal.success && (
                                        <Button
                                            onClick={() => {
                                                if (!lastBookingData) return;
                                                const msg = `*طلب حجز من الموقع*\n\n` +
                                                    `*الاسم:* ${lastBookingData.name}\n` +
                                                    `*رقم الجوال:* ${lastBookingData.phone}\n` +
                                                    `*الفندق:* ${lastBookingData.hotel}\n` +
                                                    `*عدد الغرف:* ${lastBookingData.rooms_count}\n` +
                                                    `*تاريخ الدخول:* ${format(lastBookingData.check_in, 'dd/MM/yyyy')}\n` +
                                                    `*تاريخ الخروج:* ${format(lastBookingData.check_out, 'dd/MM/yyyy')}`;
                                                window.open(`https://wa.me/966500000000?text=${encodeURIComponent(msg)}`, '_blank');
                                            }}
                                            className="bg-green-600 hover:bg-green-700 text-white h-12 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-900/20 text-base"
                                        >
                                            <MessageCircle size={20} />
                                            تأكيد عبر واتساب
                                        </Button>
                                    )}

                                    <Button
                                        variant="outline"
                                        onClick={() => setStatusModal(null)}
                                        className="h-12 rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10 font-bold text-base"
                                    >
                                        إغلاق
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>,
                    document.body
                )
            }
        </>
    );
}
