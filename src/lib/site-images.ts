import type { ImageMetadata } from 'astro';

const siteImages = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/site/*.{avif,gif,jpeg,jpg,png,webp}',
  { eager: true },
);

export const getSiteImage = (path?: string) => {
  if (!path) return undefined;
  const normalisedPath = `/${path.replace(/^\/+/, '')}`;
  return siteImages[normalisedPath]?.default;
};
