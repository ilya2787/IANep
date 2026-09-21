"use client";

import Image, { type ImageProps } from "next/image";
import { useCallback, useLayoutEffect, useRef, useState, type ReactNode, type SyntheticEvent } from "react";
import { getCompleteImageState } from "./progressive-image-state";
import styles from "./ProgressiveImage.module.css";

type ProgressiveImageProps = ImageProps & {
  readyOverlay?: ReactNode;
  showPlaceholder?: boolean;
  onReady?: (state: Exclude<ImageState, "loading">) => void;
  staticSrcSet?: string;
};
type ImageState = "loading" | "loaded" | "error";

export function ProgressiveImage({ alt, className = "", onLoad, onError, readyOverlay, showPlaceholder = true, onReady, ...props }: ProgressiveImageProps) {
  const source = typeof props.src === "string"
    ? props.src
    : "src" in props.src
      ? props.src.src
      : props.src.default.src;

  return (
    <ProgressiveImageLifecycle
      key={source}
      {...props}
      alt={alt}
      className={className}
      onLoad={onLoad}
      onError={onError}
      readyOverlay={readyOverlay}
      showPlaceholder={showPlaceholder}
      onReady={onReady}
    />
  );
}

function ProgressiveImageLifecycle({ alt, className = "", onLoad, onError, readyOverlay, showPlaceholder = true, onReady, staticSrcSet, ...props }: ProgressiveImageProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [state, setState] = useState<ImageState>("loading");
  const [useOriginalSource, setUseOriginalSource] = useState(false);
  const settledRef = useRef(false);
  const canRetryOriginal = typeof props.src === "string" && props.src.startsWith("/") && !props.unoptimized;

  const settle = useCallback((nextState: Exclude<ImageState, "loading">) => {
    if (settledRef.current) return;
    settledRef.current = true;
    setState(nextState);
    onReady?.(nextState);
  }, [onReady]);

  useLayoutEffect(() => {
    const image = imageRef.current;
    if (!image) return;
    const completeState = getCompleteImageState(image);
    if (completeState) settle(completeState);
  }, [settle]);

  const handleLoad = (event: SyntheticEvent<HTMLImageElement>) => {
    onLoad?.(event);
    settle("loaded");
  };

  const handleError = (event: SyntheticEvent<HTMLImageElement>) => {
    if (canRetryOriginal && !useOriginalSource) {
      setUseOriginalSource(true);
      return;
    }
    settle("error");
    onError?.(event);
  };

  return (
    <>
      {showPlaceholder ? (
        <span
          className={`${styles.placeholder} ${state !== "loading" ? styles.placeholderSettled : ""}`}
          aria-hidden="true"
        />
      ) : null}
      {staticSrcSet && typeof props.src === "string" ? (
        // Pre-generated variants intentionally bypass the production optimizer, whose cache misses caused multi-second placeholders.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={props.src}
          srcSet={staticSrcSet}
          sizes={props.sizes}
          width={props.fill ? undefined : typeof props.width === "number" ? props.width : undefined}
          height={props.fill ? undefined : typeof props.height === "number" ? props.height : undefined}
          alt={alt}
          ref={imageRef}
          className={`${styles.image} ${props.fill ? styles.imageFill : ""} ${styles[`image${state[0].toUpperCase()}${state.slice(1)}`]} ${className}`}
          loading={props.priority ? "eager" : props.loading}
          fetchPriority={props.fetchPriority}
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
        />
      ) : (
        <Image
          {...props}
          unoptimized={props.unoptimized || useOriginalSource}
          alt={alt}
          ref={imageRef}
          className={`${styles.image} ${styles[`image${state[0].toUpperCase()}${state.slice(1)}`]} ${className}`}
          onLoad={handleLoad}
          onError={handleError}
        />
      )}
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
