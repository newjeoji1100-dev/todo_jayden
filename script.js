// 누르면 무슨 일이 일어나는지 담당하는 파일
var STORAGE_KEY = 'jeju-checklist-v1';

// Supabase(인터넷 표)에 현장 메모를 저장한다. 공개 키만 쓴다.
var SUPABASE_URL = 'https://qsjiojomberzbcbfkawk.supabase.co';
var SUPABASE_KEY = 'sb_publishable_W4EZRKkgZR9DRKyCRMSVXg_w3-1h7hu';
var TODOS_URL = SUPABASE_URL + '/rest/v1/todos';

var checkboxes = document.querySelectorAll('li[data-kind] input[type="checkbox"]');
var cuts = document.querySelectorAll('li[data-kind]');
var setupBoxes = document.querySelectorAll('details.gear input[type="checkbox"]');
var parts = document.querySelectorAll('details.part');
var progress = document.querySelector('header progress');
var progressText = progress.parentNode.lastChild;
var resetButton = document.querySelector('header button');
var refreshButton = document.getElementById('refresh');
var refreshIcon = refreshButton.querySelector('span');
var filterButtons = document.querySelectorAll('nav button');
var memoInput = document.getElementById('memo-input');
var memoButton = memoInput.parentNode.querySelector('button');
var memoList = document.getElementById('memo-list');

// 필터 버튼 순서: 전체, 2470, 70200, 1635, 사진, 영상, 인터뷰, 필수 브릿지
var FILTERS = [
  function () { return true; },
  function (li) { return li.dataset.lens === '2470'; },
  function (li) { return li.dataset.lens === '70200'; },
  function (li) { return li.dataset.lens === '1635'; },
  function (li) { return li.dataset.kind === '사진'; },
  function (li) { return li.dataset.kind === '영상'; },
  function (li) { return li.dataset.kind === '인터뷰'; },
  function (li) { return li.dataset.bridge === '1'; }
];

// memos: { id: 표의 번호(아직 못 올렸으면 null), text: 글, dirty: 고친 글을 아직 표에 못 올렸으면 true }
// deletes: 인터넷이 없어서 아직 표에서 못 지운 번호들
var state = { checked: [], setup: [], memos: [], deletes: [], closed: [], filter: 0 };

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {}
}

function load() {
  try {
    var saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved) {
      state.checked = saved.checked || [];
      state.setup = saved.setup || [];
      // 예전에 글자만 저장하던 메모도 이어받는다(표에 올릴 차례를 기다린다)
      state.memos = (saved.memos || []).map(function (m) {
        return typeof m === 'string' ? { id: null, text: m } : m;
      });
      state.deletes = saved.deletes || [];
      state.closed = saved.closed || [];
      state.filter = saved.filter || 0;
    }
  } catch (e) {}
}

function updateProgress() {
  var done = 0;
  checkboxes.forEach(function (box) {
    if (box.checked) done++;
  });
  var total = checkboxes.length;
  progress.max = total;
  progress.value = done;
  progressText.textContent = ' ' + done + '/' + total + ' (' + Math.round(done / total * 100) + '%)';
}

function applyFilter() {
  cuts.forEach(function (li) {
    li.hidden = !FILTERS[state.filter](li);
  });
  document.querySelectorAll('section').forEach(function (section) {
    var items = section.querySelectorAll('li[data-kind]');
    if (items.length === 0) return;
    section.hidden = section.querySelectorAll('li[data-kind]:not([hidden])').length === 0;
  });
  filterButtons.forEach(function (button, i) {
    button.classList.toggle('active', i === state.filter);
  });
}

// 표(todos)에 요청을 보낸다
function request(method, query, body) {
  return fetch(TODOS_URL + query, {
    method: method,
    headers: {
      apikey: SUPABASE_KEY,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: body ? JSON.stringify(body) : undefined
  }).then(function (res) {
    if (!res.ok) throw new Error('Supabase ' + res.status);
    return res.json();
  });
}

// 순서대로 하나씩 실행한다 (하나라도 실패하면 멈춘다)
function runInOrder(items, task) {
  return items.reduce(function (chain, item) {
    return chain.then(function () { return task(item); });
  }, Promise.resolve());
}

var syncing = false;
var syncAgain = false;

// 인터넷은 되는데 표와 연결이 안 될 때 이유를 메모 칸 위에 보여 준다
var syncNote = document.createElement('p');
syncNote.className = 'note';
syncNote.hidden = true;
memoList.parentNode.insertBefore(syncNote, memoList);

// 폰에 있는 메모와 표를 맞춘다: 못 지운 것 지우기 → 못 올린 것 올리기 → 표의 목록 받아오기
function sync() {
  if (syncing) {
    syncAgain = true;
    return;
  }
  syncing = true;
  runInOrder(state.deletes.slice(), function (id) {
    return request('DELETE', '?id=eq.' + id).then(function () {
      state.deletes = state.deletes.filter(function (d) { return d !== id; });
      save();
    });
  }).then(function () {
    return runInOrder(state.memos.filter(function (m) { return m.id !== null && m.dirty; }), function (memo) {
      return request('PATCH', '?id=eq.' + memo.id, { text: memo.text }).then(function () {
        memo.dirty = false;
        save();
      });
    });
  }).then(function () {
    return runInOrder(state.memos.filter(function (m) { return m.id === null; }), function (memo) {
      return request('POST', '', [{ text: memo.text }]).then(function (rows) {
        memo.id = rows[0].id;
        save();
      });
    });
  }).then(function () {
    return request('GET', '?select=id,text,done,created_at&order=created_at.asc,id.asc');
  }).then(function (rows) {
    var waiting = state.memos.filter(function (m) { return m.id === null; });
    var byId = {};
    state.memos.forEach(function (m) {
      if (m.id !== null) byId[m.id] = m;
    });
    // 이미 있던 메모는 그대로 두고(고치는 중인 칸 유지), 표의 글로 바꾼다
    state.memos = rows.map(function (r) {
      var m = byId[r.id] || { id: r.id };
      if (!m.dirty) m.text = r.text;
      return m;
    }).concat(waiting);
    save();
    if (!editing) renderMemos();
    syncNote.hidden = true;
  }).catch(function (error) {
    // 인터넷이 없으면 폰에 저장된 목록을 그대로 쓰고, 나중에 다시 맞춘다
    if (navigator.onLine) {
      syncNote.textContent = '표와 연결하지 못했어요 (' + error.message + '). 메모는 이 폰에 저장돼 있어요.';
      syncNote.hidden = false;
    }
  }).then(function () {
    syncing = false;
    if (syncAgain) {
      syncAgain = false;
      sync();
    }
  });
}

var editing = null;  // 지금 고치고 있는 메모

function makeButton(label, className, onClick) {
  var button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = label;
  button.addEventListener('click', onClick);
  return button;
}

function saveEdit(memo, text) {
  text = text.trim().slice(0, 200);
  if (!text) return;
  if (text !== memo.text) {
    memo.text = text;
    if (memo.id !== null) memo.dirty = true;
  }
  editing = null;
  save();
  renderMemos();
  sync();
}

function renderMemos() {
  memoList.innerHTML = '';
  state.memos.forEach(function (memo, i) {
    var li = document.createElement('li');

    if (memo === editing) {
      // 고치는 중: 입력칸 + 저장 + 취소
      var input = document.createElement('input');
      input.type = 'text';
      input.value = memo.text;
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.isComposing) saveEdit(memo, input.value);
        if (e.key === 'Escape') {
          editing = null;
          renderMemos();
        }
      });
      li.appendChild(input);
      li.appendChild(makeButton('저장', 'save', function () { saveEdit(memo, input.value); }));
      li.appendChild(makeButton('취소', 'cancel', function () {
        editing = null;
        renderMemos();
      }));
      memoList.appendChild(li);
      input.focus();
      return;
    }

    var span = document.createElement('span');
    span.textContent = memo.text;
    li.appendChild(span);
    li.appendChild(makeButton('수정', 'edit', function () {
      editing = memo;
      renderMemos();
    }));
    li.appendChild(makeButton('삭제', 'delete', function () {
      if (editing === memo) editing = null;
      state.memos.splice(state.memos.indexOf(memo), 1);
      if (memo.id !== null) state.deletes.push(memo.id);
      save();
      renderMemos();
      sync();
    }));
    memoList.appendChild(li);
  });
}

function addMemo() {
  var text = memoInput.value.trim().slice(0, 200);  // 표는 1~200자만 받는다
  if (!text) return;
  state.memos.push({ id: null, text: text });
  memoInput.value = '';
  save();
  renderMemos();
  sync();
}

// 카드(체크 칸)를 누르면
checkboxes.forEach(function (box) {
  box.addEventListener('change', function () {
    state.checked = [];
    checkboxes.forEach(function (b) {
      if (b.checked) state.checked.push(b.id);
    });
    save();
    updateProgress();
  });
});

// 점검표 안의 체크 칸을 누르면 (맨 위 진행률에는 넣지 않는다)
setupBoxes.forEach(function (box) {
  box.addEventListener('change', function () {
    state.setup = [];
    setupBoxes.forEach(function (b) {
      if (b.checked) state.setup.push(b.id);
    });
    save();
  });
});

// 섹션 제목을 누르면 접고 펼친다 (접은 섹션 번호를 저장해 둔다)
parts.forEach(function (part, i) {
  part.addEventListener('toggle', function () {
    state.closed = state.closed.filter(function (n) { return n !== i; });
    if (!part.open) state.closed.push(i);
    save();
  });
});

// 필터 버튼을 누르면
filterButtons.forEach(function (button, i) {
  button.addEventListener('click', function () {
    state.filter = i;
    save();
    applyFilter();
  });
});

// 메모 추가
memoButton.addEventListener('click', addMemo);
memoInput.addEventListener('keydown', function (e) {
  if (e.key === 'Enter') addMemo();
});

// 새로고침: 평소엔 📷, 누르는 동안엔 플래시가 터진 📸. 누르면 번쩍한 뒤 새로고침한다
function setIcon(flash) {
  refreshIcon.textContent = flash ? '📸' : '📷';
}
refreshButton.addEventListener('pointerdown', function () { setIcon(true); });
['pointerup', 'pointerleave', 'pointercancel'].forEach(function (name) {
  refreshButton.addEventListener(name, function () { setIcon(false); });
});
refreshButton.addEventListener('click', function () {
  setIcon(true);
  setTimeout(function () { location.reload(); }, 400);
});

// 초기화
resetButton.addEventListener('click', function () {
  if (!confirm('정말 초기화할까요? 체크와 메모가 모두 지워져요.')) return;
  var oldIds = state.memos.filter(function (m) { return m.id !== null; }).map(function (m) { return m.id; });
  state = { checked: [], setup: [], memos: [], deletes: state.deletes.concat(oldIds), closed: state.closed, filter: 0 };
  checkboxes.forEach(function (b) { b.checked = false; });
  setupBoxes.forEach(function (b) { b.checked = false; });
  save();
  updateProgress();
  applyFilter();
  renderMemos();
  sync();
});

// 처음 열 때: 저장해 둔 상태를 되살린다
load();
parts.forEach(function (part, i) {
  part.open = state.closed.indexOf(i) === -1;
});
checkboxes.forEach(function (b) {
  b.checked = state.checked.indexOf(b.id) !== -1;
});
setupBoxes.forEach(function (b) {
  b.checked = state.setup.indexOf(b.id) !== -1;
});
updateProgress();
applyFilter();
renderMemos();
sync();
window.addEventListener('online', sync);

// 인터넷이 없어도 열리도록 저장 담당 파일(sw.js)을 등록한다
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js').catch(function () {});
  });
}
