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
  Info
} from "lucide-react";
import { toast } from "sonner";

import { useT } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { 
  getUserMedicines, 
  bulkRemoveUserFavorites, 
  bulkRemoveUserRecent,
  syncUserMedicines
} from "@/lib/user-meds.functions";
import type { MedSuggestion } from "@/lib/rx-suggest.server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ProductImage } from "@/components/ProductImage";
import { ProductPreview } from "@/components/ProductPreview";

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

  const [tab, setTab] = useState<"favorites" | "recent">("favorites");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"name" | "date">("date");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [previewProduct, setPreviewProduct] = useState<MedSuggestion | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["user-medicines"],
    enabled: !!user,
    queryFn: () => getMeds(),
  });

  const favorites = data?.favorites || [];
  const recent = data?.recent || [];

  const items = useMemo(() => {
    const list = tab === "favorites" ? favorites : recent;
    let filtered = list.filter(item => {
      const q = search.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        (item.en && item.en.toLowerCase().includes(q)) ||
        (item.generic && item.generic.toLowerCase().includes(q)) ||
        (item.brand && item.brand.toLowerCase().includes(q))
      );
    });

    if (sort === "name") {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    }
    // Date sorting is default from server (descending)
    
    return filtered;
  }, [tab, favorites, recent, search, sort]);

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

  const handleBulkRemove = async () => {
    if (selected.size === 0) return;
    try {
      if (tab === "favorites") {
        await removeFavs({ data: { ids: Array.from(selected) } });
        // Also update local storage to keep in sync
        const local = JSON.parse(localStorage.getItem("rx_favorite_meds") || "[]") as MedSuggestion[];
        const next = local.filter(l => !selected.has(l.id));
        localStorage.setItem("rx_favorite_meds", JSON.stringify(next));
      } else {
        await removeRecent({ data: { ids: Array.from(selected) } });
        const local = JSON.parse(localStorage.getItem("rx_recent_meds") || "[]") as MedSuggestion[];
        const next = local.filter(l => !selected.has(l.id));
        localStorage.setItem("rx_recent_meds", JSON.stringify(next));
      }
      toast.success(t("সফলভাবে মুছে ফেলা হয়েছে", "Successfully removed"));
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["user-medicines"] });
    } catch (e) {
      toast.error(t("মুছতে সমস্যা হয়েছে", "Error removing items"));
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
        let importedMeds: MedSuggestion[] = [];
        
        if (file.name.endsWith(".json")) {
          importedMeds = JSON.parse(content);
        } else if (file.name.endsWith(".csv")) {
          // Basic CSV parsing
          const lines = content.split("\n").slice(1);
          // This is tricky because we need the full MedSuggestion objects.
          // For now, let's just support JSON import or tell the user it needs to be the right format.
          toast.error(t("CSV ইম্পোর্ট এখনো পুরোপুরি সাপোর্ট করে না, JSON ব্যবহার করুন", "CSV import not fully supported yet, use JSON"));
          return;
        }

        if (Array.isArray(importedMeds)) {
          const ids = importedMeds.map(m => m.id);
          if (tab === "favorites") {
            const local = JSON.parse(localStorage.getItem("rx_favorite_meds") || "[]") as MedSuggestion[];
            const next = [...local, ...importedMeds].filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
            localStorage.setItem("rx_favorite_meds", JSON.stringify(next));
            await sync({ data: { favIds: ids, recentIds: [] } });
          } else {
            const local = JSON.parse(localStorage.getItem("rx_recent_meds") || "[]") as MedSuggestion[];
            const next = [...local, ...importedMeds].filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
            localStorage.setItem("rx_recent_meds", JSON.stringify(next));
            await sync({ data: { favIds: [], recentIds: ids } });
          }
          qc.invalidateQueries({ queryKey: ["user-medicines"] });
          toast.success(t("ইম্পোর্ট সফল হয়েছে", "Import successful"));
        }
      } catch (e) {
        toast.error(t("ইম্পোর্ট করতে সমস্যা হয়েছে", "Error importing data"));
      }
    };
    reader.readAsText(file);
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

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
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
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-1.5"
            onClick={() => setSort(s => s === "name" ? "date" : "name")}
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            {sort === "name" ? t("নাম", "Name") : t("তারিখ", "Date")}
          </Button>
          {selected.size > 0 && (
            <Button 
              variant="destructive" 
              size="sm" 
              className="gap-1.5"
              onClick={handleBulkRemove}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t("মুছুন", "Delete")} ({selected.size})
            </Button>
          )}
        </div>
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
              <div className="grid gap-2">
                {items.map(item => (
                  <div 
                    key={item.id} 
                    className={`group relative flex items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-accent/50 ${selected.has(item.id) ? "border-primary bg-primary/5" : "border-border bg-card"}`}
                  >
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
                      <p className="mt-0.5 text-[10px] font-bold text-primary">৳{item.price}</p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => {
                        setPreviewProduct(item);
                        setPreviewOpen(true);
                      }}>
                        <Info className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      <ProductPreview 
        product={previewProduct}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
    </div>
  );
}
