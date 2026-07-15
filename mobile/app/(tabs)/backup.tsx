import { useState } from 'react'
import { View, Alert } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as DocumentPicker from 'expo-document-picker'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { exportBackup, importBackup } from '@/src/data/backup'
import { getSettings } from '@/src/data/repositories/settings'
import { formatDate } from '@/src/lib/format'
import { toastSuccess, toastError } from '@/src/lib/toast'
import { useColors } from '@/src/lib/theme'
import { Screen } from '@/src/components/ui/screen'
import { Card } from '@/src/components/ui/card'
import { Text, Muted, Heading } from '@/src/components/ui/text'
import { Button } from '@/src/components/ui/button'

export default function BackupScreen() {
  const qc = useQueryClient()
  const c = useColors()
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: getSettings })
  const [busy, setBusy] = useState(false)

  async function handleExport() {
    setBusy(true)
    try {
      const r = await exportBackup()
      if (!r.ok) toastError(r.error)
      else {
        toastSuccess('Backup gerado.')
        qc.invalidateQueries({ queryKey: ['settings'] })
      }
    } catch {
      toastError('Não foi possível gerar o backup.')
    } finally {
      setBusy(false)
    }
  }

  async function handleImport() {
    const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true })
    if (res.canceled || !res.assets?.[0]) return
    const uri = res.assets[0].uri
    Alert.alert(
      'Importar backup',
      'Isso vai SUBSTITUIR todos os dados atuais do app pelos do arquivo. Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Importar',
          style: 'destructive',
          onPress: async () => {
            setBusy(true)
            try {
              const r = await importBackup(uri)
              if (!r.ok) toastError(r.error)
              else {
                toastSuccess('Backup restaurado!')
                qc.invalidateQueries()
              }
            } catch {
              toastError('Falha ao importar.')
            } finally {
              setBusy(false)
            }
          },
        },
      ],
    )
  }

  return (
    <Screen>
      <Card className="gap-2">
        <Heading>Backup local</Heading>
        <Muted className="leading-5">
          Seus dados ficam só neste aparelho. Exporte um arquivo de backup (dados + comprovantes) e
          guarde onde quiser — Google Drive, WhatsApp, e-mail. Para recuperar em outro aparelho,
          importe esse arquivo. Nenhuma etapa pede conta Google.
        </Muted>
        {settings?.lastBackupAt ? (
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="checkmark-circle" size={16} color={c.primary} />
            <Muted>Último backup: {formatDate(settings.lastBackupAt)}</Muted>
          </View>
        ) : (
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="alert-circle" size={16} color={c.destructive} />
            <Text className="text-[13px] font-medium text-destructive">
              Você ainda não fez backup.
            </Text>
          </View>
        )}
      </Card>

      <Button title="Exportar backup" icon="cloud-upload-outline" onPress={handleExport} loading={busy} />
      <Button
        title="Importar backup"
        icon="cloud-download-outline"
        variant="outline"
        onPress={handleImport}
        disabled={busy}
      />
    </Screen>
  )
}
