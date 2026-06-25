"use client";
import { useState } from "react";
import { Car, X, ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Foto de oferta JA TRATADA (placa coberta/limpa, re-hospedada no Storage).
 * Sempre vem do read path saneado — nunca contem URL crua nem placa.
 */
export interface OfferImage {
  url: string;
  isCapa?: boolean;
}

/** Capa primeiro (o backend ja ordena; reforcamos no cliente por seguranca). */
function ordered(images: OfferImage[]): OfferImage[] {
  return [...images].sort((a, b) => (b.isCapa ? 1 : 0) - (a.isCapa ? 1 : 0));
}

/** Lightbox em tela cheia com navegacao. */
function Lightbox({
  images,
  start = 0,
  onClose,
}: {
  images: OfferImage[];
  start?: number;
  onClose: () => void;
}) {
  const [i, setI] = useState(start);
  const go = (delta: number) => (e: React.MouseEvent) => {
    e.stopPropagation();
    setI((p) => (p + delta + images.length) % images.length);
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white/80 hover:text-white"
        aria-label="Fechar"
      >
        <X className="w-6 h-6" />
      </button>
      {images.length > 1 ? (
        <button onClick={go(-1)} className="absolute left-4 text-white/80 hover:text-white" aria-label="Anterior">
          <ChevronLeft className="w-8 h-8" />
        </button>
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={images[i].url}
        alt="Foto do veículo"
        className="max-h-[85vh] max-w-[90vw] object-contain rounded"
        onClick={(e) => e.stopPropagation()}
      />
      {images.length > 1 ? (
        <button onClick={go(1)} className="absolute right-4 text-white/80 hover:text-white" aria-label="Próxima">
          <ChevronRight className="w-8 h-8" />
        </button>
      ) : null}
      {images.length > 1 ? (
        <span className="absolute bottom-4 text-white/70 text-[12px]">
          {i + 1} / {images.length}
        </span>
      ) : null}
    </div>
  );
}

/**
 * Thumbnail compacto (tabela/cards). Mostra a capa; clique abre o lightbox.
 * Placeholder de carro quando ainda nao ha fotos tratadas (processando/escondidas).
 */
export function OfferThumb({
  images,
  size = 40,
  className = "",
}: {
  images?: OfferImage[];
  size?: number;
  className?: string;
}) {
  const imgs = images ?? [];
  const [open, setOpen] = useState(false);

  if (imgs.length === 0) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`rounded-[6px] bg-[#F3F4F6] flex items-center justify-center text-[#C1C7D0] shrink-0 ${className}`}
        aria-label="Sem fotos"
      >
        <Car className="w-1/2 h-1/2" />
      </div>
    );
  }

  const list = ordered(imgs);
  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        style={{ width: size, height: size }}
        className={`relative rounded-[6px] overflow-hidden bg-[#F3F4F6] shrink-0 ${className}`}
        aria-label={`Ver ${list.length} foto(s)`}
        title="Ver fotos"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={list[0].url} alt="Foto do veículo" loading="lazy" className="w-full h-full object-cover" />
        {list.length > 1 ? (
          <span className="absolute bottom-0 right-0 bg-black/55 text-white text-[9px] leading-none px-1 py-0.5 rounded-tl">
            {list.length}
          </span>
        ) : null}
      </button>
      {open ? <Lightbox images={list} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

/**
 * Galeria completa (modal de detalhes): foto principal + miniaturas + lightbox.
 */
export function OfferGallery({ images }: { images?: OfferImage[] }) {
  const imgs = ordered(images ?? []);
  const [idx, setIdx] = useState<number | null>(null);

  if (imgs.length === 0) {
    return (
      <div className="rounded-[8px] bg-[#F7F8FA] border border-[#EEF0F3] py-8 flex flex-col items-center gap-2 text-[#9AA0AB]">
        <Car className="w-7 h-7" />
        <span className="text-[12px]">Sem fotos disponíveis</span>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setIdx(0)}
        className="block w-full rounded-[8px] overflow-hidden bg-[#F3F4F6] aspect-[4/3]"
        aria-label="Ampliar foto"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imgs[0].url} alt="Foto do veículo" className="w-full h-full object-cover" />
      </button>
      {imgs.length > 1 ? (
        <div className="mt-2 grid grid-cols-5 gap-1.5">
          {imgs.slice(0, 10).map((im, i) => (
            <button
              key={im.url}
              type="button"
              onClick={() => setIdx(i)}
              className="rounded-[6px] overflow-hidden bg-[#F3F4F6] aspect-square"
              aria-label={`Foto ${i + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={im.url} alt="" loading="lazy" className="w-full h-full object-cover" />
            </button>
          ))}
          {imgs.length > 10 ? (
            <span className="flex items-center justify-center text-[11px] text-[#9AA0AB]">+{imgs.length - 10}</span>
          ) : null}
        </div>
      ) : null}
      {idx !== null ? <Lightbox images={imgs} start={idx} onClose={() => setIdx(null)} /> : null}
    </div>
  );
}
