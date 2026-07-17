const PUZZLES_DEMO = [
  {"frase":"Más vale tarde que nunca","fuente":"Refrán popular","filas":5,"cols":4,"bloqueadas":[],"letras":{"2,2":"M","2,3":"A","1,3":"S","0,3":"V","0,2":"A","1,2":"L","1,1":"E","0,1":"T","0,0":"A","1,0":"R","2,0":"D","2,1":"E","3,1":"Q","3,0":"U","4,0":"E","4,1":"N","4,2":"U","3,2":"N","3,3":"C","4,3":"A"},"inicio":[2,2],"solucion":[[2,2],[2,3],[1,3],[0,3],[0,2],[1,2],[1,1],[0,1],[0,0],[1,0],[2,0],[2,1],[3,1],[3,0],[4,0],[4,1],[4,2],[3,2],[3,3],[4,3]],"longitudesPalabras":[3,4,5,3,5]},
  {"frase":"Al mal tiempo buena cara","fuente":"Refrán popular","filas":5,"cols":4,"bloqueadas":[],"letras":{"1,2":"A","1,3":"L","0,3":"M","0,2":"A","0,1":"L","0,0":"T","1,0":"I","1,1":"E","2,1":"M","2,0":"P","3,0":"O","4,0":"B","4,1":"U","3,1":"E","3,2":"N","2,2":"A","2,3":"C","3,3":"A","4,3":"R","4,2":"A"},"inicio":[1,2],"solucion":[[1,2],[1,3],[0,3],[0,2],[0,1],[0,0],[1,0],[1,1],[2,1],[2,0],[3,0],[4,0],[4,1],[3,1],[3,2],[2,2],[2,3],[3,3],[4,3],[4,2]],"longitudesPalabras":[2,3,6,5,4]},
  {"frase":"Camarón que se duerme se lo lleva la corriente","fuente":"Refrán popular","filas":8,"cols":5,"bloqueadas":[[0,0],[2,3]],"letras":{"3,1":"C","3,0":"A","4,0":"M","4,1":"A","5,1":"R","5,0":"O","6,0":"N","7,0":"Q","7,1":"U","6,1":"E","6,2":"S","7,2":"E","7,3":"D","7,4":"U","6,4":"E","6,3":"R","5,3":"M","5,2":"E","4,2":"S","3,2":"E","2,2":"L","2,1":"O","2,0":"L","1,0":"L","1,1":"E","0,1":"V","0,2":"A","1,2":"L","1,3":"A","0,3":"C","0,4":"O","1,4":"R","2,4":"R","3,4":"I","3,3":"E","4,3":"N","4,4":"T","5,4":"E"},"inicio":[3,1],"solucion":[[3,1],[3,0],[4,0],[4,1],[5,1],[5,0],[6,0],[7,0],[7,1],[6,1],[6,2],[7,2],[7,3],[7,4],[6,4],[6,3],[5,3],[5,2],[4,2],[3,2],[2,2],[2,1],[2,0],[1,0],[1,1],[0,1],[0,2],[1,2],[1,3],[0,3],[0,4],[1,4],[2,4],[3,4],[3,3],[4,3],[4,4],[5,4]],"longitudesPalabras":[7,3,2,6,2,2,5,2,9]}
];

let PUZZLES = PUZZLES_DEMO;
let modoDemo = true;
let modoDios = false;

let puzzle = null;
let path = [];
let startTime = null;
let timerInterval = null;
let hintCount = 0;
let solved = false;
let CELL = 62;
let GAP = 6;
let PAD = 55;

function ajustarTamano() {
  const filas = puzzle.filas, cols = puzzle.cols;
  const esMovil = window.innerWidth < 800;
  if (esMovil) {
    const anchoDisp = Math.min(window.innerWidth - 12, 480);
    // espacio vertical aprox. ocupado por cabecera, hud, frase, boton, margenes
    // (reducido: en movil el HUD, el logo y los margenes son mas compactos,
    // asi que el tablero puede crecer mas)
    const altoReservado = 320;
    const altoDisp = Math.max(180, window.innerHeight - altoReservado);
    const padM = 12, gapM = 4;
    let celda = Math.floor(Math.min(
      (anchoDisp - 2 * padM - (cols - 1) * gapM) / cols,
      (altoDisp - 2 * padM - (filas - 1) * gapM) / filas
    ));
    celda = Math.max(26, Math.min(66, celda));
    CELL = celda; GAP = gapM; PAD = padM;
  } else {
    CELL = 62; GAP = 6; PAD = 55;
  }
}

const boardWrap = document.getElementById('boardWrap');
const timerEl = document.getElementById('timer');
const hintCountEl = document.getElementById('hintCount');
const phraseTxtEl = document.getElementById('phraseTxt');
const phraseSourceEl = document.getElementById('phraseSource');
const statusEl = document.getElementById('status');
const selectorEl = document.getElementById('selector');
const hintBtnEl = document.getElementById('hintBtn');

const shareOverlayEl = document.getElementById('shareOverlay');
const shareMedalEl = document.getElementById('shareMedal');
const shareFraseEl = document.getElementById('shareFrase');
const shareFuenteEl = document.getElementById('shareFuente');
const shareTimeEl = document.getElementById('shareTime');
const shareHintsEl = document.getElementById('shareHints');
const shareStreakEl = document.getElementById('shareStreak');
const shareNextEl = document.getElementById('shareNext');
const shareCopiedEl = document.getElementById('shareCopied');
const GAME_URL = 'https://TU-USUARIO.github.io/letraberinto/'; // cambia esto por tu URL real

let svg, gRects, gPath, gText;

function key(rc) { return rc[0] + ',' + rc[1]; }
function sameCell(a, b) { return a[0] === b[0] && a[1] === b[1]; }
function isAdjacent(a, b) { return (Math.abs(a[0]-b[0]) + Math.abs(a[1]-b[1])) === 1; }
function isBlocked(rc) { return puzzle.bloqueadas.some(b => sameCell(b, rc)); }
function inPath(rc) { return path.some(p => sameCell(p, rc)); }
function cellCenter(rc) {
  return { x: PAD + rc[1] * (CELL + GAP) + CELL / 2, y: PAD + rc[0] * (CELL + GAP) + CELL / 2 };
}

const NS = "http://www.w3.org/2000/svg";
function svgEl(tag, attrs) {
  const el = document.createElementNS(NS, tag);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  return el;
}

function loadPuzzle(idx) {
  puzzle = PUZZLES[idx];
  path = [];
  hintCount = 0;
  solved = false;
  startTime = null;
  clearInterval(timerInterval);
  timerEl.textContent = "00:00";
  hintCountEl.textContent = "0";
  statusEl.textContent = "";
  const pista = textoPista(puzzle);
  phraseSourceEl.textContent = pista;
  phraseSourceEl.classList.toggle('visible', !!pista);
  hintBtnEl.disabled = false;
  shareOverlayEl.classList.remove('visible');
  if (typeof countdownInterval !== 'undefined') clearInterval(countdownInterval);
  buildBoard();
  renderAll();
  [...selectorEl.children].forEach((b, i) => b.classList.toggle('active', i === idx));
  if (modoDios) {
    // vista previa instantanea de la frase resuelta, sin contar como partida jugada
    path = puzzle.solucion.slice();
    renderAll();
  }
}

function textoPista(p) {
  const partes = [];
  if (p.categoria) partes.push(p.categoria);
  if (p.fuente) partes.push(p.fuente);
  return partes.length ? `Pista: ${partes.join(' — ')}` : '';
}

function buildBoard() {
  ajustarTamano();
  const totalW = PAD * 2 + puzzle.cols * CELL + (puzzle.cols - 1) * GAP;
  const totalH = PAD * 2 + puzzle.filas * CELL + (puzzle.filas - 1) * GAP;

  boardWrap.innerHTML = "";
  svg = svgEl('svg', { width: totalW, height: totalH, viewBox: `0 0 ${totalW} ${totalH}` });

  gRects = svgEl('g', {});
  gPath = svgEl('g', { 'pointer-events': 'none' });
  gText = svgEl('g', {});
  svg.appendChild(gRects);
  svg.appendChild(gPath);
  svg.appendChild(gText);
  boardWrap.appendChild(svg);

  for (let r = 0; r < puzzle.filas; r++) {
    for (let c = 0; c < puzzle.cols; c++) {
      const rc = [r, c];
      const x = PAD + c * (CELL + GAP);
      const y = PAD + r * (CELL + GAP);
      const blocked = isBlocked(rc);
      const rect = svgEl('rect', {
        x, y, width: CELL, height: CELL, rx: 10,
        fill: blocked ? 'var(--blocked)' : 'var(--cell)',
        stroke: blocked ? '#000' : 'var(--cell-border)',
        'stroke-width': 2,
        'data-r': r, 'data-c': c, 'data-blocked': blocked ? '1' : '0'
      });
      rect.classList.add('cell-rect');
      gRects.appendChild(rect);

      if (!blocked) {
        const t = svgEl('text', {
          x: x + CELL / 2, y: y + CELL / 2 + 8,
          'text-anchor': 'middle', 'font-size': Math.round(CELL * 0.42), 'font-weight': 800,
          fill: 'var(--ink)', 'pointer-events': 'none'
        });
        t.textContent = puzzle.letras[key(rc)] || "";
        gText.appendChild(t);

        if (sameCell(rc, puzzle.inicio)) {
          const ring = svgEl('circle', {
            cx: x + CELL / 2, cy: y + CELL / 2, r: CELL * 0.34,
            fill: 'none', stroke: 'var(--start-ring)', 'stroke-width': 4,
            'pointer-events': 'none'
          });
          gText.appendChild(ring);
        }
      }
    }
  }
}

function renderCellFills() {
  [...gRects.children].forEach(rect => {
    if (rect.dataset.blocked === '1') return;
    const rc = [parseInt(rect.dataset.r), parseInt(rect.dataset.c)];
    rect.setAttribute('fill', inPath(rc) ? 'var(--cell-used)' : 'var(--cell)');
  });
}

function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function pointTowards(from, to, r) {
  const dx = to.x - from.x, dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: from.x + dx / len * r, y: from.y + dy / len * r };
}

function buildSmoothPath(pts, radius) {
  if (pts.length < 2) return '';
  if (pts.length === 2) return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;
  let d = `M ${pts[0].x} ${pts[0].y} `;
  for (let i = 1; i < pts.length - 1; i++) {
    const prev = pts[i - 1], curr = pts[i], next = pts[i + 1];
    const r = Math.min(radius, dist(prev, curr) / 2, dist(curr, next) / 2);
    const p1 = pointTowards(curr, prev, r);
    const p2 = pointTowards(curr, next, r);
    d += `L ${p1.x} ${p1.y} Q ${curr.x} ${curr.y} ${p2.x} ${p2.y} `;
  }
  const lastPt = pts[pts.length - 1];
  d += `L ${lastPt.x} ${lastPt.y}`;
  return d;
}

function calcularDireccionSalida(rc, filas, cols, direccionLlegada) {
  const [r, c] = rc;
  const candidatas = [];
  if (r === 0) candidatas.push({ x: 0, y: -1 });        // arriba
  if (r === filas - 1) candidatas.push({ x: 0, y: 1 });  // abajo
  if (c === 0) candidatas.push({ x: -1, y: 0 });         // izquierda
  if (c === cols - 1) candidatas.push({ x: 1, y: 0 });   // derecha
  if (candidatas.length === 0) return direccionLlegada;  // no deberia pasar
  if (candidatas.length === 1) return candidatas[0];
  // celda de esquina (toca dos bordes): si la llegada ya apunta a uno
  // de los bordes validos, seguir recto por ahi; si no, usar el primero.
  for (const cand of candidatas) {
    if (cand.x === direccionLlegada.x && cand.y === direccionLlegada.y) return cand;
  }
  return candidatas[0];
}

function renderArrow() {
  gPath.innerHTML = "";
  if (path.length === 0) return;

  let pts = path.map(cellCenter);
  let tipDir = null; // direccion conocida para la punta, si aplica

  if (solved && pts.length >= 2) {
    const lastRC = path[path.length - 1];
    const last = pts[pts.length - 1];
    const prev = pts[pts.length - 2];
    const dx = last.x - prev.x, dy = last.y - prev.y;
    const len = Math.hypot(dx, dy) || 1;
    const llegada = { x: Math.round(dx / len), y: Math.round(dy / len) };
    const salida = calcularDireccionSalida(lastRC, puzzle.filas, puzzle.cols, llegada);
    tipDir = salida;
    pts = pts.concat([{ x: last.x + salida.x * (PAD * 0.82), y: last.y + salida.y * (PAD * 0.82) }]);
  }

  if (pts.length < 2) {
    const p = pts[0];
    gPath.appendChild(svgEl('circle', { cx: p.x, cy: p.y, r: 7, fill: '#4f7ea8' }));
    return;
  }

  const tip = pts[pts.length - 1];
  let ux, uy;
  if (tipDir) {
    // direccion conocida (salida por el borde correcto), no se infiere
    // de los puntos para evitar el efecto del redondeo de esquinas
    ux = tipDir.x; uy = tipDir.y;
  } else {
    const beforeTip = pts[pts.length - 2];
    const dx = tip.x - beforeTip.x, dy = tip.y - beforeTip.y;
    const segLen = Math.hypot(dx, dy) || 1;
    ux = dx / segLen; uy = dy / segLen;
  }

  const ARROW_LEN = CELL * 0.32, ARROW_HALF_WIDTH = CELL * 0.19;
  const shaftEnd = { x: tip.x - ux * ARROW_LEN, y: tip.y - uy * ARROW_LEN };

  // el eje del trazo se detiene justo antes de la punta, para que no
  // sobresalga nada por detras de la flecha. La ultima celda real queda
  // como punto interior, asi que el redondeo de esquinas dobla el trazo
  // automaticamente hacia la salida correcta si hace falta.
  const shaftPts = pts.slice(0, -1).concat([shaftEnd]);
  const d = buildSmoothPath(shaftPts, CELL * 0.4);
  const line = svgEl('path', {
    d, fill: 'none', stroke: '#4f7ea8', 'stroke-width': Math.max(4, Math.round(CELL * 0.13)),
    'stroke-linecap': 'butt', 'stroke-linejoin': 'round', opacity: 0.92
  });
  gPath.appendChild(line);

  // triangulo de la punta, calculado a mano (sin depender de <marker>)
  const perpX = -uy, perpY = ux;
  const leftX = shaftEnd.x + perpX * ARROW_HALF_WIDTH, leftY = shaftEnd.y + perpY * ARROW_HALF_WIDTH;
  const rightX = shaftEnd.x - perpX * ARROW_HALF_WIDTH, rightY = shaftEnd.y - perpY * ARROW_HALF_WIDTH;
  const triangle = svgEl('polygon', {
    points: `${tip.x},${tip.y} ${leftX},${leftY} ${rightX},${rightY}`,
    fill: '#4f7ea8', opacity: 0.92
  });
  gPath.appendChild(triangle);
}

function palabraFormateada() {
  const longitudes = puzzle.longitudesPalabras;
  const letrasTrazadas = path.map(rc => puzzle.letras[key(rc)]);
  let out = [];
  let idx = 0;
  for (const len of longitudes) {
    if (idx >= letrasTrazadas.length) break;
    const trozo = letrasTrazadas.slice(idx, idx + len).join("");
    out.push(trozo);
    idx += len;
  }
  return out.join(" ");
}

function renderPhrase() {
  const texto = palabraFormateada();
  if (texto.length === 0) {
    phraseTxtEl.textContent = "···";
    phraseTxtEl.className = "txt empty";
  } else {
    phraseTxtEl.textContent = texto;
    phraseTxtEl.className = "txt" + (solved ? " solved" : "");
  }
}

function renderAll() {
  renderCellFills();
  renderArrow();
  renderPhrase();
}

function startTimerIfNeeded() {
  if (startTime === null) {
    startTime = Date.now();
    timerInterval = setInterval(updateTimer, 250);
  }
}
function updateTimer() {
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');
  timerEl.textContent = `${mm}:${ss}`;
}

function checkWin() {
  if (path.length !== puzzle.solucion.length) return false;
  return path.every((p, i) => sameCell(p, puzzle.solucion[i]));
}

function onWin() {
  solved = true;
  clearInterval(timerInterval);
  statusEl.textContent = `Resuelto con ${hintCount} pista(s).`;
  renderAll();
  setTimeout(mostrarPantallaCompartir, 950);
}

// --- racha de dias jugados (localStorage) ---
const STREAK_KEY = 'letraberinto_racha';

function fechaStr(date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function actualizarRacha() {
  const hoy = new Date();
  const ayer = new Date(hoy);
  ayer.setDate(hoy.getDate() - 1);
  const hoyStr = fechaStr(hoy);
  const ayerStr = fechaStr(ayer);

  let datos;
  try {
    datos = JSON.parse(localStorage.getItem(STREAK_KEY)) || { ultimaFecha: null, racha: 0 };
  } catch (e) {
    datos = { ultimaFecha: null, racha: 0 };
  }

  if (datos.ultimaFecha === hoyStr) {
    // ya contaba hoy (no debería pasar salvo doble victoria), no tocar
  } else if (datos.ultimaFecha === ayerStr) {
    datos.racha += 1;
  } else {
    datos.racha = 1;
  }
  datos.ultimaFecha = hoyStr;
  localStorage.setItem(STREAK_KEY, JSON.stringify(datos));
  return datos.racha;
}

function calcularMedalla(pistas) {
  if (pistas === 0) return { emoji: '🥇', texto: '¡Perfecto, sin pistas!' };
  if (pistas <= 2) return { emoji: '🥈', texto: '¡Muy bien resuelto!' };
  return { emoji: '🥉', texto: '¡Escapaste igualmente!' };
}

function msHastaManana() {
  const ahora = new Date();
  const manana = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + 1, 0, 0, 0);
  return manana - ahora;
}

let countdownInterval = null;
function actualizarCountdown() {
  const ms = msHastaManana();
  const h = String(Math.floor(ms / 3600000)).padStart(2, '0');
  const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0');
  const s = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0');
  shareNextEl.textContent = `Próximo laberinto en ${h}:${m}:${s}`;
}

function construirTextoCompartir(tiempoTxt, pistas, racha, medalla) {
  const lineas = [
    `Letraberinto ${medalla.emoji}`,
    `⏱ ${tiempoTxt} · 💡 ${pistas} pista${pistas === 1 ? '' : 's'} · 🔥 racha ${racha}`,
    GAME_URL,
  ];
  return lineas.join('\n');
}

function mostrarPantallaCompartir() {
  const tiempoTxt = timerEl.textContent;
  const racha = actualizarRacha();
  const medalla = calcularMedalla(hintCount);

  shareMedalEl.textContent = medalla.emoji;
  shareFraseEl.textContent = puzzle.frase;
  shareFuenteEl.textContent = puzzle.fuente ? `— ${puzzle.fuente}` : '';
  shareTimeEl.textContent = tiempoTxt;
  shareHintsEl.textContent = hintCount;
  shareStreakEl.textContent = racha;
  shareCopiedEl.textContent = '';

  actualizarCountdown();
  clearInterval(countdownInterval);
  countdownInterval = setInterval(actualizarCountdown, 1000);

  shareOverlayEl.classList.add('visible');

  shareOverlayEl.dataset.tiempo = tiempoTxt;
  shareOverlayEl.dataset.racha = racha;
  shareOverlayEl.dataset.medalla = medalla.emoji;
}

document.getElementById('closeShareBtn').addEventListener('click', () => {
  shareOverlayEl.classList.remove('visible');
  clearInterval(countdownInterval);
});

document.getElementById('shareBtn').addEventListener('click', async () => {
  const tiempoTxt = shareOverlayEl.dataset.tiempo;
  const racha = shareOverlayEl.dataset.racha;
  const medalla = { emoji: shareOverlayEl.dataset.medalla };
  const texto = construirTextoCompartir(tiempoTxt, hintCount, racha, medalla);

  if (navigator.share) {
    try {
      await navigator.share({ text: texto });
      return;
    } catch (e) {
      // el usuario cancelo el share nativo, o no soportado: seguir al portapapeles
    }
  }
  try {
    await navigator.clipboard.writeText(texto);
    shareCopiedEl.textContent = '✓ Copiado al portapapeles';
  } catch (e) {
    shareCopiedEl.textContent = 'No se pudo copiar automáticamente.';
  }
});

let dragging = false;

function cellAt(clientX, clientY) {
  const el = document.elementFromPoint(clientX, clientY);
  if (!el || !el.classList || !el.classList.contains('cell-rect')) return null;
  if (el.dataset.blocked === '1') return null;
  return [parseInt(el.dataset.r), parseInt(el.dataset.c)];
}

function handleStart(clientX, clientY) {
  if (solved) return;
  const rc = cellAt(clientX, clientY);
  if (!rc) return;
  if (path.length === 0) {
    if (!sameCell(rc, puzzle.inicio)) return;
    path = [rc];
    dragging = true;
    boardWrap.style.touchAction = 'none';
    startTimerIfNeeded();
    renderAll();
  } else {
    const last = path[path.length - 1];
    if (sameCell(rc, last)) {
      dragging = true;
      boardWrap.style.touchAction = 'none';
    }
  }
}

function handleMove(clientX, clientY) {
  if (!dragging || solved) return;
  const rc = cellAt(clientX, clientY);
  if (!rc) return;
  const last = path[path.length - 1];
  if (sameCell(rc, last)) return;

  if (path.length >= 2 && sameCell(rc, path[path.length - 2])) {
    path.pop();
    renderAll();
    return;
  }
  if (!isAdjacent(rc, last)) return;
  if (inPath(rc)) return;

  path.push(rc);
  renderAll();
  if (checkWin()) onWin();
}

function handleEnd() {
  dragging = false;
  boardWrap.style.touchAction = 'pan-y';
}

boardWrap.addEventListener('pointerdown', e => {
  const wasDragging = dragging;
  handleStart(e.clientX, e.clientY);
  if (dragging) e.preventDefault();
});
document.addEventListener('pointermove', e => {
  if (!dragging) return;
  e.preventDefault();
  // usar eventos coalescados (si el navegador los ofrece) para no perder
  // celdas cuando el dedo se mueve muy rapido entre dos frames
  const eventos = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
  for (const ev of eventos) handleMove(ev.clientX, ev.clientY);
});
document.addEventListener('pointerup', handleEnd);
document.addEventListener('pointercancel', handleEnd);
// respaldo para bloquear el scroll accidental mientras se arrastra el dedo,
// en navegadores donde touch-action por si solo no evite el scroll
boardWrap.addEventListener('touchmove', e => { if (dragging) e.preventDefault(); }, { passive: false });

let hintAnimating = false;

hintBtnEl.addEventListener('click', () => {
  if (solved || hintAnimating) return;
  startTimerIfNeeded();
  const sol = puzzle.solucion;

  let L = 0;
  while (L < path.length && L < sol.length && sameCell(path[L], sol[L])) L++;

  hintCount++;
  hintCountEl.textContent = hintCount;

  if (L < path.length) {
    hintAnimating = true;
    hintBtnEl.disabled = true;
    const undoInterval = setInterval(() => {
      path.pop();
      renderAll();
      if (path.length === L) {
        clearInterval(undoInterval);
        hintAnimating = false;
        hintBtnEl.disabled = false;
      }
    }, 260);
  } else if (L < sol.length) {
    const siguiente = sol[L];
    path.push(siguiente);
    renderAll();
    if (checkWin()) onWin();
  }
});

document.getElementById('resetBtn').addEventListener('click', () => {
  if (solved) return;
  path = [];
  renderAll();
});

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// mezcla la semilla antes de usarla: mulberry32 no distribuye bien
// semillas consecutivas (10,11,12...), esto evita que dias seguidos
// tiendan a elegir el mismo puzzle
function mezclarSeed(n) {
  n = Math.imul(n ^ (n >>> 16), 2246822507);
  n = Math.imul(n ^ (n >>> 13), 3266489909);
  return (n ^ (n >>> 16)) >>> 0;
}

// dias desde epoch (UTC), en dia LOCAL del jugador — igual que el conteo
// tipo Wordle, se usa como seed para que el puzzle sea el mismo para
// todo el mundo ese dia, pero elegido "al azar" (no secuencial) del total
function diaEpoch() {
  const hoy = new Date();
  const utcMedianoche = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  return Math.floor(utcMedianoche / 86400000);
}

function indiceDelDia(total) {
  const rng = mulberry32(mezclarSeed(diaEpoch()));
  return Math.floor(rng() * total);
}

function construirSelectorDemo() {
  selectorEl.innerHTML = '';
  const aviso = document.createElement('div');
  aviso.className = 'demo-aviso';
  aviso.textContent = 'Modo de prueba: no se encontró puzzles.json, usando puzzles de ejemplo.';
  selectorEl.appendChild(aviso);
  PUZZLES.forEach((p, i) => {
    const b = document.createElement('button');
    b.textContent = `Puzzle ${i + 1} (${Object.keys(p.letras).length} letras)`;
    b.addEventListener('click', () => loadPuzzle(i));
    selectorEl.appendChild(b);
  });
}

async function initApp() {
  try {
    const resp = await fetch('./puzzles.json', { cache: 'no-store' });
    if (!resp.ok) throw new Error('puzzles.json no encontrado');
    const datos = await resp.json();
    if (!Array.isArray(datos) || datos.length === 0) throw new Error('puzzles.json vacío');
    PUZZLES = datos;
    modoDemo = false;
    selectorEl.innerHTML = '';
    loadPuzzle(indiceDelDia(PUZZLES.length));
  } catch (err) {
    // sin servidor (ej. abierto con doble clic) o sin archivo todavia: usar demo
    PUZZLES = PUZZLES_DEMO;
    modoDemo = true;
    construirSelectorDemo();
    loadPuzzle(0);
  }
}

let resizeTimeout = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    if (puzzle) { buildBoard(); renderAll(); }
  }, 200);
});

// --- modo dios: activar con el codigo Konami o 6 clics en el logo ---
// Muestra un selector con TODAS las frases (aunque haya puzzles.json real)
// y precarga cada una ya resuelta, para poder revisar rapido como queda
// el texto/fuente de cada frase sin tener que jugarla entera.
function construirSelectorGodMode() {
  selectorEl.innerHTML = '';
  const aviso = document.createElement('div');
  aviso.className = 'demo-aviso';
  aviso.textContent = '🔓 Modo dios: vista previa de todas las frases.';
  selectorEl.appendChild(aviso);
  PUZZLES.forEach((p, i) => {
    const b = document.createElement('button');
    b.textContent = `${i + 1}`;
    b.title = [p.categoria, p.fuente].filter(Boolean).join(' — ');
    b.addEventListener('click', () => loadPuzzle(i));
    selectorEl.appendChild(b);
  });
}

function activarModoDios() {
  modoDios = !modoDios;
  if (modoDios) {
    construirSelectorGodMode();
    loadPuzzle(0);
  } else {
    selectorEl.innerHTML = '';
    initApp();
  }
}

const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];
let konamiPos = 0;
document.addEventListener('keydown', e => {
  if (e.code === KONAMI[konamiPos]) {
    konamiPos++;
    if (konamiPos === KONAMI.length) {
      konamiPos = 0;
      activarModoDios();
    }
  } else {
    konamiPos = e.code === KONAMI[0] ? 1 : 0;
  }
});

let logoClicks = 0;
let logoClickTimeout = null;
const logoImgEl = document.querySelector('.logo-wrap img');
if (logoImgEl) {
  logoImgEl.addEventListener('click', () => {
    logoClicks++;
    clearTimeout(logoClickTimeout);
    logoClickTimeout = setTimeout(() => { logoClicks = 0; }, 2500);
    if (logoClicks >= 6) {
      logoClicks = 0;
      activarModoDios();
    }
  });
}

initApp();
