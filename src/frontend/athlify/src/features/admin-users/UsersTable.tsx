import {
  Badge,
  Button,
  Flex,
  IconButton,
  Menu,
  Portal,
  Text,
  useBreakpointValue,
} from '@chakra-ui/react'
import type { CellClickedEvent, ColDef, ICellRendererParams } from 'ag-grid-community'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { LuEllipsis, LuKeyRound, LuTrash2 } from 'react-icons/lu'
import { AgGridTable } from '../../components/ag-grid/AgGridTable'
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

const ACTIONS_COLUMN = 'actions'

export function UsersTable({
  users,
  currentUserId,
  onEdit,
  onResetPassword,
  onDelete,
}: UsersTableProps) {
  const { t } = useTranslation()
  // Phones keep the name and role; username and language need the room of a wider screen.
  const wide = useBreakpointValue({ base: false, md: true }) ?? true

  const columnDefs = useMemo<ColDef<UserRow>[]>(
    () => [
      {
        colId: 'name',
        headerName: t('adminUsers.columns.name'),
        flex: 2,
        minWidth: 180,
        cellRenderer: ({ data }: ICellRendererParams<UserRow>) =>
          data ? (
            // The button names the edit action for assistive technology; the click itself opens the cell.
            <Button
              variant="plain"
              justifyContent="flex-start"
              fontWeight="normal"
              aria-label={t('adminUsers.row.edit', { name: fullName(data) })}
            >
              {fullName(data)}
              {data.id === currentUserId && (
                <Text as="span" color="fg.muted">
                  {' '}
                  {t('adminUsers.you')}
                </Text>
              )}
            </Button>
          ) : null,
      },
      {
        colId: 'username',
        headerName: t('adminUsers.columns.username'),
        flex: 1,
        minWidth: 120,
        hide: !wide,
        valueGetter: ({ data }) => data?.username ?? '',
      },
      {
        colId: 'language',
        headerName: t('adminUsers.columns.language'),
        flex: 1,
        minWidth: 100,
        hide: !wide,
        valueGetter: ({ data }) => (data ? languageLabel(toI18nLanguage(data.language)) : ''),
      },
      {
        colId: 'role',
        headerName: t('adminUsers.columns.role'),
        flex: 1,
        minWidth: 110,
        cellRenderer: ({ data }: ICellRendererParams<UserRow>) =>
          data?.role === 'ADMIN' ? (
            <Badge colorPalette="brand" variant="subtle">
              {t('adminUsers.roles.ADMIN')}
            </Badge>
          ) : data ? (
            <Badge variant="subtle" bg="bg.muted" color="fg.muted">
              {t('adminUsers.roles.USER')}
            </Badge>
          ) : null,
      },
      {
        colId: ACTIONS_COLUMN,
        headerName: t('adminUsers.row.actionsColumn'),
        width: 72,
        pinned: 'right',
        cellRenderer: ({ data }: ICellRendererParams<UserRow>) =>
          data ? (
            <Flex justify="center">
              <Menu.Root positioning={{ placement: 'bottom-end' }}>
                <Menu.Trigger asChild>
                  <IconButton
                    variant="ghost"
                    size="sm"
                    color="fg.muted"
                    aria-label={t('adminUsers.row.actions', { name: fullName(data) })}
                  >
                    <LuEllipsis />
                  </IconButton>
                </Menu.Trigger>
                <Portal>
                  <Menu.Positioner>
                    {/* Portals leave the app's brand palette, so the menu sets it again. */}
                    <Menu.Content colorPalette="brand">
                      <Menu.Item value="reset" onClick={() => onResetPassword(data)}>
                        <LuKeyRound aria-hidden />
                        {t('adminUsers.row.resetPassword')}
                      </Menu.Item>
                      {/* Nobody deletes their own account; the server refuses it as well. */}
                      {data.id !== currentUserId && (
                        <>
                          <Menu.Separator />
                          <Menu.Item
                            value="delete"
                            color="fg.error"
                            _highlighted={{ bg: 'bg.error' }}
                            onClick={() => onDelete(data)}
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
          ) : null,
      },
    ],
    [t, currentUserId, wide, onResetPassword, onDelete],
  )

  // Opening the edit dialog is a click on any cell except the actions menu.
  const handleCellClicked = ({ colDef, data }: CellClickedEvent<UserRow>) => {
    if (data && colDef.colId !== ACTIONS_COLUMN) onEdit(data)
  }

  return (
    <Flex direction="column" gap="3">
      <AgGridTable<UserRow>
        ariaLabel={t('adminUsers.title')}
        height="clamp(16rem, calc(100dvh - 22rem), 36rem)"
        rowData={[...users]}
        columnDefs={columnDefs}
        defaultColDef={{ sortable: false, filter: false, resizable: false, suppressMovable: true }}
        getRowId={(params) => params.data.id}
        onCellClicked={handleCellClicked}
      />
      <Text color="fg.muted" textStyle="sm">
        {t('adminUsers.resultCount', { count: users.length })}
      </Text>
    </Flex>
  )
}
