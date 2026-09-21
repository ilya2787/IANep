import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

const variants = [
  ["public/images/hero-mascot-front-no-eyes-v3.png", "public/images/responsive/hero/mascot", [750, 1200], 86],
  ["public/images/projects/portfolio-mascot-seated-v2.png", "public/images/responsive/portfolio/mascot", [256, 384], 82],
  ["public/images/final-cta/mascot-inviting-v3.png", "public/images/responsive/final-cta/mascot", [640, 1080], 84],
  ["public/reference/brand-symbol.png", "public/images/responsive/final-cta/brand-symbol", [640, 1080], 84],
  ["public/images/brief/mascot-questionnaire-v2.png", "public/images/responsive/brief/questionnaire", [640, 1080], 84],
  ["public/images/brief/mascot-success-v2.png", "public/images/responsive/brief/success", [640, 1080], 84],
];

const services = [
  ["landing-page", "landing-page-light-hq.png", "landing-page-dark.png"],
  ["multipage-site", "multipage-site-light-hq.png", "multipage-site-dark.png"],
  ["online-store", "online-store-light-hq.png", "online-store-dark.png"],
  ["web-apps", "web-apps-light-hq.png", "web-apps-dark.png"],
  ["site-improvements", "site-improvements-light-hq.png", "site-improvements-dark.png"],
  ["support", "support-light.webp", "support-dark.webp"],
];
for (const [id, light, dark] of services) {
  variants.push([`public/services/${light}`, `public/images/responsive/services/${id}-light`, [828, 1200], 84]);
  variants.push([`public/services/${dark}`, `public/images/responsive/services/${id}-dark`, [828, 1200], 84]);
}

for (const id of ["understand", "design", "develop", "launch"]) {
  for (const theme of ["light", "dark"]) {
    variants.push([`public/images/approach/${id}-${theme}.png`, `public/images/responsive/approach/${id}-${theme}`, [640, 1080], 82]);
  }
}

for (const [source, outputBase, widths, quality] of variants) {
  await mkdir(dirname(outputBase), { recursive: true });
  const metadata = await sharp(source).metadata();
  for (const requestedWidth of widths) {
    const width = Math.min(requestedWidth, metadata.width ?? requestedWidth);
    await sharp(source)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality, effort: 6, alphaQuality: 90, smartSubsample: true })
      .toFile(`${outputBase}-${requestedWidth}.webp`);
  }
}
