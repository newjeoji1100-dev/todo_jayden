// 누르면 무슨 일이 일어나는지 담당하는 파일
var STORAGE_KEY = 'jeju-checklist-v1';

var checkboxes = document.querySelectorAll('li[data-kind] input[type="checkbox"]');
var cuts = document.querySelectorAll('li[data-kind]');
var setupBoxes = document.querySelectorAll('details input[type="checkbox"]');
var progress = document.querySelector('header progress');
var progressText = progress.parentNode.lastChild;
var resetButton = document.querySelector('header button');
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

var state = { checked: [], setup: [], memos: [], filter: 0 };

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
      state.memos = saved.memos || [];
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

function renderMemos() {
  memoList.innerHTML = '';
  state.memos.forEach(function (text, i) {
    var li = document.createElement('li');
    var span = document.createElement('span');
    span.textContent = text;
    var del = document.createElement('button');
    del.type = 'button';
    del.textContent = '삭제';
    del.addEventListener('click', function () {
      state.memos.splice(i, 1);
      save();
      renderMemos();
    });
    li.appendChild(span);
    li.appendChild(del);
    memoList.appendChild(li);
  });
}

function addMemo() {
  var text = memoInput.value.trim();
  if (!text) return;
  state.memos.push(text);
  memoInput.value = '';
  save();
  renderMemos();
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

// 초기화
resetButton.addEventListener('click', function () {
  if (!confirm('정말 초기화할까요? 체크와 메모가 모두 지워져요.')) return;
  state = { checked: [], setup: [], memos: [], filter: 0 };
  checkboxes.forEach(function (b) { b.checked = false; });
  setupBoxes.forEach(function (b) { b.checked = false; });
  save();
  updateProgress();
  applyFilter();
  renderMemos();
});

// 처음 열 때: 저장해 둔 상태를 되살린다
load();
checkboxes.forEach(function (b) {
  b.checked = state.checked.indexOf(b.id) !== -1;
});
setupBoxes.forEach(function (b) {
  b.checked = state.setup.indexOf(b.id) !== -1;
});
updateProgress();
applyFilter();
renderMemos();

// 인터넷이 없어도 열리도록 저장 담당 파일(sw.js)을 등록한다
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js').catch(function () {});
  });
}
