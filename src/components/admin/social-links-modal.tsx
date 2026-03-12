"use client";

import { useState, useEffect, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Share2, Plus, Trash2, Loader2, Save, Globe, AlertTriangle, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
    AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
    AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel
} from "@/components/ui/alert-dialog";

import {
    getSocialLinks,
    addSocialLink,
    updateSocialLink,
    deleteSocialLink,
    reorderSocialLinks,
    SocialLink
} from "@/actions/social-links.actions";

export default function SocialLinksModal() {
    const [open, setOpen] = useState(false);
    const [links, setLinks] = useState<SocialLink[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isPending, startTransition] = useTransition();

    // Editor State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [platformName, setPlatformName] = useState("");
    const [url, setUrl] = useState("");

    // Delete confirmation state
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (open) {
            loadLinks();
        } else {
            resetForm();
        }
    }, [open]);

    const loadLinks = async () => {
        setIsLoading(true);
        try {
            const data = await getSocialLinks();
            setLinks(data || []);
        } catch {
            toast.error("فشل في تحميل الروابط");
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setPlatformName("");
        setUrl("");
    };

    const handleSave = async () => {
        if (!platformName.trim() || !url.trim()) {
            toast.error("يرجى ملء جميع الحقول المطلوبة");
            return;
        }

        startTransition(async () => {
            const payload = { platform_name: platformName, url, order_index: links.length };
            let result;

            if (editingId) {
                result = await updateSocialLink(editingId, { platform_name: platformName, url, order_index: links.find(l => l.id === editingId)?.order_index || 0 });
            } else {
                result = await addSocialLink(payload);
            }

            if (result.success) {
                toast.success(editingId ? "تم التحديث بنجاح" : "تمت الإضافة بنجاح");
                resetForm();
                loadLinks();
            } else {
                toast.error(result.error || "حدث خطأ ما");
            }
        });
    };

    const handleDeleteConfirmed = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        try {
            const result = await deleteSocialLink(deleteTarget.id);
            if (result.success) {
                toast.success("تم حذف الرابط بنجاح");
                loadLinks();
            } else {
                toast.error(result.error || "حدث خطأ أثناء الحذف");
            }
        } finally {
            setIsDeleting(false);
            setDeleteTarget(null);
        }
    };

    const handleEdit = (link: SocialLink) => {
        setEditingId(link.id);
        setPlatformName(link.platform_name);
        setUrl(link.url);
    };

    const moveLink = async (index: number, direction: 'up' | 'down') => {
        if (
            (direction === 'up' && index === 0) ||
            (direction === 'down' && index === links.length - 1)
        ) return;

        const newLinks = [...links];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;

        [newLinks[index], newLinks[swapIndex]] = [newLinks[swapIndex], newLinks[index]];

        // Optimistic update
        setLinks(newLinks);

        startTransition(async () => {
            const result = await reorderSocialLinks(newLinks.map(l => l.id));
            if (!result.success) {
                toast.error("فشل في إعادة الترتيب");
                loadLinks(); // revert
            }
        });
    };

    return (
        <>
            <Dialog open={open} onOpenChange={setOpen}>
                <TooltipProvider delayDuration={200}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <DialogTrigger asChild>
                                <button
                                    className="flex items-center justify-center w-12 h-12 rounded-[1.1rem] transition-all bg-white/10 text-white shadow-xl border border-white/20 hover:bg-white/20 active:scale-95 group/btn backdrop-blur-md cursor-pointer"
                                >
                                    <Share2 size={22} className="text-[#4db8d4] group-hover/btn:scale-110 transition-transform duration-300" />
                                </button>
                            </DialogTrigger>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="font-cairo text-sm/none py-2.5 px-3 bg-slate-900 border-white/10 text-white font-semibold shadow-xl">
                            روابط التواصل الاجتماعي
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                <DialogContent className="sm:max-w-2xl bg-slate-900 text-white border-white/10 font-cairo shadow-2xl p-0 h-[85vh] sm:h-[80vh] flex flex-col" dir="rtl">
                    <DialogHeader className="px-6 py-4 border-b border-white/10 shrink-0 flex flex-col items-start text-right sm:text-right">
                        <DialogTitle className="text-xl flex items-center gap-2">
                            <Share2 className="text-[#4db8d4]" size={24} />
                            إدارة الروابط الاجتماعية
                        </DialogTitle>
                        <DialogDescription className="text-slate-400 mt-1">
                            تحكم في أزرار التواصل الاجتماعي الظاهرة أسفل صفحة الحجز.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">

                        {/* Add / Edit Form */}
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6 relative">
                            {isPending && (
                                <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm z-10 flex items-center justify-center rounded-xl">
                                    <Loader2 className="animate-spin text-[#4db8d4]" />
                                </div>
                            )}
                            <h3 className="text-sm font-semibold mb-3 text-white">
                                {editingId ? "تعديل الرابط" : "إضافة رابط جديد"}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="text-xs text-white/60 mb-1 block">اسم المنصة (مثال: WhatsApp, Instagram)</label>
                                    <Input
                                        value={platformName}
                                        onChange={(e) => setPlatformName(e.target.value)}
                                        placeholder="WhatsApp"
                                        className="bg-black/20 border-white/10 text-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-white/60 mb-1 block">الرابط الإكتروني (URL)</label>
                                    <Input
                                        value={url}
                                        onChange={(e) => setUrl(e.target.value)}
                                        placeholder="https://..."
                                        className="bg-black/20 border-white/10 text-white text-left"
                                        dir="ltr"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2">
                                {editingId && (
                                    <Button variant="ghost" onClick={resetForm} className="text-white hover:bg-white/10">
                                        إلغاء التعديل
                                    </Button>
                                )}
                                <Button onClick={handleSave} className="bg-[#4db8d4] hover:bg-[#3ba2bd] text-white">
                                    {editingId ? <><Save className="mr-2 h-4 w-4" /> حفظ التعديلات</> : <><Plus className="mr-2 h-4 w-4" /> إضافة رابط</>}
                                </Button>
                            </div>
                        </div>

                        {/* List */}
                        <div className="space-y-2">
                            <h3 className="text-sm font-semibold mb-3 text-white flex items-center gap-2">
                                <Globe size={16} className="text-white/50" />
                                الروابط الحالية
                            </h3>

                            {isLoading ? (
                                <div className="flex justify-center py-8"><Loader2 className="animate-spin text-white/50" /></div>
                            ) : links.length === 0 ? (
                                <div className="text-center py-8 text-white/40 text-sm">لا توجد روابط مسجلة حالياً.</div>
                            ) : (
                                links.map((link, index) => (
                                    <div key={link.id} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-lg p-3 group">
                                        <div className="flex flex-col gap-1 shrink-0">
                                            <button
                                                onClick={() => moveLink(index, 'up')}
                                                disabled={index === 0}
                                                className="text-white/30 hover:text-white disabled:opacity-20 hover:scale-110 active:scale-90 transition-all"
                                            >
                                                <div className="w-5 h-3 flex items-center justify-center">▲</div>
                                            </button>
                                            <button
                                                onClick={() => moveLink(index, 'down')}
                                                disabled={index === links.length - 1}
                                                className="text-white/30 hover:text-white disabled:opacity-20 hover:scale-110 active:scale-90 transition-all"
                                            >
                                                <div className="w-5 h-3 flex items-center justify-center">▼</div>
                                            </button>
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-sm truncate text-white">{link.platform_name}</p>
                                            <p className="text-xs text-white/50 truncate w-full" dir="ltr">{link.url}</p>
                                        </div>

                                        <div className="flex items-center gap-1 shrink-0">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleEdit(link)}
                                                className="text-white/60 hover:text-[#4db8d4] hover:bg-[#4db8d4]/10 h-8 w-8"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setDeleteTarget({ id: link.id, name: link.platform_name })}
                                                className="text-white/60 hover:text-red-400 hover:bg-red-400/10 h-8 w-8"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                    </div>
                </DialogContent>
            </Dialog>

            {/* ── Delete Confirmation AlertDialog ── */}
            <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open && !isDeleting) setDeleteTarget(null); }}>
                <AlertDialogContent dir="rtl" className="font-cairo">
                    <AlertDialogHeader>
                        {/* Warning icon */}
                        <div className="flex justify-center mb-3">
                            <div className="p-4 bg-red-500/15 rounded-full">
                                <AlertTriangle size={32} className="text-red-400" />
                            </div>
                        </div>
                        <AlertDialogTitle className="text-center text-white text-lg">حذف الرابط</AlertDialogTitle>
                        <AlertDialogDescription className="text-center text-white/60 leading-relaxed">
                            هل أنت متأكد من حذف رابط منصة{' '}
                            <span className="font-bold text-white">{deleteTarget?.name}</span>
                            ؟ سيتم إزالته فوراً من فوتر صفحة الحجز.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="justify-center gap-3 mt-2">
                        <AlertDialogCancel disabled={isDeleting}>
                            إلغاء
                        </AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700 text-white border-0 min-w-[100px]"
                            disabled={isDeleting}
                            onClick={(e) => {
                                e.preventDefault(); // prevent AlertDialogPrimitive from auto-closing
                                handleDeleteConfirmed();
                            }}
                        >
                            {isDeleting ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 size={15} className="animate-spin" />
                                    جاري الحذف...
                                </span>
                            ) : (
                                "حذف نهائياً"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
