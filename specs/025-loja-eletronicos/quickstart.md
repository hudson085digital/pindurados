# Quickstart — 025 Loja de Eletrônicos

## Rodar

```bash
# banco + migração aditiva
cd api && docker compose up -d && pnpm prisma migrate dev

# dev (api 3333 + web 5173)
./dev.sh
```

Login: `hudson@pindurados.local` / `pindurados123` (seed existente).

## Fluxo de verificação manual (espelha as user stories)

1. **Produto**: Loja → Produtos → criar "JBL Boombox 4 Preta" (garantia 90d,
   preço sugerido R$ 2.600,00).
2. **Compra Milhas**: Loja → Compras → nova: valor R$ 2.576,30, acúmulo 6,
   CPM R$ 27,00 → custo final deve dar **R$ 2.158,94**.
3. **Receber**: marcar recebida informando SN/IMEI → unidade fica Disponível.
4. **Vender**: Nova venda → adicionar a unidade por R$ 2.600,00 → prévia deve
   mostrar lucro **R$ 441,06** e margem **17,0%**; parcelar como fiado normal.
5. **Pendências**: criar compra Cashback sem marcar crédito → aparece no painel.
6. **Importar**: Loja → Compras → Importar planilha → subir o `.xlsx` real e
   conferir `imported / skipped`.
7. **Página pública**: gerar link da venda → deve listar o item com garantia,
   sem nenhum custo/lucro.
8. **Regressão fiado**: criar venda por descrição livre (sem itens) → tudo
   igual a antes.

## Testes

```bash
cd api && pnpm test   # inclui purchase-cost.spec.ts (casos da planilha real)
cd web && pnpm build  # tsc + vite
```
