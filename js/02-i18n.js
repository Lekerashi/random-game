'use strict';

// ── Internationalization ──────────────────────────────────────────────────
let currentLang = store.get(LANG_KEY) || 'en';
if (currentLang === 'ja') document.documentElement.lang = 'ja';
function gc(path) { if (typeof goatcounter !== 'undefined') goatcounter.count({ path, title: path, event: true }); }

// Get display name for a line — Japanese when in JP mode
function lineDisplayName(englishName) {
  if (currentLang === 'ja' && LINE_NAMES_JA[englishName]) return LINE_NAMES_JA[englishName];
  return englishName;
}

// Line label for a platform: its displayName (through-service brand or
// shared-track combo, which carries its own JA label) or its line
function platformLineName(p) {
  if (currentLang === 'ja' && p.displayNameJa) return p.displayNameJa;
  return lineDisplayName(p.displayName || p.lineName);
}

function t(key, params) {
  let str = translations[currentLang]?.[key] || translations.en[key] || key;
  if (params) {
    // split/join: literal replacement ("$&" in a value stays as typed)
    for (const [k, v] of Object.entries(params)) str = str.split(`{${k}}`).join(String(v));
  }
  return str;
}

// Pluralization helper — returns '' or 's' based on n (only needed for EN)
function pl(n) { return currentLang === 'en' && n !== 1 ? 's' : ''; }

function applyLang() {
  // Static elements with data-i18n attribute
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.innerHTML = t(key);
  });
  // Placeholders
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
  });
  // Title attributes
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = t(el.getAttribute('data-i18n-title'));
  });
  // Arbitrary attribute translations: data-i18n-attr="data-show:key1;data-hide:key2"
  document.querySelectorAll('[data-i18n-attr]').forEach(el => {
    for (const pair of el.getAttribute('data-i18n-attr').split(';')) {
      const [attr, key] = pair.split(':');
      if (attr && key) el.setAttribute(attr, t(key));
    }
    // An open Advanced/License toggle keeps saying "Hide" after the switch
    if (el.dataset.action === 'toggle-advanced' && !el.nextElementSibling?.classList.contains('hidden')) {
      el.textContent = el.getAttribute('data-hide');
    }
  });
  // Page title
  document.title = t('pageTitle');
  // HTML lang
  document.getElementById('html-root').lang = currentLang === 'ja' ? 'ja' : 'en';
  // Update toggle buttons
  document.querySelectorAll('.lang-toggle button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === currentLang);
  });
}

function generateRNG() {
  const min = parseInt(document.getElementById('rng-min').value, 10) || 0;
  const max = parseInt(document.getElementById('rng-max').value, 10) || 0;
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  const result = Math.floor(Math.random() * (hi - lo + 1)) + lo;
  document.getElementById('rng-result').textContent = result;
}

// ── Language refresh registry ────────────────────────────────────────────
// Each entry re-renders one piece of dynamic text when the language changes.
// Entries are pushed (with a function name) right after the code that first
// renders the text, in whichever js/ file that is; switchLang() runs them in
// load order. Declared here so every later file can push at load time.
const _langRefreshers = [];

_langRefreshers.push(function refreshLocalizationCredit() {
  document.getElementById('localization-credit').style.display = currentLang === 'ja' ? 'block' : 'none';
});

function switchLang(lang) {
  if (lang === currentLang) return;
  currentLang = lang;
  store.set(LANG_KEY, lang);
  document.documentElement.lang = lang === 'ja' ? 'ja' : 'en';
  applyLang();
  for (const fn of _langRefreshers) fn();
}

function refreshPlatformGrid() {
  const extraDrinkNums = state.extraDrinkNums || 0;
  dom.platformGrid.innerHTML = state.platforms.map((p, i) =>
    p.drinkHere
      ? `<div class="platform-pill drink-here">
           <span class="platform-num">${extraDrinkNums > 0 ? `${i + 1}–${i + 1 + extraDrinkNums}` : i + 1}</span>
           <span>${eggEmoji(state.currentStation?.ja)}</span>
           <span>${t(eggLabelKey(state.currentStation?.ja))}</span>
         </div>`
      : p.takeFlight
      ? `<div class="platform-pill take-flight">
           <span class="platform-num">${i + 1}</span>
           <span>✈️</span>
           <span>${t('takeFlightLabel')}</span>
         </div>`
      : p.isShinkansen
      ? `<div class="platform-pill shinkansen">
           <span class="platform-num">${i + 1}</span>
           <span>🚅</span>
           <span>${t('shinkansenLabel')}<br><small class="text-muted">${platformHint(p)}</small></span>
         </div>`
      : `<div class="platform-pill">
           <span class="platform-num">${i + 1}</span>
           <span class="line-dot" style="background:${p.lineColor}"></span>
           <span>${platformLineName(p)}<br><small class="text-muted">${platformHint(p)}</small></span>
         </div>`
  ).join('');
}
