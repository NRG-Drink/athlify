import { Button } from '@chakra-ui/react'
import { useMemo, useState } from 'react'
import { graphql, useLazyLoadQuery } from 'react-relay'
import { useTranslation } from 'react-i18next'
import { LuPlus } from 'react-icons/lu'
import { DataTableSkeleton } from '../../components/DataTableSkeleton'
import { Page } from '../../components/Page'
import { QueryBoundary } from '../../components/QueryBoundary'
import type { ApiLanguage } from '../../i18n/languages'
import { useFetchKey } from '../../relay/useFetchKey'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { ResetPasswordDialog } from './ResetPasswordDialog'
import { UserFormDialog, type UserDialog } from './UserFormDialog'
import { useUserMutations } from './useUserMutations'
import { UsersTable } from './UsersTable'
import { fullName, type UserRow } from './userRow'
import type { ApiRole } from './userForm'
import type { AdminUsersPageQuery } from './__generated__/AdminUsersPageQuery.graphql'

const query = graphql`
  query AdminUsersPageQuery {
    me {
      id
    }
    users {
      id
      username
      firstName
      lastName
      language
      role
    }
  }
`

/** The server orders by last name, first name and username; a created user is appended, so the list is ordered again. */
const collator = new Intl.Collator()
const byName = (a: UserRow, b: UserRow) =>
  collator.compare(a.lastName, b.lastName) ||
  collator.compare(a.firstName, b.firstName) ||
  collator.compare(a.username, b.username)

interface UsersProps {
  fetchKey: number
  dialog: UserDialog
  onDialogChange: (dialog: UserDialog) => void
}

function Users({ fetchKey, dialog, onDialogChange }: UsersProps) {
  const data = useLazyLoadQuery<AdminUsersPageQuery>(
    query,
    {},
    { fetchKey, fetchPolicy: 'store-or-network' },
  )
  const [resetTarget, setResetTarget] = useState<{
    id: string
    name: string
    isSelf: boolean
  } | null>(null)
  const { t } = useTranslation()
  const [deleting, setDeleting] = useState<UserRow | null>(null)
  const { remove, isDeleting } = useUserMutations()
  const users = useMemo(() => [...data.users].sort(byName), [data.users])

  return (
    <>
      <UsersTable
        users={users}
        currentUserId={data.me.id}
        onEdit={(row) =>
          onDialogChange({
            kind: 'edit',
            id: row.id,
            username: row.username,
            isSelf: row.id === data.me.id,
            values: {
              username: row.username,
              firstName: row.firstName,
              lastName: row.lastName,
              language: row.language as ApiLanguage,
              role: row.role as ApiRole,
              password: '',
            },
          })
        }
        onResetPassword={(row) =>
          setResetTarget({ id: row.id, name: fullName(row), isSelf: row.id === data.me.id })
        }
        onDelete={setDeleting}
      />
      <UserFormDialog dialog={dialog} onClose={() => onDialogChange({ kind: 'closed' })} />
      <ResetPasswordDialog target={resetTarget} onClose={() => setResetTarget(null)} />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t('adminUsers.delete.title')}
        description={
          deleting
            ? t('adminUsers.delete.description', {
                name: fullName(deleting),
                username: deleting.username,
              })
            : ''
        }
        confirmLabel={t('adminUsers.delete.confirm')}
        busy={isDeleting}
        onConfirm={() => deleting && remove(deleting.id, { onSuccess: () => setDeleting(null) })}
      />
    </>
  )
}

/** User management for administrators: list, create, edit and password reset. */
export function AdminUsersPage() {
  const { t } = useTranslation()
  const [fetchKey, retry] = useFetchKey()
  const [dialog, setDialog] = useState<UserDialog>({ kind: 'closed' })

  return (
    <Page
      title={t('adminUsers.title')}
      actions={
        <Button onClick={() => setDialog({ kind: 'create' })}>
          <LuPlus aria-hidden />
          {t('adminUsers.create.open')}
        </Button>
      }
    >
      <QueryBoundary
        onRetry={retry}
        fallback={<DataTableSkeleton rows={4} />}
        errorMessage={t('adminUsers.loadFailed')}
      >
        <Users fetchKey={fetchKey} dialog={dialog} onDialogChange={setDialog} />
      </QueryBoundary>
    </Page>
  )
}
