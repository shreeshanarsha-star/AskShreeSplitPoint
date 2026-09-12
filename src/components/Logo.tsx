// The Askshree logo / emblem (public/askshree-emblem.png).
// Sized by `height` with automatic aspect ratio.
export default function Logo({
  height = 28,
  className = "",
}: {
  height?: number;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/askshree-emblem.png"
      height={height}
      alt="Askshree"
      className={`flex-shrink-0 w-auto ${className}`}
      style={{ height }}
    />
  );
}
