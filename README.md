# Tapfy produção

Esta pasta é a versão pronta para publicar no Netlify.

## O que está configurado

- `index.html`: landing page com Google Places, checkout e painel admin.
- `netlify/functions/tapfy-orders.js`: backend seguro para criar checkout no Mercado Pago e salvar pedidos.
- `netlify.toml`: publica a pasta atual e expõe a Function em `/api/tapfy-orders`.
- Netlify Blobs: usado como banco simples de pedidos.

## Variáveis obrigatórias no Netlify

Configure em **Site configuration > Environment variables**:

- `MERCADO_PAGO_ACCESS_TOKEN`: Access Token de produção do Mercado Pago.
- `TAPFY_ADMIN_PASSWORD`: senha que você usará no painel admin.

Depois disso, faça um novo deploy.

## URLs importantes

- Site: `https://scintillating-palmier-35ef96.netlify.app/`
- Admin: `https://scintillating-palmier-35ef96.netlify.app/#admin-tapfy-2024`

## Fluxo real

1. Cliente escolhe empresa, quantidade, dados e endereço.
2. O site chama `/api/tapfy-orders`.
3. A Function calcula o valor no servidor, cria a preferência no Mercado Pago e salva o pedido.
4. Cliente paga no ambiente seguro do Mercado Pago.
5. Webhook do Mercado Pago atualiza o status do pedido.
6. O painel admin lista pedidos persistidos no Netlify Blobs.

