import { useEffect } from 'react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface PrototypeVariantDef {
  readonly id: string;
  readonly label: string;
  readonly description: string;
}

export interface PrototypeSwitcherProps {
  readonly variants: readonly PrototypeVariantDef[];
  readonly currentVariantId: string;
  readonly onSelectVariant: (variantId: string) => void;
}

/**
 * PrototypeSwitcher — Floating bottom bar for navigating radically different prototype UI variants.
 * Follows /prototype skill guidelines (UI.md):
 * - cycles with Left/Right buttons
 * - cycles with Left/Right arrow keys (unless focused in text inputs)
 * - displays variant label and summary
 * - high-contrast pill styling
 */
export function PrototypeSwitcher({
  variants,
  currentVariantId,
  onSelectVariant,
}: PrototypeSwitcherProps) {
  const currentIndex = variants.findIndex((v) => v.id === currentVariantId);
  const activeIndex = currentIndex === -1 ? 0 : currentIndex;
  const currentVariant = variants[activeIndex];

  const handlePrev = () => {
    const nextIdx = (activeIndex - 1 + variants.length) % variants.length;
    onSelectVariant(variants[nextIdx].id);
  };

  const handleNext = () => {
    const nextIdx = (activeIndex + 1) % variants.length;
    onSelectVariant(variants[nextIdx].id);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (
        activeTag === 'input' ||
        activeTag === 'textarea' ||
        (document.activeElement as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  return (
    <div
      data-testid="prototype-switcher"
      className="fixed bottom-6 inset-x-0 mx-auto w-fit z-50 flex items-center gap-3 px-4 py-2.5 rounded-full bg-neutral-950/95 border-2 border-primary/50 text-white shadow-2xl backdrop-blur-xl pointer-events-auto"
    >
      <div className="flex items-center gap-2 pr-2 border-r border-white/20">
        <Sparkles className="size-4 text-amber-400 animate-spin-slow" />
        <span className="text-xs font-black uppercase tracking-wider text-amber-300">
          PROTOTYPE
        </span>
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={handlePrev}
        className="size-7 rounded-full text-white hover:bg-white/10 hover:text-white"
        aria-label="Variação anterior"
      >
        <ChevronLeft className="size-4" />
      </Button>

      <div className="flex items-center gap-2 px-1">
        <Badge
          variant="outline"
          className="bg-primary/20 text-primary-foreground border-primary/40 font-mono text-xs px-2 py-0.5"
        >
          {activeIndex + 1} / {variants.length}
        </Badge>
        <div className="flex flex-col">
          <span className="text-xs font-bold leading-tight">
            {currentVariant.label}
          </span>
          <span className="text-[10px] text-neutral-400 leading-tight">
            {currentVariant.description}
          </span>
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={handleNext}
        className="size-7 rounded-full text-white hover:bg-white/10 hover:text-white"
        aria-label="Próxima variação"
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
