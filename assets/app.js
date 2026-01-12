import { getAll, get, put, del } from './idb.js';

/* ------------------------- Element refs ------------------------- */
const els = {
  // pages
  catalogPage: document.getElementById('catalogPage'),
  detailPage: document.getElementById('detailPage'),
  editPage: document.getElementById('editPage'),
  listsPage: document.getElementById('listsPage'),
  listDetailPage: document.getElementById('listDetailPage'),
  statsPage: document.getElementById('statsPage'),

  // global controls
  searchInput: document.getElementById('searchInput'),
  typeFilter: document.getElementById('typeFilter'),

  // catalog
  catalogGrid: document.getElementById('catalogGrid'),

  // detail
  detailBack: document.getElementById('detailBack'),
  detailEdit: document.getElementById('detailEdit'),
  detailDelete: document.getElementById('detailDelete'),
  detailBody: document.getElementById('detailBody'),
  detailListPicker: null,       // created dynamically
  detailAddToList: null,        // created dynamically

  // edit
  editBack: document.getElementById('editBack'),
  editSave: document.getElementById('editSave'),
  editDelete: document.getElementById('editDelete'),
  editForm: document.getElementById('editForm'),
  fTitle: document.getElementById('fTitle'),
  fYear: document.getElementById('fYear'),
  fGenre: document.getElementById('fGenre'),
  fType: document.getElementById('fType'),
  fFormat: document.getElementById('fFormat'),
  fRegion: document.getElementById('fRegion'),
  fRuntime: document.getElementById('fRuntime'),
  fAudio: document.getElementById('fAudio'),
  fHdr: document.getElementById('fHdr'),
  fLanguages: document.getElementById('fLanguages'),
  fSubtitles: document.getElementById('fSubtitles'),
  fEdition: document.getElementById('fEdition'),
  fDiscs: document.getElementById('fDiscs'),
  fBarcode: document.getElementById('fBarcode'),
  fPackaging: document.getElementById('fPackaging'),
  fPoster: document.getElementById('fPoster'),
  fNotes: document.getElementById('fNotes'),
  customFieldsList: document.getElementById('customFieldsList'),
  addCustomField: document.getElementById('addCustomField'),
  customKey: document.getElementById('customKey'),
  customValue: document.getElementById('customValue'),

  // lists
  listsBack: document.getElementById('listsBack'),
  createList: document.getElementById('createList'),
  listsContainer: document.getElementById('listsContainer'),

  // list detail
  listDetailBack: document.getElementById('listDetailBack'),
  listRename: document.getElementById('listRename'),
  listDelete: document.getElementById('listDelete'),
  listTitle: document.getElementById('listTitle'),
  listMeta: document.getElementById('listMeta'),
  listItems: document.getElementById('listItems'),
  listAddPicker: document.getElementById('listAddPicker'),

  // stats
  statsGrid: document.getElementById('statsGrid'),

  // popup
  popup: document.getElementById('popup'),
  popupMessage: document.getElementById('popupMessage'),
  popupOk: document.getElementById('popupOk'),
};

const state = {
  items: [],
  lists: [],
  filter: { q: '', type: '' },
  currentItemId: null,
  currentListId: null,
};

/* ------------------------- History tracking --------------------- */
const routeHistory = [];
function goBack() {
  routeHistory.pop(); // current
  const prev = routeHistory.pop(); // previous
  if (prev) {
    location.hash = prev;
  } else {
    location.hash = '#/';
  }
}

/* ------------------------- Popup helpers ------------------------ */

function inputPopup(message, onYes, onNo = () => {}) {
  const content = els.popup.querySelector('.popup-content');
  if (!content) return;

  content.innerHTML = `
    <p>${message}</p>
    <input type="text" id="popupInput" style="width:100%; margin-top:8px;" />
    <div style="display:flex; gap:8px; justify-content:flex-end; margin-top:12px;">
      <button class="btn primary" id="popupYes">Yes</button>
      <button class="btn" id="popupNo">No</button>
    </div>
  `;
  els.popup.classList.remove('hidden');

  const input = content.querySelector('#popupInput');
  const yesBtn = content.querySelector('#popupYes');
  const noBtn = content.querySelector('#popupNo');

  const cleanup = () => {
    els.popup.classList.add('hidden');
    content.innerHTML = `
      <p id="popupMessage"></p>
      <button class="btn" id="popupOk">OK</button>
    `;
    const ok = content.querySelector('#popupOk');
    ok?.addEventListener('click', () => els.popup.classList.add('hidden'));
  };

  yesBtn.addEventListener('click', async () => {
    const val = input.value.trim();
    if (val) await onYes(val);
    cleanup();
  });
  noBtn.addEventListener('click', () => {
    onNo();
    cleanup();
  });
}

function showPopup(msg) {
  els.popupMessage.textContent = msg;
  els.popup.classList.remove('hidden');
}
els.popupOk?.addEventListener('click', () => els.popup.classList.add('hidden'));

/**
 * Confirm popup with Yes/No buttons rendered dynamically.
 * Does not require HTML changes—buttons are injected per call.
 */
function confirmPopup(message, onYes, onNo = () => {}) {
  const content = els.popup.querySelector('.popup-content');
  if (!content) return;

  // Render message + Yes/No buttons
  content.innerHTML = `
    <p id="popupMessage">${message}</p>
    <div style="display:flex; gap:8px; justify-content:flex-end; margin-top:12px;">
      <button class="btn danger" id="popupYes">Yes</button>
      <button class="btn" id="popupNo">No</button>
    </div>
  `;
  els.popup.classList.remove('hidden');

  const yesBtn = content.querySelector('#popupYes');
  const noBtn = content.querySelector('#popupNo');

  const cleanup = () => {
    els.popup.classList.add('hidden');
    // Restore original content (OK button) for non-confirm popups
    content.innerHTML = `
      <p id="popupMessage"></p>
      <button class="btn" id="popupOk">OK</button>
    `;
    // Rebind default OK
    const ok = content.querySelector('#popupOk');
    ok?.addEventListener('click', () => els.popup.classList.add('hidden'));
  };

  yesBtn.addEventListener('click', async () => {
    try { await onYes(); } finally { cleanup(); }
  });
  noBtn.addEventListener('click', () => {
    try { onNo(); } finally { cleanup(); }
  });
}

/* ------------------------- Page switching ----------------------- */
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
}

/* ------------------------- Routing ------------------------------ */
function route() {
  const hash = location.hash || '#/';
  routeHistory.push(hash);

  if (hash.startsWith('#/item/')) {
    const id = Number(hash.split('/')[2]);
    openDetailPage(id);
  } else if (hash.startsWith('#/edit/')) {
    const id = Number(hash.split('/')[2]);
    openEditPage(id);
  } else if (hash.startsWith('#/new')) {
    openEditPage(null);
  } else if (hash.startsWith('#/lists/')) {
    const id = Number(hash.split('/')[2]);
    openListDetailPage(id);
  } else if (hash.startsWith('#/lists')) {
    openListsPage();
  } else if (hash.startsWith('#/stats')) {
    openStatsPage();
  } else {
    openCatalogPage();
  }
}

/* ------------------------- Data load ---------------------------- */
async function loadData() {
  state.items = await getAll('items');
  state.lists = await getAll('lists');

  // Seed example if empty
  if (state.items.length === 0) {
    await put('items', {
      title: 'The Dark Knight',
      year: 2008,
      genre: 'Action',
      type: 'Blu-ray',
      format: 'Blu-ray',
      region: 'A',
      runtime: '152 min',
      audio: 'DTS-HD MA',
      hdr: 'HDR10, Dolby Vision, HDR10+',
      languages: 'English',
      subtitles: 'English',
      edition: 'Standard',
      discs: 1,
      packaging: 'Slipcover',
      poster: 'https://image.tmdb.org/t/p/w342/1hRoyzDtpgMU7Dz4JF22RANzQO7.jpg',
      notes: '',
      custom: {}
    });
    state.items = await getAll('items');
  }
}

/* ------------------------- Catalog ------------------------------ */
function openCatalogPage() {
  showPage('catalogPage');
  renderCatalog();
}

function renderCatalog() {
  const q = state.filter.q.toLowerCase();
  const type = (state.filter.type || '').toLowerCase();
  const filtered = state.items.filter(i =>
    (!q || (i.title || '').toLowerCase().includes(q)) &&
    (!type || (i.type || '').toLowerCase().includes(type))
  );
  els.catalogGrid.innerHTML = filtered.map(item => `
    <div class="card" data-id="${item.id}">
      ${item.poster ? `<img src="${item.poster}" alt="${item.title}" />` : ''}
      <div class="pad">
        <strong>${item.title || '(Untitled)'} <span class="muted">${item.year || ''}</span></strong>
        <div class="muted">${item.type || item.format || ''}</div>
        <div class="muted">${[item.region, item.audio].filter(Boolean).join(' • ')}</div>
        <div class="muted">${item.runtime || ''}${item.genre ? ' • ' + item.genre : ''}</div>
      </div>
    </div>
  `).join('');
  Array.from(els.catalogGrid.querySelectorAll('.card')).forEach(card => {
    card.addEventListener('click', () => {
      location.hash = `#/item/${card.dataset.id}`;
    });
  });
}

/* ------------------------- Detail ------------------------------- */
function openDetailPage(id) {
  const item = state.items.find(i => i.id === id);
  if (!item) { location.hash = '#/'; return; }
  state.currentItemId = id;
  showPage('detailPage');

  els.detailBody.innerHTML = `
    <div class="detail-layout">
      ${item.poster ? `<img src="${item.poster}" alt="${item.title}" />` : ''}
      <div class="info">
        <h2>${item.title} <span class="muted">${item.year || ''}</span></h2>
        <p class="muted">${[item.type || item.format, item.region].filter(Boolean).join(' • ')}</p>
        <p class="muted">${[item.audio, item.runtime, item.genre].filter(Boolean).join(' • ')}</p>
        <div class="section">
          ${item.languages ? `<div><strong>Languages:</strong> ${item.languages}</div>` : ''}
          ${item.subtitles ? `<div><strong>Subtitles:</strong> ${item.subtitles}</div>` : ''}
          ${item.edition ? `<div><strong>Edition:</strong> ${item.edition}</div>` : ''}
          ${item.discs != null ? `<div><strong>Discs:</strong> ${item.discs}</div>` : ''}
          ${item.packaging ? `<div><strong>Packaging:</strong> ${item.packaging}</div>` : ''}
          ${item.hdr ? `<div><strong>HDR:</strong> ${item.hdr}</div>` : ''}
          ${item.barcode ? `<div><strong>Barcode:</strong> ${item.barcode}</div>` : ''}
          ${item.notes ? `<div><strong>Notes:</strong> ${item.notes}</div>` : ''}
        </div>
        ${renderCustomDetail(item.custom || {})}
        <div class="section">
          <label class="muted">Add to list</label>
          <select id="detailListPicker"></select>
          <button class="btn" id="detailAddToList">Add</button>
        </div>
      </div>
    </div>
  `;

  // Rebind dynamic refs
  els.detailListPicker = document.getElementById('detailListPicker');
  els.detailAddToList = document.getElementById('detailAddToList');

  populateListPicker();

  // Bind Add to list now that element exists
  els.detailAddToList?.addEventListener('click', async () => {
    const val = els.detailListPicker?.value;
    if (!val) return;
    let list;
    if (val === '__new') {
  inputPopup('Enter new list name:', async (name) => {
    const id = await put('lists', { name, itemIds: [] });
    state.lists = await getAll('lists');
    const list = state.lists.find(l => l.id === id);
    list.itemIds = Array.from(new Set([...(list.itemIds || []), state.currentItemId]));
    await put('lists', list);
    state.lists = await getAll('lists');
    populateListPicker();
    showPopup('Added to new list');
  });
  return; // stop here, handled by popup
} else {
      list = state.lists.find(l => l.id === Number(val));
    }
    list.itemIds = Array.from(new Set([...(list.itemIds || []), state.currentItemId]));
    await put('lists', list);
    state.lists = await getAll('lists');
    populateListPicker();
    showPopup('Added to list');
  });
}

function renderCustomDetail(custom) {
  const keys = Object.keys(custom || {});
  if (!keys.length) return '';
  return `
    <div class="section">
      <h3>Custom fields</h3>
      ${keys.map(k => `<div><strong>${k}:</strong> ${custom[k]}</div>`).join('')}
    </div>
  `;
}

function populateListPicker() {
  els.detailListPicker.innerHTML =
    `<option value="">-- Select list --</option>` +
    state.lists.map(l => `<option value="${l.id}">${l.name}</option>`).join('') +
    `<option value="__new">＋ New List</option>`;
}

/* ------------------------- Edit -------------------------------- */
function openEditPage(id = null) {
  showPage('editPage');
  const isEdit = !!id;
  els.editDelete.style.display = isEdit ? 'inline-block' : 'none';
  state.currentItemId = isEdit ? id : null;

  if (isEdit) {
    const item = state.items.find(i => i.id === id);
    if (!item) { goBack(); return; }
    fillEditForm(item);
  } else {
    // Fresh form for new item
    fillEditForm({
      title: '', year: '', genre: '', type: '',
      format: '', region: '', runtime: '', audio: '',
      hdr: '', languages: '', subtitles: '', edition: '',
      discs: '', barcode: '', packaging: '', poster: '', notes: '',
      custom: {}
    });
    // Clear transient custom inputs
    els.customFieldsList.innerHTML = '';
    els.customKey.value = '';
    els.customValue.value = '';
  }
}

function fillEditForm(item) {
  els.fTitle.value = item.title || '';
  els.fYear.value = item.year || '';
  els.fGenre.value = item.genre || '';
  els.fType.value = item.type || '';
  els.fFormat.value = item.format || '';
  els.fRegion.value = item.region || '';
  els.fRuntime.value = item.runtime || '';
  els.fAudio.value = item.audio || '';
  els.fHdr.value = item.hdr || '';
  els.fLanguages.value = item.languages || '';
  els.fSubtitles.value = item.subtitles || '';
  els.fEdition.value = item.edition || '';
  els.fDiscs.value = item.discs ?? '';
  els.fBarcode.value = item.barcode || '';
  els.fPackaging.value = item.packaging || '';
  els.fPoster.value = item.poster || '';
  els.fNotes.value = item.notes || '';
  els.customFieldsList.innerHTML = ''; // clear previous
  renderCustomEditor(item.custom || {});
}

function renderCustomEditor(custom = {}) {
  els.customFieldsList.innerHTML = Object.keys(custom).map(k => `
    <div class="row-inline">
      <input type="text" value="${k}" data-key />
      <input type="text" value="${custom[k]}" data-value />
      <button type="button" class="btn danger" data-remove>Remove</button>
    </div>
  `).join('');
  Array.from(els.customFieldsList.querySelectorAll('[data-remove]')).forEach(btn => {
    btn.addEventListener('click', () => btn.parentElement.remove());
  });
}

function collectCustomFromEditor() {
  const custom = {};
  Array.from(els.customFieldsList.querySelectorAll('.row-inline')).forEach(row => {
    const k = row.querySelector('[data-key]').value.trim();
    const v = row.querySelector('[data-value]').value.trim();
    if (k) custom[k] = v;
  });
  const pendingKey = els.customKey.value.trim();
  const pendingValue = els.customValue.value.trim();
  if (pendingKey || pendingValue) {
    custom[pendingKey || ''] = pendingValue;
  }
  return custom;
}

function addCustomFieldRow() {
  const key = els.customKey.value.trim();
  const value = els.customValue.value.trim();
  if (!key && !value) return;
  const row = document.createElement('div');
  row.className = 'row-inline';
  row.innerHTML = `
    <input type="text" value="${key}" data-key />
    <input type="text" value="${value}" data-value />
    <button type="button" class="btn danger" data-remove>Remove</button>
  `;
  row.querySelector('[data-remove]').addEventListener('click', () => row.remove());
  els.customFieldsList.appendChild(row);
  els.customKey.value = '';
  els.customValue.value = '';
}

/* ------------------------- Save/Delete -------------------------- */
async function saveItem(e) {
  if (e) e.preventDefault();
  els.editSave.classList.add('loading');
  try {
    const isEdit = !!state.currentItemId;
    const item = {
      ...(isEdit ? { id: state.currentItemId } : {}),
      title: els.fTitle.value.trim(),
      year: Number(els.fYear.value) || null,
      genre: els.fGenre.value.trim(),
      type: els.fType.value.trim(),
      format: els.fFormat.value.trim(),
      region: els.fRegion.value.trim(),
      runtime: els.fRuntime.value.trim(),
      audio: els.fAudio.value.trim(),
      hdr: els.fHdr.value.trim(),
      languages: els.fLanguages.value.trim(),
      subtitles: els.fSubtitles.value.trim(),
      edition: els.fEdition.value.trim(),
      discs: Number(els.fDiscs.value) || null,
      barcode: els.fBarcode.value.trim(),
      packaging: els.fPackaging.value.trim(),
      poster: els.fPoster.value.trim(),
      notes: els.fNotes.value.trim(),
      custom: collectCustomFromEditor()
    };

    const returnedId = await put('items', item);
    const finalId = isEdit ? state.currentItemId : returnedId;

    state.items = await getAll('items');
    state.currentItemId = finalId;

    // Navigate to detail of the saved item
    location.hash = `#/item/${finalId}`;

    // Clear transient custom inputs (UI hygiene)
    els.customFieldsList.innerHTML = '';
    els.customKey.value = '';
    els.customValue.value = '';
  } finally {
    els.editSave.classList.remove('loading');
  }
}

async function deleteItem() {
  if (!state.currentItemId) return;

  confirmPopup('Are you sure you want to delete this item?', async () => {
    await del('items', state.currentItemId);

    const lists = await getAll('lists');
    for (const l of lists) {
      l.itemIds = (l.itemIds || []).filter(x => x !== state.currentItemId);
      await put('lists', l);
    }

    state.items = await getAll('items');
    state.lists = await getAll('lists');

    // After delete, go back to previous route
    goBack();
  }, () => {
    // No-op on cancel
  });
}

/* ------------------------- Lists -------------------------------- */
function openListsPage() {
  showPage('listsPage');
  renderLists();
}

function renderLists() {
  els.listsContainer.innerHTML = state.lists.map(l => `
    <div class="list-card" data-id="${l.id}">
      <h3>${l.name}</h3>
      <p class="muted">${(l.itemIds || []).length} items</p>
      <div style="display:flex; gap:6px; flex-wrap:wrap;">
        ${(l.itemIds || []).slice(0, 6).map((id) => {
          const it = state.items.find((x) => x.id === id);
          return it ? `<img src="${it.poster || ''}" alt="" class="poster-mini" />` : '';
        }).join('')}
      </div>
    </div>
  `).join('');
  Array.from(els.listsContainer.querySelectorAll('.list-card')).forEach(card => {
    card.addEventListener('click', () => {
      location.hash = `#/lists/${card.dataset.id}`;
    });
  });
}

function openListDetailPage(id) {
  const list = state.lists.find(l => l.id === id);
  if (!list) { location.hash = '#/lists'; return; }
  state.currentListId = id;
  showPage('listDetailPage');
  els.listTitle.textContent = list.name;
  els.listMeta.textContent = `${(list.itemIds || []).length} items`;

  const items = (list.itemIds || []).map(id => state.items.find(i => i.id === id)).filter(Boolean);
  els.listItems.innerHTML = items.map(it => `
    <div class="card">
      ${it.poster ? `<img src="${it.poster}" alt="${it.title}" />` : ''}
      <div class="pad">
        <strong>${it.title} <span class="muted">${it.year || ''}</span></strong>
        <div class="muted">${it.type || it.format || ''}</div>
        <div class="muted">${[it.region, it.audio].filter(Boolean).join(' • ')}</div>
        <div class="muted">${it.runtime || ''}${it.genre ? ' • ' + it.genre : ''}</div>
        <div style="display:flex; gap:6px; margin-top:6px;">
          <button class="btn" onclick="location.hash='#/item/${it.id}'">Open</button>
          <button class="btn danger" data-remove-id="${it.id}">Remove</button>
        </div>
      </div>
    </div>
  `).join('');
  Array.from(els.listItems.querySelectorAll('[data-remove-id]')).forEach(btn => {
    btn.addEventListener('click', async () => {
      const removeId = Number(btn.dataset.removeId);
      list.itemIds = (list.itemIds || []).filter(x => x !== removeId);
      await put('lists', list);
      state.lists = await getAll('lists');
      openListDetailPage(id);
    });
  });

  const notInList = state.items.filter(i => !(list.itemIds || []).includes(i.id));
  els.listAddPicker.innerHTML = notInList.map(i => `
    <div class="card">
      ${i.poster ? `<img src="${i.poster}" alt="${i.title}" />` : ''}
      <div class="pad">
        <div style="display:flex; align-items:center; justify-content:space-between;">
          <div>
            <strong>${i.title} <span class="muted">${i.year || ''}</span></strong>
            <div class="muted">${i.type || i.format || ''}</div>
            <div class="muted">${i.runtime || ''}${i.genre ? ' • ' + i.genre : ''}</div>
          </div>
          <button class="btn" data-add-id="${i.id}">Add</button>
        </div>
      </div>
    </div>
  `).join('');
  Array.from(els.listAddPicker.querySelectorAll('[data-add-id]')).forEach(btn => {
    btn.addEventListener('click', async () => {
      const addId = Number(btn.dataset.addId);
      list.itemIds = list.itemIds || [];
      if (!list.itemIds.includes(addId)) list.itemIds.push(addId);
      await put('lists', list);
      state.lists = await getAll('lists');
      openListDetailPage(id);
    });
  });
}

async function createList() {
  const name = prompt('List name');
  if (!name) return;
  const list = { name, itemIds: [] };
  const id = await put('lists', list);
  state.lists = await getAll('lists');
  location.hash = `#/lists/${id}`;
}

async function renameList() {
  const list = state.lists.find(l => l.id === state.currentListId);
  if (!list) return;
  const name = prompt('New list name', list.name);
  if (!name) return;
  list.name = name;
  await put('lists', list);
  state.lists = await getAll('lists');
  openListDetailPage(list.id);
}

async function deleteList() {
  const id = state.currentListId;
  if (!id) return;

  confirmPopup('Delete this list?', async () => {
    await del('lists', id);
    state.lists = await getAll('lists');
    location.hash = '#/lists';
  });
}

/* ------------------------- Stats -------------------------------- */
function openStatsPage() {
  showPage('statsPage');
  const counts = {};
  state.items.forEach(i => {
    const t = i.type || i.format || 'Unknown';
    counts[t] = (counts[t] || 0) + 1;
  });
  els.statsGrid.innerHTML = Object.entries(counts).map(([type, count]) =>
    `<div class="list-card"><h3>${type}</h3><p class="muted">${count} items</p></div>`
  ).join('');
}

/* ------------------------- Events -------------------------------- */
function bindEvents() {
  window.addEventListener('hashchange', route);

  if (els.searchInput) {
    els.searchInput.addEventListener('input', (e) => {
      state.filter.q = e.target.value.trim().toLowerCase();
      renderCatalog();
    });
  }
  if (els.typeFilter) {
    els.typeFilter.addEventListener('input', (e) => {
      state.filter.type = e.target.value.trim();
      renderCatalog();
    });
  }

  // Detail header buttons
  els.detailBack?.addEventListener('click', goBack);
  els.detailEdit?.addEventListener('click', () => openEditPage(state.currentItemId));
  els.detailDelete?.addEventListener('click', deleteItem);
  // detailAddToList is bound inside openDetailPage()

  // Edit
  els.editBack?.addEventListener('click', goBack);

  // Ensure Save triggers form submit
  els.editSave?.addEventListener('click', (e) => {
    e.preventDefault();
    els.editForm?.requestSubmit();
  });
  els.editForm?.addEventListener('submit', saveItem);
  els.editDelete?.addEventListener('click', deleteItem);
  els.addCustomField?.addEventListener('click', addCustomFieldRow);

  // Lists
  els.listsBack?.addEventListener('click', goBack);
  els.createList?.addEventListener('click', createList);

  // List detail
  els.listDetailBack?.addEventListener('click', goBack);
  els.listRename?.addEventListener('click', renameList);
  els.listDelete?.addEventListener('click', deleteList);

  // ESC → back
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') goBack();
  });
}

/* ------------------------- CSV Import --------------------------- */
function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (!lines.length) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim());
    const obj = {};
    headers.forEach((h, i) => obj[h] = values[i]);
    return obj;
  });
}

/* ------------------------- Poster Lookup ------------------------- */
// Replace with your own TMDb API key
const TMDB_API_KEY = "YOUR_TMDB_API_KEY";

async function fetchPosterUrl(title, year) {
  if (!title) return "";
  try {
    const query = encodeURIComponent(title);
    const yearParam = year ? `&year=${year}` : "";
    const url = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${query}${yearParam}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.results && data.results.length > 0) {
      const posterPath = data.results[0].poster_path;
      return posterPath ? `https://image.tmdb.org/t/p/w342${posterPath}` : "";
    }
  } catch (err) {
    console.error("Poster lookup failed:", err);
  }
  return "";
}

async function mapCsvRow(row) {
  const title = row['Title'] || '';
  const year = row['Release date'] ? new Date(row['Release date']).getFullYear() : null;
  const posterUrl = await fetchPosterUrl(title, year);

  return {
    title,
    year,
    format: 'Blu-ray',
    type: 'Blu-ray',
    region: row['Country code'] || '',
    barcode: row['UPC'] || row['EAN'] || '',
    notes: row['Comment'] || '',
    poster: posterUrl,
    custom: {
      Studio: row['Studio'] || '',
      ASIN: row['ASIN'] || '',
      ReleaseDate: row['Release date'] || '',
      Slipcover: row['Slipcover'] || '',
      Casing: row['Casing'] || '',
      Memorabilia: row['Memorabilia'] || '',
      BluRayDiscs: row['Blu-ray discs'] || '',
      DvdDiscs: row['DVD discs'] || '',
      DigitalCopy: row['Digital copy'] || '',
      DateAdded: row['Date added'] || '',
      Watched: row['Watched'] || '',
      Retailer: row['Retailer'] || '',
      Price: row['Price'] || '',
      PriceComment: row['Price comment'] || ''
    }
  };
}

async function importCsvFile(file) {
  const text = await file.text();
  const rows = parseCsv(text);
  for (const row of rows) {
    const item = mapCsvRow(row);
    await put('items', item);
  }
  state.items = await getAll('items');
  renderCatalog();
  showPopup(`Imported ${rows.length} items from CSV`);
}


// CSV Import
const csvBtn = document.getElementById('importCsvBtn');
const csvInput = document.getElementById('csvFileInput');
if (csvBtn && csvInput) {
  csvBtn.addEventListener('click', async () => {
    if (!csvInput.files.length) {
      showPopup('Please select a CSV file first');
      return;
    }
    await importCsvFile(csvInput.files[0]);
  });
}
/* ------------------------- Init ---------------------------------- */
(async function init() {
  await loadData();
  bindEvents();
  route();
})();