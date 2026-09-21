"use client";

import { useSyncExternalStore } from "react";
import type { ImageProps } from "next/image";
import { ProgressiveImage } from "./ProgressiveImage";

type StaticThemeSource = {
  src: string;
  srcSet: string;
};

type ThemeProgressiveImageProps = Omit<ImageProps, "src"> & {
  light: StaticThemeSource;
  dark: StaticThemeSource;
};

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  window.addEventListener("ianep-theme-change", onChange);
  return () => {
    observer.disconnect();
    window.removeEventListener("ianep-theme-change", onChange);
  };
}

function getTheme() {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

export function ThemeProgressiveImage({ light, dark, ...props }: ThemeProgressiveImageProps) {
  const theme = useSyncExternalStore(subscribe, getTheme, () => null);
  if (!theme) return null;
  const source = theme === "light" ? light : dark;
  return <ProgressiveImage {...props} key={source.src} src={source.src} staticSrcSet={source.srcSet} unoptimized />;
}
