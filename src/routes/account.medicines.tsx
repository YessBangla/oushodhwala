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
  const [previewProduct, setPreviewProduct] = useState<MedSuggestion | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  
  // Undo/Restore State
  const [lastDeleted, setLastDeleted] = useState<{ list: MedSuggestion[], tab: string } | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  // Reminder State
  const [reminderConfigOpen, setReminderConfigOpen] = useState(false);
  const [configProduct, setConfigProduct] = useState<MedSuggestion | null>(null);
  const [reminderConfig, setReminderConfig] = useState({ type: 'daily', time: '08:00', frequency: 1 });
  const [notificationHistory, setNotificationHistory] = useState<any[]>([]);

  // Import/Preview State
  const [importPreviewOpen, setImportPreviewOpen] = useState(false);
  const [importData, setImportData] = useState<{ raw: any[], mapping: Record<string, string>, errors: any[] }>({
    raw: [],
    mapping: {},
    errors: []
  });
  const [importStep, setImportStep] = useState<"preview" | "mapping" | "results">("preview");

  const { data, isLoading } = useQuery({
    queryKey: ["user-medicines"],
    enabled: !!user,
    queryFn: () => getMeds(),
  });

  const favorites = data?.favorites || [];
  const recent = data?.recent || [];

  const forms = useMemo(() => {
    const list = tab === "favorites" ? favorites : recent;
    return Array.from(new Set(list.map(i => i.form).filter(Boolean)));
  }, [tab, favorites, recent]);

  const items = useMemo(() => {
    const list = tab === "favorites" ? favorites : recent;
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
        const local = JSON.parse(localStorage.getItem("rx_favorite_meds") || "[]") as MedSuggestion[];
        const next = local.filter(l => !selected.has(l.id));
        localStorage.setItem("rx_favorite_meds", JSON.stringify(next));
      } else {
        await removeRecent({ data: { ids: Array.from(selected) } });
        const local = JSON.parse(localStorage.getItem("rx_recent_meds") || "[]") as MedSuggestion[];
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
    const list = tab === "favorites" ? favorites : recent;
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
      if (tab === "favorites") {
        const local = JSON.parse(localStorage.getItem("rx_favorite_meds") || "[]") as MedSuggestion[];
        const next = [...local, ...meds].filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
        localStorage.setItem("rx_favorite_meds", JSON.stringify(next));
        await sync({ data: { favIds: ids, recentIds: [] } });
      } else {
        const local = JSON.parse(localStorage.getItem("rx_recent_meds") || "[]") as MedSuggestion[];
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

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{t("ঔষধ ম্যানেজমেন্ট", "Medicine Management")}</h1>
          <p className="text-xs text-muted-foreground">{t("আপনার প্রিয় এবং সম্প্রতি দেখা ঔষধগুলো এখানে ম্যানেজ করুন।", "Manage your favorite and recently viewed medicines here.")}</p>
        </div>
        <div className="flex gap-2">
          <label className="cursor-pointer">
            <Input type="file" accept=".json" className="hidden" onChange={handleImport} />
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-[10px]">
              <Upload className="h-3.5 w-3.5" /> {t("ইম্পোর্ট", "Import")}
            </Button>
          </label>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-[10px]" onClick={() => exportData("json")}>
            <Download className="h-3.5 w-3.5" /> {t("এক্সপোর্ট", "Export")}
          </Button>
        </div>
      </header>

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
          </div>
          <DialogFooter>
            <Button className="w-full" onClick={handleSaveReminder}>
              {t("সেভ করুন", "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ProductPreview 
        product={previewProduct}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
    </div>
  );
}
