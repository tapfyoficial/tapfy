# Tapfy producao

Site de producao do Tapfy publicado na Vercel.

## O que esta configurado

- `index.html`: landing page com Google Places, checkout e painel admin.
- `api/tapfy-orders.js`: backend serverless da Vercel para checkout Mercado Pago, pedidos e painel admin.
- `vercel.json`: build estatico e configuracao da API `/api/tapfy-orders`.
- Vercel Blob privado: banco persistente de pedidos e leads usado pela API.

## Variaveis obrigatorias na Vercel

Configure em **Project Settings > Environment Variables**:

- `MERCADO_PAGO_ACCESS_TOKEN`: Access Token de producao do Mercado Pago.
- `MERCADO_PAGO_PUBLIC_KEY`: Public Key de producao do Mercado Pago.
- `TAPFY_ADMIN_PASSWORD`: senha do painel admin.
- `GOOGLE_MAPS_API_KEY`: chave Google Places usada pela prospeccao automatica no painel.
- `BLOB_READ_WRITE_TOKEN`: token criado automaticamente ao vincular o Vercel Blob.

Opcionalmente, `KV_REST_API_URL` e `KV_REST_API_TOKEN` podem ser configurados para usar KV como armazenamento prioritario.

Depois disso, faca um novo deploy pela Vercel.

## URLs importantes

- Site: `https://tapfy-production.vercel.app/`
- Admin: `https://tapfy-production.vercel.app/admin`
- Apresentacao comercial: `https://tapfy-production.vercel.app/apresentacao`

## Fluxo real

1. Cliente escolhe empresa, quantidade, dados e endereco.
2. O site chama `/api/tapfy-orders`.
3. A API calcula o valor no servidor, cria o pagamento no Mercado Pago e salva o pedido.
4. Cliente paga no ambiente seguro do Mercado Pago.
5. Webhook do Mercado Pago atualiza o status do pedido.
6. O painel admin lista pedidos persistidos no Vercel Blob privado.

## Prospeccao comercial

- A aba `Prospeccao` do admin salva leads no Vercel Blob privado.
- A busca automatica aceita endereco ou link do Google Maps como origem.
- O raio e o limite maximo de avaliacoes sao configuraveis.
- A campanha permite selecionar faixas de avaliacoes e tipos de estabelecimento.
- O modal de campanha exibe no mapa o raio configurado a partir de endereco, bairro ou cidade.
- A campanha e a lista de leads podem ser filtradas por nota em estrelas.
- A lista de leads pode ser filtrada, selecionada e excluida em massa.
- Empresas ja existentes sao preservadas e nao sao duplicadas.

## Apresentacao comercial

- A aba `Apresentacao` do admin gera um link publico personalizado para reunioes e envio por WhatsApp.
- O link aceita nome do cliente e valores comerciais temporarios sem alterar o checkout da landing page.
- A rota `/apresentacao` explica a marca, o produto e os tres planos comerciais.
