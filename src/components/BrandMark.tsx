type Variant = "primary" | "white";
type Size = "default" | "large";

export default function BrandMark({
  variant = "primary",
  size = "default",
  className = "",
  alt = "Sanchez Services logo",
}: {
  variant?: Variant;
  size?: Size;
  className?: string;
  alt?: string;
}) {
  const sources = {
    primary: {
      default: new URL("@/assets/logo/logo-primary.PNG", import.meta.url).href,
      large: new URL("@/assets/logo/logo-primary-2000px.PNG", import.meta.url).href,
    },
    white: {
      default: new URL("@/assets/logo/logo-primary-white.PNG", import.meta.url).href,
      large: new URL("@/assets/logo/logo-primary-1000px.PNG", import.meta.url).href,
    },
  } as const;

  const src = sources[variant][size];

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading={size === "large" ? "lazy" : "eager"}
    />
  );
}
