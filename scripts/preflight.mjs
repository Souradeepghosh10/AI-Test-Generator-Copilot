// Gets everything ready before the agents explore and run tests, the way a QA engineer would before starting:
//
//   node scripts/preflight.mjs web [<app url>]    web-tests installed (with Chromium), and the app reachable (no URL:
//                                                 web.url in qa.config.json; started with web.startCommand if it is
//                                                 that app and not running)
//   node scripts/preflight.mjs mobile [--ios|--android]  mobile-tests installed, a phone running (the first Android
//                                                 emulator is started if none is), and the app file present (built
//                                                 with mobile.buildCommand if it is missing)
//
// The app under test is set in qa.config.json (see scripts/qa-config.cjs).
// Prints one "READY:" line per thing that is ready, and "PROBLEM:" lines (exit code 1) for what a person must fix.
import { execFileSync, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import qa from './qa-config.cjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [platform, ...rest] = process.argv.slice(2);
const problems = [];

const ready = (message) => console.log(`READY: ${message}`);
const problem = (message) => {
  console.log(`PROBLEM: ${message}`);
  problems.push(message);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { cwd: ROOT, encoding: 'utf8', stdio: 'pipe', ...opts });

/** Starts a long-running program on its own, so it keeps running after this script ends. */
function startInBackground(cmd, args) {
  spawn(cmd, args, { cwd: ROOT, detached: true, stdio: 'ignore' }).unref();
}

function installPackages(folder, extra) {
  if (existsSync(join(ROOT, folder, 'node_modules'))) return ready(`${folder} packages installed`);
  try {
    run('npm', ['install', '--no-audit', '--no-fund'], { cwd: join(ROOT, folder) });
    if (extra) extra();
    ready(`${folder} packages installed (just now)`);
  } catch (error) {
    problem(`could not install ${folder} packages: ${String(error.stderr || error.message).split('\n')[0]}`);
  }
}

async function reachable(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
    return response.status < 500;
  } catch {
    return false;
  }
}

async function web() {
  const url = rest.find((a) => !a.startsWith('--')) || qa.web.url;
  installPackages('web-tests', () => run('npx', ['playwright', 'install', 'chromium'], { cwd: join(ROOT, 'web-tests') }));
  if (!url) return problem('no app URL: give it (node scripts/preflight.mjs web <url>) or set web.url in qa.config.json');

  if (await reachable(url)) return ready(`${url} is reachable`);
  // Only the configured app can be started here, and only if qa.config.json says how
  const sameApp = qa.web.url && new URL(url).origin === new URL(qa.web.url).origin;
  if (!sameApp || !qa.web.startCommand) {
    return problem(`${url} cannot be reached: start the app, check the URL in the test case, or set web.startCommand ` +
      'in qa.config.json');
  }
  spawn(qa.web.startCommand, { cwd: ROOT, detached: true, stdio: 'ignore', shell: true }).unref();
  for (let i = 0; i < 120 && !(await reachable(url)); i++) await sleep(500);
  if (await reachable(url)) ready(`the app is running at ${url} (just started: ${qa.web.startCommand})`);
  else problem(`the app did not start within a minute (${qa.web.startCommand})`);
}

async function mobile() {
  installPackages('mobile-tests');
  const ios = rest.includes('--ios') || (!rest.includes('--android') && qa.mobile.platform === 'ios');
  if (ios) {
    iosSimulator();
    return appBuild();
  }

  const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || join(homedir(), 'Library/Android/sdk');
  const adb = join(sdk, 'platform-tools/adb');
  const emulator = join(sdk, 'emulator/emulator');
  if (!existsSync(adb)) return problem(`the Android SDK was not found (set ANDROID_HOME); looked in ${sdk}`);

  const devices = () => run(adb, ['devices']).split('\n').slice(1).filter((l) => /\tdevice$/.test(l)).map((l) => l.split('\t')[0]);
  const booted = (id) => {
    try {
      return run(adb, ['-s', id, 'shell', 'getprop', 'sys.boot_completed']).trim() === '1';
    } catch {
      return false;
    }
  };

  let online = devices().filter(booted);
  if (online.length) {
    ready(`Android device running: ${online.join(', ')}`);
  } else {
    const avds = existsSync(emulator) ? run(emulator, ['-list-avds']).split('\n').map((l) => l.trim()).filter(Boolean) : [];
    const avd = process.env.ANDROID_AVD_NAME || avds[0];
    if (!avd) return problem('no Android device is running and no emulator is set up (create one in Android Studio > Device Manager)');
    console.log(`Starting the Android emulator ${avd} (this can take a minute or two)...`);
    startInBackground(emulator, ['-avd', avd, '-no-snapshot-save', '-no-boot-anim']);
    for (let i = 0; i < 90 && !online.length; i++) {
      await sleep(2000);
      online = devices().filter(booted);
    }
    if (!online.length) return problem(`the emulator ${avd} did not finish starting within 3 minutes`);
    ready(`Android emulator ${avd} running (just started): ${online.join(', ')}`);
  }
  appBuild();
}

function iosSimulator() {
  try {
    const booted = run('xcrun', ['simctl', 'list', 'devices', 'booted']);
    if (/\(Booted\)/.test(booted)) ready('iOS simulator running');
    else problem('no iOS simulator is running: open Xcode > Simulator first');
  } catch {
    problem('Xcode is not installed, so iOS simulators cannot run');
  }
}

/** The app file the config installs (mobile.appFile): built with mobile.buildCommand if it is missing. */
function appBuild() {
  if (!qa.mobile.appId) problem('no app id: set mobile.appId in qa.config.json (or give each test case an App: field)');
  const file = qa.mobile.appFile;
  if (!file) return ready('no app file to install (mobile.appFile is empty): the app must already be on the device');
  if (existsSync(file)) return ready(`app file present: ${file}`);
  if (!qa.mobile.buildCommand) return problem(`the app file ${file} is missing: build or download it, or set mobile.buildCommand in qa.config.json`);
  try {
    run(qa.mobile.buildCommand, [], { shell: true });
    if (!existsSync(file)) return problem(`${qa.mobile.buildCommand} ran but ${file} is still missing`);
    ready(`the app was built (just now): ${file}`);
  } catch (error) {
    problem(`could not build the app (${qa.mobile.buildCommand}): ${String(error.stderr || error.message).split('\n').filter(Boolean).pop()}`);
  }
}

if (platform === 'web') await web();
else if (platform === 'mobile') await mobile();
else {
  console.log('Usage: node scripts/preflight.mjs web [<app url>] | mobile [--ios | --android]');
  process.exit(2);
}
process.exit(problems.length ? 1 : 0);
