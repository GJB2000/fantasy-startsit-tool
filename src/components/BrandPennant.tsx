import Image from "next/image";

/**
 * Aspect of public/legitfootball-pennant.svg (2.6:1) — the artwork's real
 * bounds, which is also the file's viewBox. Illustrator centres the mark in
 * a much larger, near-square artboard; that padding is cropped out of the
 * viewBox so the asset measures the mark itself and nothing else.
 */
const SRC_W = 282.26;
const SRC_H = 108.51;

/**
 * The LEGITFOOTBALL pennant mark — cream felt, blue helmet + script.
 *
 * Rendered from the vector exported out of design/legitlogo2.ai, so it stays
 * sharp at any size, pixel density, or zoom level. The mark carries the
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
  return (
    <Image
      src="/legitfootball-pennant.svg"
      alt="Legit Football"
      width={width}
      height={Math.round((width * SRC_H) / SRC_W)}
      // Vector — there is nothing for the image optimizer to resize or
      // re-encode, and Next declines to process SVG anyway unless
      // dangerouslyAllowSVG is set. Served as-is: ~11KB, one request, no
      // per-size variants.
      unoptimized
      priority={priority}
      className={className}
    />
  );
}
