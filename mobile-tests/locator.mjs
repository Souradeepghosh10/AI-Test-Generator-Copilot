// Prints the real Mobilewright locator of elements on the device's current screen, without acting on them
// (act.mjs does the same while it taps and types: prefer it when exploring). Every locator is also added to locators.log.
//
//   node mobile-tests/locator.mjs "Email" "Sign in" "Welcome, Demo User"     (add --ios for iOS, --device=<id> for a device)
//
// Each argument is an element's text, label or resource id. Every element that matches is printed with its type:
//   Sign in (TextView): screen.getByText('Sign in').first()
//   Sign in (Button): screen.getByRole('button', { name: 'Sign in' })
import { connect, findNodes, locatorFor, logLocators, snapshot, typeName } from './lib/screen-tools.mjs';

const args = process.argv.slice(2);
const queries = args.filter((a) => !a.startsWith('--'));
if (queries.length === 0) {
  console.error('Usage: node mobile-tests/locator.mjs [--ios] [--device=<id>] "<text, label or resource id>" ...');
  process.exit(2);
}

const device = await connect(args);
let failed = false;
try {
  const { tree, nodes } = await snapshot(device.screen);
  for (const query of queries) {
    const matches = findNodes(nodes, query);
    if (matches.length === 0) {
      console.log(`${query}: NOT FOUND on the current screen`);
      failed = true;
    }
    for (const node of matches) {
      const found = locatorFor(device.screen, tree, node);
      if (found) logLocators([found.code]);
      else failed = true;
      console.log(`${query} (${typeName(node)}): ${found ? found.code : 'NO LOCATOR FOUND'}`);
    }
  }
} finally {
  await device.close();
}
process.exit(failed ? 1 : 0);
