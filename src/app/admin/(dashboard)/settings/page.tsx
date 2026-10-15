import { ActionForm, Field, Submit } from '@/components/admin/action-form'
import { RichText } from '@/components/admin/rich-text'
import { adminGetSettings } from '@/lib/data/admin'
import { parseLinks } from '@/lib/data/shape'
import { updateSettings } from '../../actions'

export default async function SettingsPage() {
  const s = await adminGetSettings()
  const links = parseLinks(s.links)
    .map((l) => `${l.label} | ${l.url}`)
    .join('\n')

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Site settings</h1>
      <ActionForm action={updateSettings} className="space-y-4">
        <Field name="name" label="Your name">
          <input name="name" defaultValue={s.name} className="input" />
        </Field>
        <Field name="headline" label="Headline" hint="One line, shown at the top of the home page">
          <input name="headline" defaultValue={s.headline} className="input" />
        </Field>
        <Field as="div" name="bio" label="Bio">
          <RichText name="bio" label="Bio" defaultValue={s.bio} minRows={6} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="email" label="Contact email">
            <input name="email" type="email" defaultValue={s.email ?? ''} className="input" />
          </Field>
          <Field name="location" label="Location">
            <input name="location" defaultValue={s.location} className="input" />
          </Field>
        </div>
        <Field name="resume_url" label="CV / résumé URL">
          <input name="resume_url" type="url" defaultValue={s.resume_url ?? ''} className="input" />
        </Field>
        <Field name="links" label="Links" hint="One per line: Label | https://url">
          <textarea
            name="links"
            defaultValue={links}
            rows={4}
            className="input font-mono text-sm"
            placeholder={'LinkedIn | https://linkedin.com/in/you\nDribbble | https://dribbble.com/you'}
          />
        </Field>
        <Submit>Save settings</Submit>
      </ActionForm>
    </div>
  )
}
