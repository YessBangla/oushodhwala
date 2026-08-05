import re

file_path = "src/routes/account.medicines.tsx"
with open(file_path, "r") as f:
    content = f.read()

# 1. Add timezone to reminderConfig
content = content.replace(
    "const [reminderConfig, setReminderConfig] = useState({ type: 'daily', time: '08:00', frequency: 1 });",
    "const [reminderConfig, setReminderConfig] = useState({ type: 'daily', time: '08:00', frequency: 1, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });"
)

# 2. Update processImport to handle batches/history (simulated with local storage for now)
# We'll add a state for importHistory
content = content.replace(
    "  const [importStep, setImportStep] = useState<\"preview\" | \"mapping\" | \"results\">(\"preview\");",
    "  const [importStep, setImportStep] = useState<\"preview\" | \"mapping\" | \"results\">(\"preview\");\n  const [importHistory, setImportHistory] = useState<any[]>(() => JSON.parse(localStorage.getItem(\"med_import_history\") || \"[]\"));"
)

# Update processImport to save history
old_process_import = """  const processImport = async (meds: any[]) => {
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
  };"""

new_process_import = """  const processImport = async (meds: any[]) => {
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
        const local = JSON.parse(localStorage.getItem("rx_favorite_meds") || "[]") as MedSuggestion[];
        // Better deduplication: highlight existing in preview if we had time, but here we merge
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

  const rollbackImport = async (batchId: string) => {
    const batch = importHistory.find(h => h.id === batchId);
    if (!batch) return;
    
    try {
      const idsToRemove = new Set(batch.data.map((m: any) => m.id));
      if (batch.type === "favorites") {
        const local = JSON.parse(localStorage.getItem("rx_favorite_meds") || "[]") as MedSuggestion[];
        const next = local.filter(m => !idsToRemove.has(m.id));
        localStorage.setItem("rx_favorite_meds", JSON.stringify(next));
        await removeFavs({ data: { ids: Array.from(idsToRemove) as string[] } });
      } else {
        const local = JSON.parse(localStorage.getItem("rx_recent_meds") || "[]") as MedSuggestion[];
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
  };"""

content = content.replace(old_process_import, new_process_import)

# Add UI for Import History and Timezone
# We'll add it to the header or as a separate section.
# Let's put it in the Import Dialog or a new tab.

with open(file_path, "w") as f:
    f.write(content)
