// The AskShree logo:
// Gold Sri Chakra emblem (/askshree-emblem.png) + "AskShree" brand typography +
// "AI powered hiring partner" punchline.
export default function Logo({
  height = 28,
  className = "",
  showPunchline = true,
  inline = false,
}: {
  height?: number;
  className?: string;
  showPunchline?: boolean;
  inline?: boolean;
}) {
  return (
    <div
      className={`inline-flex items-center gap-2.5 flex-shrink-0 select-none ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/askshree-emblem.png"
        height={height}
        width={height}
        alt="AskShree"
        className="flex-shrink-0 rounded-[22%] shadow-emblem"
        style={{ height, width: height }}
      />
      <div
        className={`flex ${
          inline ? "flex-row items-baseline gap-2" : "flex-col justify-center"
        } leading-none`}
      >
        <div
          className="font-extrabold tracking-tight text-ink font-display"
          style={{
            fontSize: Math.round(height * 0.64),
            lineHeight: 1.1,
          }}
        >
          <span>Ask</span>
          <span className="text-brand">Shree</span>
        </div>
        {showPunchline && (
          <span
            className="font-medium text-ink-muted tracking-tight mt-0.5 whitespace-nowrap"
            style={{ fontSize: Math.max(9.5, Math.round(height * 0.36)) }}
          >
            AI powered hiring partner
          </span>
        )}
      </div>
    </div>
  );
}
