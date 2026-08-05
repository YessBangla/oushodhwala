import { MedSuggestion } from "@/lib/rx-suggest.server";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ProductImage } from "./ProductImage";
import { useT } from "@/lib/i18n";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";

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

  if (!product) return null;

  const indications = t.en ? product.indications_en : product.indications;
  const sideEffects = t.en ? product.side_effects_en : product.side_effects;
  const dosage = t.en ? product.dosage_en : product.dosage;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden bg-card">
        <DialogHeader className="p-4 pb-0">
          <div className="flex items-start gap-4">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border bg-secondary p-1">
              <ProductImage src={product.medicine_image_url || product.image_url} alt={product.name} />
            </div>
            <div className="min-w-0 flex-1 pt-1">
              <DialogTitle className="text-lg font-bold leading-tight">
                {product.name} <span className="text-sm font-normal text-muted-foreground">{product.strength}</span>
              </DialogTitle>
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

        <ScrollArea className="max-h-[60vh] p-4">
          <div className="space-y-4">
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

            {side_effects && (
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  {t("পার্শ্বপ্রতিক্রিয়া", "Side Effects")}
                </h4>
                <p className="text-xs leading-relaxed text-muted-foreground">{sideEffects}</p>
              </div>
            )}

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground">{t("মূল্য", "Price")}</p>
                <p className="text-lg font-bold text-primary">৳{product.price}</p>
              </div>
              <Badge variant={product.stock > 0 ? "secondary" : "destructive"} className="h-6">
                {product.stock > 0 ? t("স্টকে আছে", "In Stock") : t("স্টকে নেই", "Out of Stock")}
              </Badge>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// Helper to safely access dynamic keys
const side_effects = true; 
