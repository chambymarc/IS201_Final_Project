const ROWS = 6;
let COLS = 5; // will be set per-game (5-7)

const board = document.getElementById('board');
const keyboard = document.getElementById('keyboard');
const message = document.getElementById('message');
const newGameBtn = document.getElementById('newGame');
const lengthSelect = document.getElementById('wordLength');

let answer = '';
let row = 0;
let col = 0;
let grid = [];
let allowedSet = new Set();
window.ALLOWED_BY_LEN = { '5': [], '6': [], '7': [] };

function initBoard(){
  board.innerHTML = '';
  updateTileSize();
  grid = Array.from({length: ROWS}, ()=>Array(COLS).fill(''));
  for(let r=0;r<ROWS;r++){
    const rowEl = document.createElement('div');
    rowEl.className = 'row';
    for(let c=0;c<COLS;c++){
      const t = document.createElement('div');
      t.className = 'tile';
      t.setAttribute('data-row',r);
      t.setAttribute('data-col',c);
      // set size from CSS variable if provided
      t.style.width = getComputedStyle(board).getPropertyValue('--tile-size') || '';
      t.style.height = getComputedStyle(board).getPropertyValue('--tile-size') || '';
      rowEl.appendChild(t);
    }
    board.appendChild(rowEl);
  }
}

function initKeyboard(){
  const rows = ['QWERTYUIOP','ASDFGHJKL','ZXCVBNM'];
  keyboard.innerHTML = '';
  rows.forEach((r,idx)=>{
    const rowEl = document.createElement('div');
    rowEl.className = 'key-row';
    if(idx===2){
      const enter = keyEl('ENTER','wide'); rowEl.appendChild(enter);
    }
    for(const ch of r){ rowEl.appendChild(keyEl(ch)); }
    if(idx===2){
      const back = keyEl('⌫','wide'); rowEl.appendChild(back);
    }
    keyboard.appendChild(rowEl);
  });
}

function keyEl(label,extra){
  const k = document.createElement('div');
  k.className = 'key' + (extra? ' '+extra:'');
  k.textContent = label;
  k.addEventListener('click', ()=>handleKey(label));
  return k;
}

function setMessage(msg, timeout=2500){
  message.textContent = msg;
  if(timeout>0) setTimeout(()=>{ if(message.textContent===msg) message.textContent=''; }, timeout);
}

function handleKey(key){
  if(key === 'ENTER') return submit();
  if(key === '⌫') return backspace();
  insert(key);
}

function insert(letter){
  if(col>=COLS || row>=ROWS) return;
  letter = letter.toUpperCase();
  grid[row][col] = letter;
  const tile = getTile(row,col);
  tile.textContent = letter;
  col++;
}

function backspace(){
  if(col<=0) return;
  col--;
  grid[row][col] = '';
  getTile(row,col).textContent = '';
}

function submit(){
  if(col !== COLS){ setMessage('Not enough letters'); return; }
  const guess = grid[row].join('');
  if(guess.length !== COLS){ setMessage('Not correct length'); return; }
  if(!allowedSet.has(guess) && !(window.JAZZ_ANSWERS||[]).includes(guess)){
    setMessage('Not in word list'); return;
  }
  reveal(guess);
}

function reveal(guess){
  const answerArr = answer.split('');
  const tiles = [];
  for(let c=0;c<COLS;c++) tiles.push(getTile(row,c));

  // compute feedback
  const result = Array(COLS).fill('absent');
  const used = Array(COLS).fill(false);
  // Greens
  for(let i=0;i<COLS;i++){
    if(guess[i] === answer[i]){ result[i]='correct'; used[i]=true; }
  }
  // Yellows
  for(let i=0;i<COLS;i++){
    if(result[i]==='correct') continue;
    for(let j=0;j<COLS;j++){
      if(!used[j] && guess[i]===answer[j]){ result[i]='present'; used[j]=true; break; }
    }
  }

  // flip animation + apply classes
  tiles.forEach((t,i)=>{
    t.classList.add('flip');
    setTimeout(()=>{
      t.classList.remove('flip');
      t.classList.add(result[i]);
      updateKey(guess[i], result[i]);
    }, i*220);
  });

  // after reveal
  setTimeout(()=>{
    if(result.every(r=>r==='correct')){
      setMessage('You win!');
      row = ROWS; // lock
      return;
    }
    row++; col=0;
    if(row>=ROWS){
      setMessage('Game over — answer: ' + answer);
    }
  }, COLS*240);
}

function updateKey(letter, status){
  letter = letter.toUpperCase();
  const keys = Array.from(document.querySelectorAll('.key'));
  const key = keys.find(k=>k.textContent===letter);
  if(!key) return;
  if(key.classList.contains('correct')) return;
  if(status === 'correct'){ key.classList.remove('present','absent'); key.classList.add('correct'); }
  else if(status === 'present'){ if(!key.classList.contains('correct')) key.classList.add('present'); }
  else { if(!key.classList.contains('correct') && !key.classList.contains('present')) key.classList.add('absent'); }
}

function getTile(r,c){ return board.querySelector(`.tile[data-row="${r}"][data-col="${c}"]`); }

function newGame(){
  // set columns from selector
  COLS = parseInt(lengthSelect.value,10) || 5;
  initBoard(); initKeyboard();
  row=0; col=0;
  // choose an answer that matches the length
  const pool = (window.JAZZ_ANSWERS||[]).filter(w=>w.length === COLS);
  if(pool.length===0){
    // fallback: pick any and pad/truncate (shouldn't happen with a curated list)
    answer = (window.JAZZ_ANSWERS||[])[Math.floor(Math.random()* (window.JAZZ_ANSWERS||[]).length)] || 'JAZZY';
  } else {
    answer = pool[Math.floor(Math.random()*pool.length)];
  }
  message.textContent = '';
}

// physical keyboard
document.addEventListener('keydown', e=>{
  if(e.key === 'Enter') handleKey('ENTER');
  else if(e.key === 'Backspace') handleKey('⌫');
  else if(e.key.match(/^[a-z]$/i)) handleKey(e.key.toUpperCase());
});

newGameBtn.addEventListener('click', newGame);

// adjust tile sizing on resize
window.addEventListener('resize', ()=>{
  updateTileSize();
  // rebuild board sizing without clearing progress
  const currentRow = row; const currentCol = col; initBoard();
});

// init on load: fetch allowed words then start
async function loadAllowedAndStart(){
  // If `allowed_words.js` was included, it will have populated `window.ALLOWED_BY_LEN`.
  if(window.ALLOWED_BY_LEN && (window.ALLOWED_BY_LEN['5']||[]).length){
    window.JAZZ_ALLOWED = [...(window.ALLOWED_BY_LEN['5']||[]), ...(window.ALLOWED_BY_LEN['6']||[]), ...(window.ALLOWED_BY_LEN['7']||[])];
    allowedSet = new Set(window.JAZZ_ALLOWED);
  } else {
    try{
      const resp = await fetch('js/allowed_words.json');
      const data = await resp.json();
      window.ALLOWED_BY_LEN = data;
      window.JAZZ_ALLOWED = [...(data['5']||[]), ...(data['6']||[]), ...(data['7']||[])];
      allowedSet = new Set(window.JAZZ_ALLOWED);
    }catch(e){
      console.error('Failed to load allowed words:', e);
      // fallback to any existing in-window list
      window.JAZZ_ALLOWED = window.JAZZ_ALLOWED || [];
      allowedSet = new Set(window.JAZZ_ALLOWED);
      // Inform the user (persistent) about the missing full wordlist and how to fix
      setMessage('Full wordlist failed to load. Serve the site with a local web server (e.g. `python3 -m http.server`) to enable the full dictionary.', 0);
    }
  }
  initBoard(); initKeyboard(); newGame();
}

loadAllowedAndStart();

function updateTileSize(){
  // compute a tile size so the board fits nicely in the max container width
  const maxContainer = Math.min(window.innerWidth - 48, 620);
  const gap = 8 * (COLS - 1);
  const available = Math.max(200, maxContainer - gap - 40);
  const tileSize = Math.max(36, Math.min(64, Math.floor(available / COLS)));
  board.style.setProperty('--tile-size', tileSize + 'px');
  board.style.setProperty('--cols', String(COLS));
}
