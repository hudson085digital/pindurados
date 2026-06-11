# Quickstart — Validar a página pública (023)

## Pré-requisitos

```bash
# após adicionar SaleShareLink + User.contactPhone no schema
cd api && pnpm prisma migrate dev --name sale-share-link
```

## Roteiro (mapeia os Success Criteria)

1. **Gerar e abrir (SC-001)**: logado, abrir uma venda com parcelas e recebimentos → "Gerar link" →
   copiar. Abrir a URL `/p/<token>` numa aba anônima (sem login) → ver total, pago, saldo e parcelas
   com status em < 3s.
2. **Privacidade (SC-002)**: inspecionar a resposta de `GET /public/sales/<token>` → **não** contém
   `productCostInCents`, `profitInCents` nem dados de outras vendas/clientes.
3. **Revogar (SC-003)**: com a página aberta, no painel do dono clicar "Revogar" → recarregar a aba
   pública → mostra "Link indisponível" imediatamente.
4. **Token inválido (SC-004)**: abrir `/p/qualquer-coisa-aleatoria` → "Link indisponível", sem
   revelar se a venda existe (mesma resposta de revogado/expirado).
5. **Comprovantes (SC-005)**: a venda com comprovante → abrir o link → visualizar/baixar o
   comprovante (testar com storage local e, se possível, com Supabase).
6. **PIX e contato (SC-006)**: com chave PIX padrão e `contactPhone` do dono → a página mostra a
   chave + valor do saldo e o botão WhatsApp. Remover PIX/contato → a página abre sem essas seções.
7. **Expiração (opcional)**: gerar link com `expiresAt` no passado (ou esperar) → acesso vira
   "indisponível".

## Smoke test backend

```bash
TOKEN=...   # token retornado por POST /sales/:id/share-link
curl -s $API/public/sales/$TOKEN | jq 'keys'          # sem custo/lucro
curl -s -o /dev/null -w "%{http_code}\n" $API/public/sales/inexistente   # 404
```

## DevTools

- Network → inspecionar o JSON público (conferir whitelist).
- Testar a rota `/p/:token` em janela anônima (garante que não depende de login).
