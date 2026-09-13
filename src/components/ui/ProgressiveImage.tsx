"use client";

import Image, { type ImageProps } from "next/image";
import { useCallback, useEffect, useRef, useState, type ReactNode, type SyntheticEvent } from "react";
import styles from "./ProgressiveImage.module.css";

type ProgressiveImageProps = ImageProps & {
  readyOverlay?: ReactNode;
  showPlaceholder?: boolean;
  onReady?: (state: Exclude<ImageState, "loading">) => void;
};
type ImageState = "loading" | "loaded" | "error";

export function ProgressiveImage({ alt, className = "", onLoad, onError, readyOverlay, showPlaceholder = true, onReady, ...props }: ProgressiveImageProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [state, setState] = useState<ImageState>("loading");

  const reveal = useCallback(async (image: HTMLImageElement) => {
    try {
      await image.decode();
    } catch {
      // A successful load may still reject decode in some browsers.
    }
    setState("loaded");
    onReady?.("loaded");
  }, [onReady]);

  useEffect(() => {
    const image = imageRef.current;
    if (!image?.complete) return;
    if (image.naturalWidth === 0) {
      setState("error");
      onReady?.("error");
      return;
    }
    void reveal(image);
  }, [onReady, reveal]);

  const handleLoad = (event: SyntheticEvent<HTMLImageElement>) => {
    onLoad?.(event);
    void reveal(event.currentTarget);
  };

  const handleError = (event: SyntheticEvent<HTMLImageElement>) => {
    setState("error");
    onReady?.("error");
    onError?.(event);
  };

  return (
    <>
      {showPlaceholder ? (
        <span
          className={`${styles.placeholder} ${state === "loaded" ? styles.placeholderLoaded : ""}`}
          aria-hidden="true"
        />
      ) : null}
      <Image
        {...props}
        alt={alt}
        ref={imageRef}
        className={`${styles.image} ${styles[`image${state[0].toUpperCase()}${state.slice(1)}`]} ${className}`}
        onLoad={handleLoad}
        onError={handleError}
      />
      {readyOverlay ? (
        <span
          className={`${styles.readyOverlay} ${state === "loaded" ? styles.readyOverlayLoaded : ""} ${state === "error" ? styles.readyOverlayError : ""}`}
        >
          {readyOverlay}
        </span>
      ) : null}
    </>
  );
}
