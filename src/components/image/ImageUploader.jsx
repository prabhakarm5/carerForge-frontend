import { useRef } from "react";
import { Image as ImageIcon, Upload, X } from "lucide-react";

export default function ImageUploader({ image, setImage }) {
  const inputRef = useRef(null);
  const previewUrl = image ? URL.createObjectURL(image) : null;

  function pick(file) {
    if (file?.type?.startsWith("image/")) setImage(file);
  }

  return (
    <>
      <input ref={inputRef} hidden type="file" accept="image/*" onChange={(e) => pick(e.target.files?.[0])} />
      {image ? (
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black">
          <img src={previewUrl} alt="Upload preview" className="h-[220px] w-full object-cover" />
          <button type="button" onClick={() => { setImage(null); if (inputRef.current) inputRef.current.value = ""; }} className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/70 text-white backdrop-blur hover:bg-black">
            <X size={17} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files?.[0]); }}
          onDragOver={(e) => e.preventDefault()}
          className="flex h-[220px] w-full flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.035] p-5 text-center transition hover:border-fuchsia-400/60 hover:bg-fuchsia-500/[0.06]"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.06] text-slate-400"><ImageIcon size={26} /></span>
          <span className="mt-4 text-sm font-bold text-white">Upload reference image</span>
          <span className="mt-1 text-xs leading-5 text-slate-500">Drag and drop or click to edit an existing image</span>
          <span className="mt-4 inline-flex items-center gap-2 rounded-xl bg-fuchsia-600 px-4 py-2 text-xs font-bold text-white"><Upload size={14} /> Choose image</span>
        </button>
      )}
    </>
  );
}
