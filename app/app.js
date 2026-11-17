import { ack, fetchIncidents } from './api.js';

const REFRESH_MS = 2000; // R4

const board = document.querySelector('[data-testid="board"]');
const list = document.querySelector('[data-testid="incident-list"]');
const loader = document.querySelector('[data-testid="loader"]');
const empty = document.querySelector('[data-testid="empty"]');
const status = document.querySelector('.status');

const known = new Map(); // id -> incident, everything seen tonight
const acked = new Set();

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

function rowFor(i) {
  const li = document.createElement('li');
  li.dataset.testid = 'incident-row';
  li.dataset.id = i.id;
  li.className = `row ${i.severity}`;
  li.append(text('span', 'id', i.id), text('span', 'sev', i.severity), text('span', 'what', `${i.service} · ${i.region} · ${i.summary}`));
  const time = text('time', '', timeFormat.format(new Date(i.openedAt)));
  time.dateTime = i.openedAt; // full UTC value stays machine-readable
  time.title = i.openedAt;
  li.append(time, actionFor(i.id));
  return li;
}

function actionFor(id) {
  if (acked.has(id)) {
    const mark = text('span', 'acked', '✓ acked');
    mark.dataset.testid = 'acked';
    return mark;
  }
  const button = text('button', 'ack', 'Ack');
  button.type = 'button';
  button.dataset.testid = 'ack';
  button.addEventListener('click', () => onAck(id, button));
  return button;
}

async function onAck(id, button) {
  button.disabled = true;
  button.textContent = 'Acking…';
  try {
    await ack(id); // R2
    acked.add(id);
    const mark = text('span', 'acked', '✓ acked');
    mark.dataset.testid = 'acked';
    button.replaceWith(mark);
  } catch (err) {
    button.disabled = false;
    button.textContent = 'Ack';
    showStatus(`Ack failed for ${id}: ${err.message}. Try again.`);
  }
}

// R1: add only what is new, each at its place by openedAt, newest first. Rows already on screen stay
// as they are, so an Ack in flight and an acked mark survive every refresh.
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
    showStatus('');
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
