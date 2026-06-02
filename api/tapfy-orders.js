const { get, put } = require('@vercel/blob');

const ORDERS_KEY = 'orders';
const LEADS_KEY = 'leads';
const PRESENTATION_CLIENTS_KEY = 'presentation_clients';
const ORDERS_BLOB_PATH = 'tapfy-admin/orders.json';
const LEADS_BLOB_PATH = 'tapfy-admin/leads.json';
const PRESENTATION_CLIENTS_BLOB_PATH = 'tapfy-admin/presentation-clients.json';
const PRESENTATION_CLIENT_STATUSES = ['novo', 'em_contato', 'negociando', 'convertido', 'perdido'];
const LEAD_SCAN_TYPES = ['restaurant', 'cafe', 'bakery', 'beauty_salon', 'dentist', 'doctor', 'gym', 'store', 'car_repair', 'veterinary_care', 'pharmacy', 'lodging'];
const LEAD_REVIEW_RANGES = ['0', '1-10', '11-50', '51-100', '101+'];
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
    ,
    productionStatus: normalizeText(payload.productionStatus, 60) || 'novo',
    trackingCode: normalizeText(payload.trackingCode, 120),
    trackingUrl: normalizeText(payload.trackingUrl, 500),
    adminNote: normalizeText(payload.adminNote, 500)
  };
}

async function getOrdersStore() {
  if (!globalThis.__tapfyOrdersMemory) globalThis.__tapfyOrdersMemory = [];
  return globalThis.__tapfyOrdersMemory;
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
    throw new Error(data.error || 'Falha ao acessar o banco de pedidos.');
  }
  return data.result;
}

async function readBlobJson(pathname) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  const result = await get(pathname, { access: 'private', useCache: false });
  if (!result?.stream) return [];
  const raw = await new Response(result.stream).text();
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [];
}

async function writeBlobJson(pathname, value) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return false;
  await put(pathname, JSON.stringify(value), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
    cacheControlMaxAge: 60
  });
  return true;
}

async function readOrders() {
  const raw = await kvCommand(['GET', ORDERS_KEY]);
  if (raw) {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  }
  const blobOrders = await readBlobJson(ORDERS_BLOB_PATH);
  if (blobOrders !== null) return blobOrders;
  const orders = await getOrdersStore();
  return Array.isArray(orders) ? orders : [];
}

async function writeOrders(orders) {
  const normalized = Array.isArray(orders) ? orders : [];
  const saved = await kvCommand(['SET', ORDERS_KEY, JSON.stringify(normalized)]);
  if (saved !== null) return;
  if (await writeBlobJson(ORDERS_BLOB_PATH, normalized)) return;
  globalThis.__tapfyOrdersMemory = normalized;
}

async function getLeadsStore() {
  if (!globalThis.__tapfyLeadsMemory) globalThis.__tapfyLeadsMemory = [];
  return globalThis.__tapfyLeadsMemory;
}

async function readLeads() {
  const raw = await kvCommand(['GET', LEADS_KEY]);
  if (raw) {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  }
  const blobLeads = await readBlobJson(LEADS_BLOB_PATH);
  if (blobLeads !== null) return blobLeads;
  return await getLeadsStore();
}

async function writeLeads(leads) {
  const normalized = Array.isArray(leads) ? leads : [];
  const saved = await kvCommand(['SET', LEADS_KEY, JSON.stringify(normalized)]);
  if (saved !== null) return;
  if (await writeBlobJson(LEADS_BLOB_PATH, normalized)) return;
  globalThis.__tapfyLeadsMemory = normalized;
}

function adminAuthorized(event) {
  const expected = process.env.TAPFY_ADMIN_PASSWORD;
  if (!expected) return false;
  const received = event.headers['x-admin-password'] || event.headers['X-Admin-Password'];
  return received === expected;
}

function siteUrl(event) {
  const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '';
  return (process.env.URL || vercelUrl || `https://${event.headers.host || 'localhost'}`).replace(/\/$/, '');
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

async function handleAdminUpdate(event) {
  if (!adminAuthorized(event)) return json(401, { ok: false, error: 'Senha do admin invalida.' });
  const payload = JSON.parse(event.body || '{}');
  const orderId = normalizeText(payload.id, 120);
  if (!orderId) return json(400, { ok: false, error: 'Pedido nao informado.' });

  const trackingCode = normalizeText(payload.trackingCode, 120);
  const trackingUrl = normalizeText(payload.trackingUrl, 500) || (trackingCode
    ? `https://rastreamento.correios.com.br/app/index.php?objeto=${encodeURIComponent(trackingCode)}`
    : '');
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

function googleMapsKey() {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) throw new Error('GOOGLE_MAPS_API_KEY nao configurada na hospedagem.');
  return key;
}

function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '');
}

function validPhone(value) {
  const digits = digitsOnly(value);
  return digits.length >= 10 && digits.length <= 13;
}

function makeLead(place, source = 'manual') {
  const now = new Date();
  const phone = normalizeText(place.formatted_phone_number || place.phone || '', 60);
  return {
    id: `lead_${now.getTime()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    source,
    status: 'novo',
    name: normalizeText(place.name, 180),
    address: normalizeText(place.formatted_address || place.vicinity || place.address, 300),
    phone,
    whatsappPhone: digitsOnly(phone),
    rating: Number(place.rating || 0),
    reviews: Number(place.user_ratings_total || place.reviews || 0),
    category: normalizeText((place.types || []).slice(0, 3).join(', ') || place.category, 160),
    description: normalizeText(place.editorial_summary?.overview || place.description || '', 500),
    imageUrl: place.photoUrl || '',
    mapsUrl: normalizeText(place.url || place.mapsUrl, 800),
    website: normalizeText(place.website, 500),
    placeId: normalizeText(place.place_id || place.placeId, 160),
    lat: Number(place.geometry?.location?.lat || place.lat || 0),
    lng: Number(place.geometry?.location?.lng || place.lng || 0),
    contactNote: '',
    saleValue: 0,
    costValue: 0
  };
}

function mapsPhotoUrl(photoReference) {
  if (!photoReference) return '';
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=640&photo_reference=${encodeURIComponent(photoReference)}&key=${encodeURIComponent(googleMapsKey())}`;
}

async function googleJson(path, params = {}) {
  const url = new URL(`https://maps.googleapis.com/maps/api/place/${path}/json`);
  Object.entries({ ...params, key: googleMapsKey(), language: 'pt-BR' }).forEach(([key, value]) => {
    if (value !== '' && value !== undefined && value !== null) url.searchParams.set(key, String(value));
  });
  const response = await fetch(url);
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !['OK', 'ZERO_RESULTS'].includes(data.status)) {
    throw new Error(data.error_message || `Google Places retornou ${data.status || response.status}.`);
  }
  return data;
}

async function googleMapsJson(path, params = {}) {
  const url = new URL(`https://maps.googleapis.com/maps/api/${path}/json`);
  Object.entries({ ...params, key: googleMapsKey(), language: 'pt-BR' }).forEach(([key, value]) => {
    if (value !== '' && value !== undefined && value !== null) url.searchParams.set(key, String(value));
  });
  const response = await fetch(url);
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !['OK', 'ZERO_RESULTS'].includes(data.status)) {
    throw new Error(data.error_message || `Google Maps retornou ${data.status || response.status}.`);
  }
  return data;
}

async function googlePlaceDetails(placeId) {
  const data = await googleJson('details', {
    place_id: placeId,
    fields: 'place_id,name,formatted_address,formatted_phone_number,rating,user_ratings_total,types,url,website,geometry,photos,editorial_summary'
  });
  const place = data.result || {};
  place.photoUrl = mapsPhotoUrl(place.photos?.[0]?.photo_reference);
  return place;
}

async function handleLeadPhotoResponse(req, res, leadId) {
  const leads = await readLeads();
  const lead = leads.find((item) => item.id === normalizeText(leadId, 160));
  if (!lead?.placeId) return res.status(404).send('Foto nao encontrada.');
  const place = await googlePlaceDetails(lead.placeId);
  if (!place.photoUrl) return res.status(404).send('Foto nao encontrada.');
  const response = await fetch(place.photoUrl, { redirect: 'follow' });
  if (!response.ok) return res.status(404).send('Foto nao encontrada.');
  const bytes = Buffer.from(await response.arrayBuffer());
  res.setHeader('content-type', response.headers.get('content-type') || 'image/jpeg');
  res.setHeader('cache-control', 'public, max-age=86400, stale-while-revalidate=604800');
  return res.status(200).send(bytes);
}

async function resolveGoogleMapsLink(link) {
  const original = normalizeText(link, 1200);
  let expanded = original;
  if (!/^https?:\/\//i.test(expanded)) throw new Error('Cole um link valido do Google Maps.');
  try {
    const response = await fetch(expanded, { method: 'GET', redirect: 'follow' });
    expanded = response.url || expanded;
  } catch {}
  const placeIdMatch = expanded.match(/[?&]place_id=([^&]+)/i) || original.match(/[?&]place_id=([^&]+)/i);
  if (placeIdMatch) return googlePlaceDetails(decodeURIComponent(placeIdMatch[1]));
  const expandedUrl = new URL(expanded);
  const originalUrl = new URL(original);
  const query = expandedUrl.searchParams.get('q')
    || expandedUrl.searchParams.get('query')
    || originalUrl.searchParams.get('q')
    || originalUrl.searchParams.get('query')
    || decodeURIComponent((expanded.match(/\/place\/([^/]+)/i) || original.match(/\/place\/([^/]+)/i) || [])[1] || '').replace(/\+/g, ' ');
  if (!query) throw new Error('Nao consegui identificar a empresa nesse link. Use um link completo do Google Maps.');
  const search = await googleJson('textsearch', { query });
  if (!search.results?.length) throw new Error('Empresa nao encontrada no Google Maps.');
  return googlePlaceDetails(search.results[0].place_id);
}

async function resolveScanCenter(origin) {
  let value = normalizeText(origin, 1200);
  if (!value) throw new Error('Informe uma localizacao para iniciar a busca.');
  if (/^https?:\/\//i.test(value)) {
    try {
      const response = await fetch(value, { method: 'GET', redirect: 'follow' });
      value = response.url || value;
    } catch {}
    const atCoordinates = value.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    const dataCoordinates = value.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    const coordinates = atCoordinates || dataCoordinates;
    if (coordinates) {
      return { lat: Number(coordinates[1]), lng: Number(coordinates[2]), label: origin };
    }
    try {
      const place = await resolveGoogleMapsLink(value);
      const lat = Number(place.geometry?.location?.lat || 0);
      const lng = Number(place.geometry?.location?.lng || 0);
      if (lat && lng) return { lat, lng, label: place.formatted_address || place.name || origin };
    } catch {}
  }
  const placeSearch = await googleJson('textsearch', { query: value });
  let result = placeSearch.results?.[0];
  if (!result?.geometry?.location) {
    const geocode = await googleMapsJson('geocode', { address: value });
    result = geocode.results?.[0];
  }
  if (!result?.geometry?.location) throw new Error('Nao consegui localizar o endereco inicial da busca.');
  return {
    lat: Number(result.geometry.location.lat),
    lng: Number(result.geometry.location.lng),
    label: result.formatted_address || result.name || value
  };
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function nearbySearchAllPages(params) {
  const results = [];
  let pageToken = '';
  for (let page = 0; page < 3; page += 1) {
    let data;
    if (!pageToken) {
      data = await googleJson('nearbysearch', params);
    } else {
      for (let attempt = 0; attempt < 4; attempt += 1) {
        await wait(attempt === 0 ? 2200 : 1200);
        try {
          data = await googleJson('nearbysearch', { pagetoken: pageToken });
          break;
        } catch (error) {
          if (!String(error.message).includes('INVALID_REQUEST') || attempt === 3) throw error;
        }
      }
    }
    results.push(...(data.results || []));
    pageToken = data.next_page_token || '';
    if (!pageToken) break;
  }
  return results;
}

function reviewMatchesRanges(reviews, ranges) {
  const count = Number(reviews || 0);
  return ranges.some((range) => (
    (range === '0' && count === 0)
    || (range === '1-10' && count >= 1 && count <= 10)
    || (range === '11-50' && count >= 11 && count <= 50)
    || (range === '51-100' && count >= 51 && count <= 100)
    || (range === '101+' && count > 100)
  ));
}

async function handleLeadList(event) {
  if (!adminAuthorized(event)) return json(401, { ok: false, error: 'Senha do admin invalida.' });
  return json(200, { ok: true, leads: await readLeads() });
}

async function handleLeadRegionResolve(event) {
  if (!adminAuthorized(event)) return json(401, { ok: false, error: 'Senha do admin invalida.' });
  const payload = JSON.parse(event.body || '{}');
  const center = await resolveScanCenter(payload.origin);
  return json(200, { ok: true, center });
}

async function handleLeadCreate(event) {
  if (!adminAuthorized(event)) return json(401, { ok: false, error: 'Senha do admin invalida.' });
  const payload = JSON.parse(event.body || '{}');
  let place = payload;
  if (payload.mapsUrl) place = await resolveGoogleMapsLink(payload.mapsUrl);
  const lead = makeLead(place, payload.mapsUrl ? 'google-maps-link' : 'manual');
  if (!lead.name || !validPhone(lead.phone)) return json(400, { ok: false, error: 'A empresa precisa ter nome e telefone valido.' });
  const leads = await readLeads();
  const duplicate = leads.find((item) => (lead.placeId && item.placeId === lead.placeId) || digitsOnly(item.phone) === digitsOnly(lead.phone));
  if (duplicate) return json(200, { ok: true, lead: duplicate, duplicate: true });
  leads.unshift(lead);
  await writeLeads(leads);
  return json(200, { ok: true, lead });
}

async function handlePresentationResolve(event) {
  if (!adminAuthorized(event)) return json(401, { ok: false, error: 'Senha do admin invalida.' });
  const payload = JSON.parse(event.body || '{}');
  const mapsUrl = normalizeText(payload.mapsUrl, 1200);
  if (!mapsUrl) return json(400, { ok: false, error: 'Cole o link do Google Maps da empresa.' });
  const place = await resolveGoogleMapsLink(mapsUrl);
  if (!place.place_id) return json(400, { ok: false, error: 'Nao consegui identificar a empresa nesse link.' });
  return json(200, {
    ok: true,
    company: {
      name: normalizeText(place.name, 180),
      address: normalizeText(place.formatted_address, 300),
      placeId: normalizeText(place.place_id, 160),
      reviewLink: `https://search.google.com/local/writereview?placeid=${encodeURIComponent(place.place_id)}`
    }
  });
}

async function handleLeadUpdate(event) {
  if (!adminAuthorized(event)) return json(401, { ok: false, error: 'Senha do admin invalida.' });
  const payload = JSON.parse(event.body || '{}');
  const id = normalizeText(payload.id, 160);
  const leads = await readLeads();
  const index = leads.findIndex((lead) => lead.id === id);
  if (index < 0) return json(404, { ok: false, error: 'Lead nao encontrado.' });
  const allowed = cleanObject({
    status: normalizeText(payload.status, 40),
    contactNote: normalizeText(payload.contactNote, 500),
    saleValue: Math.max(0, Number(payload.saleValue || 0)),
    costValue: Math.max(0, Number(payload.costValue || 0))
  });
  leads[index] = { ...leads[index], ...allowed, updatedAt: new Date().toISOString() };
  await writeLeads(leads);
  return json(200, { ok: true, lead: leads[index] });
}

async function handleLeadDelete(event) {
  if (!adminAuthorized(event)) return json(401, { ok: false, error: 'Senha do admin invalida.' });
  const payload = JSON.parse(event.body || '{}');
  const ids = [...new Set((Array.isArray(payload.ids) ? payload.ids : []).map((id) => normalizeText(id, 160)).filter(Boolean))];
  if (!ids.length) return json(400, { ok: false, error: 'Selecione ao menos um lead para excluir.' });
  const selected = new Set(ids);
  const leads = await readLeads();
  const remaining = leads.filter((lead) => !selected.has(lead.id));
  const deleted = leads.length - remaining.length;
  await writeLeads(remaining);
  return json(200, { ok: true, deleted, total: remaining.length, leads: remaining });
}

async function handleLeadScan(event) {
  if (!adminAuthorized(event)) return json(401, { ok: false, error: 'Senha do admin invalida.' });
  const payload = JSON.parse(event.body || '{}');
  const center = await resolveScanCenter(payload.origin);
  const radius = Math.min(50000, Math.max(1000, Number(payload.radius || 15000)));
  const maxReviews = Math.min(1000, Math.max(0, Number(payload.maxReviews || 120)));
  const minRating = Math.min(5, Math.max(0, Number(payload.minRating || 0)));
  const requestedTypes = Array.isArray(payload.types) ? payload.types : [];
  const types = [...new Set(requestedTypes.filter((type) => LEAD_SCAN_TYPES.includes(type)))];
  const requestedRanges = Array.isArray(payload.reviewRanges) ? payload.reviewRanges : [];
  const reviewRanges = [...new Set(requestedRanges.filter((range) => LEAD_REVIEW_RANGES.includes(range)))];
  if (requestedTypes.length && !types.length) return json(400, { ok: false, error: 'Selecione ao menos um tipo de estabelecimento valido.' });
  if (requestedRanges.length && !reviewRanges.length) return json(400, { ok: false, error: 'Selecione ao menos uma faixa de avaliacoes valida.' });
  const scanTypes = types.length ? types : LEAD_SCAN_TYPES.slice(0, 9);
  const nearbyPages = await Promise.all(scanTypes.map((type) => nearbySearchAllPages({ location: `${center.lat},${center.lng}`, radius, type })));
  const nearbyResults = nearbyPages.flat();
  const unique = [...new Map(nearbyResults.map((place) => [place.place_id, place])).values()]
    .filter((place) => reviewRanges.length ? reviewMatchesRanges(place.user_ratings_total, reviewRanges) : Number(place.user_ratings_total || 0) <= maxReviews)
    .filter((place) => Number(place.rating || 0) >= minRating)
    .sort((a, b) => Number(a.user_ratings_total || 0) - Number(b.user_ratings_total || 0));
  const details = (await Promise.all(unique.map((place) => googlePlaceDetails(place.place_id).catch(() => null))))
    .filter((item) => item && validPhone(item.formatted_phone_number));
  const leads = await readLeads();
  let added = 0;
  let duplicates = 0;
  for (const place of details) {
    const candidate = makeLead(place, 'automatico-google-places');
    candidate.searchOrigin = center.label;
    candidate.searchRadiusKm = radius / 1000;
    candidate.searchTypes = scanTypes;
    candidate.searchReviewRanges = reviewRanges;
    candidate.searchMinRating = minRating;
    const duplicate = leads.find((item) => item.placeId === candidate.placeId || digitsOnly(item.phone) === digitsOnly(candidate.phone));
    if (!duplicate) {
      leads.unshift(candidate);
      added += 1;
    } else {
      duplicates += 1;
    }
  }
  await writeLeads(leads);
  return json(200, { ok: true, added, duplicates, found: details.length, total: leads.length, center, radius, leads });
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

async function readPresentationClients() {
  const raw = await kvCommand(['GET', PRESENTATION_CLIENTS_KEY]);
  if (raw) {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  }
  const blobClients = await readBlobJson(PRESENTATION_CLIENTS_BLOB_PATH);
  if (blobClients !== null) return blobClients;
  return [];
}

async function writePresentationClients(clients) {
  const normalized = Array.isArray(clients) ? clients : [];
  const saved = await kvCommand(['SET', PRESENTATION_CLIENTS_KEY, JSON.stringify(normalized)]);
  if (saved !== null) return;
  await writeBlobJson(PRESENTATION_CLIENTS_BLOB_PATH, normalized);
}

function makePresentationClient(payload) {
  const now = new Date();
  const status = normalizeText(payload.status, 40);
  return {
    id: payload.id || `pres_${now.getTime()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: payload.createdAt || now.toISOString(),
    updatedAt: now.toISOString(),
    name: normalizeText(payload.name, 180),
    phone: normalizeText(payload.phone, 60),
    mapsUrl: normalizeText(payload.mapsUrl, 1200),
    companyName: normalizeText(payload.companyName, 180),
    companyAddress: normalizeText(payload.companyAddress, 300),
    reviewLink: normalizeText(payload.reviewLink, 800),
    plan1: normalizeText(payload.plan1, 40),
    plan3: normalizeText(payload.plan3, 40),
    plan10: normalizeText(payload.plan10, 40),
    status: PRESENTATION_CLIENT_STATUSES.includes(status) ? status : 'novo',
    presentationUrl: normalizeText(payload.presentationUrl, 2000),
    notes: normalizeText(payload.notes, 500)
  };
}

async function handlePresentationClientList(event) {
  if (!adminAuthorized(event)) return json(401, { ok: false, error: 'Senha do admin invalida.' });
  return json(200, { ok: true, clients: await readPresentationClients() });
}

async function handlePresentationClientSave(event) {
  if (!adminAuthorized(event)) return json(401, { ok: false, error: 'Senha do admin invalida.' });
  const payload = JSON.parse(event.body || '{}');
  if (!normalizeText(payload.name, 180)) return json(400, { ok: false, error: 'Informe o nome do cliente.' });
  const clients = await readPresentationClients();
  const existingIndex = payload.id ? clients.findIndex((c) => c.id === payload.id) : -1;
  const client = makePresentationClient(payload);
  if (existingIndex >= 0) {
    clients[existingIndex] = client;
  } else {
    client.id = `pres_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    clients.unshift(client);
  }
  await writePresentationClients(clients);
  return json(200, { ok: true, client, clients });
}

async function handlePresentationClientDelete(event) {
  if (!adminAuthorized(event)) return json(401, { ok: false, error: 'Senha do admin invalida.' });
  const payload = JSON.parse(event.body || '{}');
  const id = normalizeText(payload.id, 160);
  if (!id) return json(400, { ok: false, error: 'ID nao informado.' });
  const clients = await readPresentationClients();
  const remaining = clients.filter((c) => c.id !== id);
  await writePresentationClients(remaining);
  return json(200, { ok: true, clients: remaining });
}

async function handleEvent(event) {
  try {
    const action = (event.queryStringParameters && event.queryStringParameters.action) || '';

    if (event.httpMethod === 'GET' && action === 'config') return await handleConfig();
    if (event.httpMethod === 'POST' && action === 'webhook') return await handleWebhook(event);
    if (event.httpMethod === 'POST' && action === 'process-payment') return await handleProcessPayment(event);
    if ((event.httpMethod === 'POST' || event.httpMethod === 'PATCH') && action === 'update') return await handleAdminUpdate(event);
    if (event.httpMethod === 'GET' && action === 'lead-list') return await handleLeadList(event);
    if (event.httpMethod === 'POST' && action === 'lead-region-resolve') return await handleLeadRegionResolve(event);
    if (event.httpMethod === 'POST' && action === 'lead-create') return await handleLeadCreate(event);
    if (event.httpMethod === 'POST' && action === 'presentation-resolve') return await handlePresentationResolve(event);
    if (event.httpMethod === 'GET' && action === 'presentation-client-list') return await handlePresentationClientList(event);
    if (event.httpMethod === 'POST' && action === 'presentation-client-save') return await handlePresentationClientSave(event);
    if (event.httpMethod === 'DELETE' && action === 'presentation-client-delete') return await handlePresentationClientDelete(event);
    if ((event.httpMethod === 'POST' || event.httpMethod === 'PATCH') && action === 'lead-update') return await handleLeadUpdate(event);
    if (event.httpMethod === 'DELETE' && action === 'lead-delete') return await handleLeadDelete(event);
    if (event.httpMethod === 'POST' && action === 'lead-scan') return await handleLeadScan(event);
    if (event.httpMethod === 'POST') return await handleCreateCheckout(event);
    if (event.httpMethod === 'GET' && action === 'list') return await handleAdminList(event);
    if (event.httpMethod === 'DELETE' && action === 'clear') return await handleAdminClear(event);

    return json(404, { ok: false, error: 'Endpoint nao encontrado.' });
  } catch (error) {
    console.error(error);
    return json(500, { ok: false, error: error.message || 'Erro interno.' });
  }
}

module.exports = async (req, res) => {
  const requestUrl = new URL(req.url || '/api/tapfy-orders', `https://${req.headers.host || 'localhost'}`);
  if (req.method === 'GET' && requestUrl.searchParams.get('action') === 'lead-photo') {
    try {
      return await handleLeadPhotoResponse(req, res, requestUrl.searchParams.get('id'));
    } catch (error) {
      console.error(error);
      return res.status(404).send('Foto nao encontrada.');
    }
  }
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
