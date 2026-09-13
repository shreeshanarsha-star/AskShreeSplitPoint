import { iconPaths } from "@/lib/icons";

export default function Icon({
  name,
  className = "",
  size,
}: {
  name: string;
  className?: string;
  size?: number;
}) {
  const paths = iconPaths(name);
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

