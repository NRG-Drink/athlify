/** A user as the list shows it. */
export interface UserRow {
  id: string
  username: string
  firstName: string
  lastName: string
  language: string
  role: string
}

export const fullName = (row: UserRow) => `${row.firstName} ${row.lastName}`.trim()
