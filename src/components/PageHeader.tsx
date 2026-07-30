interface PageHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}

/**
 * Compact page header shared by every page under the new sidebar shell
 * — replaces each page's old full-bleed hero (large centered headline +
 * gradient glow), which made sense when every page was its own isolated
 * marketing-style screen but wastes the sidebar layout's horizontal
 * space and reads as inconsistent once a persistent nav is on screen.
 */
export function PageHeader({ eyebrow, title, description, action }: PageHeaderProps) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-5">
      <div>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-accent">{eyebrow}</span>
        <h1 className="mt-1 text-balance font-display text-[30px] font-bold tracking-tight text-foreground">{title}</h1>
        <p className="mt-1 max-w-md text-sm leading-relaxed text-foreground/55">{description}</p>
      </div>
      {action}
    </div>
  );
}
