import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const works = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/works' }),
  schema: ({ image }) => z.object({
    title: z.string().min(1),
    year: z.number().int(),
    medium: z.string().optional(),
    dimensions: z.string().optional(),
    image: image(),
    imageAlt: z.string().min(1),
    tags: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
    order: z.number().int().optional(),
    credit: z.string().optional(),
    source: z.union([z.string().url().regex(/^https:\/\//), z.literal('')]).optional(),
  }),
});
const pages = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/pages' }),
  schema: z.object({ title: z.string() }),
});
export const collections = { works, pages };
