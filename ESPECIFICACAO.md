# Pindurados — Especificação do Sistema

Sistema pessoal de controle de promissórias / vendas a prazo (fiado).

## Visão geral
- **Uso:** pessoal (só o Hudson), por enquanto.
- **Plataforma:** aplicação **web**, acessível no **celular e no computador** (responsiva).
- **Dados:** ficam **no computador do Hudson** primeiro (local-first). Possível publicar na nuvem depois.
- **Acesso no celular:** via navegador, na mesma rede Wi-Fi do computador (por enquanto).

## Funcionalidades (escopo inicial)
1. **Cadastro de devedores** — nome, contato; ver total que cada pessoa deve.
2. **Vendas/promissórias** — registrar uma venda a prazo, gerando parcelas.
3. **Controle de pagamentos** — registrar pagamentos das parcelas. O cliente **pode pagar em pedaços** (ex.: R$ 80 hoje, R$ 70 depois); o sistema controla quanto falta em cada parcela. Pode também **antecipar** parcelas (sem juros).
4. **Datas e vencimentos** — data da venda, vencimento de cada parcela, situação de atraso.
5. **Anexar comprovantes** — upload de imagens/arquivos (ex.: foto do comprovante de pagamento).
6. **Situação de atraso** — marcar parcela atrasada e **adicionar o motivo** do atraso.
7. **Juros por atraso** — aplicados automaticamente (regra abaixo), ajustáveis manualmente.
8. **Relatórios/totais** — total a receber, histórico, resumos por período.

## Regra de negócio: cálculo de juros

### Venda automática (calculadora de juros)
Base de cálculo padrão do Hudson:

1. Produto tem um **valor total** (ex.: R$ 1.000).
2. Cliente dá uma **entrada** (ex.: R$ 500).
3. **Restante** = valor total − entrada (ex.: R$ 500).
4. Aplica-se um **juros (%)** sobre o restante (ex.: 50%).
   - Valor a parcelar = restante + juros → R$ 500 + 50% = **R$ 750**.
5. **Número de parcelas** é derivado do juros: **cada 10% de juros = 1 parcela**.
   - 50% → 5x | 40% → 4x | 30% → 3x | 20% → 2x.
6. **Valor da parcela** = valor a parcelar ÷ nº de parcelas (ex.: R$ 750 ÷ 5 = **R$ 150**).

> O juros padrão é 50%, mas pode ser alterado por venda. O nº de parcelas
> acompanha o juros pela regra dos 10%.

### Venda manual
O Hudson escolhe **manualmente o prazo (nº de parcelas) e o juros**.
A regra dos "10% = 1 parcela" não se aplica aqui — é livre.

### Juros por atraso
- Taxa de atraso = **25% sobre o valor da parcela** (metade dos 50% padrão).
- Aplicado **uma única vez** sobre a parcela atrasada — **NÃO acumula** com o tempo.
  - Ex.: parcela de R$ 150 atrasada → R$ 150 + 25% = **R$ 187,50** (fica assim até ser paga).
- Incide **apenas na parcela atrasada**, não sobre as outras parcelas nem sobre o saldo total.
- Aplicado **manualmente**: o sistema avisa o vencimento, mas o juros só entra quando o
  Hudson marca a parcela como atrasada — e registra o **motivo** nesse momento.
- Ajustável manualmente caso necessário.

### Antecipação de parcelas
- O cliente pode **adiantar** quantas parcelas quiser.
- Parcela antecipada **não tem juros** — paga pelo valor original.
- Juros existe **somente em caso de atraso**.

## A definir mais adiante
- Tecnologia exata (a propor: web app com banco local SQLite).
- Telas/visual.
- Backup dos dados.
- Eventual publicação na nuvem e login.

---
*Documento vivo — atualizado conforme as regras evoluem.*
