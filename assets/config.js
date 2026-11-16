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

// أزرار التحميل: كل عنصر يحمل data-store يصير شارتين بشكل المتاجر المعروف (App Store و Google Play)
// Google Play تظهر «قريبًا» لين نخلي storeLive = true
window.souqStoreButtons = function () {
  var APPLE = '<svg class="sb-logo" viewBox="0 0 24 24" aria-hidden="true"><path fill="#fff" d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/></svg>';
  var PLAY = '<svg class="sb-logo" viewBox="0 0 24 24" aria-hidden="true">' +
    '<path fill="#00A0FF" d="M1.337.924a1.486 1.486 0 0 0-.112.568v21.017c0 .217.045.419.124.6l11.155-11.087L1.337.924z"/>' +
    '<path fill="#00F076" d="M13.544 10.989l3.258-3.238L3.45.195a1.466 1.466 0 0 0-.946-.179l11.04 10.973z"/>' +
    '<path fill="#FFD400" d="M22.018 13.298l-3.919 2.218-3.515-3.493 3.543-3.521 3.891 2.202a1.49 1.49 0 0 1 0 2.594z"/>' +
    '<path fill="#FF3A44" d="M13.544 13.056l-11 10.933c.298.036.612-.016.906-.183l13.324-7.54-3.23-3.21z"/></svg>';
  function badge(small, logo, top, name, href, label) {
    var a = document.createElement('a');
    a.className = 'store-badge' + (small ? ' sm' : '');
    a.dir = 'ltr';
    a.dataset.storeDone = '1';
    a.setAttribute('aria-label', label);
    if (href) { a.href = href; a.target = '_blank'; a.rel = 'noopener'; }
    else { a.setAttribute('aria-disabled', 'true'); a.classList.add('soon'); }
    a.innerHTML = logo + '<span class="sb-text"><span class="sb-top">' + top + '</span><span class="sb-name">' + name + '</span></span>' +
      (href ? '' : '<span class="sb-soon" dir="rtl">قريبًا</span>');
    return a;
  }
  document.querySelectorAll('[data-store]').forEach(function (a) {
    if (a.dataset.storeDone) return;
    var small = a.classList.contains('sm');
    var pair = document.createElement('span');
    pair.className = 'store-pair';
    pair.appendChild(badge(small, APPLE, 'Download on the', 'App Store', window.SOUQ.iosUrl, 'حمّل سوق العز من App Store للآيفون'));
    pair.appendChild(badge(small, PLAY, 'GET IT ON', 'Google Play', window.SOUQ.storeLive ? window.SOUQ.storeUrl : null,
      window.SOUQ.storeLive ? 'حمّل سوق العز من Google Play للأندرويد' : 'نسخة الأندرويد قريبًا على Google Play'));
    a.replaceWith(pair);
  });
};
