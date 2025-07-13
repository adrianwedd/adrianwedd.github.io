import { defineCollection, z } from 'astro:content';

const baseSchema = z.object({
  title: z.string(),
  date: z.coerce.date(),
  tags: z.array(z.string()).default([]),
  description: z.string(),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
});

const garden = defineCollection({ type: 'content', schema: baseSchema });
const codex = defineCollection({ type: 'content', schema: baseSchema });
const logs = defineCollection({ type: 'content', schema: baseSchema });
const mirror = defineCollection({ type: 'content', schema: baseSchema });
const tools = defineCollection({ type: 'content', schema: baseSchema });
const resume = defineCollection({ type: 'content', schema: baseSchema });

export const collections = {
  garden,
  codex,
  logs,
  mirror,
  tools,
  resume,
};
