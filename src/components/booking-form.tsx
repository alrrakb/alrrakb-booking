"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { CalendarIcon, Loader2 } from "lucide-react";
import { useState } from "react";
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
import { submitBooking } from "@/app/actions";
import { toast } from "sonner";
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
    name: z.string().optional(),
});

export default function BookingForm() {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            phone: "",
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsSubmitting(true);
        try {
            // 1. Save to database via server action
            const result = await submitBooking(values);

            if (result.success) {
                toast.success("تم إرسال طلبك بنجاح!");

                // 2. Format WhatsApp Message
                const message = `*طلب حجز جديد*\n\n` +
                    `${values.name ? `*الاسم:* ${values.name}\n` : ''}` +
                    `*رقم الجوال:* ${values.phone}\n` +
                    `*الفندق:* ${values.hotel}\n` +
                    `*عدد الغرف:* ${values.rooms_count}\n` +
                    `*الإطلالة:* ${values.view_type}\n` +
                    `*الوجبات:* ${values.meals}\n` +
                    `*تاريخ الدخول:* ${format(values.check_in, 'yyyy/MM/dd')}\n` +
                    `*تاريخ الخروج:* ${format(values.check_out, 'yyyy/MM/dd')}`;

                // 3. Redirect to WhatsApp
                const encodedMessage = encodeURIComponent(message);
                // Replace with the actual company WhatsApp number (e.g. 966500000000)
                window.location.href = `https://wa.me/966500000000?text=${encodedMessage}`;
            } else {
                toast.error("حدث خطأ أثناء إرسال الطلب. يرجى المحاولة مرة أخرى.");
            }
        } catch (error) {
            toast.error("حدث خطأ غير متوقع.");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    <FormField
                        control={form.control}
                        name="hotel"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="font-semibold">اختر الفندق</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="bg-slate-50/50">
                                            <SelectValue placeholder="اختر الفندق" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="فندق أبراج مكة">فندق أبراج مكة</SelectItem>
                                        <SelectItem value="فندق سويس أوتيل">فندق سويس أوتيل</SelectItem>
                                        <SelectItem value="فندق المروة ريحان">فندق المروة ريحان</SelectItem>
                                        <SelectItem value="فندق موفنبيك هاجر">فندق موفنبيك هاجر</SelectItem>
                                        <SelectItem value="فندق فيرمونت">فندق فيرمونت</SelectItem>
                                        <SelectItem value="فندق رويال دار الإيمان">فندق رويال دار الإيمان (المدينة)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="rooms_count"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="font-semibold">عدد الغرف</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="bg-slate-50/50">
                                            <SelectValue placeholder="حدد عدد الغرف" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="1">غرفة واحدة</SelectItem>
                                        <SelectItem value="2">غرفتين</SelectItem>
                                        <SelectItem value="3">ثلاث غرف</SelectItem>
                                        <SelectItem value="4">أربع غرف</SelectItem>
                                        <SelectItem value="5+">خمس غرف أو أكثر</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="view_type"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="font-semibold">اختر نوع الإطلالة</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="bg-slate-50/50">
                                            <SelectValue placeholder="اختر نوع الإطلالة" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="إطلالة على الحرم">إطلالة على الحرم</SelectItem>
                                        <SelectItem value="إطلالة على الكعبة">إطلالة جزئية على الكعبة</SelectItem>
                                        <SelectItem value="إطلالة على المدينة">إطلالة على المدينة</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="meals"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="font-semibold">اختيار الوجبات</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="bg-slate-50/50">
                                            <SelectValue placeholder="اختر الوجبات" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="بدون وجبات">بدون وجبات (إقامة فقط)</SelectItem>
                                        <SelectItem value="الإفطار">الإفطار</SelectItem>
                                        <SelectItem value="الإفطار والعشاء">الإفطار والعشاء (نصف إقامة)</SelectItem>
                                        <SelectItem value="فول بورد">ثلاث وجبات (إقامة كاملة)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="check_in"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel className="font-semibold mt-[10px]">تاريخ الدخول</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "w-full pl-3 text-right font-normal bg-slate-50/50",
                                                    !field.value && "text-muted-foreground"
                                                )}
                                            >
                                                {field.value ? (
                                                    format(field.value, "PPP", { locale: ar })
                                                ) : (
                                                    <span>اختر تاريخ الدخول</span>
                                                )}
                                                <CalendarIcon className="mr-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={field.value}
                                            onSelect={field.onChange}
                                            disabled={(date) =>
                                                date < new Date(new Date().setHours(0, 0, 0, 0))
                                            }
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="check_out"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel className="font-semibold mt-[10px]">تاريخ الخروج</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "w-full pl-3 text-right font-normal bg-slate-50/50",
                                                    !field.value && "text-muted-foreground"
                                                )}
                                            >
                                                {field.value ? (
                                                    format(field.value, "PPP", { locale: ar })
                                                ) : (
                                                    <span>اختر تاريخ الخروج</span>
                                                )}
                                                <CalendarIcon className="mr-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={field.value}
                                            onSelect={field.onChange}
                                            disabled={(date) =>
                                                date < new Date(new Date().setHours(0, 0, 0, 0)) ||
                                                (form.getValues('check_in') && date <= form.getValues('check_in'))
                                            }
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="font-semibold">الاسم <span className="text-muted-foreground font-normal text-sm block md:inline">(اختياري)</span></FormLabel>
                                <FormControl>
                                    <Input placeholder="أدخل اسمك الكريم" {...field} className="bg-slate-50/50" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="font-semibold">رقم الجوال <span className="text-destructive">*</span></FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="966501234567"
                                        {...field}
                                        dir="ltr"
                                        className="text-right bg-slate-50/50"
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
                    className="w-full text-lg h-14 font-bold shadow-md shadow-primary/20 hover:shadow-primary/40 transition-all rounded-xl mt-8"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                        <><Loader2 className="ml-2 h-5 w-5 animate-spin" /> جاري إرسال الطلب...</>
                    ) : (
                        "احجز الآن"
                    )}
                </Button>
            </form>
        </Form>
    );
}
