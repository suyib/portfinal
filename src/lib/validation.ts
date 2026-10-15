import { z } from 'zod'

// Form-data schemas for the admin server actions. The database enforces the
// same rules with constraints; these give friendly errors first.

const text = (max: number) => z.string().trim().max(max, `Keep this under ${max} characters`)
const markdown = text(50_000)
const required = (max: number, label: string) => text(max).min(1, `${label} is required`)
const uuid = z.uuid('Invalid id')
const optionalUuid = z
  .string()
  .trim()
  .transform((v) => (v === '' ? null : v))
  .pipe(z.uuid().nullable())

/** "Figma, Maze, , Notion" -> ["Figma", "Maze", "Notion"] */
const csv = (maxItems: number) =>
  z
    .string()
    .default('')
    .transform((v) => [...new Set(v.split(',').map((s) => s.trim()).filter(Boolean))])
    .pipe(z.array(z.string().max(40, 'Each item must be under 40 characters')).max(maxItems))

const checkbox = z
  .string()
  .optional()
  .transform((v) => v === 'on' || v === 'true')

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Slug is required')
  .max(80)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and single hyphens')

export const STATUSES = ['draft', 'published', 'archived'] as const
export const SECTION_KINDS = [
  'overview', 'problem', 'research', 'define', 'ideate',
  'prototype', 'test', 'iterate', 'outcome', 'reflection', 'custom',
] as const

export const createProjectSchema = z.object({
  title: required(200, 'Title'),
  slug: slugSchema,
})

export const updateProjectSchema = z.object({
  id: uuid,
  title: required(200, 'Title'),
  slug: slugSchema,
  summary: text(500),
  client: text(200),
  role: text(200),
  team: text(300),
  timeline: text(200),
  tools: csv(30),
  tags: csv(20),
  problem: markdown,
  solution: markdown,
  // status is changed only through setProjectStatus (the publish bar)
  featured: checkbox,
})

export const sectionSchema = z.object({
  id: optionalUuid,
  project_id: uuid,
  kind: z.enum(SECTION_KINDS),
  title: required(200, 'Title'),
  body: markdown,
})

export const iterationSchema = z.object({
  id: optionalUuid,
  project_id: uuid,
  section_id: optionalUuid,
  label: required(60, 'Label'),
  title: text(200),
  description: markdown,
  feedback: markdown,
  changes: markdown,
  iteration_date: z
    .string()
    .trim()
    .transform((v) => (v === '' ? null : v))
    .pipe(z.iso.date('Use a valid date').nullable()),
})

export const outcomeSchema = z.object({
  id: optionalUuid,
  project_id: uuid,
  value: required(40, 'Value'),
  label: required(120, 'Label'),
  detail: text(500),
})

export const mediaUploadSchema = z
  .object({
    project_id: uuid,
    kind: z.enum(['image', 'video']),
    storage_path: z.string().regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.[a-z0-9]{2,5}$/, 'Bad path'),
    alt_text: text(500),
    caption: text(1000),
    width: z.coerce.number().int().positive().nullable().catch(null),
    height: z.coerce.number().int().positive().nullable().catch(null),
    section_id: optionalUuid,
    iteration_id: optionalUuid,
  })
  .refine((m) => m.storage_path.startsWith(`${m.project_id}/`), {
    path: ['storage_path'],
    message: 'File must live in this project’s folder',
  })
  .refine((m) => m.kind !== 'image' || m.alt_text.length > 0, {
    path: ['alt_text'],
    message: 'Describe the image for screen readers',
  })

export const embedSchema = z.object({
  project_id: uuid,
  embed_url: z
    .url({ protocol: /^https$/, error: 'Use a full https:// URL' })
    .max(2000),
  alt_text: text(500),
  caption: text(1000),
  section_id: optionalUuid,
  iteration_id: optionalUuid,
})

export const updateMediaSchema = z.object({
  id: uuid,
  project_id: uuid,
  alt_text: text(500),
  caption: text(1000),
  section_id: optionalUuid,
  iteration_id: optionalUuid,
})

export const linksSchema = z
  .array(
    z.object({
      label: required(60, 'Link label'),
      url: z.url({ protocol: /^(https?|mailto)$/, error: 'Use a full URL' }).max(2000),
    }),
  )
  .max(20)

export const settingsSchema = z.object({
  name: text(120),
  headline: text(300),
  bio: markdown,
  email: z
    .string()
    .trim()
    .transform((v) => (v === '' ? null : v))
    .pipe(z.email('Use a valid email').nullable()),
  location: text(120),
  resume_url: z
    .string()
    .trim()
    .transform((v) => (v === '' ? null : v))
    .pipe(z.url({ protocol: /^https?$/, error: 'Use a full URL' }).nullable()),
  // one "Label | https://url" per line
  links: z
    .string()
    .default('')
    .transform((v) =>
      v
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [label, ...rest] = line.split('|')
          return { label: label.trim(), url: rest.join('|').trim() }
        }),
    )
    .pipe(linksSchema),
})

export const moveSchema = z.object({
  id: uuid,
  direction: z.enum(['up', 'down']),
})

/** FormData -> plain object (last value wins; empty file inputs dropped). */
export function formToObject(formData: FormData) {
  const out: Record<string, string> = {}
  for (const [key, value] of formData.entries()) {
    if (key.startsWith('$ACTION')) continue
    if (typeof value === 'string') out[key] = value
  }
  return out
}
