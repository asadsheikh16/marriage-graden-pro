// components/FunctionTag.tsx — function type ka chip. Naam lib/function-types.ts se (ek hi source).
// Phase 1: dashboard aur calendar par ek hi look; badge ke liye gold border, text burgundy/brown (gold text nahi).
import { functionTypeLabel } from '@/lib/function-types';

export function FunctionTag({ type }: { type: string | null | undefined }) {
  const label = functionTypeLabel(type);
  if (!label) return null;
  return (
    <span className="inline-flex min-h-[28px] items-center rounded-full border border-gold/60 bg-ivory px-2.5 text-[14px] font-semibold text-wine">
      {label}
    </span>
  );
}
