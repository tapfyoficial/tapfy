const { getStore } = require('@netlify/blobs');

const ORDERS_KEY = 'orders';
const PRICES = { 1: 79, 3: 198, 10: 590 };
const UPSELL_PRICE = 15;
const PAYMENT_API = 'https://api.mercadopago.com/checkout/preferences';
const TRANSPARENT_PAYMENT_API = 'https://api.mercadopago.com/v1/payments';
const PAYMENT_LOOKUP_API = 'https://api.mercadopago.com/v1/payments';

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
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
    state: normalizeText(payload.state, 2).toUpperCase()
  };
}

async function getOrdersStore() {
  const options = { name: 'tapfy-orders', consistency: 'strong' };
  if (process.env.NETLIFY_BLOBS_SITE_ID && process.env.NETLIFY_BLOBS_TOKEN) {
    options.siteID = process.env.NETLIFY_BLOBS_SITE_ID;
    options.token = process.env.NETLIFY_BLOBS_TOKEN;
  }
  return getStore(options);
}

async function readOrders() {
  const store = await getOrdersStore();
  const orders = await store.get(ORDERS_KEY, { type: 'json' });
  return Array.isArray(orders) ? orders : [];
}

async function writeOrders(orders) {
  const store = await getOrdersStore();
  await store.setJSON(ORDERS_KEY, orders);
}

function adminAuthorized(event) {
  const expected = process.env.TAPFY_ADMIN_PASSWORD;
  if (!expected) return false;
  const received = event.headers['x-admin-password'] || event.headers['X-Admin-Password'];
  return received === expected;
}

function siteUrl(event) {
  return (process.env.URL || `https://${event.headers.host || 'scintillating-palmier-35ef96.netlify.app'}`).replace(/\/$/, '');
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
  if (!token) throw new Error('MERCADO_PAGO_ACCESS_TOKEN nao configurado no Netlify.');
  return token;
}

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
    throw new Error(data.message || data.error || 'Mercado Pago recusou a criacao do checkout.');
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
    throw new Error(data.message || data.error || 'Mercado Pago recusou o pagamento.');
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
  if (!adminAuthorized(event)) return json(401, { ok: false, error: 'Senha do admin invalida.' });
  return json(200, { ok: true, orders: await readOrders() });
}

async function handleAdminClear(event) {
  if (!adminAuthorized(event)) return json(401, { ok: false, error: 'Senha do admin invalida.' });
  await writeOrders([]);
  return json(200, { ok: true });
}

async function handleWebhook(event) {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!token) return json(200, { ok: true, skipped: 'missing_token' });

  const params = event.queryStringParameters || {};
  const body = JSON.parse(event.body || '{}');
  const topic = params.topic || params.type || body.type || body.topic;
  const paymentId = params.id || params['data.id'] || body?.data?.id;

  if (!paymentId || !String(topic).includes('payment')) {
    return json(200, { ok: true, ignored: true });
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

exports.handler = async (event) => {
  try {
    const action = (event.queryStringParameters && event.queryStringParameters.action) || '';

    if (event.httpMethod === 'GET' && action === 'config') return await handleConfig();
    if (event.httpMethod === 'POST' && action === 'webhook') return await handleWebhook(event);
    if (event.httpMethod === 'POST' && action === 'process-payment') return await handleProcessPayment(event);
    if (event.httpMethod === 'POST') return await handleCreateCheckout(event);
    if (event.httpMethod === 'GET' && action === 'list') return await handleAdminList(event);
    if (event.httpMethod === 'DELETE' && action === 'clear') return await handleAdminClear(event);

    return json(404, { ok: false, error: 'Endpoint nao encontrado.' });
  } catch (error) {
    console.error(error);
    return json(500, { ok: false, error: error.message || 'Erro interno.' });
  }
};
