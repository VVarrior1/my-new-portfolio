import { ReactNode } from "react";

type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  kicker?: ReactNode;
};

export function SectionHeading({ eyebrow, title, kicker }: SectionHeadingProps) {
  return (
    <div className="space-y-3">
      {eyebrow && (
        <p className="text-xs uppercase tracking-[0.3em] text-emerald-300/80">
          {eyebrow}
        </p>
      )}
      <div className="flex flex-wrap items-end gap-3">
        <h2 className="text-3xl font-semibold sm:text-4xl text-white">{title}</h2>
        {kicker}
      </div>
    </div>
  );
}
