const arena = document.getElementById('arena');
const coreEl = document.getElementById('core');
const vortexEl = document.getElementById('vortex');
const scoreVal = document.getElementById('score-val');
const energyVal = document.getElementById('energy-val');
const resetBtn = document.getElementById('reset-btn');

let arenaWidth = arena.clientWidth || 560; // Safe defaults if rendering engine hasn't completely loaded layout dimensions
let arenaHeight = arena.clientHeight || 350;

// Audio Synthesizer Engine (Feature Menu: Audio Extra Credit)
function playSynthSound(mode) {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    if (mode === 'hit') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.1);
        osc.start(); osc.stop(audioCtx.currentTime + 0.1);
    } else if (mode === 'vortex') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(500, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(900, audioCtx.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.2);
        osc.start(); osc.stop(audioCtx.currentTime + 0.2);
    } else if (mode === 'damage') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(40, audioCtx.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.4, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.2);
        osc.start(); osc.stop(audioCtx.currentTime + 0.2);
    }
}

// Game State Values
let isRunning = true;
let score = 0;
let energy = 100;
let moveDirection = 0; 

// Game Entities Object Tracking
let shield = { x: 0, y: 320, width: 90, height: 14 };
let core = { x: 150, y: 150, vx: 3, vy: 3, size: 16 };
let drones = [];

// Initialize physical elements dynamically
let shieldEl = document.createElement('div');
shieldEl.className = 'player-shield';
arena.appendChild(shieldEl);

function buildGame() {
    arenaWidth = arena.clientWidth || 560;
    arenaHeight = arena.clientHeight || 350;
    
    score = 0;
    energy = 100;
    isRunning = true;
    
    scoreVal.textContent = score;
    energyVal.textContent = energy + "%";
    resetBtn.style.display = 'none';

    // Core starting vectors
    core.x = arenaWidth / 2;
    core.y = 130;
    core.vx = (Math.random() > 0.5 ? 2.5 : -2.5);
    core.vy = 3;

    shield.x = (arenaWidth / 2) - (shield.width / 2);

    // Clear old drones
    drones.forEach(d => d.el.remove());
    drones = [];

    // Spawn random spatial obstacle drones
    for (let i = 0; i < 4; i++) {
        let spawnX = 40 + Math.random() * (arenaWidth - 80);
        let spawnY = 120 + Math.random() * 100;
        
        let el = document.createElement('div');
        el.className = 'entity drone';
        arena.appendChild(el);
        
        drones.push({ x: spawnX, y: spawnY, radius: 11, el: el });
    }
}

// Mobile/iPad UI Button Hookups
function wireTouchControls(btnId, dirValue) {
    const element = document.getElementById(btnId);
    if(!element) return;
    
    const engage = (e) => { e.preventDefault(); moveDirection = dirValue; };
    const release = (e) => { e.preventDefault(); if(moveDirection === dirValue) moveDirection = 0; };

    element.addEventListener('touchstart', engage);
    element.addEventListener('touchend', release);
    element.addEventListener('mousedown', engage);
    element.addEventListener('mouseup', release);
}
wireTouchControls('btn-left', -1);
wireTouchControls('btn-right', 1);

// Standard Desktop Keyboard Fallbacks
window.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft' || e.key === 'a') moveDirection = -1;
    if (e.key === 'ArrowRight' || e.key === 'd') moveDirection = 1;
});
window.addEventListener('keyup', e => {
    if (['ArrowLeft', 'a', 'ArrowRight', 'd'].includes(e.key)) moveDirection = 0;
});

// Primary Real-time System Loop
function processEngineFrame() {
    if (!isRunning) {
        requestAnimationFrame(processEngineFrame);
        return;
    }

    // 1. Position Shield
    shield.x += moveDirection * 6;
    if (shield.x < 0) shield.x = 0;
    if (shield.x > arenaWidth - shield.width) shield.x = arenaWidth - shield.width;

    // 2. Physics Movement Calculations for the Core
    core.x += core.vx;
    core.y += core.vy;

    // Side Wall bounces
    if (core.x <= 0) { core.x = 0; core.vx *= -1; playSynthSound('hit'); }
    if (core.x >= arenaWidth - core.size) { core.x = arenaWidth - core.size; core.vx *= -1; playSynthSound('hit'); }
    if (core.y <= 0) { core.y = 0; core.vy *= -1; playSynthSound('hit'); }

    // 3. Collision Check: Shield Intersection
    if (core.y + core.size >= shield.y && core.y <= shield.y + shield.height) {
        if (core.x + core.size >= shield.x && core.x <= shield.x + shield.width) {
            core.vy = -Math.abs(core.vy);
            let relativeHitPos = (core.x + (core.size / 2) - shield.x) / shield.width;
            core.vx = (relativeHitPos - 0.5) * 7;
            playSynthSound('hit');
        }
    }

    // 4. Collision Check: Target Vortex Goal Zone
    let vortexX = arenaWidth / 2;
    let vortexY = 60; 
    let distanceToVortex = Math.hypot((core.x + 8) - vortexX, (core.y + 8) - vortexY);
    
    if (distanceToVortex < 35) {
        score += 10;
        scoreVal.textContent = score;
        playSynthSound('vortex');
        
        core.y = 140;
        core.vy = 3;
        core.vx = (Math.random() - 0.5) * 5;
    }

    // 5. Collision Check: Harmful Drone Obstacles
    drones.forEach(d => {
        let distToDrone = Math.hypot((core.x + 8) - d.x, (core.y + 8) - d.y);
        if (distToDrone < d.radius + 8) {
            core.vx = ((core.x + 8) - d.x) * 0.3;
            core.vy = ((core.y + 8) - d.y) * 0.3;
            energy -= 5;
            if (energy < 0) energy = 0;
            energyVal.textContent = energy + "%";
            playSynthSound('damage');
        }
    });

    // 6. Out of Bounds Check (Bottom Drop)
    if (core.y > arenaHeight) {
        energy -= 20;
        if (energy < 0) energy = 0;
        energyVal.textContent = energy + "%";
        playSynthSound('damage');
        
        if (energy > 0) {
            core.x = arenaWidth / 2;
            core.y = 120;
            core.vy = 3;
            core.vx = 2;
        }
    }

    if (energy <= 0) {
        isRunning = false;
        energyVal.textContent = "SYSTEM OFFLINE";
        resetBtn.style.display = 'inline-block';
    }

    // Render Frame Positions
    shieldEl.style.left = shield.x + 'px';
    shieldEl.style.top = shield.y + 'px';
    shieldEl.style.width = shield.width + 'px';

    coreEl.style.left = core.x + 'px';
    coreEl.style.top = core.y + 'px';

    drones.forEach(d => {
        d.el.style.left = (d.x - d.radius) + 'px';
        d.el.style.top = (d.y - d.radius) + 'px';
    });

    requestAnimationFrame(processEngineFrame);
}

resetBtn.addEventListener('click', buildGame);
buildGame();
processEngineFrame();
