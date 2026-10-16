// Every console message + page error while loading a view: node tools/console.mjs [view=1] [t=0]
import { launch, open, go } from './chrome.mjs';
const [view = '1', t = '0'] = process.argv.slice(2);
const browser = await launch();
try {
  const page = await open(browser, { view, t });
  page.on('console', m => console.log(m.type(), m.text().slice(0, 1500)));
  await go(page, view, Number(t));
  console.log(page.__errs.length ? page.__errs.join('\n') : 'no errors');
} catch (e) { console.log(e.message); }
await browser.close();
