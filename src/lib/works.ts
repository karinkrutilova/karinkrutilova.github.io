import type { ImageMetadata } from 'astro';
import { getCollection, type CollectionEntry } from 'astro:content';

export type Work = {
  id: string;
  entry?: CollectionEntry<'works'>;
  data: {
    title: string;
    year?: number;
    medium?: string;
    dimensions?: string;
    image: ImageMetadata;
    imageAlt: string;
    tags: string[];
    featured: boolean;
    order?: number;
    credit?: string;
    source?: string;
  };
};

const imageModules = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/works/**/*.{avif,gif,jpeg,jpg,png,webp}',
  { eager: true },
);

const normalisePath = (path: string) => `/${path.replace(/^\/+/, '')}`;
const extensionPattern = /\.[^.]+$/;

export const titleFromImagePath = (path: string) => {
  const filename = path.split('/').pop()?.replace(extensionPattern, '') ?? 'Untitled';
  const title = filename.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
  return title ? title.replace(/\b\w/g, (letter) => letter.toUpperCase()) : 'Untitled';
};

const slugFromImagePath = (path: string) => path
  .replace('/src/assets/works/', '')
  .replace(extensionPattern, '')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-zA-Z0-9]+/g, '-')
  .replace(/^-|-$/g, '')
  .toLowerCase() || 'untitled';

export async function getWorks(): Promise<Work[]> {
  const entries = await getCollection('works');
  const entriesByImage = new Map(entries.map((entry) => [normalisePath(entry.data.image), entry]));

  const works = Object.entries(imageModules).map(([path, module]) => {
    const imagePath = normalisePath(path);
    const entry = entriesByImage.get(imagePath);
    const title = entry?.data.title?.trim() || titleFromImagePath(imagePath);

    return {
      id: slugFromImagePath(imagePath),
      entry,
      data: {
        title,
        year: entry?.data.year,
        medium: entry?.data.medium,
        dimensions: entry?.data.dimensions,
        image: module.default,
        imageAlt: entry?.data.imageAlt?.trim() || title,
        tags: entry?.data.tags ?? [],
        featured: entry?.data.featured ?? false,
        order: entry?.data.order,
        credit: entry?.data.credit,
        source: entry?.data.source,
      },
    } satisfies Work;
  });

  return sortWorks(works);
}

// Explicit gallery order first. Featured is the fallback for records that have
// not yet been arranged with the ordering tool.
export const sortWorks = (works: Work[]) => [...works].sort((a, b) =>
  (a.data.order ?? 9999) - (b.data.order ?? 9999) ||
  Number(b.data.featured) - Number(a.data.featured) ||
  (b.data.year ?? 0) - (a.data.year ?? 0) || a.data.title.localeCompare(b.data.title));

// Where Astro keeps the original file, so sharp can read it at build time.
export const imagePath = (image: ImageMetadata) => (image as ImageMetadata & { fsPath?: string }).fsPath ?? image.src;
