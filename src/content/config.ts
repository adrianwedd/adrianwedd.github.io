import { defineCollection, z } from 'astro:content';

const baseSchema = z.object({
  title: z.string(),
  date: z.coerce.date(),
  tags: z.array(z.string()).default([]),
  description: z.string(),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
});

const toolsSchema = z.object({
  title: z.string(),
  repo: z.string().url(),
  description: z.string(),
  updated: z.string().optional(),
});

const agentSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string().optional(),
  owner: z.string().optional(),
  status: z.enum(['active', 'idle', 'offline', 'error']),
  last_updated: z.string(),
  description: z.string().optional(),
});

const garden = defineCollection({ type: 'content', schema: baseSchema });
const codex = defineCollection({ type: 'content', schema: baseSchema });
const logs = defineCollection({ type: 'content', schema: baseSchema });
const mirror = defineCollection({ type: 'content', schema: baseSchema });
const tools = defineCollection({ type: 'content', schema: toolsSchema });
const resume = defineCollection({ type: 'content', schema: baseSchema });
const agents = defineCollection({ type: 'data', schema: agentSchema });

export const collections = {
  garden,
  codex,
  logs,
  mirror,
  tools,
  resume,
  agents,
};
