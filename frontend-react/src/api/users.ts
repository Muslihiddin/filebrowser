// Port of the parts of frontend/src/api/users.ts used so far.
import { fetchJSON, fetchURL } from './fetch'

export async function getAll() {
  return fetchJSON<IUser[]>(`/api/users`, {})
}

export async function update(
  user: Partial<IUser> & { password?: string },
  which = ['all'],
  currentPassword: string | null = null,
) {
  await fetchURL(`/api/users/${user.id}`, {
    method: 'PUT',
    body: JSON.stringify({
      what: 'user',
      which: which,
      ...(currentPassword != null ? { current_password: currentPassword } : {}),
      data: user,
    }),
  })
}
