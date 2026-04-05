// Renders emoji as Twemoji SVG image — font-independent, works in WKWebView
function emojiToUrl(emoji: string): string {
  const codepoints = [...emoji]
    .map((c) => c.codePointAt(0)!.toString(16).toLowerCase())
    .join("-");
  return `https://cdn.jsdelivr.net/npm/twemoji@14.0.2/assets/svg/${codepoints}.svg`;
}

type Props = { emoji: string; size?: number; className?: string };

export default function TwemojiImg({ emoji, size = 20, className }: Props) {
  return (
    <img
      src={emojiToUrl(emoji)}
      alt={emoji}
      width={size}
      height={size}
      className={className}
      style={{ display: "inline-block", verticalAlign: "middle" }}
    />
  );
}
