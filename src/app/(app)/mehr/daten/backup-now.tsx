'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { HardDriveDownload } from 'lucide-react'
import { requestBackupAction } from '@/lib/actions/settings'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'

export function BackupNowButton({ pending: initiallyPending }: { pending: boolean }) {
  const [requested, setRequested] = useState(initiallyPending)
  const [pending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()

  function request() {
    startTransition(async () => {
      const result = await requestBackupAction()
      if ('error' in result) {
        toast({ title: 'Nicht angefordert', description: result.error, variant: 'destructive' })
        return
      }
      setRequested(true)
      toast({
        title: 'Sicherung angefordert',
        description: 'Der Backup-Container greift sie innerhalb einer Minute auf.',
      })
      router.refresh()
    })
  }

  return (
    <Button onClick={request} disabled={pending} variant={requested ? 'outline' : 'default'}>
      <HardDriveDownload aria-hidden />
      {pending ? 'Fordert an …' : requested ? 'Angefordert – läuft gleich' : 'Jetzt sichern'}
    </Button>
  )
}
