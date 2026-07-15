import { useState } from 'react'
import { View, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { listCustomers, createCustomer } from '@/src/data/repositories/customers'
import { formatCurrency, formatPhone } from '@/src/lib/format'
import { toastSuccess, toastError } from '@/src/lib/toast'
import { useColors } from '@/src/lib/theme'
import { Screen } from '@/src/components/ui/screen'
import { Card } from '@/src/components/ui/card'
import { Text, Muted } from '@/src/components/ui/text'
import { Button } from '@/src/components/ui/button'
import { Input } from '@/src/components/ui/input'
import { Label } from '@/src/components/ui/field'
import { Skeleton } from '@/src/components/ui/skeleton'
import { EmptyState } from '@/src/components/ui/empty-state'

export default function DevedoresScreen() {
  const router = useRouter()
  const qc = useQueryClient()
  const c = useColors()
  const { data, isLoading } = useQuery({ queryKey: ['customers'], queryFn: listCustomers })

  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [note, setNote] = useState('')

  const { mutateAsync, isPending } = useMutation({
    mutationFn: () => createCustomer({ name, phone: phone || null, note: note || null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  async function handleSave() {
    if (!name.trim()) return toastError('Informe o nome.')
    try {
      await mutateAsync()
      toastSuccess('Devedor cadastrado!')
      setName('')
      setPhone('')
      setNote('')
      setOpen(false)
    } catch {
      toastError('Não foi possível cadastrar.')
    }
  }

  return (
    <Screen>
      <Button
        title={open ? 'Cancelar' : 'Novo devedor'}
        icon={open ? undefined : 'add'}
        variant={open ? 'outline' : 'default'}
        onPress={() => setOpen((v) => !v)}
      />

      {open ? (
        <Card className="gap-3">
          <View>
            <Label>Nome *</Label>
            <Input
              value={name}
              onChangeText={setName}
              placeholder="Ex.: João da Silva"
              autoFocus
            />
          </View>
          <View>
            <Label>Contato</Label>
            <Input
              value={phone}
              onChangeText={(t) => setPhone(formatPhone(t))}
              keyboardType="phone-pad"
              placeholder="(00) 90000-0000"
            />
          </View>
          <View>
            <Label>Observação</Label>
            <Input value={note} onChangeText={setNote} placeholder="Opcional" />
          </View>
          <Button title="Salvar" onPress={handleSave} loading={isPending} />
        </Card>
      ) : null}

      {isLoading ? (
        [0, 1, 2].map((i) => (
          <Card key={i} className="flex-row items-center justify-between">
            <View className="gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </View>
            <Skeleton className="h-5 w-16" />
          </Card>
        ))
      ) : data && data.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title="Nenhum devedor ainda"
          description="Cadastre quem compra fiado para começar a registrar vendas."
          action={
            !open ? (
              <Button title="Cadastrar devedor" icon="add" onPress={() => setOpen(true)} />
            ) : undefined
          }
        />
      ) : (
        data?.map((cust) => (
          <Pressable
            key={cust.id}
            onPress={() => router.push(`/devedores/${cust.id}`)}
            className="active:opacity-70"
          >
            <Card className="flex-row items-center gap-3">
              <View className="min-w-0 flex-1">
                <Text className="font-semibold" numberOfLines={1}>
                  {cust.name}
                </Text>
                <Muted numberOfLines={1}>
                  {cust.salesCount} venda(s){cust.phone ? ` · ${cust.phone}` : ''}
                </Muted>
              </View>
              <Text
                tnum
                className={`font-bold ${cust.balanceInCents > 0 ? 'text-destructive' : 'text-primary'}`}
              >
                {formatCurrency(cust.balanceInCents)}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={c.mutedForeground} />
            </Card>
          </Pressable>
        ))
      )}
    </Screen>
  )
}
