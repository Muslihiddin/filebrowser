import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ClipboardPaste, Frown, Trash2 } from 'lucide-react'
import * as api from '@/api/share'
import * as usersApi from '@/api/users'
import type { StatusError } from '@/api/utils'
import { useAuthStore } from '@/auth/store'
import { ErrorMessage } from '@/components/ErrorMessage'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import i18n from '@/i18n'
import { copyWithPermissionRetry } from '@/lib/clipboard'
import { humanTime } from '@/lib/dayjs'
import { showError, showSuccess } from '@/lib/toast'
import { withUsernames } from './logic'

/** Spinner of the settings layout, shown while the page loads. */
export function Loading() {
  const { t } = useTranslation()
  return (
    <h2
      role="status"
      className="animate-delayed flex flex-col items-center gap-4 py-12 text-xl font-medium text-muted-foreground"
    >
      <span className="flex gap-1.5" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-3 animate-bounce rounded-full bg-muted-foreground"
            style={{ animationDelay: `${i * 0.16}s` }}
          />
        ))}
      </span>
      <span>{t('files.loading')}</span>
    </h2>
  )
}

// Port of frontend/src/views/settings/Shares.vue
export default function Shares() {
  const { t } = useTranslation()
  const isAdmin = useAuthStore((state) => !!state.user?.perm.admin)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<StatusError | null>(null)
  const [links, setLinks] = useState<Share[]>([])
  const [toDelete, setToDelete] = useState<Share | null>(null)
  const deleteButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        let newLinks = await api.list()
        if (useAuthStore.getState().user?.perm.admin) {
          newLinks = withUsernames(newLinks, await usersApi.getAll())
        }
        if (active) setLinks(newLinks)
      } catch (err) {
        if (active && err instanceof Error) {
          setError(err)
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [])

  const copyToClipboard = (text: string) => {
    copyWithPermissionRetry(text).then(
      () => showSuccess(i18n.t('success.linkCopied')),
      (e) => showError(e),
    )
  }

  const deleteLink = async (link: Share) => {
    setToDelete(null)

    try {
      await api.remove(link.hash)
      setLinks((current) => current.filter((item) => item.hash !== link.hash))
      showSuccess(i18n.t('settings.shareDeleted'))
    } catch (err) {
      if (err instanceof Error) {
        showError(err)
      }
    }
  }

  if (loading) return <Loading />
  if (error) return <ErrorMessage errorCode={error.status} />

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{t('settings.shareManagement')}</h2>
        </CardTitle>
      </CardHeader>

      {links.length > 0 ? (
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="ps-4">{t('settings.path')}</TableHead>
                <TableHead>{t('settings.shareDuration')}</TableHead>
                {isAdmin && <TableHead>{t('settings.username')}</TableHead>}
                <TableHead className="w-0" />
                <TableHead className="w-0 pe-4" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {links.map((link) => {
                const url = api.getShareURL(link)
                return (
                  <TableRow key={link.hash}>
                    <TableCell className="max-w-80 truncate ps-4">
                      <a href={url} target="_blank" className="underline-offset-4 hover:underline">
                        {link.path}
                      </a>
                    </TableCell>
                    <TableCell>
                      {link.expire !== 0 ? humanTime(link.expire) : t('permanent')}
                    </TableCell>
                    {isAdmin && <TableCell>{link.username}</TableCell>}
                    <TableCell className="w-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setToDelete(link)}
                        aria-label={t('buttons.delete')}
                        title={t('buttons.delete')}
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </TableCell>
                    <TableCell className="w-0 pe-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyToClipboard(url)}
                        aria-label={t('buttons.copyToClipboard')}
                        title={t('buttons.copyToClipboard')}
                      >
                        <ClipboardPaste aria-hidden="true" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      ) : (
        <CardContent>
          <h2 className="flex flex-col items-center gap-3 py-8 text-lg font-medium text-muted-foreground">
            <Frown className="size-10" aria-hidden="true" />
            <span>{t('files.lonely')}</span>
          </h2>
        </CardContent>
      )}

      <AlertDialog
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open) setToDelete(null)
        }}
      >
        {/* like the Vue prompts, a click on the background closes the dialog */}
        <AlertDialogContent initialFocus={deleteButton} onOverlayClick={() => setToDelete(null)}>
          <AlertDialogTitle className="sr-only">{t('buttons.delete')}</AlertDialogTitle>
          <AlertDialogDescription className="text-foreground">
            {t('prompts.deleteMessageShare', { path: '' })}
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel title={t('buttons.cancel')}>{t('buttons.cancel')}</AlertDialogCancel>
            <Button
              ref={deleteButton}
              variant="destructive"
              title={t('buttons.delete')}
              onClick={() => toDelete && void deleteLink(toDelete)}
            >
              {t('buttons.delete')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
