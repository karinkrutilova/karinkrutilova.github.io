import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const works = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/works' }),
  schema: z.object({
    title: z.string().min(1).optional(),
    year: z.number().int().optional(),
    medium: z.string().optional(),
    dimensions: z.string().optional(),
    // Keep this as a repository path. The gallery resolves it to an imported
    // image when one exists, while allowing stale optional metadata records.
    image: z.string(),
    imageAlt: z.string().min(1).optional(),
    tags: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
    order: z.number().int().optional(),
    credit: z.string().optional(),
    source: z.union([z.string().url().regex(/^https:\/\//), z.literal('')]).optional(),
  }),
});
export const collections = { works };
