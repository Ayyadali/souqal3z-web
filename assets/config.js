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

// أزرار التحميل: آيفون ← App Store، أندرويد ← Google Play (أو «قريبًا» قبل نشره)، والكمبيوتر ← App Store
window.souqStoreButtons = function () {
  var ua = navigator.userAgent || '';
  var android = /android/i.test(ua);
  document.querySelectorAll('[data-store]').forEach(function (a) {
    if (android && !window.SOUQ.storeLive) {
      a.removeAttribute('href');
      a.setAttribute('aria-disabled', 'true');
      a.textContent = 'قريبًا على Google Play';
      return;
    }
    a.href = android ? window.SOUQ.storeUrl : window.SOUQ.iosUrl;
    a.target = '_blank';
    a.rel = 'noopener';
  });
};
