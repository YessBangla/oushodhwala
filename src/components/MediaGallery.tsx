import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MEDIA_KINDS, type MediaAsset, type MediaKind, addMediaByUrl, deleteMedia, listMedia, mediaQueryKey, uploadMedia } from "@/lib/media";
import { ProductImage } from "@/components/ProductImage";


type Props = {
  /** when set, clicking an image calls this instead of showing manage actions */
  onPick?: (asset: MediaAsset) => void;
  defaultKind?: MediaKind | "all";
  compact?: boolean;
};

export function MediaGallery({ onPick, defaultKind = "all", compact }: Props) {
  const qc = useQueryClient();
  const [kind, setKind] = useState<MediaKind | "all">(defaultKind);
  const [q, setQ] = useState("");
  const [uploadKind, setUploadKind] = useState<MediaKind>("box");
  const [urlInput, setUrlInput] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: [...mediaQueryKey, kind, q],
    queryFn: () => listMedia(kind, q),
  });

  const invalidate = () => void qc.invalidateQueries({ queryKey: mediaQueryKey });

  const upload = useMutation({
    mutationFn: async (files: FileList) => {
      for (const f of Array.from(files)) await uploadMedia(f, uploadKind);
    },
    onSuccess: () => {
      toast.success("ছবি গ্যালারিতে যুক্ত হয়েছে");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addUrl = useMutation({
    mutationFn: () => addMediaByUrl(urlInput.trim(), "", uploadKind),
    onSuccess: () => {
      setUrlInput("");
      toast.success("লিংক থেকে ছবি যুক্ত হয়েছে");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (a: MediaAsset) => deleteMedia(a),
    onSuccess: () => {
      toast.success("ছবি মুছে ফেলা হয়েছে");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as MediaKind | "all")}
          className="rounded-lg border border-border bg-background px-2 py-2 text-xs outline-none"
        >
          <option value="all">সব ছবি</option>
          {MEDIA_KINDS.map((k) => (
            <option key={k.id} value={k.id}>{k.t}</option>
          ))}
        </select>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ছবির নাম খুঁজুন"
          className="min-w-[8rem] flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none"
        />
      </div>

      <div className="mt-2 rounded-xl border border-border bg-card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={uploadKind}
            onChange={(e) => setUploadKind(e.target.value as MediaKind)}
            className="rounded-lg border border-border bg-background px-2 py-2 text-xs outline-none"
          >
            {MEDIA_KINDS.map((k) => (
              <option key={k.id} value={k.id}>{k.t}</option>
            ))}
          </select>
          <label className="cursor-pointer rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">
            {upload.isPending ? "আপলোড হচ্ছে..." : "ছবি আপলোড"}
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => e.target.files?.length && upload.mutate(e.target.files)}
            />
          </label>
        </div>
        <div className="mt-2 flex gap-2">
          <input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="অথবা ছবির লিংক (URL) দিন"
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none"
          />
          <button
            disabled={!urlInput.trim() || addUrl.isPending}
            onClick={() => addUrl.mutate()}
            className="rounded-lg border border-border px-3 py-2 text-xs font-semibold disabled:opacity-50"
          >
            যোগ করুন
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="mt-3 text-xs text-muted-foreground">লোড হচ্ছে...</p>
      ) : (data ?? []).length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">এই ধরনের কোনো ছবি নেই।</p>
      ) : (
        <div className={`mt-3 grid gap-2 ${compact ? "grid-cols-3 sm:grid-cols-5" : "grid-cols-2 sm:grid-cols-4 lg:grid-cols-6"}`}>
          {(data ?? []).map((a) => (
            <div key={a.id} className="overflow-hidden rounded-xl border border-border bg-card">
              <button
                type="button"
                onClick={() => onPick?.(a)}
                className="block w-full bg-muted/40 p-1"
                title={a.name}
              >
                <ProductImage src={a.url} alt={a.name} emoji="🖼️" ratio="square" />
              </button>


              <div className="px-2 pb-2">
                <p className="truncate text-[10px] text-muted-foreground">{a.name}</p>
                <div className="mt-1 flex gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard.writeText(a.url);
                      toast.success("লিংক কপি হয়েছে");
                    }}
                    className="rounded border border-border px-1.5 py-0.5 text-[9px] font-semibold"
                  >
                    লিংক
                  </button>
                  {onPick ? (
                    <button
                      type="button"
                      onClick={() => onPick(a)}
                      className="rounded bg-primary px-1.5 py-0.5 text-[9px] font-semibold text-primary-foreground"
                    >
                      নির্বাচন
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => remove.mutate(a)}
                      className="rounded border border-border px-1.5 py-0.5 text-[9px] font-semibold text-sale"
                    >
                      মুছুন
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function MediaPickerModal({ onClose, onPick, kind }: { onClose: () => void; onPick: (a: MediaAsset) => void; kind?: MediaKind }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl bg-background p-4 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-bold">ছবি গ্যালারি</p>
          <button onClick={onClose} className="rounded-lg border border-border px-2 py-1 text-xs font-semibold">বন্ধ</button>
        </div>
        <MediaGallery compact defaultKind={kind ?? "all"} onPick={(a) => { onPick(a); onClose(); }} />
      </div>
    </div>
  );
}
