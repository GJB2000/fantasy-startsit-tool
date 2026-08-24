import Image from "next/image";

/** Intrinsic size of public/legitfootball-pennant.png (2.56:1). */
const SRC_W = 1090;
const SRC_H = 426;

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
  return (
    <Image
      src="/legitfootball-pennant.png"
      alt="Legit Football"
      width={width}
      height={Math.round((width * SRC_H) / SRC_W)}
      priority={priority}
      className={className}
    />
  );
}
