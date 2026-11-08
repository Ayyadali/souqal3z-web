// خادم موقع سوق العز على Cloudflare
// - صفحة الإعلان /ad/123 تُبنى على الخادم: تظهر صورة الإعلان وسعره عند مشاركته في واتساب، وتقرؤها محركات البحث
// - /sitemap-ads.xml خريطة الإعلانات النشطة، تتحدث تلقائيًا
// - بقية الملفات تُقدَّم كما هي من المجلد

const SITE = 'https://souqal3z.com';
const LIFETIME_DAYS = 30;
const SYMBOLS = { SAR: 'ر.س', AED: 'د.إ', KWD: 'د.ك', QAR: 'ر.ق', BHD: 'د.ب', OMR: 'ر.ع' };
const GENDER = { male: 'ذكر', female: 'أنثى', mixed: 'مختلط' };

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.hostname.startsWith('www.')) {
      url.hostname = url.hostname.slice(4);
      return Response.redirect(url.toString(), 301);
    }

    if (request.method === 'GET' || request.method === 'HEAD') {
      const match = url.pathname.match(/^\/ad\/(\d+)\/?$/);
      const legacyId = url.pathname === '/ad.html' ? url.searchParams.get('id') : null;
      if (match) return adPage(Number(match[1]), request, env);
      if (legacyId && /^\d+$/.test(legacyId)) return adPage(Number(legacyId), request, env);
      if (url.pathname === '/sitemap-ads.xml') return sitemap(env);
      if (url.pathname === '/') return env.ASSETS.fetch(new Request(new URL('/index.html', url), request));
    }
    return env.ASSETS.fetch(request);
  },
};

async function rest(env, path) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: env.SUPABASE_KEY, Accept: 'application/json' },
    cf: { cacheTtl: 60, cacheEverything: true },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const mediaUrl = (env, path) =>
  `${env.SUPABASE_URL}/storage/v1/object/public/ad-media/${path.split('/').map(encodeURIComponent).join('/')}`;

function priceText(ad) {
  if (ad.price == null) return 'على السوم';
  return Number(ad.price).toLocaleString('en-US', { maximumFractionDigits: 2 }) + ' ' + (SYMBOLS[ad.currency_code] || ad.currency_code);
}

function isExpired(ad) {
  return new Date(ad.bumped_at).getTime() < Date.now() - LIFETIME_DAYS * 86400000;
}

function openAppHref(env, id, userAgent) {
  if (/android/i.test(userAgent || '')) {
    const fallback = encodeURIComponent(`${SITE}/ad/${id}`);
    return `intent://ad/${id}#Intent;scheme=${env.APP_SCHEME};package=${env.ANDROID_PACKAGE};S.browser_fallback_url=${fallback};end`;
  }
  return `${env.APP_SCHEME}://ad/${id}`;
}

async function adPage(id, request, env) {
  const select =
    'id,title,price,is_negotiable,currency_code,quantity,gender,status,is_udhiya,description,bumped_at,' +
    'city:cities(name_ar),breed:breeds(name_ar),category:categories(name_ar,slug),age:age_options(name_ar),' +
    'media:ad_media(storage_path,media_type,sort_order)';
  let ad;
  try {
    const rows = await rest(env, `ads?select=${encodeURIComponent(select)}&id=eq.${id}`);
    ad = rows[0];
  } catch {
    return html(shell({ title: 'سوق العز', body: stateBox('تعذّر تحميل الإعلان الآن. حاول بعد قليل.'), noindex: true }), 503, 0);
  }
  if (!ad) {
    return html(
      shell({ title: 'الإعلان غير متاح | سوق العز', body: stateBox('هذا الإعلان لم يعد متاحًا، ربما بيع الحلال أو حُذف الإعلان.'), noindex: true }),
      404,
      60,
    );
  }

  const pageUrl = `${SITE}/ad/${ad.id}`;
  const media = (ad.media || []).slice().sort((a, b) => a.sort_order - b.sort_order);
  const images = media.filter((m) => m.media_type !== 'video').map((m) => mediaUrl(env, m.storage_path));
  const videos = media.filter((m) => m.media_type === 'video').map((m) => mediaUrl(env, m.storage_path));
  const place = [ad.category?.name_ar, ad.breed?.name_ar].filter(Boolean).join(' ');
  const where = ad.city?.name_ar ? `في ${ad.city.name_ar}` : '';
  const price = priceText(ad);
  const summary = [ad.category?.name_ar, ad.breed?.name_ar, ad.city?.name_ar].filter(Boolean).join('، ');
  // السعر ظاهر في العنوان، فالوصف يبدأ بالقسم والسلالة والمدينة
  const description = `${summary ? summary + '. ' : ''}${(ad.description || `${place} للبيع ${where}`).replace(/\s+/g, ' ').trim().slice(0, 140)}`;
  const expired = isExpired(ad);

  const specs = [
    ['القسم', ad.category?.name_ar],
    ['السلالة', ad.breed?.name_ar],
    ['العمر', ad.age?.name_ar],
    ['الجنس', GENDER[ad.gender]],
    ['العدد', ad.quantity > 1 ? `${ad.quantity} رأس` : ad.quantity === 1 ? 'رأس واحد' : null],
    ['المدينة', ad.city?.name_ar],
    ['للأضحية', ad.is_udhiya ? 'مناسب للأضحية' : null],
    ['رقم الإعلان', String(ad.id)],
  ]
    .filter((r) => r[1])
    .map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`)
    .join('');

  let gallery;
  if (images.length) {
    const thumbs =
      images.length > 1
        ? `<div class="thumbs">${images
            .map((src, i) => `<button type="button" aria-label="الصورة ${i + 1}" aria-pressed="${i === 0}"><img src="${esc(src)}" alt="" loading="lazy"></button>`)
            .join('')}</div>`
        : '';
    gallery = `<div class="gallery"><img class="main" src="${esc(images[0])}" alt="${esc(ad.title)}">${thumbs}</div>`;
  } else if (videos.length) {
    gallery = `<div class="gallery"><video class="main" src="${esc(videos[0])}" controls playsinline preload="metadata"></video></div>`;
  } else {
    gallery = '<div class="gallery"><div class="main empty">لا توجد صور لهذا الإعلان</div></div>';
  }

  const notice = expired
    ? '<p class="ad-desc"><b>انتهت مدة عرض هذا الإعلان.</b> تصفّح الإعلانات الجديدة في سوق العز.</p>'
    : '';

  const crumbs = [
    ['الرئيسية', `${SITE}/`],
    ['الإعلانات', `${SITE}/ads.html`],
    ad.category ? [ad.category.name_ar, `${SITE}/ads.html?cat=${ad.category.slug}`] : null,
    [ad.title, pageUrl],
  ].filter(Boolean);

  const ld = [
    {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: ad.title,
      description: ad.description || description,
      image: images.length ? images : undefined,
      category: ad.category?.name_ar,
      url: pageUrl,
      offers:
        ad.price != null
          ? {
              '@type': 'Offer',
              price: Number(ad.price),
              priceCurrency: ad.currency_code,
              availability: expired ? 'https://schema.org/Discontinued' : 'https://schema.org/InStock',
              url: pageUrl,
            }
          : undefined,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: crumbs.map(([name, item], i) => ({ '@type': 'ListItem', position: i + 1, name, item })),
    },
  ];

  const body = `
  <main class="container">
    <nav class="crumbs" aria-label="مسار الصفحة">${crumbs
      .slice(0, -1)
      .map(([name, item]) => `<a href="${esc(item.replace(SITE, ''))}">${esc(name)}</a>`)
      .join(' <span aria-hidden="true">‹</span> ')}</nav>
    <div class="ad">
      ${gallery}
      <div class="ad-info">
        <h1>${esc(ad.title)}</h1>
        <div class="ad-price">${esc(price)}${ad.price != null && ad.is_negotiable ? '<small>السعر قابل للتفاوض</small>' : ''}</div>
        <dl class="specs">${specs}</dl>
        ${notice}
        ${ad.description ? `<p class="ad-desc">${esc(ad.description)}</p>` : ''}
        <div class="ad-actions">
          <a class="btn green" href="${esc(openAppHref(env, ad.id, request.headers.get('user-agent')))}">افتح الإعلان في التطبيق</a>
          <a class="btn outline" data-store>حمّل التطبيق</a>
        </div>
        <div class="safety"><b>قبل ما تشتري</b>رقم البائع داخل التطبيق. عاين الحلال بنفسك قبل الدفع، ولا تحوّل عربونًا لشخص ما قابلته.</div>
      </div>
    </div>
  </main>
  <script>
    (function () {
      var main = document.querySelector('.gallery .main');
      document.querySelectorAll('.thumbs button').forEach(function (b, i, all) {
        b.addEventListener('click', function () {
          main.src = b.querySelector('img').src;
          all.forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
          b.setAttribute('aria-pressed', 'true');
        });
      });
    })();
  </script>`;

  return html(
    shell({
      title: `${ad.title} | سوق العز`,
      description,
      canonical: pageUrl,
      ogTitle: `${ad.title} · ${price}`,
      image: images[0],
      imageAlt: ad.title,
      ogType: 'product',
      jsonLd: ld,
      noindex: expired,
      body,
    }),
    200,
    300,
  );
}

function stateBox(text) {
  return `<main class="container"><div class="ad-state"><p>${esc(text)}</p><a class="btn outline" href="/ads.html">تصفّح الإعلانات</a></div></main>`;
}

function shell({ title, description, canonical, ogTitle, image, imageAlt, ogType = 'website', jsonLd, noindex, body }) {
  const desc = description || 'سوق العز: غنم وماعز وإبل وأبقار في دول الخليج.';
  const img = image || `${SITE}/assets/og.png`;
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}">
  <meta name="theme-color" content="#133A2C">
  ${noindex ? '<meta name="robots" content="noindex">' : ''}
  ${canonical ? `<link rel="canonical" href="${esc(canonical)}">` : ''}
  <meta property="og:type" content="${ogType}">
  <meta property="og:site_name" content="سوق العز">
  <meta property="og:locale" content="ar_SA">
  ${canonical ? `<meta property="og:url" content="${esc(canonical)}">` : ''}
  <meta property="og:title" content="${esc(ogTitle || title)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:image" content="${esc(img)}">
  ${image ? '' : '<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">'}
  ${imageAlt ? `<meta property="og:image:alt" content="${esc(imageAlt)}">` : ''}
  <meta name="twitter:card" content="summary_large_image">
  <link rel="apple-touch-icon" href="/assets/icon.png">
  <link rel="icon" href="/assets/favicon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Aref+Ruqaa:wght@700&family=IBM+Plex+Sans+Arabic:wght@400;500;700&family=Noto+Kufi+Arabic:wght@500;700;800&display=swap">
  <link rel="stylesheet" href="/assets/site.css">
  <script src="/assets/config.js"></script>
  ${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>` : ''}
</head>
<body>
  <header class="topbar">
    <div class="container">
      <a class="logo" href="/"><img src="/assets/icon.png" alt=""><span>سوق العز</span></a>
      <nav class="nav" aria-label="القائمة">
        <a href="/">الرئيسية</a>
        <a href="/ads.html">الإعلانات</a>
        <a href="/#how">كيف يشتغل</a>
        <a href="/#faq">أسئلة</a>
      </nav>
      <a class="btn gold sm" data-store>حمّل التطبيق</a>
    </div>
  </header>
  <div class="sadu thin" aria-hidden="true"></div>
${body}
  <div class="sadu thin" aria-hidden="true"></div>
  <footer class="footer">
    <div class="container">
      <div>
        <a class="logo" href="/"><img src="/assets/icon.png" alt=""><span>سوق العز</span></a>
        <p style="margin-top:12px">للتواصل: <span data-contact>…</span></p>
      </div>
      <nav aria-label="روابط">
        <a href="/">الرئيسية</a>
        <a href="/ads.html">الإعلانات</a>
        <a href="/terms.html">شروط الاستخدام</a>
        <a href="/privacy.html">سياسة الخصوصية</a>
        <a href="/commission.html">سياسة العمولة</a>
        <a href="/delete-account.html">حذف الحساب</a>
      </nav>
      <p class="small">© سوق العز. التطبيق وسيط عرض، وليس طرفًا في البيع.</p>
    </div>
  </footer>
  <script>window.souqStoreButtons(); window.souqFillContact();</script>
</body>
</html>`;
}

function html(body, status, maxAge) {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': maxAge ? `public, max-age=${maxAge}` : 'no-store',
    },
  });
}

async function sitemap(env) {
  const cutoff = new Date(Date.now() - LIFETIME_DAYS * 86400000).toISOString();
  let rows = [];
  try {
    rows = await rest(
      env,
      `ads?select=id,bumped_at&status=eq.active&blocked_at=is.null&bumped_at=gt.${encodeURIComponent(cutoff)}&order=bumped_at.desc&limit=5000`,
    );
  } catch {
    return new Response('', { status: 503, headers: { 'Retry-After': '300' } });
  }
  const urls = rows
    .map((r) => `  <url><loc>${SITE}/ad/${r.id}</loc><lastmod>${new Date(r.bumped_at).toISOString()}</lastmod></url>`)
    .join('\n');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=1800' },
  });
}
