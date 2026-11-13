// Port of the parts of frontend/src/api/share.ts used so far.
import { createURL, fetchJSON, fetchURL } from './fetch'

export async function list() {
  return fetchJSON<Share[]>('/api/shares')
}

export async function remove(hash: string) {
  await fetchURL(`/api/share/${hash}`, {
    method: 'DELETE',
  })
}

export function getShareURL(share: Share) {
  return createURL('share/' + share.hash, {})
}
