import { ack, fetchIncidents } from './api.js';

const REFRESH_MS = 2000; // R4

const board = document.querySelector('[data-testid="board"]');
const list = document.querySelector('[data-testid="incident-list"]');
const loader = document.querySelector('[data-testid="loader"]');
const empty = document.querySelector('[data-testid="empty"]');
const status = document.querySelector('.status');
const panel = document.querySelector('[data-testid="incident-panel"]');
const panelAck = panel.querySelector('[data-testid="panel-ack"]');

const known = new Map(); // id -> incident, everything seen tonight
const acked = new Set();
let selected = null; // the incident the panel names; new incidents never change it

// R5: the viewer's own zone and the viewer's own order (dd/mm in EU locales, mm/dd in en-US).
const timeFormat = new Intl.DateTimeFormat(undefined, {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

const text = (tag, cls, value) => {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  el.textContent = value; // never innerHTML: incident text comes from outside
  return el;
};

const ackedMark = () => {
  const mark = text('span', 'acked', '✓ acked');
  mark.dataset.testid = 'acked';
  return mark;
};

// R2 (product, after step 1): a row has no Ack. Picking a row opens its incident panel; Ack lives there.
function rowFor(i) {
  const li = document.createElement('li');
  li.dataset.testid = 'incident-row';
  li.dataset.id = i.id;
  li.className = `row ${i.severity}`;
  li.tabIndex = 0;
  li.setAttribute('role', 'button');
  li.setAttribute('aria-label', `Open ${i.id}`);
  li.append(text('span', 'id', i.id), text('span', 'sev', i.severity), text('span', 'what', `${i.service} · ${i.region} · ${i.summary}`));
  const time = text('time', '', timeFormat.format(new Date(i.openedAt)));
  time.dateTime = i.openedAt; // full UTC value stays machine-readable
  time.title = i.openedAt;
  li.append(time, acked.has(i.id) ? ackedMark() : text('span', 'state', 'open'));
  li.addEventListener('click', () => openPanel(i.id));
  li.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openPanel(i.id);
    }
  });
  return li;
}

function openPanel(id) {
  selected = id;
  for (const li of list.children) li.classList.toggle('selected', li.dataset.id === id);
  renderPanel();
  panel.hidden = false;
}

function renderPanel() {
  const i = known.get(selected);
  if (!i) return;
  panel.querySelector('.panel-id').textContent = i.id;
  panel.querySelector('.panel-what').textContent = `${i.service} · ${i.region} · ${i.summary}`;
  panel.querySelector('.panel-sev').textContent = i.severity;
  const time = panel.querySelector('.panel-time');
  time.dateTime = i.openedAt;
  time.textContent = timeFormat.format(new Date(i.openedAt));
  const done = acked.has(i.id);
  panel.querySelector('.panel-state').textContent = done ? '✓ acked' : 'open';
  panelAck.disabled = done;
  panelAck.textContent = done ? `${i.id} acked` : `Ack ${i.id}`;
}

panelAck.addEventListener('click', async () => {
  const id = selected; // the incident the panel names at click time, whatever moved in the list
  if (!id || acked.has(id)) return;
  panelAck.disabled = true;
  panelAck.textContent = `Acking ${id}…`;
  try {
    await ack(id);
    acked.add(id);
    const row = list.querySelector(`[data-testid="incident-row"][data-id="${CSS.escape(id)}"]`);
    row?.querySelector('.state')?.replaceWith(ackedMark());
    showStatus('');
  } catch (err) {
    showStatus(`Ack failed for ${id}: ${err.message}. Try again.`);
  }
  if (selected === id) renderPanel();
});

panel.querySelector('.panel-close').addEventListener('click', () => {
  selected = null;
  panel.hidden = true;
  for (const li of list.children) li.classList.remove('selected');
});

// R1: add only what is new, each at its place by openedAt, newest first. Rows already on screen stay
// as they are (never removed or rebuilt), so acked marks and the open panel survive every refresh.
function merge(incidents) {
  for (const i of incidents) {
    if (known.has(i.id)) continue;
    known.set(i.id, i);
    const row = rowFor(i);
    const at = Date.parse(i.openedAt);
    const after = [...list.children].find((li) => Date.parse(known.get(li.dataset.id).openedAt) < at);
    list.insertBefore(row, after ?? null);
  }
  empty.hidden = known.size > 0;
}

function showStatus(message) {
  status.textContent = message;
  status.hidden = !message;
}

let first = true;
async function refresh() {
  try {
    const page = await fetchIncidents();
    merge(page.incidents ?? []);
    if (!status.textContent.startsWith('Ack failed')) showStatus('');
    if (first) {
      first = false;
      loader.remove(); // R3: gone once incidents are on screen
      list.hidden = false;
      board.setAttribute('aria-busy', 'false');
    }
  } catch (err) {
    showStatus(`Could not reach the incident API (${err.message}). Retrying…`);
  } finally {
    setTimeout(refresh, REFRESH_MS); // one request at a time, never overlapping
  }
}

refresh();
