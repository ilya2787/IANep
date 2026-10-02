import type { ComponentProps } from "react";
import { ProgressiveImage } from "./ProgressiveImage";

export function ViewportProgressiveImage(props: ComponentProps<typeof ProgressiveImage>) {
  return <ProgressiveImage {...props} />;
}
