const TYPE_META = {
  bool:   { label: 'Boolean',  color: 'var(--t-bool)',   plural: 'booleans' },
  text:   { label: 'Text',     color: 'var(--t-text)',   plural: 'strings'  },
  color:  { label: 'Color',    color: 'var(--t-color)',  plural: 'colors'   },
  number: { label: 'Numeric',  color: 'var(--t-number)', plural: 'numbers'  },
  array:  { label: 'Array',    color: 'var(--t-array)',  plural: 'arrays'   },
  object: { label: 'Object',   color: 'var(--t-object)', plural: 'objects'  },
  null:   { label: 'Null',     color: 'var(--t-null)',   plural: 'null'     },
};

const state = {
    data: null,
    fileName: null,
    pasteBoxOpen: false
}

Coloris({
  theme: 'polaroid',
  themeMode: 'dark',
  formatToggle: true,
});

function isHexColor(s) {
  return typeof s === 'string' && /^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(s.trim());
}
function isRgbColor(s) {
  return typeof s === 'string' && /^rgba?\s*\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*(,\s*[\d.]+\s*)?\)$/i.test(s.trim());
}
function isHslColor(s) {
  return typeof s === 'string' && /^hsla?\s*\(.+\)$/i.test(s.trim());
}
/*function isNamedColor(s) { //probably redundant   
  return typeof s === 'string' && NAMED_COLORS.has(s.trim().toLowerCase());
}*/
function isColor(v) {
  return isHexColor(v) || isRgbColor(v) || isHslColor(v) 
}   

function detectType(element){
    if (element === null) return 'null';
    if (typeof element === 'boolean') return 'bool';
    if (typeof element === 'number') return 'number';
    if (Array.isArray(element)) return 'array';
    if (typeof element === 'object') return 'object';
    if (typeof element === 'string'){
        if (isColor(element)) return 'color';
        return 'text';
    }
}

function getValueFromPath(root, path){
    return path.reduce((value, part) => value[part], root);
}

function setValueFromPath(root, path, newValue){
    if (path.length === 0) return newValue;

    let parent = root;
    for (let i = 0; i < path.length -1; i++){
        parent = parent[path[i]];
    }

    parent[path[path.length - 1]] = newValue;
    return root;
}

function groupEntries(entries) {
  // entries: [{key, value}]
  const groups = { bool: [], text: [], color: [], number: [], array: [], null: [], object: [] };
  for (const e of entries) {
    const t = detectType(e.value);
    groups[t].push(e);
  }
  return groups;
}


function countAll(entry){
    const totals = { bool: 0, text: 0, color: 0, number:0, array: 0, null: 0, object: 0 };

    function walk(v){
        const t = detectType(v);
        if (t === 'object'){
            totals.object++;
            for (const k in v){
                walk(v[k]);
            }
        } else if (t === 'array') {
            totals.array++;
            v.forEach((k) => walk(k));
        } else if (t !== 'undefined'){
            totals[t]++;
        }
    }
    walk(entry);
    return totals;
}

function updateSummary(){
    const totals = countAll(state.data);
    $('totalColor').textContent = totals.color;
    $('totalBool').textContent = totals.bool;
    $('totalText').textContent = totals.text;
    $('totalNumber').textContent = totals.number;
    $('totalArray').textContent = totals.array;
    $('totalObject').textContent = totals.object;
    $('totalNull').textContent = totals.null;
    $('fileName').textContent = state.fileName;
    $('summary').classList.add('visible');
}

const $ = (id) => document.getElementById(id);

function el(tag, cls, html) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html !== undefined) n.innerHTML = html;
  return n;
}

function updatePasteBox(){
    if (!state.pasteBoxOpen) return;
    pasteText.value = JSON.stringify(state.data, null, 2);
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function addKey(container, path, countContainer = null){
    const addButton = el('button', 'button');
    addButton.type = 'button';
    addButton.textContent = "+ Add item";

    addButton.addEventListener('click', event => {
        event.stopPropagation();
        const target = getValueFromPath(state.data, path);
        let newEntries;
        if (Array.isArray(target)) {
            target.push(null);
            const index = target.length - 1;
            
            newEntries = target.map((value, index) => ({ key: index, value: value }));

            const newRow = renderItem(String(index), null, [...path, index]);

            container.insertBefore(newRow, addButton);

            if (path.length) countContainer.textContent = target.length; 
        } else {
            const key = prompt('New property name');
            if (key === null || key.trim() === '') return;
            if (Object.hasOwn(target, key)) {
                alert('That property already exists.');
                return;
            }

            target[key] = null;
            newEntries = Object.keys(target).map(k => ({key: k, value: target[k]}));
            appendEntries(container, newEntries, path);
        }

        const block = container.closest(path.length ? '.nested-block' : '.block');
        const chips = block?.querySelector(path.length ? '.nested-chips' : '.block-chips');
        if (chips) appendChips(chips, groupEntries(newEntries));
        updatePasteBox();
        updateSummary();
    });
    
    return addButton;
}

function deleteKey(container, key, path){
    const delBtn = el('button', 'button-del', 'Delete');

    delBtn.addEventListener('click', () => {
        const pathTo = path.slice(0, -1);
        
        const block = container.closest(pathTo.length ? '.nested-block' : '.block');
        const chips = block?.querySelector(pathTo.length ? '.nested-chips' : '.block-chips');
        
        const count = block?.querySelector('.count');
        const value = getValueFromPath(state.data, pathTo);
       
        if (Array.isArray(value)){
            value.splice(Number(key), 1);
            const items = container.parentElement;
            items.replaceChildren(
                ...value.map((entry, index) =>
                    renderItem(String(index), entry, [...pathTo, String(index)])
            ));
            items.appendChild(addKey(items, pathTo, count));
        
            if (pathTo.length) count.textContent = value.length;
        } else {
            delete value[key];
            container.remove();
        }
                    
        if (chips){
            const entries = Object.keys(value).map(k => ({key: k, value: value[k]}));
            appendChips(chips, groupEntries(entries));
        }
        updateSummary();
        updatePasteBox();
    });

    return delBtn;
}

function makeEditableText(container, value, path) {
    const button = renderText(value);

    button.addEventListener('click', () => {
        const wrap = el('span', 'text-val text-edit');
        const txtInput = el('textarea', 'text-input');
        //txtInput.type = 'text';
        txtInput.value = value;
        txtInput.rows = 1;
        
        function fitInput(){
            txtInput.style.height = `${txtInput.scrollHeight}px`;
        };
        txtInput.addEventListener('input', fitInput);
        
        txtInput.addEventListener('keydown', event => {
            if (event.key === 'Enter') {
                event.preventDefault();
                state.data = setValueFromPath(state.data, path, txtInput.value);
                updatePasteBox()
                container.replaceChildren(makeEditableText(container, txtInput.value, path));
            } else if (event.key === 'Escape') {
                container.replaceChildren(makeEditableText(container, value, path));
            }
        });
        
        wrap.appendChild(txtInput);
        container.replaceChildren(wrap);
        fitInput();
        txtInput.focus();
        txtInput.select();
    });

    return button;
}

function makeEditableNumber(container, value, path) {
    const button = renderNumber(value);

    button.addEventListener('click', () => {
        const wrap = el('span', 'num-val num-edit');
        const numInput = el('input', 'num-input');
        numInput.type = 'number';
        numInput.value = value;
        numInput.step = 'any';
        numInput.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
            event.preventDefault();

            const nextValue = numInput.valueAsNumber;
            if (!Number.isFinite(nextValue)) return;

            state.data = setValueFromPath(state.data, path, nextValue);
            updatePasteBox();
            container.replaceChildren(makeEditableNumber(container, nextValue, path));
        } else if (event.key === 'Escape') {
            container.replaceChildren(makeEditableNumber(container, value, path));
        }
        });

        wrap.appendChild(numInput);
        container.replaceChildren(wrap);
        numInput.focus();
        numInput.select();
    });

    return button;
}

function renderBool(v){
    const button = el('button', 'bool-pill ' + (v ? 't' : 'f'));
    button.type = 'button';
    button.setAttribute('aria-pressed', String(v));
    button.innerHTML = `
        <span class="knob" aria-hidden="true"></span>
        <span class="bool-label">${v ? 'true' : 'false'}</span>
    `;
    return button;
}

function renderText(v) {
    const txtButton = el('button', 'text-val', escapeHtml(v));
    txtButton.type = 'button';
    return txtButton
}

function renderNumber(n){
    const wrap = el('button', 'num-val num-display');
    wrap.type ='button';
    wrap.innerHTML = n;

    return wrap;
}

function renderColor(v) {
    const wrap = el('span', 'color-val');
    const fill = el('input', 'fill');
    fill.value = v;
    fill.type = 'text';
    fill.style.background = v;
    fill.setAttribute('data-coloris', '');
    wrap.appendChild(fill);
    wrap.appendChild(el('span', 'code', escapeHtml(v)));
    return wrap;
}

function renderArray(v, path){
    const wrap = el('div', 'nested-block array-block');
    const header = el('div', 'nested-header');

    header.innerHTML = `
        <span style="color:var(--ink-faint);font-size:11px;">↳</span>
        <span class="nested-name">Array</span>
        <span class="count">${v.length}</span>
        <span class="caret">›</span>
    `;

    const body = el('div', 'nested-body');
    const inner = el('div', 'nested-body-inner');

    v.forEach((value, index) => {
        inner.appendChild(renderItem(String(index), value, [...path, String(index)]));
    })

    const count = header.querySelector('.count');

    inner.appendChild(addKey(inner, path, count));
    body.appendChild(inner);
    header.addEventListener('click', () => wrap.classList.toggle('open'));

    wrap.appendChild(header);
    wrap.appendChild(body);
    return wrap;    
}

function renderNull() {
    const wrap = el('button', 'null-val', '— null —');
    wrap.type ='button';

    return wrap;
}

function renderItem(key, value, path){
    const row = el('div', 'item');
    row.appendChild(el('div', 'item-key', escapeHtml(key)));
    const val = el('div', 'item-value');

    const t = detectType(value);
    switch (t) {
        case 'bool':
            const button = renderBool(value);
            button.addEventListener('click', ()=>{
                const nextValue = !getValueFromPath(state.data, path);
                state.data = setValueFromPath(state.data, path, nextValue);
                updatePasteBox()
                button.classList.toggle('t', nextValue);
                button.classList.toggle('f', !nextValue);
                button.setAttribute('aria-pressed', String(nextValue));
                button.querySelector('.bool-label').textContent = nextValue ? 'true' : 'false';
            });
            val.appendChild(button); 
            break;
        case 'text': 
            val.appendChild(makeEditableText(val, value, path)); 
            break;
        case 'color': 
            const colorPck = renderColor(value);
            const text = colorPck.querySelector('.code');
            const fill = colorPck.querySelector('.fill');

            fill.addEventListener('input', event => {
                const newValue = event.target.value;
                text.innerHTML = newValue;
                fill.style.background = newValue;
                state.data = setValueFromPath(state.data, path, newValue);
                updatePasteBox();
            })

            val.appendChild(colorPck); 
            break;
        case 'number': 
            val.appendChild(makeEditableNumber(val, value, path));
            break;
        case 'array': val.appendChild(renderArray(value, path)); break;
        case 'null': 
            const nullBtn = renderNull();
            nullBtn.addEventListener('click',() => {
                openDialog(path, row, key);
            });
                
            val.appendChild(nullBtn);
            break;
        case 'object': val.appendChild(renderNestedBlock(value, path)); break;
        default: val.textContent = String(value);
    }
    row.appendChild(val);

    const btnRow = el('div', 'item-buttons');
    btnRow.appendChild(deleteKey(row, key, path));
    row.appendChild(btnRow);
    return row;
}

function renderNestedBlock(obj, path){

    const entries = Object.keys(obj).map(k => ({key: k, value: obj[k]}));

    const wrap = el('div', 'nested-block array-block');
    const header = el('div', 'nested-header');
    header.innerHTML = `
        <span style="color:var(--ink-faint);font-size:11px;">↳</span>
        <span class="nested-name">Object</span>
        <span class="nested-chips"></span>
        <span class="caret">›</span>
    `;
    const chipBlock = header.querySelector('.nested-chips');
    appendChips(chipBlock, groupEntries(entries));

    const body = el('div', 'nested-body');
    const inner = el('div', 'nested-body-inner');
    appendEntries(inner, entries, path, chipBlock);
    body.appendChild(inner);
    header.addEventListener('click', () => wrap.classList.toggle('open'));  
    wrap.appendChild(header);
    wrap.appendChild(body);

    return wrap;
}

function appendEntries(container, entries, path) {
    const items = el('div', 'items');
    for (const { key, value } of entries) {
        items.appendChild(renderItem(key, value, [...path, key]));
    }

    container.replaceChildren(items, addKey(container, path));
}


function buildBlock(name, value, index){
    const wrap = el('div', 'block');
    
    let entries;

    if (typeof value === 'object' && value){
        entries = Object.keys(value).map(k => ({key: k, value: value[k]}));
    }else {
        entries = [{key: name, value: value}];
    }

    const header = el('div', 'block-header');

    header.innerHTML = `
        <span class="block-index">${String(index + 1).padStart(2, '0')}</span>
        <h3 class="block-name">${escapeHtml(name)}</h3>
        <div class="block-chips"></div>
        <span class="caret">›</span>
    `;
    const chipBlock = header.querySelector('.block-chips');
    appendChips(chipBlock, groupEntries(entries));

    const body = el('div', 'block-body');
    const inner = el('div', 'block-body-inner');
    
    appendEntries(inner, entries, []);
    body.appendChild(inner);

    header.addEventListener('click', () => wrap.classList.toggle('open'));

    wrap.appendChild(header);
    wrap.appendChild(body);
    return wrap;
}

function appendChips(container, groups){
    container.replaceChildren();

    const order = ['bool','text','color','number','array','object','null'];

    for (const t of order){
        const count = groups[t].length;
        if (!count) continue;

        const chip = el('div', 'chip');

        chip.innerHTML = `<span class="dot" style="background:${TYPE_META[t].color}"></span>${count} ${TYPE_META[t].label}`;
        container.appendChild(chip);
    }

}

function render(){
    const blocksEl = $('blocks');
    blocksEl.innerHTML = '';
    const data = state.data;

    updateSummary();

    blocksEl.appendChild(buildBlock(Array.isArray(data) ? "Array" : "Root", data, 0));
    blocksEl.children[0].classList.add('open');

}

const dropzone  = $('dropzone');
const fileInput = $('fileInput');
const pasteArea = $('pasteArea');
const pasteText = $('pasteText');
const errorBox  = $('errorBox');
const errorMsg  = $('errorMsg');
const typeDialog = $('type-dialog');

function showError(msg) {
  errorMsg.textContent = msg;
  errorBox.classList.add('visible');
}

function clearError() { errorBox.classList.remove('visible'); }

function parseAndRender(text, fileName) {
  clearError();
  try {
    const data = JSON.parse(text);

    if (data === null || typeof data !== 'object'){
        showError('Top-level JSON must be an object or array.');
        return;
    }
    state.data = data;
    state.fileName = fileName;
    
    updatePasteBox();

    render();
    setTimeout(() => {
      document.getElementById('summary').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  } catch (err) {
    document.getElementById('summary').classList.remove('visible');
    document.getElementById('blocks').innerHTML = '';
    showError(err.message);
    console.log(err);
  }
}

function handleFile(file){
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => parseAndRender(e.target.result, file.name);
    reader.onerror = () => showError('Could not read file.');
    reader.readAsText(file);
}

function openDialog(path, row, key){
    typeDialog.returnValue = '';
    typeDialog.addEventListener('close', () => {
        const defaults = {
            string: '',
            boolean: false,
            number: 0,
            array: [],
            object: {}
        };
        const type = typeDialog.returnValue;
        if (!Object.hasOwn(defaults, type)) return;

        const newDefault = defaults[type];
        const pathTo = path.slice(0, -1);
        const block = row.closest(pathTo.length ? '.nested-block' : '.block');
        const chips = block?.querySelector(pathTo.length ? '.nested-chips' : '.block-chips');
        
        state.data = setValueFromPath(state.data, path, newDefault);

        row.replaceWith(renderItem(String(key), newDefault, path));
        

        if (chips){
            const value = getValueFromPath(state.data, path.slice(0,-1));
            const entries = Object.keys(value).map(k => ({key: k, value: value[k]}));   
            
            appendChips(chips, groupEntries(entries));
        }
        
        updatePasteBox()
        updateSummary();
    }, { once: true });

    typeDialog.showModal();
}

dropzone.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
    if (e.target.files[0]) handleFile(e.target.files[0]);
})

$('pasteBtn').addEventListener('click', () => {
    pasteArea.classList.toggle('open');
    state.pasteBoxOpen = true;
    state.data === null ? '' : updatePasteBox();
    if (pasteArea.classList.contains('open')) pasteText.focus();
})

$('cancelPasteBtn').addEventListener('click', () => {
    pasteArea.classList.remove('open');
    pasteText.value = '';
    state.pasteBoxOpen = false;
})

$('parsePasteBtn').addEventListener('click', () => {
    const t = pasteText.value.trim();
    if (!t) { showError('Paste some JSON first.'); return; }
    parseAndRender(t, 'pasted.json');
});

['dragenter', 'dragover'].forEach(evt => {
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault(); 
    e.stopPropagation();
    dropzone.classList.add('hover');
  });
});

['dragleave', 'drop'].forEach(evt => {
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault(); 
    e.stopPropagation();
    dropzone.classList.remove('hover');
  });
});

dropzone.addEventListener('drop', (e) => {
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});

const SAMPLE = {
  "appearance": {
    "buhh": null,
    "theme": "midnight",
    "accentColor": "#e8a23f",
    "backgroundColor": "#0d0b08",
    "fontSize": 14,
    "borderRadius": 4,
    "useAnimations": true,
    "opacity": 0.95,
    "customCursor": false
  },
  "audio": {
    "masterVolume": 72,
    "musicEnabled": true,
    "sfxVolume": 60,
    "voiceChatEnabled": false,
    "outputDevice": "Studio Monitors",
    "latencyMs": 48
  },
  "gameplay": {
    "difficulty": "normal",
    "autosaveIntervalSeconds": 300,
    "showTutorials": "rgb(58, 123, 213)",
    "maxFPS": 144,
    "mouseSensitivity": 1.35,
    "controllerDeadzone": 0.08,
    "savedLoadouts": ["recon", "sniper", "medic", "engineer"]
  },
  "profile": {
    "username": "wanderer_42",
    "email": "user@example.com",
    "avatarColor": "rgb(58, 123, 213)",
    "secondaryColor": "teal",
    "level": 47,
    "premium": true,
    "joinDate": "2023-03-15",
    "biography": "Cartographer of digital spaces. Collector of small, unimportant things.",
    "lastSeen": null,
    "statistics": {
      "hoursPlayed": 312.4,
      "achievements": 89,
      "winRate": 0.62,
      "favoriteMap": "Silent Meadow"
    }
  },
  "notifications": {
    "enabled": true,
    "quietHoursStart": "22:00",
    "quietHoursEnd": "07:00",
    "channels": ["email", "in-app", "mobile", "kfjid", "jjdsj", "in-app", "mobile", "kfjid", "jjdsj", "in-app", "mobile", "kfjid", "jjdsj", "in-app", "mobile", "kfjid", "jjdsj", "in-app", "mobile", "kfjid", "jjdsj"]
  },
  "Buhh": [1,2,4,5, {"a": {"b": 1, "c": "sdjs"}, "b": "jsij"}, [1,2,4]]
};

document.getElementById('sampleBtn').addEventListener('click', (e) => {
  e.stopPropagation();
  state.fileName = 'sample.json';
  parseAndRender(JSON.stringify(SAMPLE, null, 2), 'sample.json');
});
