import { useCallback } from 'react'
import { graphql, useMutation } from 'react-relay'
import { useTranslation } from 'react-i18next'
import { toaster } from '../../components/ui/toaster'
import type { useCreateTagMutation } from './__generated__/useCreateTagMutation.graphql'

/** The page loads the first 200 tags; a new one joins that list, so the form and the filters offer it. */
const TAGS_ARGS = { first: 200 }

const createTagMutation = graphql`
  mutation useCreateTagMutation($input: TagInput!) {
    createTag(tag: $input) {
      id
      name
    }
  }
`

/** Creates a tag from the activity form and adds it, in alphabetical order, to the loaded tags. */
export function useCreateTag() {
  const { t } = useTranslation()
  const [commit, isCreating] = useMutation<useCreateTagMutation>(createTagMutation)

  // Stable, so the form's memoized tag chips do not render again with every parent render.
  const createTag = useCallback(
    (name: string, onCreated: (id: string) => void) =>
      commit({
        variables: { input: { name } },
        updater: (store, data) => {
          const created = data?.createTag && store.get(data.createTag.id)
          const tags = store.getRoot().getLinkedRecord('tags', TAGS_ARGS)
          if (!created || !tags) return
          const nodes = (tags.getLinkedRecords('nodes') ?? []).filter((node) => node != null)
          const next = [...nodes, created].sort((a, b) =>
            String(a.getValue('name')).localeCompare(String(b.getValue('name'))),
          )
          tags.setLinkedRecords(next, 'nodes')
        },
        onCompleted: (response, errors) => {
          if (errors?.length || !response.createTag) {
            toaster.create({ type: 'error', title: t('activities.form.tagCreateFailed') })
            return
          }
          toaster.create({
            type: 'success',
            title: t('activities.form.tagCreated', { name: response.createTag.name }),
          })
          onCreated(response.createTag.id)
        },
        onError: () => {
          toaster.create({ type: 'error', title: t('activities.form.tagCreateFailed') })
        },
      }),
    [commit, t],
  )

  return { createTag, isCreating }
}
