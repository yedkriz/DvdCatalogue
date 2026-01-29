import { getAll, get, put, del } from './idb.js';

// Remove before Final 
(function assertPopup() {
  const popup = document.getElementById('popup');
  const content = popup?.querySelector('.popup-content');
  if (!popup || !content) {
    console.error('Popup container or .popup-content missing.');
  }
})();
// Remove here
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
  actions: document.getElementById('actions'),
  searchInput: document.getElementById('searchInput'),
  typeFilter: document.getElementById('typeFilter'),
  typeSuggestions: document.getElementById('typeSuggestions'),

  // catalog
  catalogGrid: document.getElementById('catalogGrid'),

  // nav buttons (add these!)
  homeBtn: document.getElementById('homeBtn'),
  listsBtn: document.getElementById('listsBtn'),
  addBtn: document.getElementById('addBtn'),
  statsBtn: document.getElementById('statsBtn'),

  // detail
  detailBack: document.getElementById('detailBack'),
  detailEdit: document.getElementById('detailEdit'),
  detailDelete: document.getElementById('detailDelete'),
  detailBody: document.getElementById('detailBody'),
  detailListPicker: null,
  detailAddToList: null,

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
  listSearchInput: document.getElementById('listSearchInput'),
  listTypeFilter: document.getElementById('listTypeFilter'),
  listTypeSuggestions: document.getElementById('listTypeSuggestions'),
  listAddPicker: document.getElementById('listAddPicker'),
  listDetailBack: document.getElementById('listDetailBack'),
  listRename: document.getElementById('listRename'),
  listDelete: document.getElementById('listDelete'),
  listTitle: document.getElementById('listTitle'),
  listMeta: document.getElementById('listMeta'),
  listItems: document.getElementById('listItems'),


  // stats
  statsGrid: document.getElementById('statsGrid'),

  // popup
  popup: document.getElementById('popup'),
  popupMessage: document.getElementById('popupMessage'),
  popupOk: document.getElementById('popupOk'),

  // Delete selected button
  deleteSelectedBtn: document.getElementById('deleteSelectedBtn'),

  // CSV import controls
  csvFileInput: document.getElementById('csvFileInput'),
  importCsvBtn: document.getElementById('importCsvBtn'),
  fileName: document.getElementById('fileName')
};

const state = {
  items: [],
  lists: [],
  
  // separate filters
  catalogFilter: { q: '', type: '' },   // used only in catalog/home
  listFilter: { q: '', type: '' },      // used only in list detail
  statsFilter: { q: '', type: '' }, 

  currentItemId: null,
  currentListId: null,

  // Additions for selection mode
  selectionMode: false,
  selectedIds: new Set(),
  lastClickedId: null
};

/* ------------------------- Popup helpers ------------------------ */

function showPopup(msg) {
  const popup = document.getElementById('popup');
  const content = popup?.querySelector('.popup-content');
  if (!popup || !content) return;

  content.innerHTML = `
    <p id="popupMessage">${msg}</p>
    <button class="btn" id="popupOk">OK</button>
  `;
  popup.classList.remove('hidden');
  popup.style.opacity = '1';
  popup.style.pointerEvents = 'auto';
  popup.style.zIndex = '9999';

  const ok = content.querySelector('#popupOk');
  ok?.addEventListener('click', () => popup.classList.add('hidden'));
}

function inputPopup(message, onYes, onNo = null, successMsg = '') {
  const popup = document.getElementById('popup');
  const content = popup?.querySelector('.popup-content');
  if (!popup || !content) return;

  content.innerHTML = `
    <p>${message}</p>
    <input type="text" id="popupInput" style="width:100%; margin-top:8px;" />
    <div id="popupWarning" class="muted" style="color:red; margin-top:4px;"></div>
    <div style="display:flex; gap:8px; justify-content:flex-end; margin-top:12px;">
      <button class="btn primary" id="popupYes">Yes</button>
      <button class="btn" id="popupNo">No</button>
    </div>
  `;
  popup.classList.remove('hidden');

  const input = content.querySelector('#popupInput');
  const warning = content.querySelector('#popupWarning');
  const yesBtn = content.querySelector('#popupYes');
  const noBtn = content.querySelector('#popupNo');

  yesBtn.addEventListener('click', async () => {
    const val = input.value.trim();
    if (!val) {
      warning.textContent = 'Please enter a name';
      return; // ✅ keep popup open
    }
    await onYes(val);
    popup.classList.add('hidden');
    if (successMsg) showPopup(successMsg.replace('{name}', val));
  });

  noBtn.addEventListener('click', () => {
    popup.classList.add('hidden'); // ✅ just close, no extra popup
    if (onNo) onNo();
  });
}

function confirmPopup(message, onYes, onNo = () => { }) {
  const popup = document.getElementById('popup');
  const content = popup?.querySelector('.popup-content');
  if (!popup || !content) return;

  content.innerHTML = `
    <p id="popupMessage">${message}</p>
    <div style="display:flex; gap:8px; justify-content:flex-end; margin-top:12px;">
      <button class="btn danger" id="popupYes">Yes</button>
      <button class="btn" id="popupNo">No</button>
    </div>
  `;
  popup.classList.remove('hidden');

  const yesBtn = content.querySelector('#popupYes');
  const noBtn = content.querySelector('#popupNo');

  const cleanup = () => {
    popup.classList.add('hidden');
    content.innerHTML = `
      <p id="popupMessage"></p>
      <button class="btn" id="popupOk">OK</button>
    `;
    const ok = content.querySelector('#popupOk');
    ok?.addEventListener('click', () => popup.classList.add('hidden'));
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

  // Toggle search/filter visibility
  if (id === 'catalogPage') {
    els.actions.classList.remove('hidden');
  } else {
    els.actions.classList.add('hidden');
  }
}

/* ------------------------- Back button logic --------------------- */
function goBack() {
  const current = location.hash;

  if (current.startsWith('#/edit/')) {
    const id = current.split('/')[2];
    location.hash = `#/item/${id}`;

  } else if (current.startsWith('#/item/')) {
    if (state.fromStats) {
      // ✅ If we came from stats, go back to stats type view
      location.hash = `#/stats/${encodeURIComponent(state.statsFilter.type)}`;
    } else if (state.fromList) {
      // ✅ If we came from a list, go back to that list detail
      location.hash = `#/lists/${state.currentListId}`;
    } else {
      // Normal case → go home
      location.hash = '#/home';
    }

  } else if (current.startsWith('#/lists/')) {
    // Reset list filter when leaving detail → overview
    state.listFilter.q = '';
    state.listFilter.type = '';
    els.listSearchInput.value = '';
    els.listTypeFilter.value = '';
    location.hash = '#/lists';

  } else if (current === '#/lists') {
    // Reset catalog filter when leaving list overview → home
    state.catalogFilter.q = '';
    state.catalogFilter.type = '';
    els.searchInput.value = '';
    els.typeFilter.value = '';
    location.hash = '#/home';

  } else if (current.startsWith('#/new')) {
    // ✅ Reset both catalog and stats filters when leaving new item page
    state.catalogFilter.q = '';
    state.catalogFilter.type = '';
    state.statsFilter.q = '';
    state.statsFilter.type = '';
    els.searchInput.value = '';
    els.typeFilter.value = '';
    state.fromStats = false;   // clear stats context
    state.fromList = false;    // clear list context
    location.hash = '#/home';

  } else if (current.startsWith('#/stats/')) {
    // ✅ From filtered stats → go back to stats overview
    location.hash = '#/stats';

  } else if (current.startsWith('#/stats')) {
    // ✅ From stats overview → go back to home (reset stats filter)
    state.statsFilter.q = '';
    state.statsFilter.type = '';
    state.fromStats = false;   // clear stats context
    location.hash = '#/home';

  } else {
    location.hash = '#/home';
  }
}

/* ------------------------- Routing ------------------------------ */
function route() {
  let hash = location.hash;

  // Normalize root or empty hash to home
  if (!hash || hash === '#' || hash === '#/') {
    hash = '#/home';
    location.hash = hash;
  }

  if (hash.startsWith('#/item/')) {
    const id = Number(hash.split('/')[2]);
    state.currentItemId = id; // track current item
    openDetailPage(id);
  } else if (hash.startsWith('#/edit/')) {
    const id = Number(hash.split('/')[2]);
    state.currentItemId = id; // track current item
    openEditPage(id);
  } else if (hash.startsWith('#/new')) {
    state.currentItemId = null;
    openEditPage(null);
  } else if (hash.startsWith('#/lists/')) {
    const id = Number(hash.split('/')[2]);
    state.currentListId = id;
    openListDetailPage(id);
  } else if (hash.startsWith('#/lists')) {
    openListsPage();
  } else if (hash.startsWith('#/stats/')) {
    const type = decodeURIComponent(hash.split('/')[2]);   // whatever user assigned or unknown
    openStatsPage(type);               // show stats filtered by that type
  } else if (hash.startsWith('#/stats')) {
    openStatsPage();                   // stats overview
  } else if (hash.startsWith('#/new')) {
    openAddItemPage();
  } else if (hash.startsWith('#/home')) {
    openCatalogPage();
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

/* ------------------------- Filter Suggestion Helper ---------------------------- */
function updateTypeSuggestions() {
  const types = [...new Set(state.items.map(i => (i.type || '').trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
  els.typeSuggestions.innerHTML = types.map(t => `<option value="${t}"></option>`).join('');
}

/* ------------------------- Poster Lookup ------------------------- */
// Replace with your own TMDb API key from https://www.themoviedb.org/documentation/api
const TMDB_API_KEY = "ebdcb5147e5c52171c2f65b14104a803";

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

/* ------------------------- CSV Import --------------------------- */
function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (!lines.length) return [];
  // Split headers by comma
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim());
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = values[i] || '';
    });
    return obj;
  });
}


async function mapCsvRow(row) {
  const title = row['Title'] || '';
  const year = row['Release date'] ? new Date(row['Release date']).getFullYear() : null;
  const posterUrl = await fetchPosterUrl(title, year);

  return {
    title,
    year,
    format: normalizeType(row['Format']),
    type: normalizeType(row['Type']),
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

function normalizeType(raw) {
  if (!raw) return '';
  const t = raw.trim().toLowerCase();

  if (t === 'dvd') return 'DVD';
  if (t === 'blu-ray' || t === 'bluray' || t === 'blu ray') return 'Blu-ray';
  if (t === 'uhd' || t === '4k') return 'UHD';
  if (t === 'digital') return 'Digital';

  // Default: capitalize first letter
  return t.charAt(0).toUpperCase() + t.slice(1);
}

async function importCsvFile(file) {
  const text = await file.text();
  const rows = parseCsv(text);
  // 🔍 Quick debug log — paste here
  console.log("Headers parsed:", Object.keys(rows[0] || {}));
  console.log("First row object:", rows[0]);

  for (const row of rows) {
    const item = await mapCsvRow(row);
    await put('items', item);
  }
  state.items = await getAll('items');
  renderCatalog();
  showPopup(`Imported ${rows.length} items from CSV`);
}

/* ------------------------- Catalog ------------------------------ */
function openCatalogPage() {
  showPage('catalogPage');
  renderCatalog();
  state.fromList = false;   // ✅ reset this flag
  state.fromStats = false;  // ✅ reset when going home
  const backBtn = document.getElementById('backToStatsBtn');
  if (backBtn) backBtn.style.display = 'none';
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && state.currentItemId) {
    showPage('catalogPage'); // or whatever your catalog view is called
    state.currentItemId = null;
  }
});

function renderCatalog() {
  const grid = document.getElementById('catalogGrid');
  grid.innerHTML = '';

  // Decide which filter to use
  const activeFilter = state.fromStats ? state.statsFilter : state.catalogFilter;

  const isUnknownFilter = activeFilter.type === 'Unknown';

  const filtered = state.items.filter(item => {
    const q = (activeFilter.q || '').toLowerCase();

    const customSearch = item.custom
      ? Object.values(item.custom).join(' ').toLowerCase()
      : '';

    const searchable = [
      item.title,
      item.year,
      item.format,
      item.region,
      item.audio,
      item.hdr,
      item.edition,
      item.discs,
      item.runtime,
      item.genre,
      item.languages,
      item.subtitles,
      item.notes,
      item.barcode,
      item.packaging,
      customSearch
    ].filter(Boolean).join(' ').toLowerCase();

    const matchesSearch = !q || searchable.includes(q);

    const isUnknownItem =
      (!item.type || !item.type.trim()) &&
      (!item.format || !item.format.trim());

    const filterType = (activeFilter.type || '').toLowerCase();

    const matchesType =
      filterType === '' ||
      (!isUnknownFilter && (item.type || '').toLowerCase() === filterType) ||
      (isUnknownFilter && isUnknownItem);

    return matchesSearch && matchesType;
  });


  filtered.forEach(item => {
    const card = document.createElement('div');
    card.className = 'card poster-tile';
    card.dataset.id = item.id;

    if (state.selectionMode && state.selectedIds.has(item.id)) {
      card.classList.add('selected');
    }

    // Compute display values once—this fixes the missing bullet
    const displayTitle = item.title || 'Untitled';
    const displayPoster = item.poster || 'assets/icons/placeholder.png';
    const displayType = item.type || item.format || 'Unknown';
    const displayYear = item.year || '';
    const showBullet = displayYear && displayType ? ' • ' : '';

    card.innerHTML = `
      <img class="poster" src="${displayPoster}" alt="${displayTitle}" />
      <div class="card-meta">
        <span class="title">${displayTitle}</span>
        <span class="meta-line">${displayYear}${showBullet}${displayType}</span>
      </div>
      ${state.selectionMode ? `<div class="selector-dot"></div>` : ''}
    `;

    attachSelectionHandlers(card, item.id);

    card.addEventListener('click', (e) => {
      if (!state.selectionMode && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        location.hash = `#/item/${item.id}`;
      }
    });

    grid.appendChild(card);
  });

  updateSelectionToolbar();
}


/* ------------------------- Selection Handlers ------------------------------- */

function attachSelectionHandlers(card, id) {
  // Long press / click-and-hold
  let pressTimer = null;
  const LONG_PRESS_MS = 1600;

  const startPress = () => {
    if (state.selectionMode) return;
    clearTimeout(pressTimer);
    pressTimer = setTimeout(() => {
      enterSelectionMode(id);
    }, LONG_PRESS_MS);
  };
  const cancelPress = () => clearTimeout(pressTimer);

  card.addEventListener('mousedown', startPress);
  card.addEventListener('touchstart', startPress, { passive: true });
  card.addEventListener('mouseup', cancelPress);
  card.addEventListener('mouseleave', cancelPress);
  card.addEventListener('touchend', cancelPress);

  // Click toggles selection in selection mode
  card.addEventListener('click', (e) => {
    if (state.selectionMode) {
      if (e.shiftKey && state.lastClickedId != null) {
        selectRange(state.lastClickedId, id);
      } else {
        toggleSelection(id);
      }
      state.lastClickedId = id;
      renderCatalog();
      return;
    }
    if (e.shiftKey) {
      enterSelectionMode(id);
    }
  });

  // Right-click enters selection mode
  card.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (!state.selectionMode) {
      enterSelectionMode(id);
    } else {
      toggleSelection(id);
      renderCatalog();
    }
  });
}

/* ------------------------- Selection Helpers ------------------------------- */

function enterSelectionMode(initialId) {
  state.selectionMode = true;
  state.selectedIds.clear();
  state.selectedIds.add(initialId);
  state.lastClickedId = initialId;
  updateSelectionToolbar(true);
  renderCatalog();
}

function exitSelectionMode() {
  state.selectionMode = false;
  state.selectedIds.clear();
  state.lastClickedId = null;
  updateSelectionToolbar(false);
  renderCatalog();
}

function toggleSelection(id) {
  if (state.selectedIds.has(id)) {
    state.selectedIds.delete(id);
  } else {
    state.selectedIds.add(id);
  }
  updateSelectionToolbar(true);
}

function selectAll() {
  state.selectedIds = new Set(state.items.map(i => i.id));
  updateSelectionToolbar(true);
}

function selectRange(fromId, toId) {
  const ids = state.items.map(i => i.id);
  const a = ids.indexOf(fromId);
  const b = ids.indexOf(toId);
  if (a === -1 || b === -1) return;
  const [start, end] = a < b ? [a, b] : [b, a];
  for (let i = start; i <= end; i++) {
    state.selectedIds.add(ids[i]);
  }
  updateSelectionToolbar(true);
}

function updateSelectionToolbar(forceVisible = null) {
  const bar = document.getElementById('selectionToolbar');
  const count = document.getElementById('selectionCount');
  count.textContent = `${state.selectedIds.size} selected`;

  const shouldShow = forceVisible === true
    || (forceVisible === null && state.selectionMode);

  bar.classList.toggle('hidden', !shouldShow);
  bar.classList.toggle('visible', shouldShow);
}

// Status Page card click helper
function onStatsCardClick(type) {
  card.addEventListener('click', () => {
    state.statsFilter.type = type;
    state.fromStats = true;   // ✅ mark that we came from stats
    location.hash = `#/stats/${encodeURIComponent(type)}`;
  });

  // Clear and add back button container
  const grid = document.getElementById('catalogGrid');
  grid.innerHTML = `
    <div class="back-bar">
      <button id="backToStatsBtn">← Back to Stats</button>
    </div>
  `;

  // Append catalog items after the back bar
  renderCatalog();

  // Bind back button safely
  const backBtn = document.getElementById('backToStatsBtn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      showPage('statsPage');
    });
  }
}

// Render Stats Grid 
function renderStatsGrid() {
  const grid = document.getElementById('statsGrid');
  if (!grid) return;

  grid.innerHTML = '';

  const counts = {};
  state.items.forEach(i => {
    const t = i.type?.trim() || i.format?.trim() || 'Unknown';
    counts[t] = (counts[t] || 0) + 1;
  });

  Object.entries(counts).forEach(([type, count]) => {
    const card = document.createElement('div');
    card.className = 'list-card';
    card.dataset.type = type;
    card.innerHTML = `
      <h3>${type}</h3>
      <p class="muted">${count} items</p>
    `;

    card.addEventListener('click', () => {
      if (type === 'Unknown') {
        state.statsFilter.type = 'Unknown';
      } else {
        state.statsFilter.type = type;
      }
      state.fromStats = true;
      location.hash = `#/stats/${encodeURIComponent(type)}`;
    });

    grid.appendChild(card);
  });
}

// Toolbar
function bindSelectionToolbar() {
  document.getElementById('selectAllBtn').addEventListener('click', () => {
    selectAll();
    renderCatalog();
  });

  document.getElementById('deleteSelectedBtn').addEventListener('click', async () => {
    if (state.selectedIds.size === 0) return;

    confirmPopup(
      `Delete ${state.selectedIds.size} selected item(s)?`,
      async () => {
        // ✅ proceed with deletion
        for (const id of state.selectedIds) {
          await del('items', id);
        }
        state.items = await getAll('items');
        exitSelectionMode();
        showPopup('Selected items deleted');
      },
      () => {
        // ❌ user cancelled
        exitSelectionMode();
      }
    );
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Delete' && state.selectionMode && state.selectedIds.size > 0) {
      confirmPopup(
        `Delete ${state.selectedIds.size} selected item(s)?`,
        async () => {
          // ✅ proceed with deletion
          for (const id of state.selectedIds) {
            await del('items', id);
          }
          state.items = await getAll('items');
          exitSelectionMode();
          showPopup('Selected items deleted');
        },
        () => {
          // ❌ user cancelled
          exitSelectionMode();
        }
      );
    }
  });

  document.getElementById('cancelSelectionBtn').addEventListener('click', () => {
    exitSelectionMode();
  });

  // 🔽 ESC key exits selection mode
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.selectionMode) {
      exitSelectionMode();
    }
  });
}

// Detail Page
function openDetailPage(id) {
  const item = state.items.find(i => i.id === id);
  if (!item) { location.hash = '#/home'; return; }
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
  // After rendering detail page HTML:
  els.detailListPicker = document.getElementById('detailListPicker');
  els.detailAddToList = document.getElementById('detailAddToList');

  populateListPicker(); // guarded version

  els.detailAddToList?.addEventListener('click', async () => {
    const val = els.detailListPicker?.value;
    if (!val) {
      showPopup('Please select a list or create a new one.');
      return;
    }

    // New list flow
    if (val === '__new') {
      inputPopup(
        'Enter new list name:',
        async (name) => {
          const id = await put('lists', { name, itemIds: [] });
          state.lists = await getAll('lists');
          const list = state.lists.find(l => l.id === id);
          list.itemIds = Array.from(new Set([...(list.itemIds || []), state.currentItemId]));
          await put('lists', list);
          state.lists = await getAll('lists');
          populateListPicker();
        },
        () => { },
        'Item added to new list "{name}"' // ✅ success message template
      );
      return;
    }

    // Existing list flow
    const list = state.lists.find(l => l.id === Number(val));
    if (!list) {
      showPopup('Selected list not found');
      return;
    }

    if ((list.itemIds || []).includes(state.currentItemId)) {
      showPopup(`"${list.name}" already contains this item`);
      return;
    }

    list.itemIds = list.itemIds || [];
    list.itemIds.push(state.currentItemId);
    await put('lists', list);
    state.lists = await getAll('lists');
    populateListPicker();
    showPopup(`Item added to list "${list.name}"`);
  });
}

// Improving Labels
function renderCustomDetail(custom) {
  const keys = Object.keys(custom || {});
  if (!keys.length) return '';

  return `
    <div class="section">
      ${keys
      .filter(k => custom[k]) // skip empty values
      .map(k => `<div><strong>${formatLabel(k)}:</strong> ${custom[k]}</div>`)
      .join('')}
    </div>
  `;
}

// Format Label
const customLabels = {
  BluRayDiscs: "Blu-ray Discs",
  DvdDiscs: "DVD Discs",
  DigitalCopy: "Digital Copy",
  DateAdded: "Date Added",
  PriceComment: "Price Comment"
  // … add others as needed
};

function formatLabel(key) {

  if (customLabels[key]) return customLabels[key];

  if (!key) return '';

  // Preserve acronyms (all caps)
  if (/^[A-Z]+$/.test(key)) return key;

  // If the key already contains spaces or hyphens, just title-case words
  if (/\s|-/.test(key)) {
    return key
      .split(/(\s|-)/) // keep spaces and hyphens as separators
      .map(part => {
        if (part === ' ' || part === '-') return part; // preserve separators
        return part.charAt(0).toUpperCase() + part.slice(1);
      })
      .join('');
  }

  // Handle camelCase → add space before capital letters
  let label = key.replace(/([a-z])([A-Z])/g, '$1 $2');

  // Replace underscores with spaces
  label = label.replace(/_/g, ' ');

  // Capitalize each word
  return label.replace(/\b\w/g, c => c.toUpperCase());
}

function populateListPicker() {
  if (!els.detailListPicker) return;
  els.detailListPicker.innerHTML =
    `<option value="">-- Select list --</option>` +
    state.lists.map(l => `<option value="${l.id}">${l.name}</option>`).join('') +
    `<option value="__new">＋ New List</option>`;
}

/* ------------------------- Edit -------------------------------- */
function openEditPage(id = null) {
    // ✅ Reset navigation context so stats/list flags don’t leak into /new
  state.fromStats = false;
  state.fromList = false;
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
    state.fromList = false;
    state.currentItemId = finalId;
    
    /* Popup - if needed
    showPopup(`Item "${item.title}" saved`);
    */
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
  state.fromList = false; // reset flag when viewing all lists
  state.fromStats = false; // reset stats context
  showPage('listsPage');
  renderLists();
}

function renderLists() {
  showPage('listsPage');

  els.listsContainer.innerHTML = state.lists.map(l => {
    const items = (l.itemIds || [])
      .map(id => state.items.find(i => i.id === id))
      .filter(Boolean);

    const posters = items.slice(0, 1) // show up to 4 posters
      .map(it => `<img src="${it.poster || 'assets/icons/placeholder.png'}" alt="" class="poster-mini">`)
      .join('');

    return `
      <div class="list-card" data-id="${l.id}">
        <h3>${l.name}</h3>
        <p class="muted">${items.length} items</p>
        <div style="display:flex; gap:6px; flex-wrap:wrap;">
          ${posters}
        </div>
      </div>
    `;
  }).join('');

  // ✅ Bind click handlers
  els.listsContainer.querySelectorAll('.list-card').forEach(el => {
    el.addEventListener('click', () => {
      const id = Number(el.dataset.id);
      openListDetailPage(id);
    });
  });
}

function renderAddPicker(list) {
  // Use list-specific filter state
  const q = (state.listFilter?.q || '').toLowerCase();
  const filterType = (state.listFilter?.type || '').toLowerCase();

  // Build the not-in-list collection
  const notInList = state.items.filter(i => {
    if ((list.itemIds || []).includes(i.id)) return false;

    // Search only title, year, format, genre (exclude type to avoid overlap)
    const searchable = [i.title, i.year, i.format, i.genre]
      .filter(Boolean).join(' ').toLowerCase();

    const matchesSearch = !q || searchable.includes(q);
    const matchesType = !filterType || (i.type || '').toLowerCase() === filterType;

    return matchesSearch && matchesType;
  });

  // Render cards
  els.listAddPicker.innerHTML = notInList.map(i => `
    <div class="card">
      <img src="${i.poster || 'assets/icons/placeholder.png'}" alt="${i.title}" />
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

  // Bind add buttons
  Array.from(els.listAddPicker.querySelectorAll('[data-add-id]')).forEach(btn => {
    btn.addEventListener('click', async () => {
      const addId = Number(btn.dataset.addId);
      list.itemIds = list.itemIds || [];
      if (!list.itemIds.includes(addId)) list.itemIds.push(addId);
      await put('lists', list);
      state.lists = await getAll('lists');
      openListDetailPage(list.id);
    });
  });
}

// Filter Suggestions
function updateListTypeSuggestions() {
  const types = [...new Set(state.items.map(i => i.type).filter(Boolean))];
  els.listTypeSuggestions.innerHTML = types.map(t => `<option value="${t}"></option>`).join('');
}

function openListDetailPage(id) {
  const list = state.lists.find(l => l.id === id);
  if (!list) { location.hash = '#/lists'; return; }
  state.currentListId = id;
  state.fromList = true;
  state.fromStats = false;
  location.hash = `#/lists/${id}`;

  showPage('listDetailPage');
  els.listTitle.textContent = list.name;
  els.listMeta.textContent = `${(list.itemIds || []).length} items`;

  // render items already in the list
  const items = (list.itemIds || [])
    .map(id => state.items.find(i => i.id === id))
    .filter(Boolean);

  els.listItems.innerHTML = items.map(it => `
    <div class="card" data-id="${it.id}">
      <img src="${it.poster || 'assets/icons/placeholder.png'}" alt="${it.title}" />
      <div class="pad">
        <strong>${it.title} <span class="muted">${it.year || ''}</span></strong>
        <div class="muted">${it.type || it.format || ''}</div>
        <div class="muted">${[it.region, it.audio].filter(Boolean).join(' • ')}</div>
        <div class="muted">${it.runtime || ''}${it.genre ? ' • ' + it.genre : ''}</div>
        <div style="display:flex; gap:6px; margin-top:6px;">
          <button class="btn danger" data-remove-id="${it.id}">Remove</button>
        </div>
      </div>
    </div>
  `).join('');

  // bind click on item cards to open item detail
Array.from(els.listItems.querySelectorAll('.card[data-id]')).forEach(card => {
  card.addEventListener('click', (e) => {
    if (!e.target.closest('[data-remove-id]')) { // avoid conflict with Remove button
      const id = card.dataset.id;
      location.hash = `#/item/${id}`;
    }
  });
});

  // remove buttons
  Array.from(els.listItems.querySelectorAll('[data-remove-id]')).forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const removeId = Number(btn.dataset.removeId);
      list.itemIds = (list.itemIds || []).filter(x => x !== removeId);
      await put('lists', list);
      state.lists = await getAll('lists');
      openListDetailPage(id);
    });
  });
  // ✅ Initial render of Add Picker
  updateListTypeSuggestions();
  renderAddPicker(list);
}

// Create new list
async function createList() {
  inputPopup('Enter new list name:', async (name) => {
    const id = await put('lists', { name, itemIds: [] });
    state.lists = await getAll('lists');

    const newListEl = document.createElement('div');
    newListEl.className = 'list-card';
    newListEl.dataset.id = id;
    newListEl.innerHTML = `
      <h3>${name}</h3>
      <p class="muted">0 items</p>
      <div style="display:flex; gap:6px; flex-wrap:wrap;"></div>
    `;
    els.listsContainer.appendChild(newListEl);

    newListEl.addEventListener('click', () => openListDetailPage(id));

    showPopup(`New list "${name}" created`);
  }, null, 'New list "{name}" created');
}

// Rename current list
async function renameList() {
  const list = state.lists.find(l => l.id === state.currentListId);
  if (!list) return;

  inputPopup('Enter new name for this list:', async (name) => {
    list.name = name;
    await put('lists', list);
    state.lists = await getAll('lists');

    // Update overview card
    const el = els.listsContainer.querySelector(`.list-card[data-id="${list.id}"] h3`);
    if (el) el.textContent = name;

    // Update detail page title immediately
    els.listTitle.textContent = name;

    showPopup(`List renamed to "${name}"`);
  }, null, 'List renamed to "{name}"');
}

// Delete current list
async function deleteList() {
  const id = state.currentListId;
  if (!id) return;

  const list = state.lists.find(l => l.id === id);

  confirmPopup(`Delete list "${list?.name}"?`, async () => {
    await del('lists', id);
    state.lists = await getAll('lists');

    const el = els.listsContainer.querySelector(`.list-card[data-id="${id}"]`);
    if (el) el.remove();

    showPopup(`"${list?.name}" list deleted`);

    // ✅ force navigation back to overview
    location.hash = '#/lists';
    openListsPage();
  });
}


/* ------------------------- Stats -------------------------------- */

function openStatsPage(type) {
  if (type) {
    // ✅ set stats filter
    state.statsFilter.type = (type === 'Unknown') ? 'Unknown' : type;
    state.statsFilter.q = ''; // clear search when coming from stats
    state.fromStats = true;

    showPage('catalogPage');
    renderCatalog(); // will use statsFilter when fromStats is true

    const backBtn = document.getElementById('backToStatsBtn');
    if (backBtn) {
      backBtn.style.display = 'block';
      backBtn.onclick = () => { location.hash = '#/stats'; };
    }
  } else {
    showPage('statsPage');
    renderStatsGrid();
    state.fromStats = false;

    const backBtn = document.getElementById('backToStatsBtn');
    if (backBtn) backBtn.style.display = 'none';

    const statsBackBtn = document.getElementById('statsBack');
    if (statsBackBtn) {
      statsBackBtn.onclick = goBack;
    }
  }
}

/* ------------------------- Events -------------------------------- */
function bindEvents() {
  window.addEventListener('hashchange', route);

// Catalog filters
els.searchInput?.addEventListener('input', (e) => {
  state.catalogFilter.q = e.target.value.trim().toLowerCase();
  renderCatalog();
});
els.typeFilter?.addEventListener('input', (e) => {
  state.catalogFilter.type = e.target.value.trim();
  renderCatalog();
});

// List detail filters
els.listSearchInput?.addEventListener('input', (e) => {
  state.listFilter.q = e.target.value.trim().toLowerCase();
  const list = state.lists.find(l => l.id === state.currentListId);
  if (list) renderAddPicker(list);
});

els.listTypeFilter?.addEventListener('input', (e) => {
  state.listFilter.type = e.target.value.trim();
  const list = state.lists.find(l => l.id === state.currentListId);
  if (list) renderAddPicker(list);
});

  // Catalog click 
  els.catalogGrid?.addEventListener('click', (e) => {
    const card = e.target.closest('.catalog-card');
    if (!card) return;

    const id = card.dataset.id;
    if (!id) return;

    // Always navigate via hash so router handles it
    location.hash = `#/item/${id}`;
  });

  // Detail header buttons
  els.detailBack?.addEventListener('click', goBack);
  els.detailEdit?.addEventListener('click', () => {
    if (state.currentItemId) {
      location.hash = `#/edit/${state.currentItemId}`;
    }
  });
  els.detailDelete?.addEventListener('click', deleteItem);

  // Edit
  els.editBack?.addEventListener('click', goBack);
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

  // CSV Import
  els.importCsvBtn?.addEventListener('click', async () => {
    if (!els.csvFileInput?.files.length) {
      showPopup('Please select a CSV file first');
      return;
    }
    await importCsvFile(els.csvFileInput.files[0]);
  });

    // ✅ CSV file name binding
  els.csvFileInput?.addEventListener('change', () => {
    const file = els.csvFileInput.files[0];
    if (els.fileName) {
      els.fileName.textContent = file ? file.name : 'Choose CSV file';
    }
  });

  // ESC → back
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') goBack();
  });
}

/* ------------------------- Init ---------------------------------- */
(async function init() {
  await loadData();
  updateTypeSuggestions(); // ✅ build dynamic suggestions
  bindEvents();
  bindSelectionToolbar();

  // Nav buttons
  els.homeBtn?.addEventListener('click', () => {
    state.catalogFilter.q = '';
    state.catalogFilter.type = '';
    els.searchInput.value = '';  
    els.typeFilter.value = '';   
    location.hash = '#/home';
  });
  els.listsBtn?.addEventListener('click', () => location.hash = '#/lists');
  els.addBtn?.addEventListener('click', () => location.hash = '#/add');
  els.statsBtn?.addEventListener('click', () => location.hash = '#/stats');
 
  // Run router once after init finishes
  route();
})();


// Listen for hash changes
window.addEventListener('hashchange', route);


