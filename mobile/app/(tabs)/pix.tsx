import { useState } from 'react'
import { ScrollView, View, Pressable, Alert } from 'react-native'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  listPixKeys,
  createPixKey,
  setDefaultPixKey,
  removePixKey,
} from '@/src/data/repositories/pix-keys'
import { getSettings, updateSettings } from '@/src/data/repositories/settings'
import { formatPhone } from '@/src/lib/format'
import { toastSuccess, toastError } from '@/src/lib/toast'
import type { PixKeyType } from '@/src/data/model'
import { Card } from '@/src/components/ui/card'
import { Text, Muted } from '@/src/components/ui/text'
import { Button } from '@/src/components/ui/button'
import { Input } from '@/src/components/ui/input'
import { Label } from '@/src/components/ui/field'
import { EmptyState } from '@/src/components/ui/empty-state'

const TYPES: { value: PixKeyType; label: string }[] = [
  { value: 'RANDOM', label: 'Aleatória' },
  { value: 'CPF', label: 'CPF' },
  { value: 'CNPJ', label: 'CNPJ' },
  { value: 'EMAIL', label: 'E-mail' },
  { value: 'PHONE', label: 'Telefone' },
]

export default function PixScreen() {
  const qc = useQueryClient()
  const { data: keys, isLoading } = useQuery({ queryKey: ['pix-keys'], queryFn: listPixKeys })
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: getSettings })

  const [open, setOpen] = useState(false)
  const [type, setType] = useState<PixKeyType>('RANDOM')
  const [key, setKey] = useState('')
  const [bankName, setBankName] = useState('')
  const [holderName, setHolderName] = useState('')
  const [phone, setPhone] = useState('')
  const [phoneDirty, setPhoneDirty] = useState(false)

  if (!phoneDirty && settings?.contactPhone && phone === '') setPhone(settings.contactPhone)

  function invalidate() {
    qc.invalidateQueries({ queryKey: ['pix-keys'] })
  }

  async function handleCreate() {
    if (!key || !bankName || !holderName) return toastError('Preencha todos os campos.')
    try {
      await createPixKey({ type, key, bankName, holderName })
      toastSuccess('Chave Pix cadastrada!')
      setKey(''); setBankName(''); setHolderName(''); setOpen(false)
      invalidate()
    } catch {
      toastError('Não foi possível cadastrar.')
    }
  }

  async function saveContact() {
    await updateSettings({ contactPhone: phone || null })
    toastSuccess('Contato atualizado.')
    setPhoneDirty(false)
    qc.invalidateQueries({ queryKey: ['settings'] })
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="gap-3 p-4">
      <Card className="gap-2">
        <Label>Seu WhatsApp (para cobranças)</Label>
        <View className="flex-row gap-2">
          <Input
            className="flex-1"
            value={phone}
            onChangeText={(t) => {
              setPhone(formatPhone(t))
              setPhoneDirty(true)
            }}
            keyboardType="phone-pad"
            placeholder="(00) 90000-0000"
          />
          <Button title="Salvar" onPress={saveContact} disabled={!phoneDirty} />
        </View>
      </Card>

      <Button title={open ? 'Cancelar' : '+ Nova chave Pix'} variant={open ? 'outline' : 'default'} onPress={() => setOpen((v) => !v)} />

      {open ? (
        <Card className="gap-3">
          <View>
            <Label>Tipo</Label>
            <View className="flex-row flex-wrap gap-2">
              {TYPES.map((t) => (
                <Button key={t.value} title={t.label} variant={type === t.value ? 'default' : 'outline'} className="h-9 px-3" onPress={() => setType(t.value)} />
              ))}
            </View>
          </View>
          <View>
            <Label>Chave *</Label>
            <Input value={key} onChangeText={setKey} placeholder="Valor da chave" />
          </View>
          <View>
            <Label>Banco *</Label>
            <Input value={bankName} onChangeText={setBankName} placeholder="Ex.: Nubank" />
          </View>
          <View>
            <Label>Titular *</Label>
            <Input value={holderName} onChangeText={setHolderName} placeholder="Nome do titular" />
          </View>
          <Button title="Salvar chave" onPress={handleCreate} />
        </Card>
      ) : null}

      {isLoading ? null : keys && keys.length === 0 ? (
        <EmptyState icon="key-outline" title="Nenhuma chave Pix" description="A primeira vira padrão automaticamente." />
      ) : (
        keys?.map((k) => (
          <Card key={k.id} className="flex-row items-center justify-between">
            <View className="min-w-0 flex-1 pr-2">
              <View className="flex-row items-center gap-2">
                <Text className="font-semibold" numberOfLines={1}>{k.key}</Text>
                {k.isDefault ? (
                  <View className="rounded-full bg-primary/10 px-2 py-0.5">
                    <Text className="text-[11px] font-semibold text-primary">padrão</Text>
                  </View>
                ) : null}
              </View>
              <Muted numberOfLines={1}>
                {TYPES.find((t) => t.value === k.type)?.label} · {k.bankName} · {k.holderName}
              </Muted>
            </View>
            <View className="flex-row gap-3">
              {!k.isDefault ? (
                <Pressable onPress={async () => { await setDefaultPixKey(k.id); invalidate() }}>
                  <Text className="text-[13px] text-primary">padrão</Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={() =>
                  Alert.alert('Excluir', 'Excluir esta chave Pix?', [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Excluir', style: 'destructive', onPress: async () => { await removePixKey(k.id); invalidate() } },
                  ])
                }
              >
                <Text className="text-[13px] text-destructive">excluir</Text>
              </Pressable>
            </View>
          </Card>
        ))
      )}
    </ScrollView>
  )
}
