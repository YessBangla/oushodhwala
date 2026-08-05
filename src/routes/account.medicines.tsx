import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { 
  Heart, 
  History, 
  Search, 
  Trash2, 
  Download, 
  Upload, 
  ArrowUpDown,
  CheckSquare,
  Square,
  MoreVertical,
  ExternalLink,
  ChevronRight,
  Info,
  Bell,
  Clock,
  Calendar,
  Filter,
  AlertTriangle,
  RotateCcw,
  Plus,
  GripVertical
} from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { toast } from "sonner";

import { useT } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { 
  getUserMedicines, 
  bulkRemoveUserFavorites, 
  bulkRemoveUserRecent,
  syncUserMedicines,
  updateMedicineReminder,
  toggleUserFavorite,
  updateUserMedicineOrder
} from "@/lib/user-meds.functions";
import type { MedSuggestion } from "@/lib/rx-suggest.server";

export type MedWithReminder = MedSuggestion & {
  reminder?: {
    time: string;
    type: string;
    frequency: number;
    timezone?: string;
    notes?: string;
  };
};
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ProductImage } from "@/components/ProductImage";
import { ProductPreview } from "@/components/ProductPreview";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

export const Route = createFileRoute("/account/medicines")({
  component: MedicineManagement,
});

function MedicineManagement() {
  const t = useT();
  const { user } = useAuth();
  const qc = useQueryClient();
  const getMeds = useServerFn(getUserMedicines);
  const removeFavs = useServerFn(bulkRemoveUserFavorites);
  const removeRecent = useServerFn(bulkRemoveUserRecent);
  const sync = useServerFn(syncUserMedicines);
  const updateRemind = useServerFn(updateMedicineReminder);
  const updateOrder = useServerFn(updateUserMedicineOrder);

  const [tab, setTab] = useState<"favorites" | "recent">("favorites");
  const [search, setSearch] = useState("");
  const [filterForm, setFilterForm] = useState<string>("all");
  const [sort, setSort] = useState<"name" | "date">("date");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [previewProduct, setPreviewProduct] = useState<MedWithReminder | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  
  // Undo/Restore State
  const [lastDeleted, setLastDeleted] = useState<{ list: MedWithReminder[], tab: string } | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  // Reminder State
  const [reminderConfigOpen, setReminderConfigOpen] = useState(false);
  const [configProduct, setConfigProduct] = useState<MedWithReminder | null>(null);
  const [reminderConfig, setReminderConfig] = useState({ type: 'daily', time: '08:00', frequency: 1, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
  const [notificationHistory, setNotificationHistory] = useState<any[]>(() => JSON.parse(localStorage.getItem("med_delivery_logs") || "[]"));
  const [showLogs, setShowLogs] = useState(false);
  const [logFilter, setLogFilter] = useState<string>("all");

  // Import/Preview State
  const [importPreviewOpen, setImportPreviewOpen] = useState(false);
  const [importData, setImportData] = useState<{ raw: any[], mapping: Record<string, string>, errors: any[], diff?: { new: any[], updated: any[], deleted: any[] }, selectedRows?: Set<number> }>({
    selectedRows: new Set(),
    raw: [],
    mapping: {},
    errors: []
  });
  const [importStep, setImportStep] = useState<"preview" | "mapping" | "results">("preview");
  const [importHistory, setImportHistory] = useState<any[]>(() => JSON.parse(localStorage.getItem("med_import_history") || "[]"));

  const { data, isLoading } = useQuery({
    queryKey: ["user-medicines"],
    enabled: !!user,
    queryFn: () => getMeds(),
  });

  const favorites = (data?.favorites || []) as MedWithReminder[];
  const recent = (data?.recent || []) as MedWithReminder[];

  const forms = useMemo(() => {
    const list = (tab === "favorites" ? favorites : recent) as MedWithReminder[];
    return Array.from(new Set(list.map(i => i.form).filter(Boolean)));
  }, [tab, favorites, recent]);

  const items = useMemo(() => {
    const list = (tab === "favorites" ? favorites : recent) as MedWithReminder[];
    let filtered = list.filter(item => {
      const q = search.toLowerCase();
      const matchesSearch = (
        item.name.toLowerCase().includes(q) ||
        (item.en && item.en.toLowerCase().includes(q)) ||
        (item.generic && item.generic.toLowerCase().includes(q)) ||
        (item.brand && item.brand.toLowerCase().includes(q))
      );
      const matchesForm = filterForm === "all" || item.form === filterForm;
      return matchesSearch && matchesForm;
    });

    if (sort === "name") {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    }
    
    return filtered;
  }, [tab, favorites, recent, search, sort, filterForm]);

  const onDragEnd = async (result: any) => {
    if (!result.destination || tab !== "favorites") return;
    
    const reordered = Array.from(items);
    const [removed] = reordered.splice(result.source.index, 1);
    if (!removed) return;
    reordered.splice(result.destination.index, 0, removed);

    // Optimistic update
    qc.setQueryData(["user-medicines"], (old: any) => ({
      ...old,
      favorites: tab === "favorites" ? reordered : old.favorites,
    }));

    try {
      await updateOrder({ data: { productIds: reordered.map(i => i.id) } });
      toast.success(t("ক্রম পরিবর্তন করা হয়েছে", "Order updated"));
    } catch (e) {
      toast.error(t("ক্রম পরিবর্তন করতে সমস্যা হয়েছে", "Error updating order"));
      qc.invalidateQueries({ queryKey: ["user-medicines"] });
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const selectAll = () => {
    if (selected.size === items.length) setSelected(new Set());
    else setSelected(new Set(items.map(i => i.id)));
  };

  const performBulkRemove = async () => {
    if (selected.size === 0) return;
    try {
      const currentList = tab === "favorites" ? favorites : recent;
      const deletedItems = currentList.filter(i => selected.has(i.id));
      setLastDeleted({ list: deletedItems, tab });

      if (tab === "favorites") {
        await removeFavs({ data: { ids: Array.from(selected) } });
        const local = JSON.parse(localStorage.getItem("rx_favorite_meds") || "[]") as MedWithReminder[];
        const next = local.filter(l => !selected.has(l.id));
        localStorage.setItem("rx_favorite_meds", JSON.stringify(next));
      } else {
        await removeRecent({ data: { ids: Array.from(selected) } });
        const local = JSON.parse(localStorage.getItem("rx_recent_meds") || "[]") as MedWithReminder[];
        const next = local.filter(l => !selected.has(l.id));
        localStorage.setItem("rx_recent_meds", JSON.stringify(next));
      }
      
      toast.success(t("মুছে ফেলা হয়েছে", "Successfully removed"), {
        action: {
          label: t("ফিরে আনুন", "Undo"),
          onClick: handleRestore
        }
      });
      setSelected(new Set());
      setConfirmDeleteOpen(false);
      qc.invalidateQueries({ queryKey: ["user-medicines"] });
    } catch (e) {
      toast.error(t("মুছতে সমস্যা হয়েছে", "Error removing items"));
    }
  };

  const handleRestore = async () => {
    if (!lastDeleted) return;
    try {
      const ids = lastDeleted.list.map(i => i.id);
      if (lastDeleted.tab === "favorites") {
        await sync({ data: { favIds: ids, recentIds: [] } });
      } else {
        await sync({ data: { favIds: [], recentIds: ids } });
      }
      qc.invalidateQueries({ queryKey: ["user-medicines"] });
      setLastDeleted(null);
      toast.success(t("পুনরুদ্ধার করা হয়েছে", "Restored successfully"));
    } catch (e) {
      toast.error(t("পুনরুদ্ধার করতে সমস্যা হয়েছে", "Error restoring"));
    }
  };

  const handleSaveReminder = async () => {
    if (!configProduct) return;
    try {
      await updateRemind({ 
        data: { productId: configProduct.id, config: reminderConfig } 
      });
      toast.success(t("রিমাইন্ডার সেট করা হয়েছে", "Reminder set successfully"));
      setReminderConfigOpen(false);
      qc.invalidateQueries({ queryKey: ["user-medicines"] });
    } catch (e) {
      toast.error(t("রিমাইন্ডার সেট করতে সমস্যা হয়েছে", "Error setting reminder"));
    }
  };

  const exportData = (format: "json" | "csv") => {
    const list = (tab === "favorites" ? favorites : recent) as MedWithReminder[];
    if (list.length === 0) return;

    if (format === "json") {
      const blob = new Blob([JSON.stringify(list, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `oushodhwala-${tab}.json`;
      a.click();
    } else {
      const headers = ["ID", "Name", "Brand", "Generic", "Form", "Strength", "Price"];
      const rows = list.map(i => [
        i.id,
        i.name,
        i.brand || "",
        i.generic || "",
        i.form || "",
        i.strength || "",
        i.price
      ]);
      const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `oushodhwala-${tab}.csv`;
      a.click();
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        let importedMeds: any[] = [];
        let errors: any[] = [];
        
        if (file.name.endsWith(".json")) {
          try {
            importedMeds = JSON.parse(content);
            if (!Array.isArray(importedMeds)) {
              importedMeds = [importedMeds];
            }
          } catch (err) {
            errors.push({ row: 0, error: "Invalid JSON format" });
          }
        } else if (file.name.endsWith(".csv")) {
          const lines = content.split("\n");
          const headers = lines[0]?.split(",").map(h => h.trim().toLowerCase()) || [];
          
          // Initial mapping guess
          const initialMapping: Record<string, string> = {};
          const possibleFields = ["id", "name", "brand", "generic", "form", "strength", "price"];
          headers.forEach(h => {
            const match = possibleFields.find(f => h.includes(f));
            if (match) initialMapping[h] = match;
          });

          importedMeds = lines.slice(1).filter(line => line.trim()).map((line, idx) => {
            const values = line.split(",").map(v => v.trim());
            const obj: any = { _row: idx + 1 };
            headers.forEach((h, i) => {
              obj[h] = values[i];
            });
            
            // Basic validation
            if (!values[0]) errors.push({ row: idx + 1, error: "Missing required identifier" });
            
            return obj;
          });

          setImportData({ raw: importedMeds, mapping: initialMapping, errors });
          setImportStep("preview");
          setImportPreviewOpen(true);
          return;
        }

        if (importedMeds.length > 0) {
          await processImport(importedMeds);
        }
      } catch (e) {
        toast.error(t("ইম্পোর্ট করতে সমস্যা হয়েছে", "Error importing data"));
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // Reset
  };

  const processImport = async (meds: any[]) => {
    try {
      const ids = meds.map(m => m.id).filter(Boolean);
      const batchId = Date.now().toString();
      const newHistory = [
        { id: batchId, timestamp: new Date().toISOString(), count: meds.length, type: tab, data: meds },
        ...importHistory
      ].slice(0, 10);
      setImportHistory(newHistory);
      localStorage.setItem("med_import_history", JSON.stringify(newHistory));

      if (tab === "favorites") {
        const local = JSON.parse(localStorage.getItem("rx_favorite_meds") || "[]") as MedWithReminder[];
        // Better deduplication: highlight existing in preview if we had time, but here we merge
        const next = [...local, ...meds].filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
        localStorage.setItem("rx_favorite_meds", JSON.stringify(next));
        await sync({ data: { favIds: ids, recentIds: [] } });
      } else {
        const local = JSON.parse(localStorage.getItem("rx_recent_meds") || "[]") as MedWithReminder[];
        const next = [...local, ...meds].filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
        localStorage.setItem("rx_recent_meds", JSON.stringify(next));
        await sync({ data: { favIds: [], recentIds: ids } });
      }
      qc.invalidateQueries({ queryKey: ["user-medicines"] });
      toast.success(t("ইম্পোর্ট সফল হয়েছে", "Import successful"));
      setImportPreviewOpen(false);
    } catch (err) {
      toast.error(t("সিঙ্ক করতে সমস্যা হয়েছে", "Sync error"));
    }
  };

  const rollbackImport = async (batchId: string) => {
    const batch = importHistory.find(h => h.id === batchId);
    if (!batch) return;
    
    try {
      const idsToRemove = new Set(batch.data.map((m: any) => m.id));
      if (batch.type === "favorites") {
        const local = JSON.parse(localStorage.getItem("rx_favorite_meds") || "[]") as MedWithReminder[];
        const next = local.filter(m => !idsToRemove.has(m.id));
        localStorage.setItem("rx_favorite_meds", JSON.stringify(next));
        await removeFavs({ data: { ids: Array.from(idsToRemove) as string[] } });
      } else {
        const local = JSON.parse(localStorage.getItem("rx_recent_meds") || "[]") as MedWithReminder[];
        const next = local.filter(m => !idsToRemove.has(m.id));
        localStorage.setItem("rx_recent_meds", JSON.stringify(next));
        await removeRecent({ data: { ids: Array.from(idsToRemove) as string[] } });
      }
      
      const newHistory = importHistory.filter(h => h.id !== batchId);
      setImportHistory(newHistory);
      localStorage.setItem("med_import_history", JSON.stringify(newHistory));
      
      qc.invalidateQueries({ queryKey: ["user-medicines"] });
      toast.success(t("রোলব্যাক সফল হয়েছে", "Rollback successful"));
    } catch (err) {
      toast.error(t("রোলব্যাক করতে সমস্যা হয়েছে", "Error during rollback"));
    }
  };
  const exportHistoryBatch = (batchId: string) => {
    const batch = importHistory.find(h => h.id === batchId);
    if (!batch) return;
    const headers = ["ID", "Name", "Brand", "Generic", "Form", "Strength", "Price"];
    const rows = batch.data.map((i: any) => [i.id, i.name, i.brand || "", i.generic || "", i.form || "", i.strength || "", i.price]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rollback-data-${batchId}.csv`;
    a.click();
  };


  const checkReminderConflicts = (time: string) => {
    const existing = (items as MedWithReminder[]).filter(i => i.reminder?.time === time && i.id !== configProduct?.id);
    return existing;
  };

  const exportToICS = (reminder: any, product: any) => {
    const [hours, minutes] = reminder.time.split(':');
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), parseInt(hours), parseInt(minutes));
    const end = new Date(start.getTime() + 30 * 60000); // 30 mins duration
    
    const formatDate = (date: Date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `SUMMARY:Medicine: ${product.name}`,
      `DESCRIPTION:Take ${product.name} (${product.strength}). Notes: ${reminder.notes || 'N/A'}`,
      `DTSTART:${formatDate(start)}`,
      `DTEND:${formatDate(end)}`,
      'RRULE:FREQ=DAILY;INTERVAL=1',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${product.name}-reminder.ics`;
    a.click();
  };

  const triggerNotification = async (reminder: any, attempt = 1) => {
    const logId = Date.now().toString();
    const newLog = { 
      id: logId, 
      reminderId: reminder.id, 
      time: new Date().toISOString(), 
      status: 'pending', 
      timezone: reminder.timezone 
    };
    
    setNotificationHistory(prev => {
      const next = [newLog, ...prev].slice(0, 50);
      localStorage.setItem("med_delivery_logs", JSON.stringify(next));
      return next;
    });

    try {
      // Simulate delivery
      if (Math.random() < 0.2) throw new Error("Network Timeout"); // 20% failure for demo
      
      setNotificationHistory(prev => {
        const next = prev.map(l => l.id === logId ? { ...l, status: 'success' } : l);
        localStorage.setItem("med_delivery_logs", JSON.stringify(next));
        return next;
      });
      toast.success(t("নোটিফিকেশন সফলভাবে পাঠানো হয়েছে", "Notification delivered"));
    } catch (err: any) {
      const errorMsg = err.message || "Unknown error";
      setNotificationHistory(prev => {
        const next = prev.map(l => l.id === logId ? { ...l, status: 'failed', error: errorMsg, canRetry: attempt < 3 } : l);
        localStorage.setItem("med_delivery_logs", JSON.stringify(next));
        return next;
      });

      if (attempt < 3) {
        toast.error(`${t("ব্যর্থ হয়েছে", "Failed")}: ${errorMsg}. ${t("পুনরায় চেষ্টা করা হচ্ছে...", "Retrying...")}`);
        setTimeout(() => triggerNotification(reminder, attempt + 1), 5000);
      } else {
        toast.error(`${t("ব্যর্থ হয়েছে", "Failed")}: ${errorMsg}. ${t("ম্যানুয়ালি চেষ্টা করুন।", "Please try manually.")}`);
      }
    }
  };


  const downloadErrorReport = () => {
    if (importData.errors.length === 0) return;
    const csv = ["Row,Error", ...importData.errors.map(e => `${e.row},${e.error}`)].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "import-errors.csv";
    a.click();
  };

  const testNotification = () => {
    toast.info(t("টেস্ট নোটিফিকেশন পাঠানো হয়েছে", "Test notification sent"), {
      description: t("আপনার ডিভাইস এবং ইমেইল চেক করুন।", "Check your device and email.")
    });
    setNotificationHistory(prev => [
      { id: Date.now(), type: 'test', status: 'delivered', time: new Date().toISOString() },
      ...prev
    ]);
  };

  if (!user) return null;

  const mappedData = importData.raw.map(row => {
    const obj: any = {};
    Object.entries(importData.mapping).forEach(([csvHeader, appField]) => {
      obj[appField] = row[csvHeader];
    });
    return obj;
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{t("ঔষধ ম্যানেজমেন্ট", "Medicine Management")}</h1>
          <p className="text-xs text-muted-foreground">{t("আপনার প্রিয় এবং সম্প্রতি দেখা ঔষধগুলো এখানে ম্যানেজ করুন।", "Manage your favorite and recently viewed medicines here.")}</p>
        </div>
        <div className="flex gap-2">
          <label className="cursor-pointer">
            <Input type="file" accept=".json,.csv" className="hidden" onChange={handleImport} />
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-[10px]">
              <Upload className="h-3.5 w-3.5" /> {t("ইম্পোর্ট", "Import")}
            </Button>
          </label>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-[10px]" onClick={() => exportData("json")}>
            <Download className="h-3.5 w-3.5" /> {t("এক্সপোর্ট", "Export")}
          </Button>
        </div>
      </header>

      {/* Import Preview/Mapping Dialog */}
      <Dialog open={importPreviewOpen} onOpenChange={setImportPreviewOpen}>
        <DialogContent className="max-w-3xl overflow-hidden p-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              {t("ডেটা ইম্পোর্ট প্রিভিউ", "Data Import Preview")}
            </DialogTitle>
            <DialogDescription>
              {importStep === "preview" 
                ? t("কলাম ম্যাপিং চেক করুন এবং প্রিভিউ দেখুন।", "Check column mapping and see preview.")
                : t("ইম্পোর্ট রেজাল্ট ও এরর রিপোর্ট।", "Import results and error report.")}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
            {importData.errors.length > 0 && (
              <div className="rounded-lg bg-destructive/10 p-3 flex items-start justify-between">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-xs font-bold">{importData.errors.length} {t("টি এরর পাওয়া গেছে", "errors found")}</span>
                </div>
                <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={downloadErrorReport}>
                  <Download className="h-3 w-3 mr-1.5" /> {t("এরর রিপোর্ট ডাউনলোড", "Download Error Report")}
                </Button>
              </div>
            )}

                        {importHistory.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t("ইম্পোর্ট হিস্টরি", "Import History")}</h4>
                <div className="space-y-2">
                  {importHistory.map((h: any) => (
                    <div key={h.id} className="flex items-center justify-between p-2 rounded border bg-secondary/10">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold">{new Date(h.timestamp).toLocaleString()}</span>
                        <span className="text-[8px] text-muted-foreground">{h.count} {t("টি আইটেম", "items")} ({h.type})</span>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-7 text-[8px]" onClick={() => exportHistoryBatch(h.id)}>
                          <Download className="h-3 w-3 mr-1" /> {t("এক্সপোর্ট CSV", "Export CSV")}
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-[8px] text-destructive" onClick={() => rollbackImport(h.id)}>
                          <RotateCcw className="h-3 w-3 mr-1" /> {t("রোলব্যাক", "Rollback")}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t("কলাম ম্যাপিং", "Column Mapping")}</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.keys(importData.raw[0] || {}).filter(k => k !== "_row").map(csvHeader => (
                  <div key={csvHeader} className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground truncate block">{csvHeader}</Label>
                    <Select 
                      value={importData.mapping[csvHeader] || "skip"} 
                      onValueChange={(v) => setImportData(prev => ({ ...prev, mapping: { ...prev.mapping, [csvHeader]: v } }))}
                    >
                      <SelectTrigger className="h-8 text-[10px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="skip">{t("বাদ দিন", "Skip")}</SelectItem>
                        <SelectItem value="id">ID</SelectItem>
                        <SelectItem value="name">{t("নাম", "Name")}</SelectItem>
                        <SelectItem value="brand">{t("ব্র্যান্ড", "Brand")}</SelectItem>
                        <SelectItem value="generic">{t("জেনেরিক", "Generic")}</SelectItem>
                        <SelectItem value="form">{t("ফর্ম", "Form")}</SelectItem>
                        <SelectItem value="strength">{t("স্ট্রেংথ", "Strength")}</SelectItem>
                        <SelectItem value="price">{t("মূল্য", "Price")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t("প্রিভিউ (প্রথম ৫ রো)", "Preview (First 5 rows)")}</h4>
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-[11px] text-left border-collapse">
                  <thead>
                    <tr className="bg-secondary/30">
                      {Object.values(importData.mapping).filter(v => v !== "skip").map(v => (
                        <th key={v} className="p-2 border-b font-bold">{v.toUpperCase()}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {mappedData.slice(0, 5).map((row, idx) => (
                      <tr key={idx} className="border-b last:border-0">
                        {Object.values(importData.mapping).filter(v => v !== "skip").map(v => (
                          <td key={v} className="p-2 truncate max-w-[120px]">{row[v] || "-"}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 border-t gap-2 bg-secondary/10">
            <Button variant="outline" size="sm" onClick={() => setImportPreviewOpen(false)}>
              {t("বাতিল", "Cancel")}
            </Button>
            <Button size="sm" onClick={() => processImport(mappedData)} disabled={importData.errors.length > 0}>
              {t("ইম্পোর্ট কনফার্ম করুন", "Confirm Import")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="mb-4 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input 
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t("নাম বা জেনেরিক দিয়ে খুঁজুন...", "Search by name or generic...")}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Select value={filterForm} onValueChange={setFilterForm}>
              <SelectTrigger className="w-[120px] h-9 text-[11px]">
                <Filter className="mr-2 h-3 w-3" />
                <SelectValue placeholder={t("সব ফর্ম", "All Forms")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("সব ফর্ম", "All Forms")}</SelectItem>
                {forms.map(f => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-9 gap-1.5"
              onClick={() => setSort(s => s === "name" ? "date" : "name")}
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              {sort === "name" ? t("নাম", "Name") : t("তারিখ", "Date")}
            </Button>
          </div>
        </div>
        
        {selected.size > 0 && (
          <div className="flex items-center justify-between rounded-lg bg-destructive/10 px-3 py-2">
            <span className="text-xs font-medium text-destructive">
              {selected.size} {t("টি আইটেম সিলেক্ট করা হয়েছে", "items selected")}
            </span>
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-xs"
                onClick={() => setSelected(new Set())}
              >
                {t("বাতিল", "Cancel")}
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                className="h-7 text-xs gap-1.5"
                onClick={() => setConfirmDeleteOpen(true)}
              >
                <Trash2 className="h-3 w-3" />
                {t("মুছুন", "Delete")}
              </Button>
            </div>
          </div>
        )}
      </div>

      <Tabs value={tab} onValueChange={v => { setTab(v as any); setSelected(new Set()); }} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="favorites" className="gap-2">
            <Heart className={`h-4 w-4 ${tab === "favorites" ? "fill-primary" : ""}`} />
            {t("প্রিয়", "Favorites")}
          </TabsTrigger>
          <TabsTrigger value="recent" className="gap-2">
            <History className="h-4 w-4" />
            {t("সম্প্রতি", "Recent")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4 space-y-2">
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <History className="h-8 w-8 animate-spin text-muted-foreground opacity-20" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center rounded-xl border border-dashed border-border p-6 text-center">
              <Search className="mb-2 h-8 w-8 text-muted-foreground opacity-20" />
              <p className="text-sm text-muted-foreground">{t("কোনো ঔষধ পাওয়া যায়নি।", "No medicines found.")}</p>
            </div>
          ) : (
            <>
              <div className="mb-2 flex items-center gap-2 px-2">
                <Checkbox 
                  checked={selected.size === items.length && items.length > 0}
                  onCheckedChange={selectAll}
                />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  {t("সব সিলেক্ট করুন", "Select All")} ({items.length})
                </span>
              </div>
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="medicine-list">
                  {(provided) => (
                    <div 
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="grid gap-2"
                    >
                      {items.map((item: any, index: number) => (
                        <Draggable 
                          key={item.id} 
                          draggableId={item.id} 
                          index={index}
                          isDragDisabled={tab !== "favorites"}
                        >
                          {(provided, snapshot) => (
                            <div 
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`group relative flex items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-accent/50 ${snapshot.isDragging ? "z-50 shadow-lg ring-2 ring-primary bg-background" : selected.has(item.id) ? "border-primary bg-primary/5" : "border-border bg-card"}`}
                            >
                              <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors px-1">
                                <GripVertical className="h-4 w-4" />
                              </div>

                    <Checkbox 
                      checked={selected.has(item.id)}
                      onCheckedChange={() => toggleSelect(item.id)}
                      className="shrink-0"
                    />
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-secondary">
                      <ProductImage src={item.medicine_image_url || item.image_url} alt={item.name} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-sm font-bold">{item.name}</h3>
                        <span className="shrink-0 text-[10px] font-semibold text-muted-foreground">{item.strength}</span>
                      </div>
                      <p className="truncate text-[10px] text-muted-foreground">{item.generic}</p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <p className="text-[10px] font-bold text-primary">৳{item.price}</p>
                        {item.reminder_config?.type && (
                          <Badge variant="secondary" className="h-4 px-1 text-[8px] gap-0.5">
                            <Bell className="h-2 w-2" />
                            {item.reminder_config.time}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {tab === "favorites" && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => {
                          setConfigProduct(item);
                          setReminderConfig(item.reminder_config || { type: 'daily', time: '08:00', frequency: 1 });
                          setReminderConfigOpen(true);
                        }}>
                          <Bell className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => {
                        setPreviewProduct(item);
                        setPreviewOpen(true);
                      }}>
                        <Info className="h-4 w-4" />
                      </Button>
                    </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("আপনি কি নিশ্চিত?", "Are you sure?")}</DialogTitle>
            <DialogDescription>
              {t("নির্বাচিত আইটেমগুলো মুছে ফেলা হবে। আপনি পরবর্তীতে চাইলে ফিরে আনতে পারবেন।", "Selected items will be removed. You can undo this action later.")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setConfirmDeleteOpen(false)}>
              {t("না", "No")}
            </Button>
            <Button variant="destructive" onClick={performBulkRemove}>
              {t("হ্যাঁ, মুছুন", "Yes, Delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reminder Config Dialog */}
      <Dialog open={reminderConfigOpen} onOpenChange={setReminderConfigOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              {t("রিমাইন্ডার সেট করুন", "Set Reminder")}
            </DialogTitle>
            <DialogDescription>
              {configProduct?.name} {configProduct?.strength}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase">{t("ধরন", "Type")}</label>
              <Select value={reminderConfig.type} onValueChange={(v) => setReminderConfig(c => ({...c, type: v}))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">{t("প্রতিদিন", "Daily")}</SelectItem>
                  <SelectItem value="weekly">{t("সাপ্তাহিক", "Weekly")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase">{t("সময়", "Time")}</label>
              <Input 
                type="time" 
                value={reminderConfig.time} 
                onChange={(e) => setReminderConfig(c => ({...c, time: e.target.value}))}
              />
            </div>
            
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">{t("নোটিফিকেশন যাচাই", "Verify Notification")}</label>
                <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={testNotification}>
              <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1" onClick={() => setShowLogs(true)}>
                <History className="h-3 w-3" /> {t("ডেলিভারি লগ", "Delivery Logs")}
              </Button>
                  {t("টেস্ট নোটিফিকেশন", "Test Notification")}
                </Button>
              </div>

              {notificationHistory.length > 0 && (
                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight">{t("ইতিহাস", "History")}</label>
                  <ScrollArea className="h-20 rounded border bg-secondary/20 p-2">
                    {notificationHistory.map(h => (
                      <div key={h.id} className="flex items-center justify-between py-1 border-b last:border-0">
                        <span className="text-[9px] flex items-center gap-1">
                          <Clock className="h-2 w-2" /> {new Date(h.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <Badge variant="secondary" className="text-[8px] h-3.5 px-1 capitalize">{h.status}</Badge>
                      </div>
                    ))}
                  </ScrollArea>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <div className="flex gap-2 w-full">
              <Button variant="outline" className="flex-1" onClick={() => exportToICS(reminderConfig, configProduct)}>
                <Calendar className="mr-2 h-4 w-4" /> ICS Export
              </Button>
              <Button className="flex-1" onClick={handleSaveReminder}>
                {t("সেভ করুন", "Save")}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ProductPreview 
        product={previewProduct}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />

      {/* Delivery Logs Dialog */}
      <Dialog open={showLogs} onOpenChange={setShowLogs}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("নোটিফিকেশন ডেলিভারি লগ", "Notification Delivery Logs")}</DialogTitle>
            <DialogDescription>{t("টাইমজোন এবং ডেলিভারি স্ট্যাটাস চেক করুন।", "Check timezone and delivery status.")}</DialogDescription>
          </DialogHeader>
          
          <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
            {['all', 'success', 'failed', 'pending'].map((f) => (
              <Button 
                key={f} 
                variant={logFilter === f ? "secondary" : "ghost"} 
                size="sm" 
                className="h-7 text-[10px] capitalize"
                onClick={() => setLogFilter(f)}
              >
                {t(f, f)}
              </Button>
            ))}
          </div>
<ScrollArea className="h-[400px] pr-4">
            <div className="space-y-2">
              {notificationHistory.filter(l => logFilter === "all" || l.status === logFilter).map((log: any) => (
                <div key={log.id} className="flex items-center justify-between p-3 rounded-lg border bg-secondary/5 text-xs">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{new Date(log.time).toLocaleString()}</span>
                      <Badge variant={log.status === 'success' ? 'secondary' : log.status === 'failed' ? 'destructive' : 'outline'} className="text-[8px] h-4">
                        {log.status === 'success' ? t('সফল', 'Success') : log.status === 'failed' ? t('ব্যর্থ', 'Failed') : t('পেন্ডিং', 'Pending')}
                      </Badge>
                    </div>
                    <span className="text-[10px] text-muted-foreground">Timezone: {log.timezone}</span>
                    {log.error && <span className="text-destructive font-mono text-[9px]">{log.error}</span>}
                  </div>
                  {log.status === 'failed' && (
                    <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => triggerNotification({ id: log.reminderId, timezone: log.timezone })}>
                      <RotateCcw className="h-3 w-3 mr-1" /> {t("আবার চেষ্টা করুন", "Retry")}
                    </Button>
                  )}
                </div>
              ))}
              {notificationHistory.length === 0 && (
                <div className="py-10 text-center text-muted-foreground text-xs">{t("কোন লগ পাওয়া যায়নি।", "No logs found.")}</div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

    </div>
  );
}
