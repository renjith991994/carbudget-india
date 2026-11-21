const assert = require('node:assert/strict');
const {readFileSync, readdirSync} = require('node:fs');
const {resolve} = require('node:path');
const {test} = require('node:test');
const vm = require('node:vm');

const root = resolve(__dirname, '..');
const html = readFileSync(resolve(root, 'index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const read = file => JSON.parse(readFileSync(resolve(root, file), 'utf8'));
const files = read('brands.json');
const rows = files.flatMap(read);
const tick = () => new Promise(setImmediate);
const response = data => ({ok: true, json: async () => data});

// Run the real page script with a small DOM and controllable JSON responses.
function page(fetch = async file => response(read(file))) {
  const nodes = new Map();
  function element() {
    return {
      innerHTML: '', textContent: '', children: [], attributes: {}, dataset: {}, hidden: false,
      style: {setProperty() {}},
      appendChild(child) { this.children.push(child); },
      setAttribute(name, value) { this.attributes[name] = value; },
      removeAttribute(name) { delete this.attributes[name]; },
      addEventListener() {},
      querySelector() { return this.closeButton ||= element(); },
      showModal() { this.open = true; },
      close() { this.open = false; }
    };
  }
  for (const [, id] of html.matchAll(/\bid="([^"]+)"/g)) nodes.set(id, element());
  const document = {
    getElementById(id) {
      if (id === 'clr' || id === 'retry') {
        if (!nodes.get('list').innerHTML.includes(`id="${id}"`)) return null;
        if (!nodes.has(id)) nodes.set(id, element());
      }
      return nodes.get(id);
    },
    createElement: element,
    querySelectorAll(selector) {
      if (selector === '#quick button') return nodes.get('quick').children;
      if (selector === '.chip') return [...nodes.values()].flatMap(n => n.children).filter(n => n.className === 'chip');
      throw new Error(`Unexpected selector: ${selector}`);
    }
  };
  const context = vm.createContext({document, fetch});
  vm.runInContext(script, context);
  return {nodes, run: code => vm.runInContext(code, context)};
}

test('the manifest lists every brand file once and rows retain the model schema', () => {
  assert.ok(files.length);
  assert.equal(new Set(files).size, files.length);
  assert.deepEqual([...files].sort(), readdirSync(root).filter(f => /^cars-.*\.json$/.test(f)).sort());
  const names = new Set();
  for (const file of files) {
    assert.match(file, /^cars-[a-z0-9-]+\.json$/);
    assert.ok(read(file).length);
    for (const car of read(file)) {
      assert.equal(car.length, 8);
      assert.equal(file, `cars-${car[0].split(' ')[0].toLowerCase()}.json`);
      assert.ok(!names.has(car[0]), `Duplicate model: ${car[0]}`);
      names.add(car[0]);
      assert.ok(Number.isFinite(car[1]) && car[1] > 0);
      assert.ok(['Hatchback', 'Sedan', 'SUV', 'MPV'].includes(car[2]));
      assert.ok(car[3].length && car[3].every(f => ['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid'].includes(f)));
      assert.ok([0, 1].includes(car[4]));
      assert.ok(Number.isInteger(car[5]) && car[5] > 0);
      assert.equal(typeof car[6], 'string');
      assert.ok(Array.isArray(car[7]) && car[7].every(f => typeof f === 'string'));
    }
  }
});

test('loading waits for every brand and retains order despite reversed responses', async () => {
  const pending = new Map();
  const p = page(file => file === 'brands.json' ? Promise.resolve(response(files)) : new Promise(done => pending.set(file, done)));
  await tick();
  assert.equal(p.nodes.get('count').textContent, 'Loading cars…');
  assert.equal(p.nodes.get('list').attributes['aria-busy'], 'true');
  pending.get(files[0])(response(read(files[0])));
  await tick();
  assert.equal(p.run('CARS.length'), 0, 'Never show a partial catalogue');
  for (const file of [...files].reverse().filter(f => f !== files[0])) pending.get(file)(response(read(file)));
  await tick();
  assert.equal(p.run('CARS.length'), rows.length);
  assert.equal(p.nodes.get('list').attributes['aria-busy'], undefined);
  assert.deepEqual(JSON.parse(p.run('JSON.stringify(CARS.filter(c=>c[1]===7.3).map(c=>c[0]))')), ['Tata Nexon', 'Hyundai Venue', 'Kia Sonet']);
  assert.deepEqual(JSON.parse(p.run('JSON.stringify(CARS.filter(c=>c[1]===14).map(c=>c[0]))')), ['Tata Harrier', 'Mahindra XUV700']);
});

test('budget input during loading is applied when the data arrives', async () => {
  let finish;
  const p = page(file => file === 'brands.json' ? new Promise(done => { finish = done; }) : Promise.resolve(response(read(file))));
  p.nodes.get('rng').oninput({target: {value: '15'}});
  assert.equal(p.nodes.get('big').innerHTML, '₹15<small>lakh</small>');
  finish(response(files));
  await tick();
  assert.equal(p.nodes.get('count').textContent, `${rows.filter(c => c[1] <= 15).length} cars fit ₹15 lakh`);
});

test('filters, sorting, on-road budget, near results and clear filters still work', async () => {
  const p = page();
  await tick();
  p.run("S.body.add('SUV');S.feat.add('ADAS');render()");
  assert.equal(p.nodes.get('count').textContent, '3 cars fit ₹10 lakh');
  assert.ok(p.nodes.get('list').innerHTML.includes('Mahindra XUV 3XO'));
  assert.ok(!p.nodes.get('list').innerHTML.includes('Tata Nexon'));
  assert.ok(p.nodes.get('near').innerHTML.includes('Hyundai Creta'));
  p.run("S.body.clear();S.feat.clear();S.sort='lo';render()");
  assert.ok(p.nodes.get('list').innerHTML.indexOf('Maruti Alto K10') < p.nodes.get('list').innerHTML.indexOf('Tata Tiago'));
  p.run('S.onroad=true;S.seven=true;render()');
  assert.equal(p.nodes.get('count').textContent, 'No cars fit ₹10 lakh');
  assert.ok(p.nodes.get('near').innerHTML.includes('Maruti Ertiga'));
  p.nodes.get('clr').onclick();
  assert.equal(p.run('S.seven'), false);
  assert.ok(p.nodes.get('list').innerHTML.includes('Maruti Alto K10'));
});

test('each loaded model opens the right details and manufacturer link', async () => {
  const p = page();
  await tick();
  for (let i = 0; i < rows.length; i++) {
    p.run(`openCar(${i})`);
    const dialog = p.nodes.get('dlg');
    assert.equal(dialog.open, true);
    assert.ok(dialog.innerHTML.includes(p.run(`CARS[${i}][0]`)));
    assert.ok(dialog.innerHTML.includes(p.run(`CARS[${i}][6]`)));
    assert.ok(dialog.innerHTML.includes(p.run(`SITE[CARS[${i}][0].split(' ')[0]][1]`)));
    dialog.closeButton.onclick();
    assert.equal(dialog.open, false);
  }
});

for (const failure of ['network', 'manifest HTTP', 'brand HTTP', 'invalid JSON', 'non-array JSON']) {
  test(`${failure} failure shows no partial catalogue and can be retried`, async () => {
    let failing = true;
    const p = page(async file => {
      if (failing) {
        if (failure === 'network') throw new Error('Offline');
        if (failure === 'manifest HTTP' && file === 'brands.json') return {ok: false};
        if (file === 'cars-tata.json') {
          if (failure === 'brand HTTP') return {ok: false};
          if (failure === 'invalid JSON') return {ok: true, json: async () => { throw new SyntaxError('Invalid JSON'); }};
          if (failure === 'non-array JSON') return response({});
        }
      }
      return response(read(file));
    });
    await tick();
    assert.equal(p.nodes.get('count').textContent, 'Cars could not be loaded');
    assert.equal(p.run('CARS.length'), 0);
    assert.equal(p.nodes.get('nearWrap').hidden, true);
    assert.ok(p.nodes.get('list').innerHTML.includes('Try again'));
    assert.equal(p.nodes.get('list').attributes['aria-busy'], undefined);
    failing = false;
    await p.nodes.get('retry').onclick();
    assert.equal(p.run('CARS.length'), rows.length);
    assert.equal(p.nodes.get('count').textContent, `${rows.filter(c => c[1] <= 10).length} cars fit ₹10 lakh`);
  });
}
