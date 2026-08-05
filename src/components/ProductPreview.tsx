import { MedSuggestion } from "@/lib/rx-suggest.server";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ProductImage } from "./ProductImage";
import { useT } from "@/lib/i18n";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";
import { Button } from "./ui/button";
import { Share2, Copy, Check, Lock, Globe, Clock } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Label } from "./ui/label";

export function ProductPreview({ 
  product, 
  open, 
  onOpenChange 
}: { 
  product: MedSuggestion | null; 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const [access, setAccess] = useState<"public" | "private">("public");
  const [expiry, setExpiry] = useState<"never" | "1h" | "1d" | "7d">("never");
  const [shareToken, setShareToken] = useState<string | null>(null);

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined' || !product) return '';
    const base = `${window.location.origin}/store/product/${product.id}`;
    if (access === "private") {
      const token = shareToken || Math.random().toString(36).substring(2, 15);
      if (!shareToken && typeof window !== 'undefined') {
        // We shouldn't set state during render, but for simplicity in this preview:
        setTimeout(() => setShareToken(token), 0);
      }
      return `${base}?token=${token || shareToken}&expires=${expiry}`;
    }
    return base;
  }, [product, access, expiry, shareToken]);

  if (!product) return null;

  const indications = t.en ? product.indications_en : product.indications;
  const sideEffects = t.en ? product.side_effects_en : product.side_effects;
  const dosage = t.en ? product.dosage_en : product.dosage;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success(t("লিংক কপি করা হয়েছে", "Link copied to clipboard"));
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: `${product.name} - ${product.generic}`,
          url: shareUrl,
        });
      } catch (err) {
        handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden bg-card">
        <DialogHeader className="p-4 pb-0">
          <div className="flex items-start gap-4">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border bg-secondary p-1">
              <ProductImage src={product.medicine_image_url || product.image_url} alt={product.name} />
            </div>
            <div className="min-w-0 flex-1 pt-1">
              <div className="flex items-start justify-between gap-2">
                <DialogTitle className="text-lg font-bold leading-tight">
                  {product.name} <span className="text-sm font-normal text-muted-foreground">{product.strength}</span>
                </DialogTitle>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={handleShare}>
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
              <DialogDescription className="mt-1 line-clamp-1 text-xs font-semibold text-primary">
                {product.generic}
              </DialogDescription>
              <div className="mt-2 flex flex-wrap gap-1">
                <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                  {product.form}
                </Badge>
                {product.brand && (
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                    {product.brand}
                  </Badge>
                )}
                {product.manufacturer && (
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0 font-medium">
                    {product.manufacturer}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[40vh] p-4">
          <div className="space-y-4">
            <div className="rounded-lg border bg-secondary/20 p-3 space-y-3">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Share2 className="h-3 w-3" />
                {t("শেয়ারিং সেটিংস", "Sharing Settings")}
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[9px] flex items-center gap-1">
                    <Lock className="h-2.5 w-2.5" /> {t("অ্যাক্সেস", "Access")}
                  </Label>
                  <Select value={access} onValueChange={(v: any) => setAccess(v)}>
                    <SelectTrigger className="h-7 text-[10px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">{t("পাবলিক", "Public")}</SelectItem>
                      <SelectItem value="private">{t("প্রাইভেট", "Private")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[9px] flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" /> {t("মেয়াদ", "Expiry")}
                  </Label>
                  <Select value={expiry} onValueChange={(v: any) => setExpiry(v)}>
                    <SelectTrigger className="h-7 text-[10px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="never">{t("কখনো নয়", "Never")}</SelectItem>
                      <SelectItem value="1h">{t("১ ঘণ্টা", "1 Hour")}</SelectItem>
                      <SelectItem value="1d">{t("১ দিন", "1 Day")}</SelectItem>
                      <SelectItem value="7d">{t("৭ দিন", "7 Days")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                {t("ইঙ্গ্রেডিয়েন্ট / জেনেরিক", "Ingredients / Generic")}
              </h4>
              <p className="text-xs leading-relaxed">{product.generic}</p>
            </div>

            {indications && (
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  {t("নির্দেশনা", "Indications")}
                </h4>
                <p className="text-xs leading-relaxed text-muted-foreground">{indications}</p>
              </div>
            )}

            {dosage && (
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  {t("সেবনমাত্রা", "Dosage")}
                </h4>
                <p className="text-xs leading-relaxed text-muted-foreground">{dosage}</p>
              </div>
            )}

            {sideEffects && (
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  {t("পার্শ্বপ্রতিক্রিয়া", "Side Effects")}
                </h4>
                <p className="text-xs leading-relaxed text-muted-foreground">{sideEffects}</p>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="border-t bg-secondary/30 p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] text-muted-foreground">{t("মূল্য", "Price")}</p>
              <p className="text-lg font-bold text-primary">৳{product.price}</p>
            </div>
            <Badge variant={product.stock > 0 ? "secondary" : "destructive"} className="h-6">
              {product.stock > 0 ? t("স্টকে আছে", "In Stock") : t("স্টকে নেই", "Out of Stock")}
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" size="sm" onClick={handleShare}>
              {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
              {copied ? t("কপি করা হয়েছে", "Copied") : t("লিংক কপি করুন", "Copy Link")}
            </Button>
            <Button variant="outline" className="flex-1" size="sm" asChild>
              <a href={shareUrl} target="_blank" rel="noopener noreferrer">
                {t("স্টোরে দেখুন", "View in Store")}
              </a>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
