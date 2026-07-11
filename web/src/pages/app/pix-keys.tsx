import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Star, Trash2, KeyRound, Plus } from 'lucide-react'
import {
  fetchPixKeys,
  createPixKey,
  setDefaultPixKey,
  deletePixKey,
} from '@/api/pix-keys'
import { getProfile, updateProfile } from '@/api/auth'
import { PixKeyType } from '@/api/types'
import { cn } from '@/lib/utils'
import { queryClient } from '@/lib/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { PhoneInput } from '@/components/ui/phone-input'
import { PageHeader } from '@/components/ui/page-header'
import { useConfirm } from '@/components/ui/confirm-dialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

const TYPES: { value: PixKeyType; label: string }[] = [
  { value: 'RANDOM', label: 'Aleatória' },
  { value: 'CPF', label: 'CPF' },
  { value: 'CNPJ', label: 'CNPJ' },
  { value: 'EMAIL', label: 'E-mail' },
  { value: 'PHONE', label: 'Telefone' },
]

export function PixKeys() {
  const confirm = useConfirm()
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<PixKeyType>('RANDOM')
  const [key, setKey] = useState('')
  const [bankName, setBankName] = useState('')
  const [holderName, setHolderName] = useState('')

  const { data: keys, isLoading } = useQuery({
    queryKey: ['pix-keys'],
    queryFn: fetchPixKeys,
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['pix-keys'] })
  }

  const { mutateAsync: create, isPending } = useMutation({ mutationFn: createPixKey })
  const { mutateAsync: makeDefault } = useMutation({ mutationFn: setDefaultPixKey })
  const { mutateAsync: remove } = useMutation({ mutationFn: deletePixKey })

  async function handleCreate() {
    if (!key || !bankName || !holderName) return toast.error('Preencha todos os campos.')
    try {
      await create({ type, key, bankName, holderName })
      toast.success('Chave Pix cadastrada!')
      setOpen(false)
      setKey('')
      setBankName('')
      setHolderName('')
      invalidate()
    } catch {
      toast.error('Não foi possível cadastrar.')
    }
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: 'Excluir esta chave Pix?',
      description: 'Ela deixa de aparecer na página pública das vendas.',
      confirmLabel: 'Excluir',
      destructive: true,
    })
    if (!ok) return
    await remove(id)
    invalidate()
  }

  async function handleDefault(id: string) {
    await makeDefault(id)
    invalidate()
  }

  return (
    <div className="space-y-3">
      <PageHeader title="Pix e contato" />

      <ContactCard />

      <Dialog open={open} onOpenChange={setOpen}>
        <div className="flex items-center justify-between pt-1">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Chaves Pix
          </p>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4" /> Nova chave
            </Button>
          </DialogTrigger>
        </div>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova chave Pix</DialogTitle>
          </DialogHeader>
          <div>
            <Label>Tipo</Label>
            <div className="mt-1 grid grid-cols-3 gap-1.5">
              {TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={cn(
                    'min-h-[40px] rounded-md border p-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card',
                    type === t.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-input bg-card text-muted-foreground hover:border-border hover:text-foreground',
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="pix-key">Chave *</Label>
            <Input id="pix-key" value={key} onChange={(e) => setKey(e.target.value)} placeholder="Valor da chave" />
          </div>
          <div>
            <Label htmlFor="pix-bank">Banco *</Label>
            <Input id="pix-bank" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Ex.: Nubank" />
          </div>
          <div>
            <Label htmlFor="pix-holder">Titular *</Label>
            <Input id="pix-holder" value={holderName} onChange={(e) => setHolderName(e.target.value)} placeholder="Nome do titular" />
          </div>
          <Button className="w-full" onClick={handleCreate} loading={isPending}>
            Salvar chave
          </Button>
        </DialogContent>
      </Dialog>

      {isLoading &&
        Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-52" />
              </div>
              <Skeleton className="h-8 w-8 rounded-md" />
            </CardContent>
          </Card>
        ))}

      {keys?.length === 0 && (
        <EmptyState
          icon={KeyRound}
          title="Nenhuma chave Pix"
          description="Cadastre sua chave para que ela apareça na página pública da venda. A primeira vira padrão automaticamente."
        />
      )}

      {keys?.map((k) => (
        <Card key={k.id}>
          <CardContent className="flex items-center justify-between p-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate font-semibold">{k.key}</p>
                {k.isDefault && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                    padrão
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {TYPES.find((t) => t.value === k.type)?.label} · {k.bankName} · {k.holderName}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {!k.isDefault && (
                <Button size="icon" variant="ghost" onClick={() => handleDefault(k.id)} title="Tornar padrão" aria-label="Tornar padrão">
                  <Star className="h-4 w-4" />
                </Button>
              )}
              <Button size="icon" variant="ghost" className="hover:bg-destructive/10" onClick={() => handleDelete(k.id)} title="Excluir" aria-label="Excluir chave">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// Contato do credor (023): telefone que aparece na página pública do devedor
// como botão "Falar com o credor" (WhatsApp). Opcional.
function ContactCard() {
  const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: getProfile })
  const [phone, setPhone] = useState('')
  const [dirty, setDirty] = useState(false)

  // Sincroniza o input quando o perfil carrega (sem sobrescrever a edição).
  if (!dirty && profile && phone === '' && profile.contactPhone) {
    setPhone(profile.contactPhone)
  }

  const { mutateAsync: save, isPending } = useMutation({ mutationFn: updateProfile })

  async function handleSave() {
    try {
      await save({ contactPhone: phone || null })
      toast.success('Contato atualizado.')
      setDirty(false)
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    } catch {
      toast.error('Não foi possível salvar o contato.')
    }
  }

  return (
    <Card>
      <CardContent className="space-y-2 p-4">
        <Label htmlFor="contact-phone">Seu WhatsApp (para o devedor falar com você)</Label>
        <p className="text-xs text-muted-foreground">
          Aparece como botão na página pública da venda. Deixe em branco para ocultar.
        </p>
        <div className="flex gap-2">
          <PhoneInput
            id="contact-phone"
            value={phone}
            onChangeValue={(v) => {
              setPhone(v)
              setDirty(true)
            }}
            placeholder="(XX) XXXXX-XXXX"
            className="flex-1"
          />
          <Button onClick={handleSave} loading={isPending} disabled={!dirty}>
            Salvar
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
