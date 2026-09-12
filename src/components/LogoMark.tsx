// The Askshree mark -- static emblem asset (public/askshree-emblem.png).
// Sized via width/height prop.
export default function LogoMark({
  size = 26,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/askshree-emblem.png"
      width={size}
      height={size}
      alt="Askshree"
      className={`flex-shrink-0 rounded-[22%] ${className}`}
    />
  );
}
