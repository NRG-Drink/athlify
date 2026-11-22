import { Badge, Flex, IconButton, Menu, Portal, Text } from '@chakra-ui/react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { LuEllipsis, LuKeyRound, LuTrash2 } from 'react-icons/lu'
import { DataTable, type DataTableColumn } from '../../components/DataTable'
import { languageLabel, toI18nLanguage } from '../../i18n/languages'
import { fullName, type UserRow } from './userRow'

interface UsersTableProps {
  users: readonly UserRow[]
  /** Id of the signed-in administrator, marked "(du)" in the list. */
  currentUserId: string
  onEdit: (row: UserRow) => void
  onResetPassword: (row: UserRow) => void
  onDelete: (row: UserRow) => void
}

export function UsersTable({
  users,
  currentUserId,
  onEdit,
  onResetPassword,
  onDelete,
}: UsersTableProps) {
  const { t } = useTranslation()

  const columns = useMemo<DataTableColumn<UserRow>[]>(
    () => [
      {
        id: 'name',
        header: t('adminUsers.columns.name'),
        accessor: fullName,
        cell: (row) => (
          <>
            {fullName(row)}
            {row.id === currentUserId && (
              <Text as="span" color="fg.muted">
                {' '}
                {t('adminUsers.you')}
              </Text>
            )}
          </>
        ),
      },
      {
        id: 'username',
        header: t('adminUsers.columns.username'),
        accessor: (row) => row.username,
        muted: true,
        hideBelow: 'md',
      },
      {
        id: 'language',
        header: t('adminUsers.columns.language'),
        accessor: (row) => languageLabel(toI18nLanguage(row.language)),
        hideBelow: 'md',
      },
      {
        id: 'role',
        header: t('adminUsers.columns.role'),
        accessor: (row) => row.role,
        cell: (row) =>
          row.role === 'ADMIN' ? (
            <Badge colorPalette="brand" variant="subtle">
              {t('adminUsers.roles.ADMIN')}
            </Badge>
          ) : (
            <Badge variant="subtle" bg="bg.muted" color="fg.muted">
              {t('adminUsers.roles.USER')}
            </Badge>
          ),
      },
    ],
    [t, currentUserId],
  )

  return (
    <DataTable
      data={users}
      columns={columns}
      getRowId={(row) => row.id}
      caption={t('adminUsers.title')}
      actionsLabel={t('adminUsers.row.actionsColumn')}
      onRowClick={onEdit}
      rowLabel={(row) => t('adminUsers.row.edit', { name: fullName(row) })}
      count={t('adminUsers.resultCount', { count: users.length })}
      rowActions={(row) => (
        <Flex justify="flex-end">
          <Menu.Root positioning={{ placement: 'bottom-end' }}>
            <Menu.Trigger asChild>
              <IconButton
                variant="ghost"
                size="sm"
                color="fg.muted"
                aria-label={t('adminUsers.row.actions', { name: fullName(row) })}
              >
                <LuEllipsis />
              </IconButton>
            </Menu.Trigger>
            <Portal>
              <Menu.Positioner>
                {/* Portals leave the app's brand palette, so the menu sets it again. */}
                <Menu.Content colorPalette="brand">
                  <Menu.Item value="reset" onClick={() => onResetPassword(row)}>
                    <LuKeyRound aria-hidden />
                    {t('adminUsers.row.resetPassword')}
                  </Menu.Item>
                  {/* Nobody deletes their own account; the server refuses it as well. */}
                  {row.id !== currentUserId && (
                    <>
                      <Menu.Separator />
                      <Menu.Item
                        value="delete"
                        color="fg.error"
                        _highlighted={{ bg: 'bg.error' }}
                        onClick={() => onDelete(row)}
                      >
                        <LuTrash2 aria-hidden />
                        {t('adminUsers.row.delete')}
                      </Menu.Item>
                    </>
                  )}
                </Menu.Content>
              </Menu.Positioner>
            </Portal>
          </Menu.Root>
        </Flex>
      )}
    />
  )
}
