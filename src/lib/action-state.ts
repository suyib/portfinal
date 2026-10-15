export type ActionState = {
  ok: boolean
  message?: string
  fieldErrors?: Record<string, string[] | undefined>
} | null
