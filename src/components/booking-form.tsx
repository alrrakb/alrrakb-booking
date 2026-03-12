"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { CalendarIcon, Loader2, CheckCircle2, XCircle, MessageCircle, ChevronDown, Check } from "lucide-react";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Form,
    FormControl,
    FormField as ShadcnFormField,
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
import { submitBooking } from "@/app/actions";
import { FormField, FormSettings } from "@/actions/form-builder.actions";
import { cn } from "@/lib/utils";

const generateZodSchema = (fields: FormField[]) => {
    const schemaObj: Record<string, z.ZodTypeAny> = {};
    fields.forEach(f => {
        let fieldSchema: z.ZodTypeAny;
        switch (f.type) {
            case 'text':
            case 'phone':
            case 'select': {
                const s = z.string({ required_error: `${f.label} مطلوب` });
                fieldSchema = f.is_required ? s.min(1, `${f.label} مطلوب`) : s.optional().or(z.literal(''));
                break;
            }
            case 'email': {
                const s = z.string().email('بريد إلكتروني غير صالح');
                fieldSchema = f.is_required ? s : s.optional().or(z.literal(''));
                break;
            }
            case 'date': {
                const s = z.date({ required_error: `${f.label} مطلوب` });
                fieldSchema = f.is_required ? s : s.optional();
                break;
            }
            case 'multi-select': {
                let s = z.array(z.string()).min(f.is_required ? 1 : 0, `${f.label} مطلوب`);
                if (f.max_selections) {
                    s = s.max(f.max_selections, `لا يمكن تجاوز ${f.max_selections} اختيارات`);
                }
                fieldSchema = f.is_required ? s : s.optional();
                break;
            }
            default:
                fieldSchema = z.any();
        }
        schemaObj[f.id] = fieldSchema;
    });
    return z.object(schemaObj);
};

// Custom Dropdown Component for Multi-Select Field
function MultiSelectDropdown({ field, formField }: { field: FormField; formField: { value: string[]; onChange: (v: string[]) => void } }) {
    const [open, setOpen] = useState(false);
    const currentValues = formField.value || [];
    const maxReached = field.max_selections ? currentValues.length >= field.max_selections : false;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <FormControl>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className={cn(
                            "w-full justify-between bg-white/[0.05] border-white/30 text-white hover:bg-white/10 hover:border-[#4db8d4]/50 hover:text-white transition-colors min-h-[2.5rem] h-auto py-2 font-normal",
                            !currentValues.length && "text-white/70"
                        )}
                    >
                        {currentValues.length > 0
                            ? currentValues.join("، ")
                            : field.placeholder || "اختر..."}
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </FormControl>
            </PopoverTrigger>
            <PopoverContent
                className="w-[var(--radix-popover-trigger-width)] min-w-full p-0 bg-slate-900/95 backdrop-blur-xl border-white/20 text-white"
                align="start"
                sideOffset={4}
                dir="rtl"
            >
                <div className="max-h-60 overflow-y-auto p-1 flex flex-col gap-1 custom-scrollbar">
                    {(field.options || []).map(opt => {
                        const isSelected = currentValues.includes(opt);
                        const disabled = !isSelected && maxReached;
                        return (
                            <div
                                key={opt}
                                className={cn(
                                    "relative flex w-full cursor-pointer select-none items-center rounded-sm py-2 pl-8 pr-8 text-sm outline-none transition-colors hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white",
                                    disabled && "opacity-50 cursor-not-allowed"
                                )}
                                onClick={() => {
                                    if (disabled) return;
                                    let newValues;
                                    if (isSelected) {
                                        newValues = currentValues.filter((v: string) => v !== opt);
                                    } else {
                                        newValues = [...currentValues, opt];
                                        // Auto-close if max selections reached
                                        if (field.max_selections && newValues.length >= field.max_selections) {
                                            setTimeout(() => setOpen(false), 150);
                                        }
                                    }
                                    formField.onChange(newValues);
                                }}
                            >
                                <span className="flex-1 text-right">{opt}</span>
                                {isSelected && (
                                    <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center text-[#8b4fb8]">
                                        <Check className="h-4 w-4" />
                                    </span>
                                )}
                            </div>
                        )
                    })}
                </div>
            </PopoverContent>
        </Popover>
    );
}

export default function BookingForm({ fields, settings }: { fields: FormField[], settings: FormSettings | null }) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [statusModal, setStatusModal] = useState<{ show: boolean, success: boolean, message: string } | null>(null);
    const [lastBookingData, setLastBookingData] = useState<Record<string, unknown> | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const dynamicFormSchema = generateZodSchema(fields);

    const form = useForm<z.infer<typeof dynamicFormSchema>>({
        resolver: zodResolver(dynamicFormSchema),
        defaultValues: fields.reduce((acc, f) => {
            if (f.type === 'multi-select') acc[f.id] = [];
            else if (f.type === 'date') acc[f.id] = undefined;
            else acc[f.id] = "";
            return acc;
        }, {} as Record<string, unknown>)
    });

    async function onSubmit(values: z.infer<typeof dynamicFormSchema>) {
        setIsSubmitting(true);
        try {
            // Save to database via server action
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

    if (fields.length === 0) {
        return <div className="text-white text-center p-8">لا توجد حقول متاحة للنموذج. يرجى إضافتها من لوحة التحكم.</div>;
    }

    return (
        <>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {fields.map(field => (
                            <ShadcnFormField
                                key={field.id}
                                control={form.control}
                                name={field.id}
                                render={({ field: formField }) => (
                                    <FormItem className="flex flex-col justify-start">
                                        <FormLabel className="font-semibold text-white">
                                            {field.label} {field.is_required && <span className="text-destructive">*</span>}
                                        </FormLabel>

                                        {(field.type === 'text' || field.type === 'phone' || field.type === 'email') && (
                                            <FormControl>
                                                <Input
                                                    placeholder={field.placeholder || ''}
                                                    {...formField}
                                                    value={formField.value || ''}
                                                    dir={field.type === 'phone' || field.type === 'email' ? 'ltr' : 'rtl'}
                                                    className={cn(
                                                        "bg-white/[0.05] border-white/30 text-white placeholder:text-white/70 focus-visible:ring-[#8b4fb8]",
                                                        (field.type === 'phone' || field.type === 'email') && "text-right"
                                                    )}
                                                />
                                            </FormControl>
                                        )}

                                        {field.type === 'select' && (
                                            <Select onValueChange={formField.onChange} defaultValue={formField.value || ""} value={formField.value || ""}>
                                                <FormControl>
                                                    <SelectTrigger className="bg-white/[0.05] border-white/30 text-white focus:ring-[#8b4fb8] w-full min-h-[2.5rem] h-auto py-2">
                                                        <SelectValue placeholder={field.placeholder || "اختر..."} />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent sideOffset={4} className="w-[var(--radix-select-trigger-width)] bg-slate-900/90 backdrop-blur-xl border-white/20 text-white" dir="rtl">
                                                    {(field.options || []).map((opt) => (
                                                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}

                                        {field.type === 'multi-select' && (
                                            <MultiSelectDropdown field={field} formField={formField} />
                                        )}

                                        {field.type === 'date' && (
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button
                                                            variant={"outline"}
                                                            className={cn(
                                                                "w-full justify-between text-right font-normal bg-white/[0.05] border-white/30 text-white hover:bg-white/10 hover:border-[#4db8d4]/50 transition-colors",
                                                                !formField.value && "text-white/70"
                                                            )}
                                                        >
                                                            {formField.value ? (
                                                                format(formField.value, "d MMMM yyyy", { locale: ar })
                                                            ) : (
                                                                <span>{field.placeholder || 'اختر تاريخاً'}</span>
                                                            )}
                                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0 bg-slate-900/90 backdrop-blur-xl border-white/20" align="end" side="bottom" dir="rtl" sideOffset={4}>
                                                    <Calendar
                                                        mode="single"
                                                        selected={formField.value}
                                                        onSelect={formField.onChange}
                                                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                                        locale={ar}
                                                        initialFocus
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                        )}
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        ))}

                    </div>

                    <Button
                        type="submit"
                        size="lg"
                        className="w-full text-lg h-14 font-bold shadow-lg transition-all rounded-xl mt-8 text-white border-0"
                        style={{ backgroundImage: "linear-gradient(135deg, #4db8d4 0%, #2d3a6b 50%, #8b4fb8 100%)" }}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <><Loader2 className="ml-2 h-5 w-5 animate-spin" /> جاري الإرسال...</>
                        ) : (
                            settings?.submit_button_text || "احجز الآن"
                        )}
                    </Button>
                </form>
            </Form>

            {/* Premium Feedback Modal */}
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
                                    <div className="w-full bg-white/[0.03] border border-white/10 rounded-[1.5rem] p-5 mb-6 text-right ring-1 ring-white/5 space-y-3">
                                        <h4 className="text-[#4db8d4] font-bold text-sm border-b border-white/10 pb-1.5">ملخص طلبك:</h4>
                                        <div className="space-y-2 max-h-40 overflow-y-auto">
                                            {fields.slice(0, 5).map(f => {
                                                let val = lastBookingData[f.id];
                                                if (val === undefined || val === null || val === '') return null;
                                                if (val instanceof Date) val = format(val, 'dd MMMM yyyy', { locale: ar });
                                                if (Array.isArray(val)) val = val.join('، ');

                                                return (
                                                    <div key={f.id} className="flex justify-between items-start text-sm border-b border-white/5 pb-2 last:border-0 pt-1 gap-2">
                                                        <span className="font-bold text-white flex-1 text-left" dir="ltr">{val as React.ReactNode}</span>
                                                        <span className="text-white/40 break-words max-w-[50%]">{f.label}</span>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}

                                <div className="flex flex-col w-full gap-3 px-2">
                                    {statusModal.success && (
                                        <Button
                                            onClick={() => {
                                                if (!lastBookingData) return;

                                                const msgLines = fields.map(f => {
                                                    let val = lastBookingData[f.id];
                                                    if (val === undefined || val === null || val === '') return null;
                                                    if (val instanceof Date) val = format(val, 'dd/MM/yyyy');
                                                    if (Array.isArray(val)) val = val.join('، ');
                                                    return `*${f.label}:* ${val}`;
                                                }).filter(Boolean);

                                                const msg = `*طلب حجز من الموقع*\n\n` + msgLines.join('\n');
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
