const crypto = require('crypto');

const ORDERS_KEY = 'orders';
const PRICES = { 1: 79, 3: 198, 10: 590 };
const UPSELL_PRICE = 15;
const PAYMENT_API = 'https://api.mercadopago.com/checkout/preferences';
const TRANSPARENT_PAYMENT_API = 'https://api.mercadopago.com/v1/payments';
const PAYMENT_LOOKUP_API = 'https://api.mercadopago.com/v1/payments';
const RATE_LIMIT_PREFIX = 'ratelimit:admin:';
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW = 900; // 15 minutes in seconds

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff'
    },
    body: JSON.stringify(body)
  };
}

function normalizeText(value, max = 500) {
  return String(value || '').trim().slice(0, max);
}

function getCustomPrice(qty) {
  if (qty <= 1) return 79;
  if (qty <= 3) return Math.round(qty * 66);
  if (qty <= 9) return Math.round(qty * 62);
  return Math.round(qty * 59);
}

function calculateOrder(payload) {
  const requestedQty = Number(payload.qty || 0);
  const qty = Math.max(1, Math.min(50, Number.isFinite(requestedQty) ? Math.round(requestedQty) : 1));
  const base = PRICES[qty] || getCustomPrice(qty);
  const requestedUpsell = Number(payload.upsellQty || 0);
  const upsellQty = Math.max(0, Math.min(qty, Number.isFinite(requestedUpsell) ? Math.round(requestedUpsell) : 0));
  const upsellPrice = upsellQty * UPSELL_PRICE;

  return {
    qty,
    base,
    upsellQty,
    upsellPrice,
    hasQr: upsellQty > 0,
    total: base + upsellPrice
  };
}

function makeOrder(payload, status) {
  const pricing = calculateOrder(payload);
  const now = new Date();
  const id = `tapfy_${now.getTime()}_${Math.random().toString(36).slice(2, 8)}`;

  return {
    id,
    createdAt: now.toISOString(),
    date: now.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
    status,
    bizName: normalizeText(payload.bizName, 180),
    bizAddr: normalizeText(payload.bizAddr, 260),
    placeId: normalizeText(payload.placeId, 120),
    name: normalizeText(payload.name, 140),
    phone: normalizeText(payload.phone, 60),
    email: normalizeText(payload.email, 180),
    qty: pricing.qty,
    total: pricing.total,
    baseTotal: pricing.base,
    hasQr: pricing.hasQr,
    upsellQty: pricing.upsellQty,
    upsellPrice: pricing.upsellPrice,
    nfcLink: normalizeText(payload.nfcLink, 800),
    reviewLink: normalizeText(payload.reviewLink, 800),
    payMethod: normalizeText(payload.payMethod, 40) || 'checkout-pro',
    cep: normalizeText(payload.cep, 20),
    addr: normalizeText(payload.addr, 220),
    num: normalizeText(payload.num, 40),
    comp: normalizeText(payload.comp, 100),
    bairro: normalizeText(payload.bairro, 120),
    city: normalizeText(payload.city, 120),
    state: normalizeText(payload.state, 2).toUpperCase(),
    productionStatus: normalizeText(payload.productionStatus, 60) || 'novo',
    trackingCode: normalizeText(payload.trackingCode, 120),
    trackingUrl: normalizeText(payload.trackingUrl, 500),
    adminNote: normalizeText(payload.adminNote, 500)
  };
}

async function kvCommand(command) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify(command)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error('Falha ao acessar o banco de pedidos.');
  }
  return data.result;
}

async function readOrders() {
  const raw = await kvCommand(['GET', ORDERS_KEY]);
  if (raw) {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  }
  // KV not configured — log a warning and use in-memory fallback
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    console.warn('AVISO: KV_REST_API_URL/KV_REST_API_TOKEN nao configurados. Pedidos serao perdidos entre reinicializacoes.');
  }
  if (!globalThis.__tapfyOrdersMemory) globalThis.__tapfyOrdersMemory = [];
  return Array.isArray(globalThis.__tapfyOrdersMemory) ? globalThis.__tapfyOrdersMemory : [];
}

async function writeOrders(orders) {
  const normalized = Array.isArray(orders) ? orders : [];
  const saved = await kvCommand(['SET', ORDERS_KEY, JSON.stringify(normalized)]);
  if (saved !== null) return;
  globalThis.__tapfyOrdersMemory = normalized;
}

// ── ADMIN SESSION TOKENS ──────────────────────────────────────────────────────
// Tokens are HMAC-SHA256(password + ":" + hour_bucket) signed with the admin
// password. They expire naturally when the hour rolls over (we also accept the
// previous hour for graceful expiry).

function hourBucket(offsetHours = 0) {
  const ms = Date.now() + offsetHours * 3600000;
  return String(Math.floor(ms / 3600000));
}

function computeToken(password, bucket) {
  return crypto.createHmac('sha256', password).update(`tapfy-admin:${bucket}`).digest('hex');
}

function generateAdminToken(password) {
  return `${hourBucket()}.${computeToken(password, hourBucket())}`;
}

function verifyAdminToken(password, token) {
  if (!password || !token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [bucket, provided] = parts;
  // Accept current hour and previous hour
  const validBuckets = [hourBucket(0), hourBucket(-1)];
  for (const validBucket of validBuckets) {
    if (bucket !== validBucket) continue;
    const expected = computeToken(password, validBucket);
    try {
      if (crypto.timingSafeEqual(Buffer.from(provided, 'hex'), Buffer.from(expected, 'hex'))) {
        return true;
      }
    } catch {
      // buffers of different length — invalid
    }
  }
  return false;
}

function adminAuthorized(event) {
  const expected = process.env.TAPFY_ADMIN_PASSWORD;
  if (!expected) return false;
  const token = event.headers['x-admin-token'] || event.headers['X-Admin-Token'];
  return verifyAdminToken(expected, token);
}

// ── RATE LIMITING ─────────────────────────────────────────────────────────────

function clientIp(event) {
  return (
    event.headers['x-forwarded-for'] ||
    event.headers['x-real-ip'] ||
    'unknown'
  ).split(',')[0].trim().slice(0, 64);
}

async function checkRateLimit(ip) {
  const key = `${RATE_LIMIT_PREFIX}${ip}`;
  const raw = await kvCommand(['GET', key]);
  const count = raw ? Number(raw) : 0;
  return count >= RATE_LIMIT_MAX;
}

async function incrementRateLimit(ip) {
  const key = `${RATE_LIMIT_PREFIX}${ip}`;
  const raw = await kvCommand(['GET', key]);
  const count = (raw ? Number(raw) : 0) + 1;
  await kvCommand(['SET', key, String(count), 'EX', RATE_LIMIT_WINDOW]);
}

async function clearRateLimit(ip) {
  const key = `${RATE_LIMIT_PREFIX}${ip}`;
  await kvCommand(['DEL', key]);
}

// ── WEBHOOK SIGNATURE VERIFICATION ───────────────────────────────────────────

function verifyWebhookSignature(event, paymentId) {
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  if (!secret) return true; // Skip if secret not configured (backwards compat)

  const xSignature = event.headers['x-signature'] || event.headers['X-Signature'] || '';
  const xRequestId = event.headers['x-request-id'] || event.headers['X-Request-Id'] || '';
  if (!xSignature) return false;

  // Parse ts and v1 from "ts=<timestamp>,v1=<hmac>"
  const parts = {};
  xSignature.split(',').forEach((part) => {
    const [k, v] = part.split('=');
    if (k && v) parts[k.trim()] = v.trim();
  });

  if (!parts.ts || !parts.v1) return false;

  const manifest = `id:${paymentId};request-id:${xRequestId};ts:${parts.ts}`;
  const expected = crypto.createHmac('sha256', secret).update(manifest).digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(parts.v1, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}

// ── HELPERS ───────────────────────────────────────────────────────────────────

function siteUrl(event) {
  if (process.env.URL) return process.env.URL.replace(/\/$/, '');
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  // Development fallback only — production must set URL or VERCEL_URL
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Variavel de ambiente URL nao configurada na hospedagem.');
  }
  return `https://${event.headers.host || 'localhost'}`;
}

function isValidHttpUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

function cleanObject(value) {
  if (Array.isArray(value)) {
    return value.map(cleanObject).filter((item) => item !== undefined);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .map(([key, entry]) => [key, cleanObject(entry)])
        .filter(([, entry]) => entry !== undefined && entry !== '' && entry !== null)
    );
  }
  return value === undefined ? undefined : value;
}

function authToken() {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!token) throw new Error('MERCADO_PAGO_ACCESS_TOKEN nao configurado na hospedagem.');
  return token;
}

// ── MERCADO PAGO ──────────────────────────────────────────────────────────────

async function createMercadoPagoPreference(event, order) {
  const token = authToken();

  const baseUrl = siteUrl(event);
  const items = [
    {
      id: 'tapfy-nfc',
      title: `tapfy. NFC - ${order.qty} cartao${order.qty > 1 ? 's' : ''}`,
      quantity: 1,
      currency_id: 'BRL',
      unit_price: Number(order.baseTotal)
    }
  ];

  if (order.upsellPrice > 0) {
    items.push({
      id: 'tapfy-qr',
      title: `QR Code no verso - ${order.upsellQty} cartao${order.upsellQty > 1 ? 's' : ''}`,
      quantity: 1,
      currency_id: 'BRL',
      unit_price: Number(order.upsellPrice)
    });
  }

  const preference = {
    items,
    external_reference: order.id,
    statement_descriptor: 'TAPFY',
    back_urls: {
      success: `${baseUrl}/?payment=success&order=${encodeURIComponent(order.id)}`,
      pending: `${baseUrl}/?payment=pending&order=${encodeURIComponent(order.id)}`,
      failure: `${baseUrl}/?payment=failure&order=${encodeURIComponent(order.id)}`
    },
    auto_return: 'approved',
    notification_url: `${baseUrl}/api/tapfy-orders?action=webhook`,
    metadata: {
      order_id: order.id,
      business_name: order.bizName,
      nfc_link: order.nfcLink,
      review_link: order.reviewLink
    },
    payer: {
      name: order.name,
      email: order.email,
      phone: { number: order.phone },
      address: {
        zip_code: order.cep,
        street_name: order.addr,
        street_number: order.num
      }
    },
    shipments: {
      cost: 0,
      mode: 'not_specified',
      receiver_address: {
        zip_code: order.cep,
        street_name: order.addr,
        street_number: order.num,
        floor: order.comp,
        city_name: order.city,
        state_name: order.state
      }
    }
  };

  const response = await fetch(PAYMENT_API, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify(preference)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error('Erro ao criar preferencia de pagamento. Tente novamente.');
  }

  return data;
}

async function createTransparentPayment(event, order, payment, selectedPaymentMethod) {
  const token = authToken();
  const baseUrl = siteUrl(event);
  const payer = payment.payer || {};
  const payerEmail = payer.email || order.email;

  const paymentBody = cleanObject({
    ...payment,
    transaction_amount: Number(order.total),
    description: `tapfy. NFC - ${order.qty} ${order.qty === 1 ? 'cartao' : 'cartoes'}`,
    external_reference: order.id,
    notification_url: `${baseUrl}/api/tapfy-orders?action=webhook`,
    metadata: {
      order_id: order.id,
      business_name: order.bizName,
      nfc_link: order.nfcLink,
      review_link: order.reviewLink
    },
    payer: {
      ...payer,
      email: payerEmail,
      first_name: order.name,
      phone: { number: order.phone },
      address: {
        zip_code: order.cep,
        street_name: order.addr,
        street_number: order.num
      }
    },
    additional_info: {
      items: [
        {
          id: 'tapfy-nfc',
          title: `tapfy. NFC - ${order.qty} ${order.qty === 1 ? 'cartao' : 'cartoes'}`,
          quantity: order.qty,
          unit_price: Number(order.baseTotal / order.qty),
          category_id: 'services'
        }
      ],
      payer: {
        first_name: order.name,
        phone: { number: order.phone },
        address: {
          zip_code: order.cep,
          street_name: order.addr,
          street_number: order.num
        }
      },
      shipments: {
        receiver_address: {
          zip_code: order.cep,
          street_name: order.addr,
          street_number: order.num,
          floor: order.comp,
          city_name: order.city,
          state_name: order.state
        }
      }
    }
  });

  const response = await fetch(TRANSPARENT_PAYMENT_API, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      'x-idempotency-key': `${order.id}-${selectedPaymentMethod || payment.payment_method_id || 'payment'}`
    },
    body: JSON.stringify(paymentBody)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error('Pagamento recusado. Verifique os dados e tente novamente.');
  }
  return data;
}

async function updateOrder(orderId, patch) {
  const orders = await readOrders();
  const index = orders.findIndex((order) => order.id === orderId);
  if (index === -1) return null;
  orders[index] = { ...orders[index], ...patch, updatedAt: new Date().toISOString() };
  await writeOrders(orders);
  return orders[index];
}

// ── HANDLERS ──────────────────────────────────────────────────────────────────

async function handleAdminLogin(event) {
  const ip = clientIp(event);

  if (await checkRateLimit(ip)) {
    return json(429, { ok: false, error: 'Muitas tentativas. Aguarde 15 minutos e tente novamente.' });
  }

  const expected = process.env.TAPFY_ADMIN_PASSWORD;
  if (!expected) return json(500, { ok: false, error: 'Painel nao configurado.' });

  const payload = JSON.parse(event.body || '{}');
  const received = normalizeText(payload.password, 200);

  // Constant-time comparison to prevent timing attacks
  let match = false;
  try {
    const a = Buffer.from(received);
    const b = Buffer.from(expected);
    if (a.length === b.length) {
      match = crypto.timingSafeEqual(a, b);
    }
  } catch {
    match = false;
  }

  if (!match) {
    await incrementRateLimit(ip);
    return json(401, { ok: false, error: 'Senha invalida.' });
  }

  await clearRateLimit(ip);
  const token = generateAdminToken(expected);
  return json(200, { ok: true, token });
}

async function handleCreateCheckout(event) {
  const payload = JSON.parse(event.body || '{}');
  if (!payload.name || !payload.email || !payload.phone) {
    return json(400, { ok: false, error: 'Preencha nome, telefone e e-mail.' });
  }
  if (!payload.addr || !payload.city || !payload.state || !payload.cep) {
    return json(400, { ok: false, error: 'Preencha os dados de entrega.' });
  }

  const order = makeOrder(payload, 'pending_checkout');
  const preference = await createMercadoPagoPreference(event, order);
  order.preferenceId = preference.id;
  order.checkoutUrl = preference.init_point || preference.sandbox_init_point;
  order.status = 'pending_payment';

  const orders = await readOrders();
  orders.unshift(order);
  await writeOrders(orders);

  return json(200, { ok: true, orderId: order.id, checkoutUrl: order.checkoutUrl });
}

async function handleConfig() {
  return json(200, {
    ok: true,
    publicKey: process.env.MERCADO_PAGO_PUBLIC_KEY || '',
    testMode: String(process.env.MERCADO_PAGO_PUBLIC_KEY || '').startsWith('TEST-')
  });
}

async function handleProcessPayment(event) {
  const payload = JSON.parse(event.body || '{}');
  const orderPayload = payload.order || {};
  const paymentPayload = payload.payment || {};

  if (!orderPayload.name || !orderPayload.email || !orderPayload.phone) {
    return json(400, { ok: false, error: 'Preencha nome, telefone e e-mail.' });
  }
  if (!orderPayload.addr || !orderPayload.city || !orderPayload.state || !orderPayload.cep) {
    return json(400, { ok: false, error: 'Preencha os dados de entrega.' });
  }

  const order = makeOrder(orderPayload, 'processing_payment');
  order.payMethod = normalizeText(payload.selectedPaymentMethod || paymentPayload.payment_method_id || order.payMethod, 60);

  const payment = await createTransparentPayment(event, order, paymentPayload, payload.selectedPaymentMethod);
  order.status = payment.status || 'payment_created';
  order.statusDetail = payment.status_detail || '';
  order.paymentId = payment.id ? String(payment.id) : '';
  order.paymentMethodId = payment.payment_method_id || '';
  order.paymentTypeId = payment.payment_type_id || '';
  order.paidAt = payment.date_approved || '';
  order.pixQrCode = payment.point_of_interaction?.transaction_data?.qr_code || '';
  order.pixQrCodeBase64 = payment.point_of_interaction?.transaction_data?.qr_code_base64 || '';
  order.pixTicketUrl = payment.point_of_interaction?.transaction_data?.ticket_url || '';

  const orders = await readOrders();
  orders.unshift(order);
  await writeOrders(orders);

  return json(200, {
    ok: true,
    order: {
      id: order.id,
      status: order.status,
      statusDetail: order.statusDetail,
      total: order.total
    },
    payment: {
      id: order.paymentId,
      status: order.status,
      statusDetail: order.statusDetail,
      paymentMethodId: order.paymentMethodId,
      paymentTypeId: order.paymentTypeId,
      pixQrCode: order.pixQrCode,
      pixQrCodeBase64: order.pixQrCodeBase64,
      pixTicketUrl: order.pixTicketUrl
    }
  });
}

async function handleAdminList(event) {
  if (!adminAuthorized(event)) return json(401, { ok: false, error: 'Acesso nao autorizado.' });
  return json(200, { ok: true, orders: await readOrders() });
}

async function handleAdminClear(event) {
  if (!adminAuthorized(event)) return json(401, { ok: false, error: 'Acesso nao autorizado.' });
  await writeOrders([]);
  return json(200, { ok: true });
}

async function handleAdminUpdate(event) {
  if (!adminAuthorized(event)) return json(401, { ok: false, error: 'Acesso nao autorizado.' });
  const payload = JSON.parse(event.body || '{}');
  const orderId = normalizeText(payload.id, 120);
  if (!orderId) return json(400, { ok: false, error: 'Pedido nao informado.' });

  const trackingCode = normalizeText(payload.trackingCode, 120);

  // Build tracking URL server-side from tracking code to avoid URL injection
  let trackingUrl = '';
  if (payload.trackingUrl) {
    const candidateUrl = normalizeText(payload.trackingUrl, 500);
    if (isValidHttpUrl(candidateUrl)) {
      trackingUrl = candidateUrl;
    }
  }
  if (!trackingUrl && trackingCode) {
    trackingUrl = `https://rastreamento.correios.com.br/app/index.php?objeto=${encodeURIComponent(trackingCode)}`;
  }

  const patch = cleanObject({
    productionStatus: normalizeText(payload.productionStatus, 60),
    trackingCode,
    trackingUrl,
    adminNote: normalizeText(payload.adminNote, 500)
  });
  const order = await updateOrder(orderId, patch);
  if (!order) return json(404, { ok: false, error: 'Pedido nao encontrado.' });
  return json(200, { ok: true, order });
}

async function handleWebhook(event) {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!token) return json(200, { ok: true, skipped: 'missing_token' });

  const params = event.queryStringParameters || {};
  const body = JSON.parse(event.body || '{}');
  const topic = params.topic || params.type || body.type || body.topic;
  const rawPaymentId = params.id || params['data.id'] || body?.data?.id;

  if (!rawPaymentId || !String(topic).includes('payment')) {
    return json(200, { ok: true, ignored: true });
  }

  // Validate paymentId is a positive integer to prevent path traversal
  const paymentId = String(rawPaymentId);
  if (!/^\d+$/.test(paymentId)) {
    return json(400, { ok: false, error: 'ID de pagamento invalido.' });
  }

  // Verify webhook signature if secret is configured
  if (!verifyWebhookSignature(event, paymentId)) {
    return json(401, { ok: false, error: 'Assinatura do webhook invalida.' });
  }

  const response = await fetch(`${PAYMENT_LOOKUP_API}/${paymentId}`, {
    headers: { authorization: `Bearer ${token}` }
  });
  const payment = await response.json().catch(() => ({}));
  if (!response.ok) return json(200, { ok: false, ignored: 'payment_lookup_failed' });

  const orderId = payment.external_reference || payment.metadata?.order_id;
  if (!orderId) return json(200, { ok: true, ignored: 'missing_order_id' });

  await updateOrder(orderId, {
    status: payment.status || 'payment_updated',
    paymentId: String(paymentId),
    paymentMethodId: payment.payment_method_id || '',
    paymentTypeId: payment.payment_type_id || '',
    paidAt: payment.date_approved || ''
  });

  return json(200, { ok: true });
}

async function handleEvent(event) {
  try {
    const action = (event.queryStringParameters && event.queryStringParameters.action) || '';

    if (event.httpMethod === 'GET' && action === 'config') return await handleConfig();
    if (event.httpMethod === 'POST' && action === 'webhook') return await handleWebhook(event);
    if (event.httpMethod === 'POST' && action === 'login') return await handleAdminLogin(event);
    if (event.httpMethod === 'POST' && action === 'process-payment') return await handleProcessPayment(event);
    if ((event.httpMethod === 'POST' || event.httpMethod === 'PATCH') && action === 'update') return await handleAdminUpdate(event);
    if (event.httpMethod === 'POST') return await handleCreateCheckout(event);
    if (event.httpMethod === 'GET' && action === 'list') return await handleAdminList(event);
    if (event.httpMethod === 'DELETE' && action === 'clear') return await handleAdminClear(event);

    return json(404, { ok: false, error: 'Endpoint nao encontrado.' });
  } catch (error) {
    console.error('[tapfy-orders error]', error);
    return json(500, { ok: false, error: 'Erro interno. Tente novamente.' });
  }
}

module.exports = async (req, res) => {
  const requestUrl = new URL(req.url || '/api/tapfy-orders', `https://${req.headers.host || 'localhost'}`);
  const body = typeof req.body === 'string'
    ? req.body
    : (req.body ? JSON.stringify(req.body) : '');

  const response = await handleEvent({
    httpMethod: req.method,
    headers: req.headers || {},
    queryStringParameters: Object.fromEntries(requestUrl.searchParams.entries()),
    body
  });

  Object.entries(response.headers || {}).forEach(([key, value]) => res.setHeader(key, value));
  res.status(response.statusCode).send(response.body);
};

module.exports.handler = handleEvent;
