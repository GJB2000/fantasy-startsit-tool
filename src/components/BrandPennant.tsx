import Image from "next/image";

/** Intrinsic size of public/legitfootball-pennant.png (2.56:1). */
const SRC_W = 1610;
const SRC_H = 628;

/**
 * The LEGITFOOTBALL pennant mark — cream felt, blue helmet + script.
 *
 * Rendered straight from the artwork exported out of design/legitlogo2.ai
 * (transparent PNG, tightly cropped to the art), so it always matches the
 * source logo rather than a hand-built approximation. The mark carries the
 * wordmark itself, so wherever it appears it replaces — rather than sits
 * beside — a "LEGITFOOTBALL" text lockup.
 */
export function BrandPennant({
  width = 174,
  className,
  priority = true,
}: {
  width?: number;
  className?: string;
  priority?: boolean;
}) {
  const height = Math.round((width * SRC_H) / SRC_W);
  return (
    <Image
      src="/legitfootball-pennant.png"
      alt="Legit Football"
      // Ask for twice the pixels we actually display, then scale down in CSS.
      // A fixed-size next/image only offers 1x and 2x of the `width` prop in
      // its srcset, so on a 2x screen this lands 4x the CSS size — sharp on
      // retina and still sharp zoomed in. Without it the mark renders soft:
      // at width={142} a 2x display got a 192px-wide file for a 284px slot.
      width={width * 2}
      height={height * 2}
      quality={90}
      style={{ width, height }}
      priority={priority}
      className={className}
    />
  );
}
