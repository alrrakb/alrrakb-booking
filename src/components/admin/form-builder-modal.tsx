"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Settings, XCircle, Plus, Pencil, Trash2, Save, ArrowUp, ArrowDown, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
    AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
    AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel
} from "@/components/ui/alert-dialog";
import {
    getFormFields,
    getFormSettings,
    addFormField,
    updateFormField,
    deleteFormField,
    reorderFormFields,
    updateFormSettings,
    FormField,
    FormSettings,
    FormFieldType
} from "@/actions/form-builder.actions";

interface FormBuilderModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function FormBuilderModal({ isOpen, onClose }: FormBuilderModalProps) {
    const router = useRouter();
    const [fields, setFields] = useState<FormField[]>([]);
    const [settings, setSettings] = useState<FormSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const [isSavingReorder, setIsSavingReorder] = useState(false);
    const [isSavingSettings, setIsSavingSettings] = useState(false);

    // Confirmation dialog states
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
    const [isDeletingField, setIsDeletingField] = useState(false);
    const [showSaveConfirm, setShowSaveConfirm] = useState(false);

    // Modal State for Add/Edit Field
    const [fieldModal, setFieldModal] = useState<{
        isOpen: boolean;
        mode: 'add' | 'edit';
        field: Partial<FormField>;
    }>({
        isOpen: false,
        mode: 'add',
        field: {}
    });

    const [submitButtonText, setSubmitButtonText] = useState("احجز الآن");

    const fetchData = async () => {
        setIsLoading(true);
        const [fetchedFields, fetchedSettings] = await Promise.all([
            getFormFields(),
            getFormSettings()
        ]);
        setFields(fetchedFields);
        if (fetchedSettings) {
            setSettings(fetchedSettings);
            setSubmitButtonText(fetchedSettings.submit_button_text);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        if (isOpen) {
            fetchData();
        }
    }, [isOpen]);

    // Opens the save-settings confirmation dialog
    const handleSaveSettings = () => setShowSaveConfirm(true);

    // Actually saves after confirmation
    const performSaveSettings = async () => {
        setShowSaveConfirm(false);
        setIsSavingSettings(true);
        const result = await updateFormSettings(submitButtonText);
        if (result.success) {
            toast.success("تم تحديث إعدادات النموذج");
            router.refresh();
        } else {
            toast.error("فشل التحديث");
        }
        setIsSavingSettings(false);
    };

    const handleMoveField = async (index: number, direction: 'up' | 'down') => {
        const newFields = [...fields];
        if (direction === 'up' && index > 0) {
            [newFields[index - 1], newFields[index]] = [newFields[index], newFields[index - 1]];
        } else if (direction === 'down' && index < newFields.length - 1) {
            [newFields[index + 1], newFields[index]] = [newFields[index], newFields[index + 1]];
        } else {
            return;
        }

        setFields(newFields);
        setIsSavingReorder(true);
        const orderedIds = newFields.map(f => f.id);
        await reorderFormFields(orderedIds);
        setIsSavingReorder(false);
        router.refresh();
    };

    // Opens the delete confirmation dialog
    const handleDeleteField = (id: string, label: string) => setDeleteTarget({ id, label });

    // Actually deletes after confirmation
    const performDeleteField = async () => {
        if (!deleteTarget) return;
        setIsDeletingField(true);
        const result = await deleteFormField(deleteTarget.id);
        if (result.success) {
            toast.success("تم حذف الحقل بنجاح");
            fetchData();
            router.refresh();
        } else {
            toast.error("فشل الحذف");
        }
        setIsDeletingField(false);
        setDeleteTarget(null);
    };

    const openAddField = () => {
        setFieldModal({
            isOpen: true,
            mode: 'add',
            field: {
                type: 'text',
                label: '',
                placeholder: '',
                is_required: false,
                options: [],
                max_selections: null,
                order_index: fields.length
            }
        });
    };

    const openEditField = (f: FormField) => {
        setFieldModal({
            isOpen: true,
            mode: 'edit',
            field: { ...f }
        });
    };

    const [isSavingField, setIsSavingField] = useState(false);

    const handleSaveField = async () => {
        const f = fieldModal.field;
        if (!f.label || !f.type) {
            toast.error("يرجى إدخال القيم المطلوبة");
            return;
        }

        setIsSavingField(true);
        let result;

        const payload = {
            type: f.type,
            label: f.label,
            placeholder: f.placeholder || null,
            is_required: f.is_required || false,
            options: (f.type === 'select' || f.type === 'multi-select') ? (f.options || []).map(s => s.trim()).filter(s => s) : null,
            max_selections: f.type === 'multi-select' ? (f.max_selections || null) : null,
            order_index: f.order_index ?? fields.length
        };

        if (fieldModal.mode === 'add') {
            result = await addFormField(payload);
        } else {
            result = await updateFormField(f.id!, payload);
        }

        if (result.success) {
            toast.success(fieldModal.mode === 'add' ? "تمت الإضافة" : "تم التحديث");
            setFieldModal({ isOpen: false, mode: 'add', field: {} });
            fetchData();
            router.refresh();
        } else {
            toast.error("فشل الحفظ");
        }
        setIsSavingField(false);
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 z-[10001] flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
                <div className="bg-[#0f172a] border border-white/20 rounded-[2rem] sm:rounded-[2.5rem] w-full max-w-4xl overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-200 flex flex-col max-h-[95vh] sm:max-h-[90vh]" dir="rtl">

                    {/* ── Header ── */}
                    <div className="px-4 py-4 sm:p-8 border-b border-white/10 bg-white/[0.02]">
                        <div className="flex items-start justify-between gap-3">
                            {/* Icon + Text */}
                            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                                <div className="p-2 sm:p-3 bg-indigo-500/20 rounded-xl sm:rounded-2xl border border-indigo-500/30 shrink-0">
                                    <Settings className="text-indigo-400" size={20} />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-base sm:text-xl md:text-2xl font-black text-white leading-tight">منشئ النماذج الديناميكي</h3>
                                    <p className="text-white/40 text-xs sm:text-sm mt-0.5 truncate">إدارة حقول وإعدادات نموذج الحجز بالكامل</p>
                                </div>
                            </div>
                            {/* Close button — always a 44px touch target */}
                            <button
                                onClick={onClose}
                                className="shrink-0 h-11 w-11 flex items-center justify-center rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                                aria-label="إغلاق"
                            >
                                <XCircle size={24} />
                            </button>
                        </div>
                    </div>

                    {/* ── Main Content ── */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 flex flex-col md:flex-row gap-4 sm:gap-6 md:gap-8">

                        {/* Settings Column */}
                        <div className="w-full md:w-1/3 space-y-6">
                            <div className="bg-white/5 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/10 flex flex-col gap-4">
                                <h4 className="font-bold text-white text-sm sm:text-base">إعدادات النموذج</h4>
                                <div className="space-y-2">
                                    <label className="text-xs text-white/50 font-bold">نص زر الإرسال</label>
                                    <Input
                                        className="bg-white/5 border-white/10 text-white"
                                        value={submitButtonText}
                                        onChange={e => setSubmitButtonText(e.target.value)}
                                    />
                                </div>
                                <Button
                                    onClick={handleSaveSettings}
                                    disabled={isSavingSettings}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white mt-2"
                                >
                                    {isSavingSettings ? <Loader2 className="animate-spin mr-2" /> : <Save className="ml-2" size={16} />}
                                    حفظ الإعدادات
                                </Button>
                            </div>
                        </div>

                        {/* Fields List Column */}
                        <div className="w-full md:w-2/3 flex flex-col gap-3">

                            {/* Fields toolbar */}
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 bg-white/5 p-3 sm:p-4 rounded-2xl border border-white/10">
                                <span className="font-bold text-white text-base sm:text-lg">حقول النموذج</span>
                                {/* Full-width on mobile → auto-width on sm+ */}
                                <Button onClick={openAddField} className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 h-11">
                                    <Plus className="ml-2" size={16} /> إضافة حقل جديد
                                </Button>
                            </div>

                            {isLoading ? (
                                <div className="flex justify-center p-10"><Loader2 className="animate-spin text-white/40" size={32} /></div>
                            ) : fields.length === 0 ? (
                                <div className="text-center p-10 text-white/40">لا توجد حقول. ابدأ بإضافة حقل جديد.</div>
                            ) : (
                                <div className="space-y-3">
                                    {fields.map((field, index) => (
                                        <div key={field.id} className="bg-white/5 p-3 sm:p-4 rounded-2xl border border-white/10 hover:border-white/20 transition-all">

                                            {/* Card top row: label + required badge */}
                                            <div className="flex items-start gap-2 mb-2">
                                                <span className="font-bold text-white text-sm sm:text-base flex-1 leading-snug">{field.label}</span>
                                                {field.is_required && (
                                                    <span className="shrink-0 text-[9px] sm:text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full mt-0.5">
                                                        مطلوب
                                                    </span>
                                                )}
                                            </div>

                                            {/* Meta row */}
                                            <div className="text-xs text-white/40 flex gap-3 mb-3">
                                                <span>النوع: {field.type}</span>
                                                {(field.type === 'select' || field.type === 'multi-select') && (
                                                    <span>| الخيارات: {field.options?.length || 0}</span>
                                                )}
                                            </div>

                                            {/* Actions row — always visible, properly spaced for touch */}
                                            <div className="flex items-center gap-2 border-t border-white/10 pt-2">
                                                {/* Move up */}
                                                <button
                                                    disabled={index === 0 || isSavingReorder}
                                                    onClick={() => handleMoveField(index, 'up')}
                                                    className={cn(
                                                        "h-11 w-11 flex items-center justify-center rounded-xl transition-colors",
                                                        index === 0 || isSavingReorder
                                                            ? "text-white/20 cursor-not-allowed"
                                                            : "text-white/50 hover:text-white hover:bg-white/10"
                                                    )}
                                                    aria-label="تحريك للأعلى"
                                                >
                                                    <ArrowUp size={16} />
                                                </button>

                                                {/* Move down */}
                                                <button
                                                    disabled={index === fields.length - 1 || isSavingReorder}
                                                    onClick={() => handleMoveField(index, 'down')}
                                                    className={cn(
                                                        "h-11 w-11 flex items-center justify-center rounded-xl transition-colors",
                                                        index === fields.length - 1 || isSavingReorder
                                                            ? "text-white/20 cursor-not-allowed"
                                                            : "text-white/50 hover:text-white hover:bg-white/10"
                                                    )}
                                                    aria-label="تحريك للأسفل"
                                                >
                                                    <ArrowDown size={16} />
                                                </button>

                                                <div className="flex-1" />

                                                {/* Edit */}
                                                <button
                                                    onClick={() => openEditField(field)}
                                                    className="h-11 w-11 flex items-center justify-center rounded-xl text-indigo-400 hover:bg-indigo-500/20 border border-white/10 transition-colors"
                                                    aria-label="تعديل"
                                                >
                                                    <Pencil size={15} />
                                                </button>

                                                {/* Delete */}
                                                <button
                                                    onClick={() => handleDeleteField(field.id, field.label)}
                                                    className="h-11 w-11 flex items-center justify-center rounded-xl text-red-400 hover:bg-red-500/20 border border-white/10 transition-colors"
                                                    aria-label="حذف"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Field Editor Modal */}
                {fieldModal.isOpen && (
                    <div className="fixed inset-0 z-[10002] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" dir="rtl">
                        <div className="bg-[#1a1c2e] border border-white/10 rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                            <div className="p-6 border-b border-white/10 flex justify-between items-center">
                                <h3 className="font-bold text-white text-lg">{fieldModal.mode === 'add' ? 'إضافة حقل' : 'تعديل حقل'}</h3>
                                <Button variant="ghost" size="sm" className="text-white/40" onClick={() => setFieldModal({ isOpen: false, mode: 'add', field: {} })}><XCircle /></Button>
                            </div>
                            <div className="p-6 overflow-y-auto space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs text-white/50 font-bold">عنوان الحقل (Label)</label>
                                    <Input placeholder="مثال: الاسم الكريم" value={fieldModal.field.label || ''} onChange={e => setFieldModal(prev => ({ ...prev, field: { ...prev.field, label: e.target.value } }))} className="bg-white/5 border-white/10 text-white" />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs text-white/50 font-bold">النوع</label>
                                    <select
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white outline-none"
                                        value={fieldModal.field.type || 'text'}
                                        onChange={e => setFieldModal(prev => ({ ...prev, field: { ...prev.field, type: e.target.value as FormFieldType } }))}
                                    >
                                        <option value="text" className="bg-slate-900">نص قصير (Text)</option>
                                        <option value="email" className="bg-slate-900">بريد إلكتروني (Email)</option>
                                        <option value="phone" className="bg-slate-900">رقم جوال (Phone)</option>
                                        <option value="date" className="bg-slate-900">تاريخ (Date)</option>
                                        <option value="select" className="bg-slate-900">قائمة منسدلة (Select)</option>
                                        <option value="multi-select" className="bg-slate-900">تحديد متعدد (Multi-select)</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs text-white/50 font-bold">النص الإرشادي (Placeholder)</label>
                                    <Input placeholder="مثال: أدخل اسمك هنا" value={fieldModal.field.placeholder || ''} onChange={e => setFieldModal(prev => ({ ...prev, field: { ...prev.field, placeholder: e.target.value } }))} className="bg-white/5 border-white/10 text-white" />
                                </div>

                                <div className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/10">
                                    <label className="text-sm font-bold text-white">حقل إجباري (Required)</label>
                                    <input
                                        type="checkbox"
                                        className="w-5 h-5 accent-indigo-500 bg-white/10 border-white/20 rounded"
                                        checked={fieldModal.field.is_required || false}
                                        onChange={(e) => setFieldModal(prev => ({ ...prev, field: { ...prev.field, is_required: e.target.checked } }))}
                                    />
                                </div>

                                {(fieldModal.field.type === 'select' || fieldModal.field.type === 'multi-select') && (
                                    <div className="space-y-3 bg-white/5 p-4 rounded-xl border border-white/10">
                                        <label className="text-xs text-white/50 font-bold">الخيارات (يفصل بينها بفاصلة أو سطر جديد)</label>
                                        <textarea
                                            className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm outline-none min-h-[100px]"
                                            placeholder="خيار ١&#10;خيار ٢&#10;خيار ٣"
                                            value={(fieldModal.field.options || []).join('\n')}
                                            onChange={e => {
                                                // Split without aggressively filtering to preserve new lines while typing
                                                const opts = e.target.value.split('\n');
                                                setFieldModal(prev => ({ ...prev, field: { ...prev.field, options: opts } }));
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.stopPropagation();
                                                }
                                            }}
                                        />
                                        <div className="text-[10px] text-indigo-400">عدد الخيارات الحالية: {(fieldModal.field.options || []).length}</div>

                                        {fieldModal.field.type === 'multi-select' && (
                                            <div className="pt-2">
                                                <label className="text-xs text-white/50 font-bold block mb-1">الحد الأقصى للاختيارات (اتركه فارغاً للسماح بالكل)</label>
                                                <Input type="number" min="1" value={fieldModal.field.max_selections || ''} onChange={e => setFieldModal(prev => ({ ...prev, field: { ...prev.field, max_selections: e.target.value ? parseInt(e.target.value) : null } }))} className="bg-black/50 border-white/10 text-white" />
                                            </div>
                                        )}
                                    </div>
                                )}

                            </div>
                            <div className="p-6 border-t border-white/10 flex gap-3">
                                <Button onClick={handleSaveField} disabled={isSavingField} className="flex-1 bg-indigo-600 hover:bg-indigo-700 font-bold">
                                    {isSavingField ? <Loader2 className="animate-spin" /> : "حفظ الحقل"}
                                </Button>
                                <Button variant="ghost" onClick={() => setFieldModal({ isOpen: false, mode: 'add', field: {} })} className="flex-1 text-white bg-white/5 hover:bg-white/10">إلغاء</Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Delete Field Confirmation ── */}
            <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open && !isDeletingField) setDeleteTarget(null); }}>
                <AlertDialogContent dir="rtl" className="font-cairo">
                    <AlertDialogHeader>
                        <div className="flex justify-center mb-3">
                            <div className="p-4 bg-red-500/15 rounded-full">
                                <AlertTriangle size={32} className="text-red-400" />
                            </div>
                        </div>
                        <AlertDialogTitle className="text-center">حذف الحقل</AlertDialogTitle>
                        <AlertDialogDescription className="text-center leading-relaxed">
                            هل أنت متأكد من حذف الحقل{' '}
                            <span className="font-bold text-white">&ldquo;{deleteTarget?.label}&rdquo;</span>
                            ؟ سيتم حذفه نهائياً وقد يؤثر ذلك على بيانات الحجوزات السابقة.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="justify-center gap-3">
                        <AlertDialogCancel disabled={isDeletingField}>إلغاء</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700 text-white border-0 min-w-[110px]"
                            disabled={isDeletingField}
                            onClick={(e) => { e.preventDefault(); performDeleteField(); }}
                        >
                            {isDeletingField ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 size={14} className="animate-spin" />
                                    جاري الحذف...
                                </span>
                            ) : 'حذف نهائياً'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* ── Save Settings Confirmation ── */}
            <AlertDialog open={showSaveConfirm} onOpenChange={setShowSaveConfirm}>
                <AlertDialogContent dir="rtl" className="font-cairo">
                    <AlertDialogHeader>
                        <div className="flex justify-center mb-3">
                            <div className="p-4 bg-emerald-500/15 rounded-full">
                                <CheckCircle2 size={32} className="text-emerald-400" />
                            </div>
                        </div>
                        <AlertDialogTitle className="text-center">حفظ الإعدادات</AlertDialogTitle>
                        <AlertDialogDescription className="text-center leading-relaxed">
                            سيتم تحديث نص زر الإرسال إلى{' '}
                            <span className="font-bold text-white">&ldquo;{submitButtonText}&rdquo;</span>
                            . هذا التغيير سيظهر فوراً لجميع زوار صفحة الحجز.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="justify-center gap-3">
                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-emerald-600 hover:bg-emerald-700 text-white border-0 min-w-[110px]"
                            onClick={(e) => { e.preventDefault(); performSaveSettings(); }}
                        >
                            نعم، احفظ التغييرات
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
