import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { fetchCustomers, createCustomer } from '@/api/customers'
import { formatCurrency, cn } from '@/lib/utils'
import { queryClient } from '@/lib/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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

      {isLoading && (
        <p className="py-10 text-center text-muted-foreground">Carregando…</p>
      )}

      {customers?.length === 0 && (
        <div className="py-10 text-center text-muted-foreground">
          <p className="mb-2 text-4xl">👥</p>
          Nenhum devedor cadastrado ainda.
        </div>
      )}

      {customers?.map((c) => (
        <Link key={c.id} to={`/devedores/${c.id}`}>
          <Card className="transition active:scale-[0.99]">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="font-semibold">{c.name}</p>
                <p className="text-sm text-muted-foreground">
                  {c.salesCount} venda(s){c.phone ? ` · ${c.phone}` : ''}
                </p>
              </div>
              <span
                className={cn(
                  'text-lg font-bold',
                  c.balanceInCents > 0 ? 'text-destructive' : 'text-primary',
                )}
              >
                {formatCurrency(c.balanceInCents)}
              </span>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}
