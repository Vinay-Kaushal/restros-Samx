import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const base =
    "px-4 py-2.5 rounded-card font-sans text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const variants: Record<Variant, string> = {
    primary: "bg-chili-400 text-ink-50 hover:bg-chili-600",
    secondary: "bg-ink-900 text-ink-50 hover:bg-ink-700",
    ghost: "bg-transparent text-ink-700 hover:bg-ink-100"
  };
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}
