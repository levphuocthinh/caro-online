/**
 * Tier 1 - Feature Coverage: Dynamic UI Localization Parity (Feature 14)
 * Covers:
 *   - 5 Locales: Vietnamese (vi), English (en), Japanese (ja), Korean (ko), Chinese (zh)
 *   - SVG flags and localized language display names
 *   - 100% Dictionary Key Parity across all 5 languages
 *   - Template parameter interpolation in getText(key, { ... })
 *   - CustomEvent 'caro:languageChanged' dispatching
 */

const {
  describe,
  test,
  assert,
  assertEqual,
  assertNotEqual,
  assertTruthy,
  setupDomMock,
  teardownDomMock
} = require('../harness');

let i18nModule;

async function getI18n() {
  if (!i18nModule) {
    setupDomMock();
    i18nModule = await import('../../public/js/modules/i18n.js');
  }
  return i18nModule;
}

describe('Feature 14: Localization Engine & Metadata', () => {
  test('Supports all 5 required languages with flags and names', async () => {
    const { svgFlags, langNames, translations } = await getI18n();
    const requiredLangs = ['vi', 'en', 'ja', 'ko', 'zh'];

    for (const lang of requiredLangs) {
      assertTruthy(svgFlags[lang], `SVG flag must exist for locale "${lang}"`);
      assert(svgFlags[lang].includes('<svg'), `Flag for "${lang}" must be valid SVG markup`);
      assertTruthy(langNames[lang], `Display name must exist for locale "${lang}"`);
      assertTruthy(translations[lang], `Translation dictionary must exist for locale "${lang}"`);
    }
  });

  test('100% translation key parity across all 5 languages', async () => {
    const { translations } = await getI18n();
    const viKeys = Object.keys(translations.vi).sort();
    assert(viKeys.length > 50, `Expected at least 50 translation keys, found ${viKeys.length}`);

    const otherLangs = ['en', 'ja', 'ko', 'zh'];
    for (const lang of otherLangs) {
      const targetDict = translations[lang];
      const missingKeys = viKeys.filter(k => targetDict[k] === undefined || targetDict[k] === '');
      assertEqual(
        missingKeys.length,
        0,
        `Language "${lang}" has missing or empty keys: [${missingKeys.slice(0, 5).join(', ')}${missingKeys.length > 5 ? '...' : ''}]`
      );
    }
  });

  test('Template string interpolation works for dynamic parameters', async () => {
    const { i18n } = await getI18n();
    i18n.setLanguage('vi');
    const viText = i18n.getText('player_bot_ai', { diff: 'Cao Thủ' });
    assertEqual(viText, 'Bé Bot AI (Cao Thủ)');

    i18n.setLanguage('en');
    const enText = i18n.getText('player_bot_ai', { diff: 'Hard' });
    assertEqual(enText, 'Bot AI (Hard)');

    i18n.setLanguage('ja');
    const jaText = i18n.getText('player_bot_ai', { diff: '達人' });
    assertEqual(jaText, 'AIボット (達人)');

    i18n.setLanguage('ko');
    const koText = i18n.getText('player_bot_ai', { diff: '고수' });
    assertEqual(koText, 'AI 봇 (고수)');

    i18n.setLanguage('zh');
    const zhText = i18n.getText('player_bot_ai', { diff: '高手' });
    assertEqual(zhText, 'AI机器人 (高手)');
  });

  test('Switching language persists to localStorage and dispatches event', async () => {
    const { i18n } = await getI18n();
    let eventReceived = null;

    globalThis.window.addEventListener('caro:languageChanged', (e) => {
      eventReceived = e.detail;
    });

    i18n.setLanguage('en');
    assertEqual(i18n.currentLang, 'en');
    assertEqual(globalThis.localStorage.getItem('caro_lang'), 'en');
    assertTruthy(eventReceived, 'caro:languageChanged event must fire');
    assertEqual(eventReceived.lang, 'en');
    assertTruthy(eventReceived.dict);
  });
});
