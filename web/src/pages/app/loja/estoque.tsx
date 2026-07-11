import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Boxes, Pencil, Search } from 'lucide-react'
import { StockUnit, StockUnitStatus } from '@/api/types'
import { fetchStockUnits, updateStockUnit } from '@/api/stock'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { queryClient } from '@/lib/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const STATUS_LABEL: Record<StockUnitStatus, string> = {
  AWAITING: 'aguardando',
  AVAILABLE: 'disponível',
  SOLD: 'vendida',
}

export function Estoque() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [editing, setEditing] = useState<StockUnit | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['stock-units', status, search],
    queryFn: () =>
      fetchStockUnits({
        status: (status || undefined) as StockUnitStatus | undefined,
        search: search.trim() || undefined,
      }),
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['stock-units'] })
  }

  return (
    <div className="space-y-3">
      {data && (
        <div className="grid grid-cols-3 gap-3">
          {(
            [
              ['available', 'Disponível', 'text-success'],
              ['awaiting', 'A caminho', ''],
              ['sold', 'Vendidas', 'text-muted-foreground'],
            ] as const
          ).map(([key, label, color]) => (
            <Card key={key}>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className={cn('mt-1 font-display text-xl font-bold tabular-nums', color)}>
                  {data.summary[key].count}
                </p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {formatCurrency(data.summary[key].costInCents)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por IMEI, SN, DANFE ou produto"
            aria-label="Buscar unidade"
            className="pl-9"
          />
        </div>
        <Select
          aria-label="Filtrar por status"
          className="w-40 shrink-0"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Todos</option>
          <option value="AVAILABLE">Disponíveis</option>
          <option value="AWAITING">A caminho</option>
          <option value="SOLD">Vendidas</option>
        </Select>
      </div>

      {isLoading &&
        Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="space-y-2 p-4">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-64" />
            </CardContent>
          </Card>
        ))}

      {data?.units.length === 0 && (
        <EmptyState
          icon={Boxes}
          title="Nenhuma unidade encontrada"
          description="As unidades entram no estoque quando você registra (ou importa) uma compra."
        />
      )}

      {data?.units.map((unit) => (
        <Card key={unit.id}>
          <CardContent className="flex items-start gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{unit.product.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {unit.imei1 ? `IMEI ${unit.imei1}` : unit.serialNumber ? `SN ${unit.serialNumber}` : 'sem identificação'}
                {' · '}comprada em {formatDate(unit.purchase.date)}
                {unit.purchase.marketplace ? ` (${unit.purchase.marketplace})` : ''}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-1 text-[11px] font-semibold">
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5',
                    unit.status === 'AVAILABLE' && 'bg-success/10 text-success',
                    unit.status === 'AWAITING' && 'bg-secondary text-muted-foreground',
                    unit.status === 'SOLD' && 'bg-primary/10 text-primary',
                  )}
                >
                  {STATUS_LABEL[unit.status]}
                </span>
                {unit.sale && (
                  <Link
                    to={`/clientes/${unit.sale.customerId}`}
                    className="rounded-full bg-secondary px-2 py-0.5 text-muted-foreground underline-offset-2 hover:underline"
                  >
                    venda: {unit.sale.customerName}
                  </Link>
                )}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-display font-bold tabular-nums">
                {formatCurrency(unit.finalCostInCents)}
              </p>
              <p className="text-[11px] text-muted-foreground">custo efetivo</p>
              <Button
                size="icon"
                variant="ghost"
                className="mt-1"
                aria-label="Editar dados da unidade"
                onClick={() => setEditing(unit)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      <UnitDialog unit={editing} onClose={() => setEditing(null)} onSaved={invalidate} />
    </div>
  )
}

function UnitDialog({
  unit,
  onClose,
  onSaved,
}: {
  unit: StockUnit | null
  onClose: () => void
  onSaved: () => void
}) {
  const [serialNumber, setSerialNumber] = useState('')
  const [imei1, setImei1] = useState('')
  const [imei2, setImei2] = useState('')
  const [danfe, setDanfe] = useState('')
  const [note, setNote] = useState('')
  const [seededFor, setSeededFor] = useState<string | null>(null)

  if (unit && unit.id !== seededFor) {
    setSeededFor(unit.id)
    setSerialNumber(unit.serialNumber ?? '')
    setImei1(unit.imei1 ?? '')
    setImei2(unit.imei2 ?? '')
    setDanfe(unit.danfe ?? '')
    setNote(unit.note ?? '')
  }
  if (!unit && seededFor !== null) setSeededFor(null)

  const hasImei = ((unit?.product.typeFields ?? []) as string[]).some((l) =>
    l.toUpperCase().startsWith('IMEI'),
  )

  const { mutateAsync, isPending } = useMutation({
    mutationFn: () =>
      updateStockUnit(unit!.id, {
        serialNumber: serialNumber || null,
        imei1: imei1 || null,
        imei2: imei2 || null,
        danfe: danfe || null,
        note: note || null,
      }),
  })

  async function handleSave() {
    try {
      await mutateAsync()
      toast.success('Unidade atualizada.')
      onClose()
      onSaved()
    } catch {
      toast.error('Não foi possível salvar.')
    }
  }

  return (
    <Dialog open={unit !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dados da unidade</DialogTitle>
        </DialogHeader>
        {unit && (
          <p className="text-sm text-muted-foreground">
            {unit.product.name} · custo {formatCurrency(unit.finalCostInCents)}
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="unit-sn">Serial (SN)</Label>
            <Input id="unit-sn" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="unit-danfe">DANFE</Label>
            <Input id="unit-danfe" value={danfe} onChange={(e) => setDanfe(e.target.value)} />
          </div>
          {hasImei && (
            <div>
              <Label htmlFor="unit-imei1">IMEI</Label>
              <Input id="unit-imei1" value={imei1} onChange={(e) => setImei1(e.target.value)} />
            </div>
          )}
          {hasImei && (
            <div>
              <Label htmlFor="unit-imei2">IMEI 2</Label>
              <Input id="unit-imei2" value={imei2} onChange={(e) => setImei2(e.target.value)} />
            </div>
          )}
        </div>
        <div>
          <Label htmlFor="unit-note">Observação</Label>
          <Input id="unit-note" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <Button className="w-full" onClick={handleSave} loading={isPending}>
          Salvar
        </Button>
      </DialogContent>
    </Dialog>
  )
}
