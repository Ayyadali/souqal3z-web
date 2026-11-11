// إعدادات الصفحات العامة — المفتاح العام نفسه المستخدم داخل التطبيق
window.SOUQ = {
  supabaseUrl: 'https://avbqkguasnpxbcmuqdtu.supabase.co',
  supabaseKey: 'sb_publishable_ICYdofxqMVO3qX7xTFs04w_6_vg0HQZ',
  scheme: 'souqal3z',
  androidPackage: 'com.souqal3z.app',
  storeUrl: 'https://play.google.com/store/apps/details?id=com.souqal3z.app',
  // اجعلها true بعد نشر التطبيق في Google Play
  storeLive: false,
  iosUrl: 'https://apps.apple.com/app/id6832979469',
};

window.souqFetch = async function (path) {
  const res = await fetch(window.SOUQ.supabaseUrl + '/rest/v1/' + path, {
    headers: { apikey: window.SOUQ.supabaseKey, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
};

// يضع بريد الدعم من إعدادات التطبيق في كل عنصر يحمل data-contact
window.souqFillContact = async function () {
  const slots = document.querySelectorAll('[data-contact]');
  if (!slots.length) return;
  try {
    const rows = await window.souqFetch('app_settings?select=support_email&id=eq.1');
    const email = rows[0] && rows[0].support_email;
    slots.forEach(function (el) {
      if (email) {
        const a = document.createElement('a');
        a.href = 'mailto:' + email;
        a.textContent = email;
        a.dir = 'ltr';
        el.replaceChildren(a);
      } else {
        el.textContent = 'صفحة "حسابي" في التطبيق';
      }
    });
  } catch (e) {
    slots.forEach(function (el) { el.textContent = 'صفحة "حسابي" في التطبيق'; });
  }
};

// أزرار التحميل: كل عنصر يحمل data-store يصير زرّين — «حمّل للآيفون» (App Store) و«أندرويد قريبًا»
// وبعد نشر Google Play (storeLive) يصير الثاني «حمّل للأندرويد»
window.souqStoreButtons = function () {
  var ICON_DL = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>';
  var ICON_SOON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
  document.querySelectorAll('[data-store]').forEach(function (a) {
    if (a.dataset.storeDone) return;
    var pair = document.createElement('span');
    pair.className = 'store-pair';
    var ios = a.cloneNode(false);
    ios.removeAttribute('data-store');
    ios.dataset.storeDone = '1';
    ios.href = window.SOUQ.iosUrl; ios.target = '_blank'; ios.rel = 'noopener';
    ios.innerHTML = ICON_DL + '<span>حمّل للآيفون</span>';
    var android = a.cloneNode(false);
    android.removeAttribute('data-store');
    android.dataset.storeDone = '1';
    if (window.SOUQ.storeLive) {
      android.href = window.SOUQ.storeUrl; android.target = '_blank'; android.rel = 'noopener';
      android.innerHTML = ICON_DL + '<span>حمّل للأندرويد</span>';
    } else {
      android.removeAttribute('href');
      android.setAttribute('aria-disabled', 'true');
      android.classList.add('soon');
      android.innerHTML = ICON_SOON + '<span>أندرويد قريبًا</span>';
    }
    pair.appendChild(ios); pair.appendChild(android);
    a.replaceWith(pair);
  });
};
