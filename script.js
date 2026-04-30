'use strict';

const CHARACTERS = [
    {
        walkFrames: ['img/man1/step1.png', 'img/man1/step2.png', 'img/man1/step3.png'],
        stopFrames: ['img/man1/dance1.png', 'img/man1/dance2.png'],
        stand:      'img/man1/def.png',
        ready:      'img/man1/fire.png',
        shoot:      'img/man1/def.png',
        deadFrames: ['img/man1/kill.png', 'img/man1/gunman 10.png'],
        scale: 2.2,
    },
    {
        walkFrames: ['img/man2/dance1_whiteman.png', 'img/man2/gunman 16.png'],
        stopFrames: [],
        stand:      'img/man2/def_whiteman.png',
        ready:      'img/man2/fire_whiteman.png',
        shoot:      'img/man2/shot_whiteman.png',
        deadFrames: ['img/man2/pants_down.png'],
        scale: 2.2,
    },
    {
        walkFrames: ['img/man3/dance1_blackman.png', 'img/man3/dance2_blackman.png'],
        stopFrames: [],
        stand:      'img/man3/gunman 26.png',
        ready:      'img/man3/fire_blackman.png',
        shoot:      'img/man3/gunman 28.png',
        deadFrames: ['img/man3/gunman 27.png'],
        scale: 2.0,
    },
];

// ============================================================
//  Audio helpers
// ============================================================
const playSound = (id) => {
    const audio = document.getElementById(id);
    if (!audio) return;
    audio.currentTime = 0;
    audio.play().catch(() => {});
};

const stopSound = (id) => {
    const audio = document.getElementById(id);
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
};

const stopAll = () => {
    ['snd-intro', 'snd-wait', 'snd-fire', 'snd-shot',
        'snd-shotfall', 'snd-death', 'snd-win', 'snd-foul']
        .forEach(stopSound);
};

// ============================================================
//  DOM references
// ============================================================
const el = (id) => document.getElementById(id);

const menuScreen    = el('menu-screen');
const gameScreen    = el('game-screen');
const winScreen     = el('win-screen');
const gunmanEl      = el('gunman');
const messageEl     = el('message');
const deathOverlay  = el('death-overlay');
const actionBtns    = el('action-buttons');
const timerYouEl    = el('timer-you');
const timerGunmanEl = el('timer-gunman');
const scoreEl       = el('score-val');
const levelEl       = el('level-val');
const winTitle      = el('win-title');
const winStats      = el('win-stats');
const nextBtn       = el('next-btn');
const quitBtn       = el('quit-btn');

// ============================================================
//  State factory
// ============================================================
const makeState = () => ({
    level:         1,
    score:         0,
    phase:         'menu',  // menu | walking | waiting | duel | result
    gunmanTime:    1.5,     // seconds until gunman fires (decreases each level)
    fireTime:      null,
    playerWon:     null,
    charIndex:     0,
    walkFrame:     0,
    deadFrame:     0,
    walkInterval:  null,
    deadInterval:  null,
    waitTimeout:   null,
    gunmanTimeout: null,
    timerInterval: null,
});

let state = makeState();

// ============================================================
//  Screen management
// ============================================================
const showScreen = (name) => {
    [menuScreen, gameScreen, winScreen].forEach(s => s.classList.remove('active'));
    if (name === 'menu') menuScreen.classList.add('active');
    if (name === 'game') gameScreen.classList.add('active');
    if (name === 'win')  winScreen.classList.add('active');
};

// ============================================================
//  Gunman sprite helpers
// ============================================================
const setGunmanImage = (src) => {
    gunmanEl.src = src;
};

// Resize <img> to natural dimensions × scale
const resizeGunman = (src, scale) => {
    const tmp = new Image();
    tmp.onload = () => {
        gunmanEl.style.width  = (tmp.naturalWidth  * scale) + 'px';
        gunmanEl.style.height = (tmp.naturalHeight * scale) + 'px';
    };
    tmp.src = src;
};

const setGunmanState = (stateName) => {
    const char = CHARACTERS[state.charIndex];

    clearInterval(state.walkInterval);
    clearInterval(state.deadInterval);

    if (stateName === 'walking') {
        // --- Walk loop ---
        state.walkFrame = 0;
        setGunmanImage(char.walkFrames[0]);
        resizeGunman(char.walkFrames[0], char.scale);

        state.walkInterval = setInterval(() => {
            state.walkFrame = (state.walkFrame + 1) % char.walkFrames.length;
            setGunmanImage(char.walkFrames[state.walkFrame]);
        }, 180);

    } else if (stateName === 'walkstop') {
        // --- Play stopFrames once then switch to stand ---
        // Only character 1 has stopFrames; others go straight to stand
        if (char.stopFrames && char.stopFrames.length > 0) {
            let stopFrame = 0;
            setGunmanImage(char.stopFrames[0]);
            resizeGunman(char.stopFrames[0], char.scale);

            state.walkInterval = setInterval(() => {
                stopFrame++;
                if (stopFrame < char.stopFrames.length) {
                    setGunmanImage(char.stopFrames[stopFrame]);
                } else {
                    clearInterval(state.walkInterval);
                    setGunmanImage(char.stand);
                    resizeGunman(char.stand, char.scale);
                }
            }, 220);
        } else {
            setGunmanImage(char.stand);
            resizeGunman(char.stand, char.scale);
        }

    } else if (stateName === 'stand') {
        setGunmanImage(char.stand);
        resizeGunman(char.stand, char.scale);

    } else if (stateName === 'ready') {
        setGunmanImage(char.ready);
        resizeGunman(char.ready, char.scale);

    } else if (stateName === 'shoot') {
        setGunmanImage(char.shoot);
        resizeGunman(char.shoot, char.scale);

    } else if (stateName === 'dead') {
        state.deadFrame = 0;
        setGunmanImage(char.deadFrames[0]);
        resizeGunman(char.deadFrames[0], char.scale);

        state.deadInterval = setInterval(() => {
            state.deadFrame++;
            if (state.deadFrame < char.deadFrames.length) {
                setGunmanImage(char.deadFrames[state.deadFrame]);
            } else {
                clearInterval(state.deadInterval);
            }
        }, 200);
    }
};

// ============================================================
//  HUD
// ============================================================
const updateHud = () => {
    scoreEl.textContent = state.score;
    levelEl.textContent = state.level;
};

const resetTimers = () => {
    timerYouEl.textContent    = '0.00';
    timerGunmanEl.textContent = '0.00';
};

// ============================================================
//  Messages
// ============================================================
/* СТАЛО — для стану fire текст не потрібен, для решти (YOU WIN, YOU LOSE) залишаємо */
const showMsg = (text, cls = '') => {
    messageEl.className = cls;
    if (cls === 'fire') {
        messageEl.textContent   = '';
        messageEl.style.display = 'block';
    } else {
        messageEl.textContent        = text;
        messageEl.style.background   = 'none';
        messageEl.style.width        = 'auto';
        messageEl.style.height       = 'auto';
        messageEl.style.padding      = '10px 22px';
        messageEl.style.border       = '2px solid #000';
        messageEl.style.background   = '#fff';
        messageEl.style.color        = '#000';
        messageEl.style.fontSize     = '20px';
        messageEl.style.fontFamily   = 'monospace';
        messageEl.style.fontWeight   = 'bold';
        messageEl.style.display      = 'block';
        messageEl.style.whiteSpace   = 'nowrap';
    }
};

/* СТАЛО */
const hideMsg = () => {
    messageEl.style.display    = 'none';
    messageEl.className        = '';
    messageEl.textContent      = '';
    messageEl.style.background = '';
    messageEl.style.width      = '';
    messageEl.style.height     = '';
    messageEl.style.padding    = '';
    messageEl.style.border     = '';
    messageEl.style.color      = '';
    messageEl.style.fontSize   = '';
    messageEl.style.fontFamily = '';
    messageEl.style.fontWeight = '';
    messageEl.style.whiteSpace = '';
};

// ============================================================
//  Clear all timers
// ============================================================
const clearAllTimers = () => {
    clearTimeout(state.waitTimeout);
    clearTimeout(state.gunmanTimeout);
    clearInterval(state.timerInterval);
    clearInterval(state.walkInterval);
    clearInterval(state.deadInterval);
};

// ============================================================
//  Score formula
// ============================================================
const calcScore = (level, reactionTime) => {
    const base       = 100 * level;
    const speedBonus = Math.max(0, Math.floor((1.2 - reactionTime) * 150));
    return base + speedBonus;
};

// ============================================================
//  Game flow
// ============================================================
const startGame = () => {
    state = makeState();
    showScreen('game');
    updateHud();
    stopAll();
    playSound('snd-intro');
    startRound();
};

const startRound = () => {
    clearAllTimers();
    resetTimers();
    hideMsg();
    deathOverlay.className = '';
    actionBtns.classList.remove('visible');
    state.phase     = 'walking';
    state.playerWon = null;
    state.fireTime  = null;

    // Cycle characters: level 1→char0, 2→char1, 3→char2, 4→char0, 5→char1 ...
    state.charIndex = (state.level - 1) % CHARACTERS.length;

    // Walk in from the right
    gunmanEl.style.transition = 'none';
    gunmanEl.style.left       = '850px';
    setGunmanState('walking');
    void gunmanEl.offsetWidth;                     // force reflow
    gunmanEl.style.transition = 'left 2s linear';
    gunmanEl.style.left       = '320px';

    playSound('snd-wait');
    state.waitTimeout = setTimeout(prepareForDuel, 2300);
};

const prepareForDuel = () => {
    state.phase = 'waiting';
    gunmanEl.style.transition = 'none';
    stopSound('snd-wait');

    // Play stop-steps animation, then go to stand
    setGunmanState('walkstop');

    const delay = 900 + Math.random() * 2100;
    state.waitTimeout = setTimeout(startDuel, delay);
};

const startDuel = () => {
    state.phase    = 'duel';
    state.fireTime = performance.now();

    setGunmanState('ready');
    showMsg('FIRE!!!', 'fire');
    playSound('snd-fire');
    resetTimers();

    // Tick player reaction timer
    state.timerInterval = setInterval(() => {
        if (state.phase !== 'duel') return;
        const elapsed = ((performance.now() - state.fireTime) / 1000).toFixed(2);
        timerYouEl.textContent = elapsed;
    }, 50);

    // Gunman fires after gunmanTime seconds
    const delay = Math.max(0.35, state.gunmanTime) * 1000;
    state.gunmanTimeout = setTimeout(gunmanShootsPlayer, delay);
};

const gunmanShootsPlayer = () => {
    if (state.phase !== 'duel') return;
    state.phase     = 'result';
    state.playerWon = false;
    clearAllTimers();

    timerGunmanEl.textContent = state.gunmanTime.toFixed(2);
    setGunmanState('shoot');
    hideMsg();
    showMsg('YOU LOSE!');
    deathOverlay.classList.add('active');

    stopSound('snd-fire');
    stopSound('snd-intro');
    playSound('snd-shot');
    setTimeout(() => playSound('snd-death'), 350);
    setTimeout(() => playSound('snd-foul'),  850);

    actionBtns.classList.add('visible');
    nextBtn.style.display = 'none';
    quitBtn.textContent   = 'Main Menu';
};

const playerShootsGunman = () => {
    if (state.phase !== 'duel') return;
    state.phase     = 'result';
    state.playerWon = true;
    clearAllTimers();

    const elapsed = (performance.now() - state.fireTime) / 1000;
    timerYouEl.textContent    = elapsed.toFixed(2);
    timerGunmanEl.textContent = state.gunmanTime.toFixed(2);

    setGunmanState('dead');
    hideMsg();
    showMsg('YOU WIN!');

    stopSound('snd-fire');
    stopSound('snd-intro');
    playSound('snd-shot');
    setTimeout(() => playSound('snd-shotfall'), 300);

    const reward = calcScore(state.level, elapsed);
    state.score += reward;
    updateHud();

    actionBtns.classList.add('visible');
    nextBtn.style.display = '';
    quitBtn.textContent   = 'End Game';
};

const nextLevel = () => {
    state.level     += 1;
    state.gunmanTime = Math.max(0.35, state.gunmanTime - 0.12);
    updateHud();
    stopAll();
    playSound('snd-intro');
    startRound();
};

const endGame = () => {
    clearAllTimers();
    stopAll();
    playSound(state.playerWon ? 'snd-win' : 'snd-foul');

    winTitle.textContent = state.playerWon ? 'YOU WON!' : 'GAME OVER';
    winStats.innerHTML =
        `Total Reward: <span style="color:#e8c840">${state.score}</span><br>` +
        `Level Reached: <span style="color:#e8c840">${state.level}</span>`;

    actionBtns.classList.remove('visible');
    showScreen('win');
};

const restartGame = () => {
    clearAllTimers();
    stopAll();
    state = makeState();
    showScreen('menu');
};

// ============================================================
//  Event listeners
// ============================================================

// Click on gunman → player shoots
gunmanEl.addEventListener('click', (e) => {
    e.stopPropagation();
    if (state.phase === 'duel') playerShootsGunman();
});

// Click elsewhere during duel → foul
gameScreen.addEventListener('click', () => {
    if (state.phase === 'duel') {
        showMsg('FOUL!');
        setTimeout(hideMsg, 900);
    }
});

el('start-btn').addEventListener('click',   startGame);
el('restart-btn').addEventListener('click', restartGame);
el('next-btn').addEventListener('click',    nextLevel);
el('quit-btn').addEventListener('click',    () => {
    if (!state.playerWon) restartGame();
    else endGame();
});
