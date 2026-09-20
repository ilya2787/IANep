export type SettledImageState = "loaded" | "error";

type ImageCompletion = Pick<HTMLImageElement, "complete" | "naturalWidth">;

export function getCompleteImageState(image: ImageCompletion): SettledImageState | null {
  if (!image.complete) return null;
  return image.naturalWidth > 0 ? "loaded" : "error";
}
