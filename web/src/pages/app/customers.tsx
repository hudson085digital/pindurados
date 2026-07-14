import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Users, ChevronRight, ChevronDown, Plus, Search } from 'lucide-react'
import { fetchCustomers, createCustomer } from '@/api/customers'
import { formatCurrency, cn } from '@/lib/utils'
import { queryClient } from '@/lib/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { PhoneInput } from '@/components/ui/phone-input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { PageHeader } from '@/components/ui/page-header'
import { OptionSelect } from '@/components/ui/option-select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

const form = z.object({
  name: z.string().min(1, 'Informe o nome'),
  phone: z.string().optional(),
  note: z.string().optional(),
  // 025 — mais dados (todos opcionais)
  kind: z.string().optional(),
  cpfCnpj: z.string().optional(),
  instagram: z.string().optional(),
  tags: z.string().optional(), // separadas por vírgula na UI
  addressZip: z.string().optional(),
  addressStreet: z.string().optional(),
  addressNumber: z.string().optional(),
  addressDistrict: z.string().optional(),
  addressCity: z.string().optional(),
  addressState: z.string().optional(),
})
type Form = z.infer<typeof form>

export function Customers() {
  const [open, setOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [search, setSearch] = useState('')
  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: fetchCustomers,
  })

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(form) })

  const { mutateAsync } = useMutation({
    mutationFn: createCustomer,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers'] }),
  })

  async function onSubmit(data: Form) {
    try {
      await mutateAsync({
        ...data,
        kind: data.kind || undefined,
        tags: data.tags
          ? data.tags.split(',').map((t) => t.trim()).filter(Boolean)
          : undefined,
      })
      toast.success('Cliente cadastrado!')
      reset()
      setOpen(false)
    } catch {
      toast.error('Não foi possível cadastrar.')
    }
  }

  const query = search.trim().toLowerCase()
  const filtered = query
    ? customers?.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          (c.phone ?? '').includes(query) ||
          (c.cpfCnpj ?? '').replace(/\D/g, '').includes(query.replace(/\D/g, '') || '§') ||
          (c.tags ?? []).some((t) => t.toLowerCase().includes(query)),
      )
    : customers

  return (
    <div className="space-y-3">
      <Dialog open={open} onOpenChange={setOpen}>
        <PageHeader
          title="Clientes"
          action={
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4" /> Novo cliente
              </Button>
            </DialogTrigger>
          }
        />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo cliente</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div>
              <Label htmlFor="name">Nome *</Label>
              <Input id="name" {...register('name')} placeholder="Ex.: João da Silva" />
              {errors.name && (
                <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="phone">Contato</Label>
              <Controller
                control={control}
                name="phone"
                render={({ field }) => (
                  <PhoneInput
                    id="phone"
                    value={field.value ?? ''}
                    onChangeValue={field.onChange}
                    placeholder="(00) 90000-0000"
                  />
                )}
              />
            </div>
            <div>
              <Label htmlFor="note">Observação</Label>
              <Textarea id="note" {...register('note')} rows={2} />
            </div>
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              className="inline-flex min-h-[36px] items-center gap-1 text-sm font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronDown className={cn('h-4 w-4 transition-transform', moreOpen && 'rotate-180')} />
              Mais dados (CPF, endereço, tags…)
            </button>

            {moreOpen && (
              <div className="space-y-3 rounded-md border p-4">
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <div>
                    <Label htmlFor="cust-kind">Tipo</Label>
                    <Controller
                      control={control}
                      name="kind"
                      render={({ field }) => (
                        <OptionSelect
                          id="cust-kind"
                          kind="CUSTOMER_KIND"
                          value={field.value ?? ''}
                          onChange={field.onChange}
                          placeholder="Tipo de cliente"
                          emptyLabel="—"
                        />
                      )}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cust-cpf">CPF/CNPJ</Label>
                    <Input id="cust-cpf" {...register('cpfCnpj')} placeholder="Para a nota fiscal" />
                  </div>
                  <div>
                    <Label htmlFor="cust-insta">Instagram</Label>
                    <Input id="cust-insta" {...register('instagram')} placeholder="@usuario" />
                  </div>
                  <div>
                    <Label htmlFor="cust-tags">Tags</Label>
                    <Input id="cust-tags" {...register('tags')} placeholder="atacado, recorrente" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="cust-zip">CEP</Label>
                    <Input id="cust-zip" {...register('addressZip')} />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="cust-street">Rua</Label>
                    <Input id="cust-street" {...register('addressStreet')} />
                  </div>
                  <div>
                    <Label htmlFor="cust-number">Número</Label>
                    <Input id="cust-number" {...register('addressNumber')} />
                  </div>
                  <div>
                    <Label htmlFor="cust-district">Bairro</Label>
                    <Input id="cust-district" {...register('addressDistrict')} />
                  </div>
                  <div>
                    <Label htmlFor="cust-state">UF</Label>
                    <Input id="cust-state" maxLength={2} {...register('addressState')} />
                  </div>
                  <div className="col-span-3">
                    <Label htmlFor="cust-city">Cidade</Label>
                    <Input id="cust-city" {...register('addressCity')} />
                  </div>
                </div>
              </div>
            )}

            <Button type="submit" className="w-full" loading={isSubmitting}>
              Salvar
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {customers && customers.length > 5 && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou telefone"
            aria-label="Buscar cliente"
            className="pl-9"
          />
        </div>
      )}

      {isLoading &&
        Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-5 w-16" />
            </CardContent>
          </Card>
        ))}

      {customers?.length === 0 && (
        <EmptyState
          icon={Users}
          title="Nenhum cliente ainda"
          description="Cadastre quem compra fiado para começar a registrar vendas e acompanhar o que cada um deve."
          action={
            <Button className="w-full" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> Cadastrar cliente
            </Button>
          }
        />
      )}

      {customers && customers.length > 0 && filtered?.length === 0 && (
        <p className="px-1 py-4 text-center text-sm text-muted-foreground">
          Nenhum cliente encontrado para “{search.trim()}”.
        </p>
      )}

      {filtered?.map((c) => (
        <Link
          key={c.id}
          to={`/clientes/${c.id}`}
          className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Card className="transition-[transform,box-shadow] hover:shadow-md active:scale-[0.99]">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{c.name}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {c.salesCount} venda(s){c.phone ? ` · ${c.phone}` : ''}
                  {c.kind ? ` · ${c.kind}` : ''}
                </p>
              </div>
              <span
                className={cn(
                  'shrink-0 text-lg font-bold tabular-nums',
                  c.balanceInCents > 0 ? 'text-destructive' : 'text-success',
                )}
              >
                {formatCurrency(c.balanceInCents)}
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}
