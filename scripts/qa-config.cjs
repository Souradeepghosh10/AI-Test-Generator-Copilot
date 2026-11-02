// The app under test, from qa.config.json at the project root. Every tool reads it from here: web-tests and
// mobile-tests configs, both act.mjs and preflight.mjs. Environment variables override it (handy in CI):
//   QA_WEB_URL, QA_WEB_START, QA_PLATFORM (android | ios), QA_APP_ID, QA_APP_FILE, QA_APP_BUILD
// CommonJS on purpose: the TypeScript configs and the .mjs scripts can all import it.
const { existsSync, readFileSync } = require('node:fs');
const { join, resolve } = require('node:path');

const root = resolve(__dirname, '..');
const file = join(root, 'qa.config.json');
const json = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
const web = json.web || {};
const mobile = json.mobile || {};
const env = process.env;
const appFile = env.QA_APP_FILE || mobile.appFile;

module.exports = {
  root,
  web: {
    // the default page for test cases without a URL
    url: env.QA_WEB_URL || web.url || '',
    // starts the app locally when its URL cannot be reached (empty: the app is already online)
    startCommand: env.QA_WEB_START ?? web.startCommand ?? '',
    testIdAttribute: web.testIdAttribute || 'data-testid',
  },
  mobile: {
    platform: (env.QA_PLATFORM || mobile.platform || 'android').toLowerCase(),
    // Android package name or iOS bundle id, for test cases without an App: field
    appId: env.QA_APP_ID || mobile.appId || '',
    // the .apk / .app / .ipa installed before the tests (absolute path; empty: the app is already installed)
    appFile: appFile ? resolve(root, appFile) : '',
    // builds appFile when it is missing (empty: it must exist)
    buildCommand: env.QA_APP_BUILD ?? mobile.buildCommand ?? '',
  },
};
