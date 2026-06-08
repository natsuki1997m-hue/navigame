"use strict";

/*
 * みちをきこう！日本語マップゲーム
 * 道路、建物、移動命令をデータで分けておくことで、
 * VOCAB/QUIZ/レベル/信号などを後から追加しやすくしています。
 */

const CONFIG = {
  moveMs: 240,
  correctScore: 100,
  wrongPenalty: 20,
  clearScore: 500,
  initialNodeId: "center",
  initialDirection: "up",
  locale: "ja",
  mode: "easy",
  historyLimit: 30
};

const DIRECTIONS = {
  up: { dx: 0, dy: -1, left: "left", right: "right", className: "facing-up" },
  right: { dx: 1, dy: 0, left: "up", right: "down", className: "facing-right" },
  down: { dx: 0, dy: 1, left: "right", right: "left", className: "facing-down" },
  left: { dx: -1, dy: 0, left: "down", right: "up", className: "facing-left" }
};

const OPPOSITE_DIRECTIONS = {
  up: "down",
  right: "left",
  down: "up",
  left: "right"
};

const HARD_SIGNALS = [
  { id: "centerSignal", nodeId: "center", x: 728, y: 612 },
  { id: "eastSignal", nodeId: "eastBridgeMiddle", x: 1062, y: 612 },
  { id: "topSignal", nodeId: "topCenter", x: 690, y: 328 }
];

const MAP_SETTINGS = {
  easy: {
    image: "town-map.png?v=12",
    width: 1448,
    height: 1086
  },
  hard: {
    image: "town-map-hard.png?v=1",
    width: 1536,
    height: 1024
  }
};

// 道路ノードは画像ピクセル座標で管理します。
const ROAD_NODES = {
  nwBridge: { x: 180, y: 350 },
  hotel: { x: 295, y: 350 },
  park: { x: 607, y: 350 },
  topCenter: { x: 705, y: 350 },
  library: { x: 905, y: 350 },
  eastBridgeTop: { x: 1080, y: 350 },
  school: { x: 1248, y: 350 },
  eastEndTop: { x: 1302, y: 350 },

  westMiddle: { x: 180, y: 636 },
  super: { x: 295, y: 636 },
  restaurant: { x: 570, y: 636 },
  center: { x: 705, y: 636 },
  bank: { x: 875, y: 636 },
  eastBridgeMiddle: { x: 1080, y: 636 },
  bookStore: { x: 1248, y: 636 },
  eastEndMiddle: { x: 1320, y: 636 },

  hospital: { x: 295, y: 951 },
  postOffice: { x: 570, y: 951 },
  templeCross: { x: 705, y: 951 },
  temple: { x: 875, y: 951 },
  southEast: { x: 970, y: 951 },

  northCenter: { x: 705, y: 290 },
  southExit: { x: 705, y: 1086 },
  schoolGate: { x: 1248, y: 255 }
};

// 各ノードの接続先。道以外へ進めないよう、移動はこの接続だけを使います。
const ROAD_CONNECTIONS = {
  nwBridge: { right: "hotel", down: "westMiddle" },
  hotel: { left: "nwBridge", right: "park", down: "super" },
  park: { left: "hotel", right: "topCenter" },
  topCenter: { left: "park", right: "library", up: "northCenter", down: "center" },
  library: { left: "topCenter", right: "eastBridgeTop", down: "bank" },
  eastBridgeTop: { left: "library", right: "school", down: "eastBridgeMiddle" },
  school: { left: "eastBridgeTop", right: "eastEndTop", up: "schoolGate", down: "bookStore" },
  eastEndTop: { left: "school" },
  schoolGate: { down: "school" },

  westMiddle: { up: "nwBridge", right: "super" },
  super: { left: "westMiddle", right: "restaurant", up: "hotel", down: "hospital" },
  restaurant: { left: "super", right: "center", down: "postOffice" },
  center: { left: "restaurant", right: "bank", up: "topCenter", down: "templeCross" },
  bank: { left: "center", right: "eastBridgeMiddle", up: "library", down: "temple" },
  eastBridgeMiddle: { left: "bank", right: "bookStore", up: "eastBridgeTop" },
  bookStore: { left: "eastBridgeMiddle", right: "eastEndMiddle", up: "school" },
  eastEndMiddle: { left: "bookStore" },

  hospital: { up: "super", right: "postOffice" },
  postOffice: { left: "hospital", right: "templeCross", up: "restaurant" },
  templeCross: { left: "postOffice", right: "temple", up: "center", down: "southExit" },
  temple: { left: "templeCross", right: "southEast", up: "bank" },
  southEast: { left: "temple" },
  northCenter: { down: "topCenter" },
  southExit: { up: "templeCross" }
};

// 目的地は「建物の前」の道路ノードに紐づけています。
const BUILDINGS = [
  { id: "hotel", name: "ホテル", nodeId: "hotel", labelX: 310, labelY: 174 },
  { id: "super", name: "スーパー", nodeId: "super", labelX: 312, labelY: 498 },
  { id: "park", name: "こうえん", nodeId: "park", labelX: 626, labelY: 145 },
  { id: "restaurant", name: "レストラン", nodeId: "restaurant", labelX: 560, labelY: 516 },
  { id: "library", name: "としょかん", nodeId: "library", labelX: 898, labelY: 172 },
  { id: "bank", name: "ぎんこう", nodeId: "bank", labelX: 875, labelY: 522 },
  { id: "hospital", name: "びょういん", nodeId: "hospital", labelX: 304, labelY: 792 },
  { id: "school", name: "がっこう", nodeId: "school", labelX: 1248, labelY: 158 },
  { id: "temple", name: "おてら", nodeId: "temple", labelX: 902, labelY: 797 },
  { id: "bookStore", name: "ほんや", nodeId: "bookStore", labelX: 1254, labelY: 534 },
  { id: "postOffice", name: "ゆうびんきょく", nodeId: "postOffice", labelX: 575, labelY: 824 }
];

const HARD_ROAD_NODES = {
  westTop: { x: 70, y: 310 },
  hotel: { x: 250, y: 310 },
  leftMainTop: { x: 420, y: 310 },
  park: { x: 610, y: 310 },
  centerTop: { x: 720, y: 310 },
  riverBridgeTop: { x: 780, y: 310 },
  library: { x: 940, y: 310 },
  eastTop: { x: 1110, y: 310 },
  school: { x: 1290, y: 310 },
  eastEndTop: { x: 1460, y: 310 },

  westMiddle: { x: 70, y: 560 },
  super: { x: 250, y: 560 },
  leftMainMiddle: { x: 420, y: 560 },
  restaurant: { x: 610, y: 560 },
  center: { x: 720, y: 560 },
  bank: { x: 930, y: 560 },
  eastMiddle: { x: 1110, y: 560 },
  bookStore: { x: 1320, y: 560 },
  eastEndMiddle: { x: 1460, y: 560 },

  westBottom: { x: 95, y: 890 },
  hospital: { x: 250, y: 890 },
  leftMainBottom: { x: 420, y: 890 },
  postOffice: { x: 570, y: 890 },
  centerBottom: { x: 720, y: 890 },
  temple: { x: 850, y: 890 },
  eastBottom: { x: 1110, y: 890 },
  station: { x: 1320, y: 890 },
  eastEndBottom: { x: 1460, y: 890 }
};

const HARD_ROAD_CONNECTIONS = {
  westTop: { right: "hotel", down: "westMiddle" },
  hotel: { left: "westTop", right: "leftMainTop", down: "super" },
  leftMainTop: { left: "hotel", right: "park", down: "leftMainMiddle" },
  park: { left: "leftMainTop", right: "centerTop" },
  centerTop: { left: "park", right: "riverBridgeTop", down: "center" },
  riverBridgeTop: { left: "centerTop", right: "library" },
  library: { left: "riverBridgeTop", right: "eastTop", down: "bank" },
  eastTop: { left: "library", right: "school", down: "eastMiddle" },
  school: { left: "eastTop", right: "eastEndTop", down: "bookStore" },
  eastEndTop: { left: "school", down: "eastEndMiddle" },

  westMiddle: { up: "westTop", right: "super", down: "westBottom" },
  super: { left: "westMiddle", right: "leftMainMiddle", up: "hotel", down: "hospital" },
  leftMainMiddle: { left: "super", right: "restaurant", up: "leftMainTop", down: "leftMainBottom" },
  restaurant: { left: "leftMainMiddle", right: "center", down: "postOffice" },
  center: { left: "restaurant", right: "bank", up: "centerTop", down: "centerBottom" },
  bank: { left: "center", right: "eastMiddle", up: "library", down: "temple" },
  eastMiddle: { left: "bank", right: "bookStore", up: "eastTop", down: "eastBottom" },
  bookStore: { left: "eastMiddle", right: "eastEndMiddle", up: "school", down: "station" },
  eastEndMiddle: { left: "bookStore", up: "eastEndTop", down: "eastEndBottom" },

  westBottom: { up: "westMiddle", right: "hospital" },
  hospital: { left: "westBottom", right: "leftMainBottom", up: "super" },
  leftMainBottom: { left: "hospital", right: "postOffice", up: "leftMainMiddle" },
  postOffice: { left: "leftMainBottom", right: "centerBottom", up: "restaurant" },
  centerBottom: { left: "postOffice", right: "temple", up: "center" },
  temple: { left: "centerBottom", right: "eastBottom", up: "bank" },
  eastBottom: { left: "temple", right: "station", up: "eastMiddle" },
  station: { left: "eastBottom", right: "eastEndBottom", up: "bookStore" },
  eastEndBottom: { left: "station", up: "eastEndMiddle" }
};

const HARD_BUILDINGS = [
  { id: "hotel", name: "ホテル", nodeId: "hotel", labelX: 250, labelY: 155 },
  { id: "super", name: "スーパー", nodeId: "super", labelX: 250, labelY: 430 },
  { id: "park", name: "こうえん", nodeId: "park", labelX: 610, labelY: 160 },
  { id: "restaurant", name: "レストラン", nodeId: "restaurant", labelX: 610, labelY: 430 },
  { id: "library", name: "としょかん", nodeId: "library", labelX: 940, labelY: 155 },
  { id: "bank", name: "ぎんこう", nodeId: "bank", labelX: 930, labelY: 465 },
  { id: "hospital", name: "びょういん", nodeId: "hospital", labelX: 250, labelY: 740 },
  { id: "school", name: "がっこう", nodeId: "school", labelX: 1290, labelY: 170 },
  { id: "temple", name: "おてら", nodeId: "temple", labelX: 850, labelY: 740 },
  { id: "bookStore", name: "ほんや", nodeId: "bookStore", labelX: 1320, labelY: 430 },
  { id: "postOffice", name: "ゆうびんきょく", nodeId: "postOffice", labelX: 570, labelY: 750 }
];

const HARD_MAP_SIGNALS = [
  { id: "leftTopSignal", nodeId: "leftMainTop", x: 412, y: 288 },
  { id: "leftMiddleSignal", nodeId: "leftMainMiddle", x: 472, y: 530 },
  { id: "centerSignal", nodeId: "center", x: 810, y: 520 },
  { id: "eastTopSignal", nodeId: "eastTop", x: 1110, y: 285 },
  { id: "eastMiddleSignal", nodeId: "eastMiddle", x: 1110, y: 535 },
  { id: "eastBottomSignal", nodeId: "eastBottom", x: 1110, y: 850 }
];

const TEXT = {
  ja: {
    mission: (place) => `${place}へ行ってください。`,
    correct: "Correct! +100 Score",
    clear: (score) => `Game Clear! ${score} Score`,
    wrong: (place, points) => `${place}ではありません。-${points} Score`,
    cantMove: "そちらへは進めません",
    moving: "移動中...",
    undo: "一つ前にもどりました",
    noUndo: "まだ戻れません"
  },
  en: {
    mission: (place) => `Please go to the ${place}.`,
    correct: "Correct! +100 Score",
    clear: (score) => `Game Clear! ${score} Score`,
    wrong: (place, points) => `Not the ${place}. -${points} Score`,
    cantMove: "You cannot go that way.",
    moving: "Moving...",
    undo: "Went back one step.",
    noUndo: "Nothing to undo yet."
  }
};

const state = {
  score: 0,
  currentNodeId: CONFIG.initialNodeId,
  direction: CONFIG.initialDirection,
  mode: CONFIG.mode,
  target: null,
  isMoving: false,
  isCleared: false,
  history: [],
  lastJudgedWrongNodeId: null,
  audioContext: null
};

const elements = {
  gameShell: document.querySelector(".game-shell"),
  score: document.querySelector("#score"),
  mission: document.querySelector("#mission"),
  message: document.querySelector("#message"),
  mapStage: document.querySelector("#mapStage"),
  townMap: document.querySelector(".town-map"),
  signalLayer: document.querySelector("#signalLayer"),
  targetLabel: document.querySelector("#targetLabel"),
  player: document.querySelector("#player"),
  modeButtons: [...document.querySelectorAll("[data-mode]")],
  commandButtons: [...document.querySelectorAll("[data-command]")]
};

function initGame() {
  elements.modeButtons.forEach((button) => {
    button.addEventListener("click", () => setMode(button.dataset.mode));
  });

  elements.commandButtons.forEach((button) => {
    button.addEventListener("click", () => runCommand(button.dataset.command));
  });

  renderSignals();
  setMode(CONFIG.mode);
  resetPlayer();
  pickNewTarget();
  render();
}

function setMode(mode) {
  state.mode = mode;
  state.score = 0;
  state.history = [];
  state.isCleared = false;
  state.lastJudgedWrongNodeId = null;
  elements.gameShell.classList.toggle("hard-active", mode === "hard");
  elements.mapStage.classList.toggle("hard-mode", mode === "hard");
  elements.townMap.src = getMapSettings().image;

  elements.modeButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === mode);
  });

  resetPlayer();
  renderSignals();
  pickNewTarget();
  render();
}

function renderSignals() {
  elements.signalLayer.innerHTML = "";

  getSignals().forEach((signal) => {
    const marker = document.createElement("span");
    marker.className = "signal-marker";
    marker.style.left = `${(signal.x / getMapSettings().width) * 100}%`;
    marker.style.top = `${(signal.y / getMapSettings().height) * 100}%`;
    elements.signalLayer.appendChild(marker);
  });
}

function getMapSettings() {
  return MAP_SETTINGS[state.mode];
}

function getRoadNodes() {
  return state.mode === "hard" ? HARD_ROAD_NODES : ROAD_NODES;
}

function getRoadConnections() {
  return state.mode === "hard" ? HARD_ROAD_CONNECTIONS : ROAD_CONNECTIONS;
}

function getBuildings() {
  return state.mode === "hard" ? HARD_BUILDINGS : BUILDINGS;
}

function getSignals() {
  return state.mode === "hard" ? HARD_MAP_SIGNALS : [];
}

function resetPlayer() {
  state.currentNodeId = CONFIG.initialNodeId;
  state.direction = CONFIG.initialDirection;
}

function pickNewTarget() {
  const candidates = getBuildings().filter((building) => building.nodeId !== state.currentNodeId);
  state.target = candidates[Math.floor(Math.random() * candidates.length)];
  elements.message.textContent = "";
}

function render() {
  const node = getRoadNodes()[state.currentNodeId];
  const directionInfo = DIRECTIONS[state.direction];
  const mapSettings = getMapSettings();

  elements.score.textContent = state.score;
  elements.mission.textContent = TEXT[CONFIG.locale].mission(state.target.name);
  elements.targetLabel.textContent = state.target.name;
  elements.targetLabel.style.left = `${(state.target.labelX / mapSettings.width) * 100}%`;
  elements.targetLabel.style.top = `${(state.target.labelY / mapSettings.height) * 100}%`;
  elements.player.style.left = `${(node.x / mapSettings.width) * 100}%`;
  elements.player.style.top = `${(node.y / mapSettings.height) * 100}%`;
  elements.player.className = `player ${directionInfo.className}`;
}

async function runCommand(commandName) {
  if (state.isMoving || state.isCleared) return;

  const commands = {
    forward: () => moveInScreenDirection("up"),
    cross: () => moveInScreenDirection(state.direction),
    crossRoad: () => moveInScreenDirection(state.direction),
    turnLeft: () => moveInScreenDirection("left"),
    turnRight: () => moveInScreenDirection("right"),
    goBack: () => moveInScreenDirection("down"),
    cornerLeft: () => turnAtNthCorner(1, "left"),
    cornerRight: () => turnAtNthCorner(1, "right"),
    secondLeft: () => turnAtNthCorner(2, "left"),
    secondRight: () => turnAtNthCorner(2, "right"),
    signalLeft: () => turnAtNthSignal(1, "left"),
    signalRight: () => turnAtNthSignal(1, "right"),
    undo: () => undoMove()
  };

  if (commands[commandName]) {
    if (commandName !== "undo") saveHistory();
    const moved = await commands[commandName]();
    judgeArrival(Boolean(moved));
  }
}

function turnOnly(side) {
  state.direction = DIRECTIONS[state.direction][side];
  elements.message.textContent = "";
  render();
  return false;
}

async function turnAndMove(side) {
  turnOnly(side);
  await wait(90);
  return moveForward(1);
}

async function moveInScreenDirection(direction) {
  state.direction = direction;
  elements.message.textContent = "";
  render();
  await wait(90);
  return moveForward(1);
}

async function moveForward(blocks) {
  const path = [];

  for (let i = 0; i < blocks; i += 1) {
    const nextNodeId = getNextNodeId(state.currentNodeId, state.direction);
    if (!nextNodeId) {
      showBlockedMove();
      return false;
    }
    path.push(nextNodeId);
    state.currentNodeId = nextNodeId;
  }

  await animatePath(path);
  return true;
}

async function turnAtNthCorner(cornerNumber, side) {
  setMoving(true);
  elements.message.textContent = TEXT[CONFIG.locale].moving;

  let cornersPassed = 0;

  while (cornersPassed < cornerNumber) {
    const nextNodeId = getNextNodeId(state.currentNodeId, state.direction);
    if (!nextNodeId) {
      showBlockedMove();
      setMoving(false);
      return false;
    }

    state.currentNodeId = nextNodeId;
    render();
    await wait(CONFIG.moveMs);

    if (isCorner(state.currentNodeId, state.direction)) {
      cornersPassed += 1;
    }
  }

  turnOnly(side);
  await wait(80);

  const moved = await moveForward(1);
  if (moved) elements.message.textContent = "";
  setMoving(false);
  return moved;
}

async function turnAtNthSignal(signalNumber, side) {
  setMoving(true);
  elements.message.textContent = TEXT[CONFIG.locale].moving;

  let signalsPassed = 0;

  while (signalsPassed < signalNumber) {
    const nextNodeId = getNextNodeId(state.currentNodeId, state.direction);
    if (!nextNodeId) {
      showBlockedMove();
      setMoving(false);
      return false;
    }

    state.currentNodeId = nextNodeId;
    render();
    await wait(CONFIG.moveMs);

    if (isSignalNode(state.currentNodeId)) {
      signalsPassed += 1;
    }
  }

  turnOnly(side);
  await wait(80);

  const moved = await moveForward(1);
  if (moved) elements.message.textContent = "";
  setMoving(false);
  return moved;
}

function undoMove() {
  const previous = state.history.pop();
  if (!previous) {
    elements.message.textContent = TEXT[CONFIG.locale].noUndo;
    return;
  }

  state.currentNodeId = previous.currentNodeId;
  state.direction = previous.direction;
  elements.message.textContent = TEXT[CONFIG.locale].undo;
  render();
  return false;
}

function saveHistory() {
  state.history.push({
    currentNodeId: state.currentNodeId,
    direction: state.direction
  });

  if (state.history.length > CONFIG.historyLimit) {
    state.history.shift();
  }
}

function getNextNodeId(nodeId, direction) {
  return getRoadConnections()[nodeId]?.[direction] || null;
}

function isCorner(nodeId, travelDirection) {
  const connections = getRoadConnections()[nodeId] || {};
  const leftDirection = DIRECTIONS[travelDirection].left;
  const rightDirection = DIRECTIONS[travelDirection].right;
  return Boolean(connections[leftDirection] || connections[rightDirection]);
}

function isSignalNode(nodeId) {
  return getSignals().some((signal) => signal.nodeId === nodeId);
}

async function animatePath(path) {
  setMoving(true);

  for (const nodeId of path) {
    state.currentNodeId = nodeId;
    render();
    await wait(CONFIG.moveMs);
  }

  setMoving(false);
}

function setMoving(isMoving) {
  state.isMoving = isMoving;
  elements.commandButtons.forEach((button) => {
    button.disabled = isMoving;
  });
}

function showBlockedMove() {
  elements.message.textContent = TEXT[CONFIG.locale].cantMove;
  elements.player.classList.add("bump");
  window.setTimeout(() => elements.player.classList.remove("bump"), 200);
}

function judgeArrival(didMove) {
  if (!didMove) return;

  const arrivedBuilding = getBuildings().find((building) => building.nodeId === state.currentNodeId);
  if (!arrivedBuilding) {
    state.lastJudgedWrongNodeId = null;
    return;
  }

  if (arrivedBuilding.nodeId === state.target.nodeId) {
    state.score += CONFIG.correctScore;
    elements.message.textContent = TEXT[CONFIG.locale].correct;
    elements.score.textContent = state.score;
    playCorrectSound();

    if (state.score >= CONFIG.clearScore) {
      clearGame();
      return;
    }

    window.setTimeout(() => {
      resetPlayer();
      state.lastJudgedWrongNodeId = null;
      pickNewTarget();
      render();
    }, 900);
    return;
  }

  if (state.lastJudgedWrongNodeId === arrivedBuilding.nodeId) return;
  if (canPassThroughBuilding(arrivedBuilding.nodeId)) {
    state.lastJudgedWrongNodeId = null;
    return;
  }

  state.score -= CONFIG.wrongPenalty;
  state.lastJudgedWrongNodeId = arrivedBuilding.nodeId;
  elements.score.textContent = state.score;
  elements.message.textContent = TEXT[CONFIG.locale].wrong(arrivedBuilding.name, CONFIG.wrongPenalty);
  playWrongSound();
}

function canPassThroughBuilding(nodeId) {
  const connectionCount = Object.keys(getRoadConnections()[nodeId] || {}).length;
  return connectionCount >= 2;
}

function clearGame() {
  state.isCleared = true;
  elements.message.textContent = TEXT[CONFIG.locale].clear(state.score);
  elements.mission.textContent = "クリアしました！";
  setMoving(true);
  playCorrectSound();
}

function getAudioContext() {
  if (!state.audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    state.audioContext = new AudioContextClass();
  }
  if (state.audioContext.state === "suspended") {
    state.audioContext.resume();
  }
  return state.audioContext;
}

function playTone({ frequency, start, duration, type = "sine", volume = 0.12 }) {
  const context = getAudioContext();
  if (!context) return;

  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const startTime = context.currentTime + start;
  const endTime = startTime + duration;

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startTime);
  gain.gain.setValueAtTime(0.001, startTime);
  gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, endTime);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startTime);
  oscillator.stop(endTime + 0.03);
}

function playCorrectSound() {
  playTone({ frequency: 880, start: 0, duration: 0.12, type: "sine", volume: 0.14 });
  playTone({ frequency: 1320, start: 0.12, duration: 0.18, type: "sine", volume: 0.14 });
}

function playWrongSound() {
  playTone({ frequency: 150, start: 0, duration: 0.18, type: "sawtooth", volume: 0.09 });
  playTone({ frequency: 95, start: 0.12, duration: 0.22, type: "square", volume: 0.08 });
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

initGame();
