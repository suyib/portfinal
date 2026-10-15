// Cache tags shared by the cached public reads and the admin server actions.
export const TAGS = {
  site: 'site',
  projects: 'projects',
  project: (slug: string) => `project:${slug.toLowerCase()}`,
} as const
