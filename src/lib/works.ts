import type { CollectionEntry } from 'astro:content';

// Featured first, then by sort order, newest year, title.
export const sortWorks = (works: CollectionEntry<'works'>[]) => [...works].sort((a, b) =>
  Number(b.data.featured) - Number(a.data.featured) ||
  (a.data.order ?? 9999) - (b.data.order ?? 9999) ||
  b.data.year - a.data.year || a.data.title.localeCompare(b.data.title));

// Where Astro keeps the original file, so sharp can read it at build time.
export const imagePath = (image: { src: string }) => (image as { fsPath?: string }).fsPath ?? image.src;
