type Variant = "standalone" | "withLogo";

export default function Mascot({
  variant = "standalone",
  size = 320,
  className = "",
  alt = "Sanchez Services mascot",
}: {
  variant?: Variant;
  size?: number;
  className?: string;
  alt?: string;
}) {
  const sources = {
    standalone: {
      small: new URL("@/assets/mascot/mascot-standalone.png", import.meta.url).href,
      large: new URL("@/assets/mascot/mascot-standalone-2000px.png", import.meta.url).href,
    },
    withLogo: {
      small: new URL("@/assets/mascot/sanchez-services-mascot.png", import.meta.url).href,
      large: new URL("@/assets/mascot/sanchez-services-logo.png", import.meta.url).href,
    },
  } as const;

  // use large asset if requesting size > 500px
  const src = size > 500 ? sources[variant].large : sources[variant].small;

  return (
    <img
      src={src}
      width={size}
      height={Math.round(size * 0.88)}
      alt={alt}
      className={className}
      loading={size > 500 ? "lazy" : "eager"}
    />
  );
}
