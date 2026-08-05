import re

file_path = "src/routes/account.medicines.tsx"
with open(file_path, "r") as f:
    content = f.read()

# 1. Enhanced Diff Preview State & Logic
# We need to add state for diff selection and individual row actions
content = content.replace(
    'const [importData, setImportData] = useState<{ raw: any[], mapping: Record<string, string>, errors: any[] }>({',
    'const [importData, setImportData] = useState<{ raw: any[], mapping: Record<string, string>, errors: any[], diff?: { new: any[], updated: any[], deleted: any[] }, selectedRows?: Set<number> }>({\n    selectedRows: new Set(),'
)

# 2. Delivery Log State
content = content.replace(
    'const [notificationHistory, setNotificationHistory] = useState<any[]>([]);',
    'const [notificationHistory, setNotificationHistory] = useState<any[]>(() => JSON.parse(localStorage.getItem("med_delivery_logs") || "[]"));\n  const [showLogs, setShowLogs] = useState(false);'
)

# 3. Enhanced processImport to handle individual rows and save logs
# This is a bit complex for a single replace, so I'll target the rollbackImport first and then append new functions

new_functions = """
  const exportHistoryBatch = (batchId: string) => {
    const batch = importHistory.find(h => h.id === batchId);
    if (!batch) return;
    const headers = ["ID", "Name", "Brand", "Generic", "Form", "Strength", "Price"];
    const rows = batch.data.map((i: any) => [i.id, i.name, i.brand || "", i.generic || "", i.form || "", i.strength || "", i.price]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rollback-data-${batchId}.csv`;
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
"""

# Find a good place to insert new functions (after rollbackImport)
content = content.replace(
    'toast.error(t("রোলব্যাক করতে সমস্যা হয়েছে", "Error during rollback"));\n    }\n  };',
    'toast.error(t("রোলব্যাক করতে সমস্যা হয়েছে", "Error during rollback"));\n    }\n  };' + new_functions
)

# 4. Update UI for Delivery Logs and Diff Preview
# This will be handled in the next step to ensure selectors are correct
with open(file_path, "w") as f:
    f.write(content)
