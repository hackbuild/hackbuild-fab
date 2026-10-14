# Explainer Patterns: Interactive Format Reference

## Table of Contents
1. Section Flow Principles
2. Slider Pattern
3. Toggle/Switch Pattern
4. Click-to-Reveal Pattern
5. Draggable Canvas Pattern
6. Tick-Based Simulation Pattern
7. Venn/Relationship Diagram Pattern
8. Calculator Pattern
9. Comparison Pattern
10. Do/Don't Grid Pattern
11. Connecting Sections

---

## 1. Section Flow Principles

Every section follows the **Question → Interact → Insight** arc:

1. **Pose a question** (1-2 paragraphs, conversational)
2. **Let them play** (interactive container with controls)
3. **Name the insight** (1 paragraph connecting what they just experienced to the concept)
4. **Bridge to next** ("But what happens when..." or "Now imagine...")

Never explain what the simulation will show before they use it. Let them discover it. Then name it after.

---

## 2. Slider Pattern

Use when a concept has a continuous variable that affects an outcome.

### Structure
```html
<div class="interactive-container">
  <div class="interactive-label">
    <i class="fas fa-sliders-h"></i> Adjust the Variable
  </div>
  <div class="canvas-wrap">
    <canvas id="myCanvas" width="800" height="300"></canvas>
  </div>
  <div class="slider-row">
    <label>Variable Name:</label>
    <input type="range" id="mySlider" min="0" max="100" value="50">
    <span class="slider-value" id="myValue">50</span>
  </div>
  <div class="info-text">
    Observation text that updates based on slider position.
  </div>
</div>
```

### JavaScript Pattern
```javascript
const slider = document.getElementById('mySlider');
const valueDisplay = document.getElementById('myValue');
const canvas = document.getElementById('myCanvas');
const ctx = canvas.getContext('2d');

function draw(value) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Draw based on value
  // Update info text based on ranges
}

slider.addEventListener('input', function() {
  const val = parseInt(this.value);
  valueDisplay.textContent = val;
  draw(val);
});

draw(50); // Initial state
```

---

## 3. Toggle/Switch Pattern

Use for binary states or A/B comparisons.

### Structure
```html
<div class="interactive-container">
  <div class="interactive-label">
    <i class="fas fa-toggle-on"></i> Toggle to Compare
  </div>
  <div class="canvas-wrap">
    <canvas id="toggleCanvas" width="800" height="300"></canvas>
  </div>
  <div class="controls">
    <button class="btn-ghost active" id="optionA" onclick="setMode('A')">
      <i class="fas fa-check"></i> Option A
    </button>
    <button class="btn-ghost" id="optionB" onclick="setMode('B')">
      <i class="fas fa-times"></i> Option B
    </button>
  </div>
  <div class="info-text" id="toggleInfo">
    Description of current state.
  </div>
</div>
```

### JavaScript Pattern
```javascript
let currentMode = 'A';

function setMode(mode) {
  currentMode = mode;
  document.querySelectorAll('.controls .btn-ghost').forEach(b => b.classList.remove('active'));
  document.getElementById('option' + mode).classList.add('active');
  draw();
  updateInfo();
}

function draw() {
  // Draw based on currentMode
}

function updateInfo() {
  const info = document.getElementById('toggleInfo');
  info.textContent = currentMode === 'A' ? 'State A description' : 'State B description';
}
```

---

## 4. Click-to-Reveal Pattern

Use for "test yourself" moments, hidden information, or progressive disclosure.

### Structure
```html
<div class="reveal-grid">
  <div class="reveal-card" onclick="reveal(this)">
    <div class="reveal-front">
      <i class="fas fa-question-circle"></i>
      <span>Click to reveal</span>
    </div>
    <div class="reveal-back" style="display:none;">
      <i class="fas fa-check-circle"></i>
      <span>The hidden answer</span>
    </div>
  </div>
  <!-- more cards -->
</div>
```

### CSS
```css
.reveal-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin: 24px 0;
}
.reveal-card {
  background: var(--paper-cream);
  border: 2px solid var(--ink);
  padding: 20px;
  cursor: pointer;
  box-shadow: 4px 4px 0 0 var(--ink);
  text-align: center;
  transition: all 0.2s;
}
.reveal-card.revealed {
  border-color: var(--accent);
  box-shadow: 4px 4px 0 0 var(--accent);
}
```

### JavaScript
```javascript
function reveal(card) {
  card.classList.add('revealed');
  card.querySelector('.reveal-front').style.display = 'none';
  card.querySelector('.reveal-back').style.display = 'block';
}
```

---

## 5. Draggable Canvas Pattern

Use for spatial concepts (warping, positioning, mapping).

### JavaScript Pattern
```javascript
const canvas = document.getElementById('dragCanvas');
const ctx = canvas.getContext('2d');
let isDragging = false;
let dragTarget = null;

// Points or objects that can be dragged
let points = [
  { x: 100, y: 100, r: 12 },
  { x: 300, y: 100, r: 12 },
  { x: 300, y: 300, r: 12 },
  { x: 100, y: 300, r: 12 }
];

canvas.addEventListener('mousedown', function(e) {
  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
  const my = (e.clientY - rect.top) * (canvas.height / rect.height);
  
  for (let i = 0; i < points.length; i++) {
    const dx = mx - points[i].x;
    const dy = my - points[i].y;
    if (Math.sqrt(dx*dx + dy*dy) < points[i].r + 5) {
      isDragging = true;
      dragTarget = i;
      break;
    }
  }
});

canvas.addEventListener('mousemove', function(e) {
  if (!isDragging) return;
  const rect = canvas.getBoundingClientRect();
  points[dragTarget].x = (e.clientX - rect.left) * (canvas.width / rect.width);
  points[dragTarget].y = (e.clientY - rect.top) * (canvas.height / rect.height);
  draw();
});

canvas.addEventListener('mouseup', () => { isDragging = false; dragTarget = null; });

// Add touch equivalents for mobile
canvas.addEventListener('touchstart', function(e) {
  e.preventDefault();
  const touch = e.touches[0];
  // ... same logic as mousedown with touch coords
});
```

---

## 6. Tick-Based Simulation Pattern

Use for emergent behavior, systems, or "watch what happens over time" demos.

### Structure
```html
<div class="interactive-container">
  <div class="interactive-label">
    <i class="fas fa-play"></i> Simulation
  </div>
  <div class="stat-grid">
    <div class="stat-box">
      <div class="stat-label">Metric A</div>
      <div class="stat-value" id="statA">0</div>
    </div>
    <div class="stat-box">
      <div class="stat-label">Metric B</div>
      <div class="stat-value" id="statB">0</div>
    </div>
  </div>
  <div class="controls">
    <button class="btn-ghost" onclick="startSim()">
      <i class="fas fa-play"></i> Start
    </button>
    <button class="btn-ghost" onclick="resetSim()">
      <i class="fas fa-redo"></i> Reset
    </button>
  </div>
  <div class="sim-log" id="simLog"></div>
</div>
```

### JavaScript Pattern
```javascript
let simInterval = null;
let tick = 0;
let state = { metricA: 0, metricB: 0 };

const events = [
  { msg: "Something happened", effectA: 5, effectB: -2 },
  { msg: "Another thing happened", effectA: -3, effectB: 8 },
  // ... more events
];

function startSim() {
  if (simInterval) return;
  simInterval = setInterval(() => {
    const event = events[Math.floor(Math.random() * events.length)];
    state.metricA += event.effectA;
    state.metricB += event.effectB;
    
    document.getElementById('statA').textContent = state.metricA;
    document.getElementById('statB').textContent = state.metricB;
    
    // Color code: green for positive, accent for negative
    document.getElementById('statA').style.color =
      state.metricA >= 0 ? 'var(--success)' : 'var(--accent)';
    
    // Log entry
    const log = document.getElementById('simLog');
    const entry = document.createElement('div');
    entry.className = 'event';
    entry.textContent = '> ' + event.msg;
    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;
    
    tick++;
    if (tick >= 20) clearInterval(simInterval); // End after N ticks
  }, 800);
}

function resetSim() {
  if (simInterval) clearInterval(simInterval);
  simInterval = null;
  tick = 0;
  state = { metricA: 0, metricB: 0 };
  document.getElementById('statA').textContent = '0';
  document.getElementById('statB').textContent = '0';
  document.getElementById('simLog').innerHTML = '';
}
```

---

## 7. Venn/Relationship Diagram Pattern

Use for showing overlaps, intersections, or multi-factor relationships.

Best implemented as SVG with hover/click states, or as a canvas with hit testing.

### CSS for SVG Approach
```css
.venn-container svg {
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
  display: block;
}
.venn-circle {
  fill: rgba(255, 51, 102, 0.15);
  stroke: var(--accent);
  stroke-width: 2;
  cursor: pointer;
  transition: fill 0.2s;
}
.venn-circle:hover {
  fill: rgba(255, 51, 102, 0.3);
}
.venn-label {
  font-family: var(--font-terminal);
  font-size: 14px;
  fill: var(--ink);
  text-anchor: middle;
  pointer-events: none;
}
```

---

## 8. Calculator Pattern

Use for ROI, conversions, or "plug in your numbers" interactives.

### Structure
```html
<div class="interactive-container">
  <div class="interactive-label">
    <i class="fas fa-calculator"></i> Calculate Your Own
  </div>
  <div style="padding: 20px;">
    <div class="calc-row">
      <label>Input A:</label>
      <input type="number" id="inputA" value="100" class="calc-input">
    </div>
    <div class="calc-row">
      <label>Input B:</label>
      <input type="number" id="inputB" value="50" class="calc-input">
    </div>
    <div class="calc-result">
      <span class="stat-label">Result</span>
      <span class="stat-value" id="calcResult">-</span>
    </div>
  </div>
</div>
```

### CSS
```css
.calc-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.calc-row label {
  font-family: var(--font-terminal);
  font-size: 14px;
  color: rgba(255,255,255,0.5);
  min-width: 100px;
  text-transform: uppercase;
}
.calc-input {
  font-family: var(--font-terminal);
  font-size: 18px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 0;
  color: white;
  padding: 8px 12px;
  width: 120px;
}
.calc-result {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid rgba(255,255,255,0.1);
  text-align: center;
}
```

---

## 9. Comparison Pattern

Use for side-by-side before/after or A vs B displays.

### Structure
```html
<div class="compare-grid">
  <div class="compare-col compare-bad">
    <h3><i class="fas fa-times-circle"></i> Without</h3>
    <ul>
      <li>Bad outcome 1</li>
      <li>Bad outcome 2</li>
    </ul>
  </div>
  <div class="compare-col compare-good">
    <h3><i class="fas fa-check-circle"></i> With</h3>
    <ul>
      <li>Good outcome 1</li>
      <li>Good outcome 2</li>
    </ul>
  </div>
</div>
```

### CSS
```css
.compare-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin: 24px 0;
}
.compare-col {
  padding: 20px;
  border: 2px solid var(--ink);
}
.compare-bad {
  background: rgba(239, 68, 68, 0.05);
  border-color: var(--error);
}
.compare-good {
  background: rgba(34, 197, 94, 0.05);
  border-color: var(--success);
}
.compare-col h3 {
  font-family: var(--font-marker);
  font-size: 1.1rem;
  margin-bottom: 12px;
}
.compare-bad h3 { color: var(--error); }
.compare-good h3 { color: var(--success); }
.compare-col ul {
  list-style: none;
  padding: 0;
}
.compare-col li {
  padding: 6px 0;
  font-size: 14px;
  border-bottom: 1px dashed rgba(0,0,0,0.1);
}
```

---

## 10. Do/Don't Grid Pattern

Variant of comparison specifically for best practices.

### Structure
```html
<div class="do-dont-grid">
  <div class="do-card">
    <div class="do-header"><i class="fas fa-thumbs-up"></i> DO</div>
    <ul>
      <li>Good practice 1</li>
      <li>Good practice 2</li>
    </ul>
  </div>
  <div class="dont-card">
    <div class="dont-header"><i class="fas fa-thumbs-down"></i> DON'T</div>
    <ul>
      <li>Bad practice 1</li>
      <li>Bad practice 2</li>
    </ul>
  </div>
</div>
```

---

## 11. Connecting Sections

### Bridge Phrases

Use these patterns to connect one section to the next:

- "That works great when [condition]. **But what happens when [new condition]?**"
- "So now you understand [concept A]. The next question is obvious:"
- "Simple enough. **Now let's break it.**"
- "That's the theory. **Let's see what actually happens.**"
- "One variable down. But real systems have [more complexity]..."

### Scroll Hint (Hero section only)
```html
<div class="scroll-hint">
  <span>Scroll to begin</span>
  <i class="fas fa-chevron-down"></i>
</div>
```

```css
.scroll-hint {
  font-family: var(--font-terminal);
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: var(--ink-muted);
  text-align: center;
  margin-top: 40px;
  animation: float 2s ease-in-out infinite;
}
.scroll-hint i {
  display: block;
  margin-top: 8px;
  color: var(--accent);
}
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(6px); }
}
```
