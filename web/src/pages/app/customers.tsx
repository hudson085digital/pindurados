import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Users, ChevronRight } from 'lucide-react'
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
})
type Form = z.infer<typeof form>

export function Customers() {
  const [open, setOpen] = useState(false)
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
      await mutateAsync(data)
      toast.success('Devedor cadastrado!')
      reset()
      setOpen(false)
    } catch {
      toast.error('Não foi possível cadastrar.')
    }
  }

  return (
    <div className="space-y-3">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button className="w-full">+ Novo devedor</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo devedor</DialogTitle>
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
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              Salvar
            </Button>
          </form>
        </DialogContent>
      </Dialog>

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
          title="Nenhum devedor ainda"
          description="Cadastre quem compra fiado para começar a registrar vendas e acompanhar o que cada um deve."
        />
      )}

      {customers?.map((c) => (
        <Link
          key={c.id}
          to={`/devedores/${c.id}`}
          className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Card className="transition-[transform,box-shadow] hover:shadow-md active:scale-[0.99]">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{c.name}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {c.salesCount} venda(s){c.phone ? ` · ${c.phone}` : ''}
                </p>
              </div>
              <span
                className={cn(
                  'shrink-0 text-lg font-bold tabular-nums',
                  c.balanceInCents > 0 ? 'text-destructive' : 'text-primary',
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
