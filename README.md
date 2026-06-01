# Tapfy producao

Site de producao do Tapfy publicado na Vercel.

## O que esta configurado

- `index.html`: landing page com Google Places, checkout e painel admin.
- `api/tapfy-orders.js`: backend serverless da Vercel para checkout Mercado Pago, pedidos e painel admin.
- `vercel.json`: build estatico e configuracao da API `/api/tapfy-orders`.
- Vercel KV: banco de pedidos usado pela API.

## Variaveis obrigatorias na Vercel

Configure em **Project Settings > Environment Variables**:

- `MERCADO_PAGO_ACCESS_TOKEN`: Access Token de producao do Mercado Pago.
- `MERCADO_PAGO_PUBLIC_KEY`: Public Key de producao do Mercado Pago.
- `TAPFY_ADMIN_PASSWORD`: senha do painel admin.
- `GOOGLE_MAPS_API_KEY`: chave Google Places usada pela prospeccao automatica no painel.
- `KV_REST_API_URL`: URL REST do Vercel KV.
- `KV_REST_API_TOKEN`: token REST do Vercel KV.

Depois disso, faca um novo deploy pela Vercel.

## URLs importantes

- Site: `https://tapfy-production.vercel.app/`
- Admin: `https://tapfy-production.vercel.app/admin`

## Fluxo real

1. Cliente escolhe empresa, quantidade, dados e endereco.
2. O site chama `/api/tapfy-orders`.
3. A API calcula o valor no servidor, cria o pagamento no Mercado Pago e salva o pedido.
4. Cliente paga no ambiente seguro do Mercado Pago.
5. Webhook do Mercado Pago atualiza o status do pedido.
6. O painel admin lista pedidos persistidos no Vercel KV.

## Prospeccao comercial

- A aba `Prospeccao` do admin salva leads no Vercel KV.
- A busca automatica aceita endereco ou link do Google Maps como origem.
- O raio e o limite maximo de avaliacoes sao configuraveis.
- Empresas ja existentes sao preservadas e nao sao duplicadas.
