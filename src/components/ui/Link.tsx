import NextLink, { type LinkProps as NextLinkProps } from "next/link";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import type { ButtonVariant } from "./Button";
import styles from "./Button.module.css";

type LinkProps = NextLinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof NextLinkProps> & {
    children: ReactNode;
    variant?: "text" | ButtonVariant;
  };

export function Link({
  children,
  className,
  variant = "text",
  ...props
}: LinkProps) {
  const classes =
    variant === "text"
      ? className
      : [styles.button, styles[variant], className].filter(Boolean).join(" ");

  return (
    <NextLink className={classes} {...props}>
      {children}
    </NextLink>
  );
}
