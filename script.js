// =========================
// CONFIG: edit these only
// =========================
const CONFIG = {
  // Step 1: One image split into tiles
  captcha: {
    imageSrc: "assets/captcha/group.jpg",
    rows: 3,
    cols: 3,
    // Indices are 0..(rows*cols-1), row-major:
    // 0 1 2
    // 3 4 5
    // 6 7 8
    lauraTiles: [4, 7], // <-- YOU EDIT THIS to match where Laura is
  },

  // Step 2: Code output
  codeQuestion: {
    languageLabel: "JavaScript",
    code: `const a = [1,2,3];
const b = a;
b.push(4);
console.log(a.length);`,
    choices: ["3", "4", "undefined", "TypeError"],
    correctIndex: 1,
  },

  // Step 3: Ranking
  ranking: {
    prompt: "Rank the following programmers from best → worst.",
    // Shown as draggable items
    items: [
      "Guido van Rossum",
      "Egor",
      "Linus Torvalds",
      "Laura",
      "Mark Zuckerberg",
    ],
    // NEW: only these two must be top-2 (any order)
    topTwoMustBe: ["Egor", "Laura"],
  },

  // Step 4: Bugs to trash
  bugs: {
    prompt: "Drag all REAL bugs into the trash.",
    contextCode: `function sum(arr){
  let s = 0;
  for (let i = 0; i <= arr.length; i++){
    s += arr[i];
  }
  return s;
}`,
    cards: [
      { id: "offbyone", text: "`i <= arr.length` (off-by-one)", isBug: true },
      { id: "arrread", text: "`arr[i]` becomes undefined at the end", isBug: true },
      { id: "semicolons", text: "Missing semicolons", isBug: false },
      { id: "name", text: "Function name is `sum` (too generic)", isBug: false },
      { id: "var", text: "`let s = 0` should be `var s = 0`", isBug: false },
    ],
  },

  // Step 5: Two truths and a lie
  truths: {
    prompt: "Two truths and a lie. Select the lie to continue.",
    statements: [
      "Laura once fixed a bug in under 30 seconds.",
      "Laura secretly prefers Vim over all other editors.",
      "Laura has written code at 2 AM and called it 'productive'.",
    ],
    lieIndex: 1, // <-- YOU EDIT THIS (0,1,2)
  },

  // Final screen placeholder message
  final: {
    title: "Verification complete",
    // Leave as placeholder; you’ll fill in later:
    placeholderText:
      "TODO: Put your birthday message here.\n\nIdeas:\n- A sweet message\n- An inside joke\n- A link to a gift\n- A 'press for confetti' button 😄",
  },
};

// =========================
// App state & helpers
// =========================
const TOTAL_STEPS = 5; // not counting intro & success
let step = 0; // 0=intro, 1..5=questions, 6=success

const screenRoot = document.getElementById("screenRoot");
const progressFill = document.getElementById("progressFill");
const stepLabel = document.getElementById("stepLabel");
const spinner = document.getElementById("spinner");

// Step-local state
let captchaSelected = new Set();
let codeChoice = null;
let rankingOrder = []; // array of strings
let bugTrash = new Set(); // card ids in trash
let truthChoice = null;

function setSpinner(on){
  spinner.classList.toggle("on", !!on);
}

function setProgress(){
  // Intro: 0%
  // Steps 1..5: (step-1)/(TOTAL_STEPS) -> fill up gradually
  // Success: 100%
  let pct = 0;
  if (step >= 1 && step <= TOTAL_STEPS){
    pct = Math.round(((step - 1) / TOTAL_STEPS) * 100);
  } else if (step > TOTAL_STEPS){
    pct = 100;
  }
  progressFill.style.width = `${pct}%`;

  if (step === 0) stepLabel.textContent = `Step 0 of ${TOTAL_STEPS}`;
  else if (step >= 1 && step <= TOTAL_STEPS) stepLabel.textContent = `Step ${step} of ${TOTAL_STEPS}`;
  else stepLabel.textContent = `Done`;
}

function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

async function fakeCheck(){
  setSpinner(true);
  await sleep(550 + Math.random()*450);
  setSpinner(false);
}

function showNotice(el, msg){
  el.textContent = msg;
  el.classList.add("show");
  el.classList.remove("pulse");
  // reflow to retrigger animation
  void el.offsetWidth;
  el.classList.add("pulse");
}

function hideNotice(el){
  el.classList.remove("show");
}

// =========================
// Rendering
// =========================
function render(){
  setProgress();

  if (step === 0) return renderIntro();
  if (step === 1) return renderCaptcha();
  if (step === 2) return renderCode();
  if (step === 3) return renderRanking();
  if (step === 4) return renderBugs();
  if (step === 5) return renderTruths();
  return renderSuccess();
}

function renderIntro(){
  screenRoot.innerHTML = `
    <h1>Before you can access your birthday card…</h1>
    <p>Please prove that you are <b>not not Laura</b>.</p>
    <div class="panel" style="margin-top:12px">
      <p style="margin:0;color:var(--muted)">
        This helps us prevent automated birthday wishes and other suspicious behavior.
      </p>
    </div>
    <div class="actions">
      <button class="btn primary" id="startBtn">PROVE</button>
    </div>
  `;
  document.getElementById("startBtn").addEventListener("click", async () => {
    step = 1;
    captchaSelected = new Set();
    await fakeCheck();
    render();
  });
}

function renderCaptcha(){
  const { rows, cols, imageSrc } = CONFIG.captcha;
  const total = rows * cols;

  // Build tile buttons; each tile shows the same image but with shifted background-position.
  const tilesHtml = Array.from({ length: total }, (_, i) => {
    const r = Math.floor(i / cols);
    const c = i % cols;

    const bgX = cols === 1 ? 0 : (c / (cols - 1)) * 100;
    const bgY = rows === 1 ? 0 : (r / (rows - 1)) * 100;

    const selectedClass = captchaSelected.has(i) ? "selected" : "";
    return `
      <button class="tile ${selectedClass}"
        data-idx="${i}"
        style="
          background-image: url('${imageSrc}');
          background-size: ${cols * 100}% ${rows * 100}%;
          background-position: ${bgX}% ${bgY}%;
        "
        aria-label="tile ${i}"
      ></button>
    `;
  }).join("");

  screenRoot.innerHTML = `
    <div class="captchaWrap">
      <div class="captchaHeader">
        <div>
          <h2>Select all squares with Laura</h2>
          <p class="hint">If there are none, click Verify. (But there totally are.)</p>
        </div>
        <div class="hint">(${rows}×${cols})</div>
      </div>

      <div class="captchaGrid" id="captchaGrid"
        style="grid-template-columns: repeat(${cols}, 1fr); grid-template-rows: repeat(${rows}, 1fr);">
        ${tilesHtml}
      </div>

      <div class="notice" id="captchaNotice"></div>

      <div class="actions">
        <button class="btn ghost" id="captchaReset">Reset</button>
        <button class="btn primary" id="captchaVerify">VERIFY</button>
      </div>
    </div>
  `;

  const grid = document.getElementById("captchaGrid");
  const notice = document.getElementById("captchaNotice");

  grid.querySelectorAll(".tile").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.idx);
      if (captchaSelected.has(idx)) captchaSelected.delete(idx);
      else captchaSelected.add(idx);
      hideNotice(notice);
      renderCaptcha(); // re-render to update selected visuals
    });
  });

  document.getElementById("captchaReset").addEventListener("click", () => {
    captchaSelected = new Set();
    hideNotice(notice);
    renderCaptcha();
  });

  document.getElementById("captchaVerify").addEventListener("click", async () => {
    hideNotice(notice);
    await fakeCheck();

    const correct = new Set(CONFIG.captcha.lauraTiles);
    const sameSize = captchaSelected.size === correct.size;
    const allMatch = sameSize && [...captchaSelected].every(x => correct.has(x));

    if (!allMatch){
      showNotice(notice, "Hmm… verification failed. Please try again.");
      // Infinite tries: stay here
      return;
    }
    step = 2;
    codeChoice = null;
    render();
  });
}

function renderCode(){
  const q = CONFIG.codeQuestion;

  const choices = q.choices.map((txt, i) => {
    const cls = (codeChoice === i) ? "choice selected" : "choice";
    return `<button class="${cls}" data-i="${i}"><b>${txt}</b></button>`;
  }).join("");

  screenRoot.innerHTML = `
    <h2>Quick check: What is the output?</h2>
    <p>Language: <b>${escapeHtml(q.languageLabel)}</b></p>

    <div class="codeBox" role="region" aria-label="code sample"><pre style="margin:0">${escapeHtml(q.code)}</pre></div>

    <div class="choiceGrid" id="choiceGrid">${choices}</div>

    <div class="notice" id="codeNotice"></div>

    <div class="actions">
      <button class="btn ghost" id="codeBack">Back</button>
      <button class="btn primary" id="codeVerify">VERIFY</button>
    </div>
  `;

  const notice = document.getElementById("codeNotice");
  document.getElementById("choiceGrid").querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => {
      codeChoice = Number(btn.dataset.i);
      hideNotice(notice);
      renderCode();
    });
  });

  document.getElementById("codeBack").addEventListener("click", () => {
    step = 1;
    render();
  });

  document.getElementById("codeVerify").addEventListener("click", async () => {
    hideNotice(notice);
    if (codeChoice == null){
      showNotice(notice, "Pick an answer first.");
      return;
    }
    await fakeCheck();

    if (codeChoice !== q.correctIndex){
      showNotice(notice, "Compilation failed. Try again.");
      return;
    }
    step = 3;
    rankingOrder = [...CONFIG.ranking.items];
    render();
  });
}

function renderRanking(){
  const noticeId = "rankNotice";
  const listId = "rankList";

  // If rankingOrder empty (first render), initialize:
  if (!rankingOrder.length) rankingOrder = [...CONFIG.ranking.items];

  screenRoot.innerHTML = `
    <h2>${escapeHtml(CONFIG.ranking.prompt)}</h2>
    <p>Drag to reorder. Top = best.</p>

    <div class="panel">
      <div class="list" id="${listId}">
        ${rankingOrder.map((name, idx) => `
          <div class="draggable" draggable="true" data-name="${escapeAttr(name)}" data-idx="${idx}">
            <span><b>#${idx+1}</b> ${escapeHtml(name)}</span>
            <span class="badge">drag</span>
          </div>
        `).join("")}
      </div>
      <div class="smallCode">Peer review is strict. Choose wisely.</div>
    </div>

    <div class="notice" id="${noticeId}"></div>

    <div class="actions">
      <button class="btn ghost" id="rankBack">Back</button>
      <button class="btn primary" id="rankVerify">VERIFY</button>
    </div>
  `;

  const notice = document.getElementById(noticeId);
  const list = document.getElementById(listId);

  enableReorderDrag(list, (newOrder) => {
    rankingOrder = newOrder;
    hideNotice(notice);
  });

  document.getElementById("rankBack").addEventListener("click", () => {
    step = 2;
    render();
  });

  document.getElementById("rankVerify").addEventListener("click", async () => {
    hideNotice(notice);
    await fakeCheck();

    const required = new Set(CONFIG.ranking.topTwoMustBe);
    const topTwo = new Set(rankingOrder.slice(0, 2));
    const ok = (topTwo.size === required.size) && [...topTwo].every(x => required.has(x));
    if (!ok){
      showNotice(notice, "Ordering rejected by peer review. Try again.");
      return;
    }
    step = 4;
    bugTrash = new Set();
    render();
  });
}

function renderBugs(){
  const noticeId = "bugNotice";
  const poolId = "bugPool";
  const trashId = "bugTrash";

  const cards = CONFIG.bugs.cards;

  // Determine which cards are in trash/pool by state
  const inTrash = new Set(bugTrash);

  const poolCards = cards.filter(c => !inTrash.has(c.id));
  const trashCards = cards.filter(c => inTrash.has(c.id));

  screenRoot.innerHTML = `
    <h2>${escapeHtml(CONFIG.bugs.prompt)}</h2>
    <p>Drag cards into the trash can. Infinite tries, no shame.</p>

    <div class="dragArea">
      <div class="panel">
        <div class="trash">
          <div class="badge">Context</div>
        </div>
        <div class="codeBox"><pre style="margin:0">${escapeHtml(CONFIG.bugs.contextCode)}</pre></div>
      </div>

      <div class="panel">
        <div class="trash">
          <div class="trashIcon" aria-hidden="true"></div>
          <div><b>Trash</b> <span class="badge">(drop here)</span></div>
        </div>

        <div class="dropzone" id="${trashId}">
          <div class="list">
            ${trashCards.map(c => bugCardHtml(c)).join("")}
          </div>
        </div>

        <div style="height:12px"></div>

        <div class="badge">Bug candidates</div>
        <div class="dropzone" id="${poolId}">
          <div class="list">
            ${poolCards.map(c => bugCardHtml(c)).join("")}
          </div>
        </div>
      </div>
    </div>

    <div class="notice" id="${noticeId}"></div>

    <div class="actions">
      <button class="btn ghost" id="bugsBack">Back</button>
      <button class="btn ghost" id="bugsReset">Reset</button>
      <button class="btn primary" id="bugsVerify">SUBMIT</button>
    </div>
  `;

  const notice = document.getElementById(noticeId);
  const poolZone = document.getElementById(poolId);
  const trashZone = document.getElementById(trashId);

  enableDropzone(poolZone, "pool");
  enableDropzone(trashZone, "trash");

  // Make all bug cards draggable with payload
  screenRoot.querySelectorAll(".draggable[data-bugid]").forEach(el => {
    el.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", el.dataset.bugid);
      e.dataTransfer.effectAllowed = "move";
    });
  });

  function enableDropzone(zoneEl, kind){
    zoneEl.addEventListener("dragover", (e) => {
      e.preventDefault();
      zoneEl.classList.add("over");
      e.dataTransfer.dropEffect = "move";
    });
    zoneEl.addEventListener("dragleave", () => zoneEl.classList.remove("over"));
    zoneEl.addEventListener("drop", (e) => {
      e.preventDefault();
      zoneEl.classList.remove("over");
      hideNotice(notice);

      const bugId = e.dataTransfer.getData("text/plain");
      if (!bugId) return;

      if (kind === "trash") bugTrash.add(bugId);
      else bugTrash.delete(bugId);

      renderBugs();
    });
  }

  document.getElementById("bugsBack").addEventListener("click", () => {
    step = 3;
    render();
  });

  document.getElementById("bugsReset").addEventListener("click", () => {
    bugTrash = new Set();
    hideNotice(notice);
    renderBugs();
  });

  document.getElementById("bugsVerify").addEventListener("click", async () => {
    hideNotice(notice);
    await fakeCheck();

    const bugIds = new Set(cards.filter(c => c.isBug).map(c => c.id));
    const sameSize = bugTrash.size === bugIds.size;
    const allMatch = sameSize && [...bugTrash].every(id => bugIds.has(id));

    if (!allMatch){
      showNotice(notice, "Some bugs survived. Try again.");
      return;
    }

    step = 5;
    truthChoice = null;
    render();
  });
}

function renderTruths(){
  const t = CONFIG.truths;

  const list = t.statements.map((s, i) => {
    const cls = (truthChoice === i) ? "statement selected" : "statement";
    return `<div class="${cls}" data-i="${i}">${escapeHtml(s)}</div>`;
  }).join("");

  screenRoot.innerHTML = `
    <h2>${escapeHtml(t.prompt)}</h2>
    <p>Select the lie.</p>

    <div class="statementGrid" id="truthGrid">
      ${list}
    </div>

    <div class="notice" id="truthNotice"></div>

    <div class="actions">
      <button class="btn ghost" id="truthBack">Back</button>
      <button class="btn primary" id="truthVerify">CONFIRM</button>
    </div>
  `;

  const notice = document.getElementById("truthNotice");

  document.getElementById("truthGrid").querySelectorAll(".statement").forEach(el => {
    el.addEventListener("click", () => {
      truthChoice = Number(el.dataset.i);
      hideNotice(notice);
      renderTruths();
    });
  });

  document.getElementById("truthBack").addEventListener("click", () => {
    step = 4;
    render();
  });

  document.getElementById("truthVerify").addEventListener("click", async () => {
    hideNotice(notice);
    if (truthChoice == null){
      showNotice(notice, "Pick one statement.");
      return;
    }
    await fakeCheck();

    if (truthChoice !== t.lieIndex){
      showNotice(notice, "Suspicious… try again.");
      return;
    }

    step = 6;
    render();
  });
}

function renderSuccess(){
  screenRoot.innerHTML = `
    <div class="success">
      <div class="bigCheck">✓</div>
      <h1>${escapeHtml(CONFIG.final.title)}</h1>
      <p>Access granted. Happy birthday card unlocked.</p>

      <div class="finalMessage" id="finalMessage">${escapeHtml(CONFIG.final.placeholderText)}</div>

      <div class="actions" style="justify-content:center">
        <button class="btn primary" id="moreConfetti">MORE CONFETTI</button>
        <button class="btn ghost" id="restart">Restart</button>
      </div>
    </div>
  `;

  startConfettiBurst(2200);

  document.getElementById("moreConfetti").addEventListener("click", () => {
    startConfettiBurst(1600);
  });

  document.getElementById("restart").addEventListener("click", async () => {
    step = 0;
    captchaSelected = new Set();
    codeChoice = null;
    rankingOrder = [];
    bugTrash = new Set();
    truthChoice = null;
    await fakeCheck();
    render();
  });
}

// =========================
// Drag reorder helper
// =========================
function enableReorderDrag(listEl, onReorder){
  let dragFromIdx = null;

  listEl.querySelectorAll(".draggable").forEach((item) => {
    item.addEventListener("dragstart", (e) => {
      dragFromIdx = Number(item.dataset.idx);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", item.dataset.name);
    });

    item.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    });

    item.addEventListener("drop", (e) => {
      e.preventDefault();
      const toIdx = Number(item.dataset.idx);
      if (dragFromIdx == null || toIdx == null || dragFromIdx === toIdx) return;

      const order = [...rankingOrder];
      const [moved] = order.splice(dragFromIdx, 1);
      order.splice(toIdx, 0, moved);

      dragFromIdx = null;
      onReorder(order);
      renderRanking();
    });

    item.addEventListener("dragend", () => {
      dragFromIdx = null;
    });
  });
}

function bugCardHtml(c){
  return `
    <div class="draggable" draggable="true" data-bugid="${escapeAttr(c.id)}">
      <span>${escapeHtml(c.text)}</span>
      <span class="badge">drag</span>
    </div>
  `;
}

// =========================
// Confetti (simple canvas)
// =========================
const confettiCanvas = document.getElementById("confetti");
const ctx = confettiCanvas.getContext("2d");

let confettiParticles = [];
let confettiRAF = null;
let confettiOffTimeout = null;

function resizeConfetti(){
  confettiCanvas.width = window.innerWidth * devicePixelRatio;
  confettiCanvas.height = window.innerHeight * devicePixelRatio;
  confettiCanvas.style.width = window.innerWidth + "px";
  confettiCanvas.style.height = window.innerHeight + "px";
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
}
window.addEventListener("resize", resizeConfetti);
resizeConfetti();

function startConfettiBurst(durationMs = 2000){
  confettiCanvas.classList.add("on");
  clearTimeout(confettiOffTimeout);

  // spawn
  const count = 120;
  for (let i = 0; i < count; i++){
    confettiParticles.push(makeParticle());
  }

  if (!confettiRAF) animateConfetti();

  confettiOffTimeout = setTimeout(() => {
    confettiCanvas.classList.remove("on");
  }, durationMs);
}

function makeParticle(){
  const w = window.innerWidth;
  const x = Math.random() * w;
  const y = -20 - Math.random() * 200;
  const size = 6 + Math.random() * 6;

  return {
    x, y,
    vx: (Math.random() - 0.5) * 2.2,
    vy: 2.5 + Math.random() * 3.2,
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.18,
    size,
    // random bright-ish color (no hardcoded palette needed)
    color: `hsl(${Math.floor(Math.random()*360)}, 90%, 60%)`,
    shape: Math.random() < 0.5 ? "rect" : "circle",
  };
}

function animateConfetti(){
  confettiRAF = requestAnimationFrame(animateConfetti);

  const w = window.innerWidth;
  const h = window.innerHeight;

  ctx.clearRect(0, 0, w, h);

  confettiParticles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.rot += p.vr;
    p.vy += 0.01; // tiny gravity

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.color;

    if (p.shape === "rect"){
      ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size * 0.7);
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, p.size/2, 0, Math.PI*2);
      ctx.fill();
    }

    ctx.restore();
  });

  // keep only particles on screen-ish
  confettiParticles = confettiParticles.filter(p => p.y < h + 80);

  // stop if none and canvas is hidden
  if (confettiParticles.length === 0 && !confettiCanvas.classList.contains("on")){
    cancelAnimationFrame(confettiRAF);
    confettiRAF = null;
  }
}

// =========================
// Utils
// =========================
function arrayEquals(a,b){
  if (a.length !== b.length) return false;
  for (let i=0;i<a.length;i++){
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function escapeHtml(str){
  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
function escapeAttr(str){
  return escapeHtml(str).replaceAll("\n"," ");
}

// Boot
render();

