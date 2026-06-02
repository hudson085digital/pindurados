# Feature Specification: Otimizar/Comprimir Comprovantes

**Feature Branch**: `001-recebimento-parcial` (trabalho contínuo) · **Created**: 2026-06-02 · **Status**: Draft

## Resumo

Reduzir o tamanho dos comprovantes enviados ([[013-... ]] e recebimentos): imagens são
redimensionadas e recomprimidas no upload; o limite de upload é ampliado para aceitar
fotos de celular.

## Requirements
- **FR-001**: Imagens (jpg/png/webp/heic/…) MUST ser redimensionadas (máx. 1600px) e
  recomprimidas (JPEG ~72%) ao subir, reduzindo o tamanho armazenado.
- **FR-002**: PDFs e formatos não-imagem MUST ser mantidos como estão.
- **FR-003**: Falha na otimização MUST manter o arquivo original (não bloquear o
  recebimento).
- **FR-004**: O limite de upload MUST acomodar fotos de celular (20MB por arquivo).

## Success Criteria
- **SC-001**: Uma foto de ~4MB é armazenada com tamanho significativamente menor
  (ex.: ~650KB), sem erro no fluxo.

## Assumptions
- Compressão de imagem via `sharp` (binário pré-compilado). Compressão de PDF fica como
  evolução futura (precisa de ghostscript/serviço externo).
