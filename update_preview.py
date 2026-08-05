import re

file_path = "src/components/ProductPreview.tsx"
with open(file_path, "r") as f:
    content = f.read()

# Add sync logic to invalidate cache when revoked
revoked_logic = """    if (!product) return;
    const next = !revoked;
    setRevoked(next);
    const tracking = { views: viewCount, revoked: next };
    localStorage.setItem(`share_track_${product.id}`, JSON.stringify(tracking));
    
    // Auto-sync mechanism: Trigger a broadcast to other tabs/sessions
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new StorageEvent('storage', {
            key: `share_track_${product.id}`,
            newValue: JSON.stringify(tracking)
        }));
    }
    
    toast.success(next ? t("লিংক রিভোক করা হয়েছে", "Link revoked") : t("লিংক সচল করা হয়েছে", "Link reactivated"));"""

content = content.replace("    if (!product) return;\n    const next = !revoked;\n    setRevoked(next);\n    const tracking = { views: viewCount, revoked: next };\n    localStorage.setItem(`share_track_${product.id}`, JSON.stringify(tracking));\n    toast.success(next ? t(\"লিংক রিভোক করা হয়েছে\", \"Link revoked\") : t(\"লিংক সচল করা হয়েছে\", \"Link reactivated\"));", revoked_logic)

# Add event listener for auto-sync
sync_effect = """  useEffect(() => {
    const handleSync = (e: StorageEvent) => {
      if (e.key === `share_track_${product?.id}` && e.newValue) {
        const tracking = JSON.parse(e.newValue);
        setRevoked(tracking.revoked);
      }
    };
    window.addEventListener('storage', handleSync);
    return () => window.removeEventListener('storage', handleSync);
  }, [product?.id]);"""

# Insert before the end of the component (before return)
content = content.replace("  if (!product) return null;", sync_effect + "\n\n  if (!product) return null;")

with open(file_path, "w") as f:
    f.write(content)
