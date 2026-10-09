(() => {
  'use strict';

  const launchers = Array.from(document.querySelectorAll('[data-calculator-launcher]'));
  if (!launchers.length) return;

  const panel = document.createElement('section');
  panel.id = 'lms-calculator';
  panel.className = 'lms-calculator';
  panel.hidden = true;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Máy tính khoa học FX-580VN X');
  panel.innerHTML = `
    <div class="calc-shell">
      <header class="calc-header" data-calc-drag>
        <div class="calc-brand">
          <span class="calc-classwiz">CLASSWIZ</span>
          <strong>fx-580VN X</strong>
        </div>
        <div class="calc-header-actions">
          <span class="calc-solar-strip" aria-hidden="true"></span>
          <button class="calc-close" type="button" aria-label="Đóng máy tính" title="Đóng">×</button>
        </div>
      </header>

      <nav class="calc-modes" aria-label="Chế độ máy tính">
        <button type="button" class="calc-mode-tab active" data-mode="calculate">Tính</button>
        <button type="button" class="calc-mode-tab" data-mode="equation">Phương trình</button>
        <button type="button" class="calc-mode-tab" data-mode="system">Hệ PT</button>
        <button type="button" class="calc-mode-tab" data-mode="statistics">Thống kê</button>
        <button type="button" class="calc-mode-tab" data-mode="matrix">Ma trận</button>
        <button type="button" class="calc-mode-tab" data-mode="vector">Vector</button>
      </nav>

      <section class="calc-mode-panel active calc-main-face" data-mode-panel="calculate">
        <div class="calc-screen" aria-live="polite">
          <div class="calc-screen-top">
            <span class="calc-screen-flags">
              <span class="calc-shift-flag">S</span>
              <span class="calc-alpha-flag">A</span>
              <span class="calc-angle-mode">DEG</span>
            </span>
            <span class="calc-screen-hint">Math</span>
          </div>
          <div class="calc-expression" aria-label="Biểu thức">0</div>
          <div class="calc-result" aria-label="Kết quả">0</div>
        </div>

        <div class="calc-control-deck" aria-label="Phím điều khiển">
          <button type="button" class="calc-top-key calc-shift-key" data-action="shift"><span>SHIFT</span></button>
          <button type="button" class="calc-top-key calc-alpha-key" data-action="alpha"><span>ALPHA</span></button>
          <div class="calc-nav-pad" aria-label="Điều hướng">
            <button type="button" class="calc-nav-up" data-action="nav-up" aria-label="Lên">▲</button>
            <button type="button" class="calc-nav-left" data-action="nav-left" aria-label="Trái">◀</button>
            <button type="button" class="calc-nav-ok" data-action="nav-ok">OK</button>
            <button type="button" class="calc-nav-right" data-action="nav-right" aria-label="Phải">▶</button>
            <button type="button" class="calc-nav-down" data-action="nav-down" aria-label="Xuống">▼</button>
          </div>
          <button type="button" class="calc-top-key calc-menu-key" data-action="menu"><span>MENU</span></button>
          <button type="button" class="calc-top-key calc-on-key" data-action="on"><span>ON</span></button>
        </div>

        <div class="calc-science-pad" aria-label="Phím khoa học">
          <button type="button" class="calc-sci-key" data-action="reciprocal"><span class="calc-shift-label">∫</span><b>x⁻¹</b></button>
          <button type="button" class="calc-sci-key" data-action="square"><span class="calc-shift-label">√</span><b>x²</b></button>
          <button type="button" class="calc-sci-key" data-fn="log"><span class="calc-shift-label">10ˣ</span><b>log</b></button>
          <button type="button" class="calc-sci-key" data-fn="ln"><span class="calc-shift-label">eˣ</span><b>ln</b></button>
          <button type="button" class="calc-sci-key" data-insert="-"><span class="calc-shift-label">Abs</span><b>(−)</b></button>
          <button type="button" class="calc-sci-key calc-mode-key" data-action="angle"><span class="calc-shift-label">SETUP</span><b>DEG</b></button>

          <button type="button" class="calc-sci-key" data-fn="sqrt"><span class="calc-shift-label">x³</span><b>√</b></button>
          <button type="button" class="calc-sci-key" data-action="cube"><span class="calc-shift-label">∛</span><b>x³</b></button>
          <button type="button" class="calc-sci-key" data-insert="^"><span class="calc-shift-label">x√y</span><b>xʸ</b></button>
          <button type="button" class="calc-sci-key" data-action="fraction"><span class="calc-shift-label">d/c</span><b>S⇔D</b></button>
          <button type="button" class="calc-sci-key" data-insert="!"><span class="calc-shift-label">nPr</span><b>x!</b></button>
          <button type="button" class="calc-sci-key" data-insert="pi"><span class="calc-shift-label">π</span><b>π</b></button>

          <button type="button" class="calc-sci-key" data-fn="sin"><span class="calc-shift-label">sin⁻¹</span><b>sin</b></button>
          <button type="button" class="calc-sci-key" data-fn="cos"><span class="calc-shift-label">cos⁻¹</span><b>cos</b></button>
          <button type="button" class="calc-sci-key" data-fn="tan"><span class="calc-shift-label">tan⁻¹</span><b>tan</b></button>
          <button type="button" class="calc-sci-key" data-insert="("><span class="calc-shift-label">%</span><b>(</b></button>
          <button type="button" class="calc-sci-key" data-insert=")"><span class="calc-shift-label">,</span><b>)</b></button>
          <button type="button" class="calc-sci-key" data-insert="e"><span class="calc-shift-label">RND</span><b>e</b></button>
        </div>

        <div class="calc-number-pad" aria-label="Bàn phím số">
          <button type="button" class="calc-white-key" data-insert="7">7</button>
          <button type="button" class="calc-white-key" data-insert="8">8</button>
          <button type="button" class="calc-white-key" data-insert="9">9</button>
          <button type="button" class="calc-white-key calc-del-key" data-action="delete">DEL</button>
          <button type="button" class="calc-white-key calc-ac-key" data-action="clear">AC</button>
          <button type="button" class="calc-white-key calc-op-key" data-insert="/">÷</button>

          <button type="button" class="calc-white-key" data-insert="4">4</button>
          <button type="button" class="calc-white-key" data-insert="5">5</button>
          <button type="button" class="calc-white-key" data-insert="6">6</button>
          <button type="button" class="calc-white-key calc-op-key" data-insert="*">×</button>
          <button type="button" class="calc-white-key calc-op-key" data-insert="Ans">Ans</button>
          <button type="button" class="calc-white-key calc-op-key" data-insert="(">(</button>

          <button type="button" class="calc-white-key" data-insert="1">1</button>
          <button type="button" class="calc-white-key" data-insert="2">2</button>
          <button type="button" class="calc-white-key" data-insert="3">3</button>
          <button type="button" class="calc-white-key calc-op-key" data-insert="+">+</button>
          <button type="button" class="calc-white-key calc-op-key" data-insert="-">−</button>
          <button type="button" class="calc-white-key calc-op-key" data-insert=")">)</button>

          <button type="button" class="calc-white-key" data-insert="0">0</button>
          <button type="button" class="calc-white-key" data-insert=".">.</button>
          <button type="button" class="calc-white-key calc-op-key" data-fn="pow10">×10ˣ</button>
          <button type="button" class="calc-white-key calc-op-key" data-insert="pi">π</button>
          <button type="button" class="calc-white-key calc-op-key" data-insert="e">e</button>
          <button type="button" class="calc-white-key calc-equals-key" data-action="equals">=</button>
        </div>
      </section>

      <section class="calc-mode-panel calc-tool-panel" data-mode-panel="equation">
        <div class="calc-tool-head">
          <div><strong>Giải phương trình đa thức</strong><span>Bậc 1 đến bậc 4</span></div>
          <label class="calc-inline-select">Bậc
            <select id="calc-equation-degree">
              <option value="1">1</option>
              <option value="2" selected>2</option>
              <option value="3">3</option>
              <option value="4">4</option>
            </select>
          </label>
        </div>
        <div class="calc-equation-preview" id="calc-equation-preview">ax² + bx + c = 0</div>
        <div class="calc-input-grid" id="calc-equation-inputs"></div>
        <button type="button" class="calc-solve-btn" id="calc-equation-solve">Giải phương trình</button>
        <div class="calc-output" id="calc-equation-output" aria-live="polite"></div>
      </section>

      <section class="calc-mode-panel calc-tool-panel" data-mode-panel="system">
        <div class="calc-tool-head">
          <div><strong>Giải hệ phương trình tuyến tính</strong><span>2 đến 4 ẩn</span></div>
          <label class="calc-inline-select">Số ẩn
            <select id="calc-system-size">
              <option value="2" selected>2</option>
              <option value="3">3</option>
              <option value="4">4</option>
            </select>
          </label>
        </div>
        <div class="calc-system-grid" id="calc-system-grid"></div>
        <button type="button" class="calc-solve-btn" id="calc-system-solve">Giải hệ</button>
        <div class="calc-output" id="calc-system-output" aria-live="polite"></div>
      </section>

      <section class="calc-mode-panel calc-tool-panel" data-mode-panel="statistics">
        <div class="calc-tool-head">
          <div><strong>Thống kê</strong><span>1 biến hoặc dữ liệu cặp (x, y)</span></div>
          <label class="calc-inline-select">Kiểu
            <select id="calc-stat-mode">
              <option value="one" selected>1 biến</option>
              <option value="two">2 biến</option>
            </select>
          </label>
        </div>
        <label class="calc-field">
          <span>Dữ liệu X</span>
          <textarea id="calc-stat-x" rows="4" placeholder="Ví dụ: 10, 12, 15, 18"></textarea>
        </label>
        <label class="calc-field calc-stat-y-wrap" hidden>
          <span>Dữ liệu Y</span>
          <textarea id="calc-stat-y" rows="4" placeholder="Ví dụ: 20, 25, 30, 38"></textarea>
        </label>
        <button type="button" class="calc-solve-btn" id="calc-stat-solve">Tính thống kê</button>
        <div class="calc-output" id="calc-stat-output" aria-live="polite"></div>
      </section>

      <section class="calc-mode-panel calc-tool-panel" data-mode-panel="matrix">
        <div class="calc-tool-head">
          <div><strong>Ma trận</strong><span>Ma trận vuông 2×2 đến 4×4</span></div>
          <label class="calc-inline-select">Kích thước
            <select id="calc-matrix-size">
              <option value="2" selected>2×2</option>
              <option value="3">3×3</option>
              <option value="4">4×4</option>
            </select>
          </label>
        </div>
        <div class="calc-matrix-editors">
          <div class="calc-matrix-box"><strong>A</strong><div class="calc-matrix-grid" id="calc-matrix-a"></div></div>
          <div class="calc-matrix-box"><strong>B</strong><div class="calc-matrix-grid" id="calc-matrix-b"></div></div>
        </div>
        <div class="calc-operation-grid" id="calc-matrix-ops">
          <button type="button" data-matrix-op="add">A + B</button>
          <button type="button" data-matrix-op="subtract">A − B</button>
          <button type="button" data-matrix-op="multiply">A × B</button>
          <button type="button" data-matrix-op="multiply-reverse">B × A</button>
          <button type="button" data-matrix-op="det-a">det(A)</button>
          <button type="button" data-matrix-op="det-b">det(B)</button>
          <button type="button" data-matrix-op="inv-a">A⁻¹</button>
          <button type="button" data-matrix-op="inv-b">B⁻¹</button>
          <button type="button" data-matrix-op="transpose-a">Aᵀ</button>
          <button type="button" data-matrix-op="transpose-b">Bᵀ</button>
        </div>
        <div class="calc-output" id="calc-matrix-output" aria-live="polite"></div>
      </section>

      <section class="calc-mode-panel calc-tool-panel" data-mode-panel="vector">
        <div class="calc-tool-head">
          <div><strong>Vector</strong><span>Vector 2D hoặc 3D</span></div>
          <label class="calc-inline-select">Chiều
            <select id="calc-vector-size">
              <option value="2" selected>2D</option>
              <option value="3">3D</option>
            </select>
          </label>
        </div>
        <div class="calc-vector-editors">
          <div class="calc-vector-box"><strong>A</strong><div class="calc-vector-grid" id="calc-vector-a"></div></div>
          <div class="calc-vector-box"><strong>B</strong><div class="calc-vector-grid" id="calc-vector-b"></div></div>
        </div>
        <div class="calc-operation-grid" id="calc-vector-ops">
          <button type="button" data-vector-op="add">A + B</button>
          <button type="button" data-vector-op="subtract">A − B</button>
          <button type="button" data-vector-op="dot">A · B</button>
          <button type="button" data-vector-op="cross">A × B</button>
          <button type="button" data-vector-op="mag-a">|A|</button>
          <button type="button" data-vector-op="mag-b">|B|</button>
          <button type="button" data-vector-op="angle">Góc(A,B)</button>
        </div>
        <div class="calc-output" id="calc-vector-output" aria-live="polite"></div>
      </section>

      <div class="calc-footnote">Kéo thanh trên cùng để di chuyển · Esc để đóng</div>
    </div>
  `;
  document.body.appendChild(panel);

  const expressionEl = panel.querySelector('.calc-expression');
  const resultEl = panel.querySelector('.calc-result');
  const angleLabel = panel.querySelector('.calc-angle-mode');
  const modeKey = panel.querySelector('.calc-mode-key');
  const modeKeyLabel = modeKey?.querySelector('b');
  const closeBtn = panel.querySelector('.calc-close');
  const dragHandle = panel.querySelector('[data-calc-drag]');

  let expression = '';
  let answer = 0;
  let angleMode = 'DEG';
  let numericResult = 0;
  let hasResult = false;
  let showingFraction = false;
  let dragState = null;
  let lastPosition = null;
  let activeMode = 'calculate';
  let shiftActive = false;
  let alphaActive = false;

  const DISPLAY_REPLACEMENTS = [
    [/sqrt\(/g, '√('],
    [/pow10\(/g, '10^('],
    [/pi/g, 'π'],
    [/Ans/g, 'Ans'],
    [/\*/g, '×'],
    [/\//g, '÷'],
    [/-/g, '−']
  ];

  const EPS = 1e-10;

  function formatNumber(value, digits = 12) {
    if (!Number.isFinite(value)) throw new Error('Math ERROR');
    if (Object.is(value, -0) || Math.abs(value) < EPS) value = 0;
    const abs = Math.abs(value);
    if (abs !== 0 && (abs >= 1e12 || abs < 1e-9)) {
      return value.toExponential(8).replace(/\.0+(?=e)/, '').replace(/(\.\d*?[1-9])0+(?=e)/, '$1');
    }
    return Number(value.toPrecision(digits)).toString();
  }

  function displayExpression(value) {
    let text = value || '0';
    DISPLAY_REPLACEMENTS.forEach(([pattern, replacement]) => {
      text = text.replace(pattern, replacement);
    });
    return text;
  }

  function gcd(a, b) {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b > 1e-12) {
      const t = b;
      b = a % b;
      a = t;
    }
    return a || 1;
  }

  function toFraction(value, maxDenominator = 100000) {
    if (!Number.isFinite(value)) return null;
    if (Number.isInteger(value)) return String(value);

    const sign = value < 0 ? -1 : 1;
    let x = Math.abs(value);
    let h1 = 1, h0 = 0, k1 = 0, k0 = 1;
    let b = x;

    for (let i = 0; i < 24; i += 1) {
      const a = Math.floor(b);
      const h2 = a * h1 + h0;
      const k2 = a * k1 + k0;
      if (k2 > maxDenominator) break;
      h0 = h1; h1 = h2;
      k0 = k1; k1 = k2;
      const frac = b - a;
      if (frac < 1e-12) break;
      b = 1 / frac;
    }

    let numerator = sign * h1;
    let denominator = k1;
    if (!denominator) return null;
    const divisor = gcd(Math.abs(numerator), denominator);
    numerator = Math.round(numerator / divisor);
    denominator = Math.round(denominator / divisor);
    if (denominator === 1) return String(numerator);
    return `${numerator}/${denominator}`;
  }

  function factorial(n) {
    if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n) || n > 170) throw new Error('Math ERROR');
    let out = 1;
    for (let i = 2; i <= n; i += 1) out *= i;
    return out;
  }

  function trig(name, value) {
    const radians = angleMode === 'DEG' ? value * Math.PI / 180 : value;
    if (name === 'sin') return Math.sin(radians);
    if (name === 'cos') return Math.cos(radians);
    if (name === 'tan') {
      if (Math.abs(Math.cos(radians)) < 1e-12) throw new Error('Math ERROR');
      return Math.tan(radians);
    }
    throw new Error('Math ERROR');
  }

  function tokenize(source) {
    const tokens = [];
    let i = 0;
    while (i < source.length) {
      const ch = source[i];
      if (/\s/.test(ch)) { i += 1; continue; }

      if (/\d|\./.test(ch)) {
        let value = '';
        let dots = 0;
        while (i < source.length && /[\d.]/.test(source[i])) {
          if (source[i] === '.') dots += 1;
          if (dots > 1) throw new Error('Syntax ERROR');
          value += source[i];
          i += 1;
        }
        if (value === '.') throw new Error('Syntax ERROR');
        tokens.push({ type: 'number', value: Number(value) });
        continue;
      }

      if (/[A-Za-z]/.test(ch)) {
        let value = '';
        while (i < source.length && /[A-Za-z0-9]/.test(source[i])) {
          value += source[i];
          i += 1;
        }
        tokens.push({ type: 'id', value });
        continue;
      }

      if ('+-*/^!%(),'.includes(ch)) {
        tokens.push({ type: ch, value: ch });
        i += 1;
        continue;
      }
      throw new Error('Syntax ERROR');
    }
    return tokens;
  }

  class Parser {
    constructor(tokens) { this.tokens = tokens; this.index = 0; }
    peek(type) { return this.tokens[this.index]?.type === type; }
    take(type) {
      if (!this.peek(type)) throw new Error('Syntax ERROR');
      return this.tokens[this.index++];
    }
    parse() {
      const value = this.parseAddSub();
      if (this.index !== this.tokens.length) throw new Error('Syntax ERROR');
      return value;
    }
    parseAddSub() {
      let value = this.parseMulDiv();
      while (this.peek('+') || this.peek('-')) {
        const op = this.tokens[this.index++].type;
        const right = this.parseMulDiv();
        value = op === '+' ? value + right : value - right;
      }
      return value;
    }
    parseMulDiv() {
      let value = this.parseUnary();
      while (this.peek('*') || this.peek('/')) {
        const op = this.tokens[this.index++].type;
        const right = this.parseUnary();
        if (op === '/' && Math.abs(right) < 1e-15) throw new Error('Math ERROR');
        value = op === '*' ? value * right : value / right;
      }
      return value;
    }
    parseUnary() {
      if (this.peek('+')) { this.index += 1; return this.parseUnary(); }
      if (this.peek('-')) { this.index += 1; return -this.parseUnary(); }
      return this.parsePower();
    }
    parsePower() {
      let value = this.parsePostfix();
      if (this.peek('^')) {
        this.index += 1;
        value = Math.pow(value, this.parseUnary());
      }
      return value;
    }
    parsePostfix() {
      let value = this.parsePrimary();
      while (this.peek('!') || this.peek('%')) {
        if (this.peek('!')) {
          this.index += 1;
          value = factorial(value);
        } else {
          this.index += 1;
          value /= 100;
        }
      }
      return value;
    }
    parsePrimary() {
      if (this.peek('number')) return this.tokens[this.index++].value;
      if (this.peek('(')) {
        this.index += 1;
        const value = this.parseAddSub();
        this.take(')');
        return value;
      }
      if (this.peek('id')) {
        const id = this.tokens[this.index++].value;
        if (id === 'pi') return Math.PI;
        if (id === 'e') return Math.E;
        if (id === 'Ans') return answer;
        this.take('(');
        const arg = this.parseAddSub();
        this.take(')');
        if (id === 'sin' || id === 'cos' || id === 'tan') return trig(id, arg);
        if (id === 'asin' || id === 'acos' || id === 'atan') {
          let result;
          if (id === 'asin') result = Math.asin(arg);
          else if (id === 'acos') result = Math.acos(arg);
          else result = Math.atan(arg);
          return angleMode === 'DEG' ? result * 180 / Math.PI : result;
        }
        if (id === 'log') {
          if (arg <= 0) throw new Error('Math ERROR');
          return Math.log10(arg);
        }
        if (id === 'ln') {
          if (arg <= 0) throw new Error('Math ERROR');
          return Math.log(arg);
        }
        if (id === 'sqrt') {
          if (arg < 0) throw new Error('Math ERROR');
          return Math.sqrt(arg);
        }
        if (id === 'pow10') return Math.pow(10, arg);
        if (id === 'exp') return Math.exp(arg);
        throw new Error('Syntax ERROR');
      }
      throw new Error('Syntax ERROR');
    }
  }

  function calculate(source) {
    if (!source.trim()) return 0;
    return new Parser(tokenize(source)).parse();
  }

  function render() {
    expressionEl.textContent = displayExpression(expression);
    angleLabel.textContent = angleMode;
    if (modeKeyLabel) modeKeyLabel.textContent = angleMode;
    if (!hasResult) {
      resultEl.textContent = '0';
      resultEl.classList.remove('is-error');
      return;
    }
    try {
      resultEl.classList.remove('is-error');
      resultEl.textContent = showingFraction
        ? (toFraction(numericResult) || formatNumber(numericResult))
        : formatNumber(numericResult);
    } catch {
      resultEl.textContent = 'Math ERROR';
      resultEl.classList.add('is-error');
    }
  }

  function evaluate() {
    try {
      const value = calculate(expression);
      if (!Number.isFinite(value)) throw new Error('Math ERROR');
      numericResult = value;
      answer = value;
      hasResult = true;
      showingFraction = false;
      resultEl.classList.remove('is-error');
      render();
    } catch (error) {
      hasResult = true;
      resultEl.textContent = error?.message === 'Math ERROR' ? 'Math ERROR' : 'Syntax ERROR';
      resultEl.classList.add('is-error');
    }
  }

  function insert(text) {
    if (resultEl.classList.contains('is-error')) {
      hasResult = false;
      resultEl.classList.remove('is-error');
    }
    expression += text;
    showingFraction = false;
    render();
  }

  function deleteLast() {
    if (!expression) return;
    const namedTokens = ['sqrt(', 'pow10(', 'asin(', 'acos(', 'atan(', 'sin(', 'cos(', 'tan(', 'log(', 'ln(', 'exp(', 'Ans', 'pi'];
    const match = namedTokens.find(token => expression.endsWith(token));
    expression = match ? expression.slice(0, -match.length) : expression.slice(0, -1);
    showingFraction = false;
    render();
  }

  function squareCurrent() {
    if (!expression) expression = 'Ans';
    expression += '^2';
    showingFraction = false;
    render();
  }

  function clearAll() {
    expression = '';
    numericResult = 0;
    hasResult = false;
    showingFraction = false;
    resultEl.classList.remove('is-error');
    render();
  }

  function toggleFraction() {
    if (!hasResult || resultEl.classList.contains('is-error')) return;
    showingFraction = !showingFraction;
    render();
  }

  function toggleAngle() {
    angleMode = angleMode === 'DEG' ? 'RAD' : 'DEG';
    render();
  }

  function setShift(active = !shiftActive) {
    shiftActive = active;
    panel.classList.toggle('shift-active', shiftActive);
    panel.querySelector('.calc-shift-flag')?.classList.toggle('visible', shiftActive);
  }

  function setAlpha(active = !alphaActive) {
    alphaActive = active;
    panel.classList.toggle('alpha-active', alphaActive);
    panel.querySelector('.calc-alpha-flag')?.classList.toggle('visible', alphaActive);
  }

  function toggleMenu(force) {
    const open = typeof force === 'boolean' ? force : !panel.classList.contains('menu-open');
    panel.classList.toggle('menu-open', open);
  }

  function moveMenu(delta) {
    const tabs = Array.from(panel.querySelectorAll('.calc-mode-tab'));
    const current = Math.max(0, tabs.findIndex(tab => tab.dataset.mode === activeMode));
    const next = (current + delta + tabs.length) % tabs.length;
    tabs[next]?.focus();
  }

  function setMode(mode) {
    activeMode = mode;
    panel.querySelectorAll('.calc-mode-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.mode === mode);
      tab.setAttribute('aria-pressed', tab.dataset.mode === mode ? 'true' : 'false');
    });
    panel.querySelectorAll('.calc-mode-panel').forEach(section => {
      section.classList.toggle('active', section.dataset.modePanel === mode);
    });
    panel.classList.toggle('is-advanced', mode !== 'calculate');
    toggleMenu(false);
    requestAnimationFrame(() => {
      if (!panel.hidden) {
        const rect = panel.getBoundingClientRect();
        const pos = clampPosition(rect.left, rect.top);
        panel.style.left = `${pos.left}px`;
        panel.style.top = `${pos.top}px`;
        lastPosition = pos;
      }
    });
  }

  function numberInput(value = '', label = '') {
    return `<label class="calc-number-field">${label ? `<span>${label}</span>` : ''}<input type="number" step="any" inputmode="decimal" value="${value}"></label>`;
  }

  function readNumber(input) {
    const value = Number(input.value);
    if (!Number.isFinite(value)) throw new Error('Hãy nhập đủ dữ liệu số.');
    return value;
  }

  function outputError(target, message) {
    target.innerHTML = `<div class="calc-output-error">${escapeHtml(message)}</div>`;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  }

  function outputRows(target, rows) {
    target.innerHTML = `<div class="calc-result-list">${rows.map(([key, value]) =>
      `<div><span>${escapeHtml(key)}</span><strong>${escapeHtml(value)}</strong></div>`
    ).join('')}</div>`;
  }

  // Polynomial equation solver
  const equationDegree = panel.querySelector('#calc-equation-degree');
  const equationInputs = panel.querySelector('#calc-equation-inputs');
  const equationPreview = panel.querySelector('#calc-equation-preview');
  const equationOutput = panel.querySelector('#calc-equation-output');

  function renderEquationInputs() {
    const degree = Number(equationDegree.value);
    const labelsByDegree = {
      1: ['a', 'b'],
      2: ['a', 'b', 'c'],
      3: ['a', 'b', 'c', 'd'],
      4: ['a', 'b', 'c', 'd', 'e']
    };
    const previewByDegree = {
      1: 'ax + b = 0',
      2: 'ax² + bx + c = 0',
      3: 'ax³ + bx² + cx + d = 0',
      4: 'ax⁴ + bx³ + cx² + dx + e = 0'
    };
    equationPreview.textContent = previewByDegree[degree];
    equationInputs.innerHTML = labelsByDegree[degree].map((label, index) =>
      numberInput(index === 0 ? '1' : '0', label)
    ).join('');
    equationOutput.innerHTML = '';
  }

  function c(re, im = 0) { return { re, im }; }
  function cadd(a, b) { return c(a.re + b.re, a.im + b.im); }
  function csub(a, b) { return c(a.re - b.re, a.im - b.im); }
  function cmul(a, b) { return c(a.re*b.re - a.im*b.im, a.re*b.im + a.im*b.re); }
  function cdiv(a, b) {
    const den = b.re*b.re + b.im*b.im;
    if (den < 1e-24) return c(1e6, 1e6);
    return c((a.re*b.re + a.im*b.im)/den, (a.im*b.re - a.re*b.im)/den);
  }
  function cabs(a) { return Math.hypot(a.re, a.im); }

  function evalComplexPolynomial(coefficients, z) {
    let out = c(coefficients[0], 0);
    for (let i = 1; i < coefficients.length; i += 1) {
      out = cadd(cmul(out, z), c(coefficients[i], 0));
    }
    return out;
  }

  function solvePolynomial(coefficients) {
    while (coefficients.length > 1 && Math.abs(coefficients[0]) < EPS) coefficients.shift();
    const degree = coefficients.length - 1;
    if (degree < 1) throw new Error('Hệ số của ẩn không được đồng thời bằng 0.');
    if (degree === 1) return [c(-coefficients[1] / coefficients[0], 0)];
    if (degree === 2) {
      const [a,b,d] = coefficients;
      const disc = b*b - 4*a*d;
      if (disc >= -EPS) {
        const root = Math.sqrt(Math.max(0,disc));
        return [c((-b+root)/(2*a),0), c((-b-root)/(2*a),0)];
      }
      const root = Math.sqrt(-disc);
      return [c(-b/(2*a),root/(2*a)), c(-b/(2*a),-root/(2*a))];
    }

    const lead = coefficients[0];
    const normalized = coefficients.map(v => v / lead);
    const radius = 1 + Math.max(...normalized.slice(1).map(Math.abs));
    const roots = Array.from({ length: degree }, (_, i) => {
      const angle = 2 * Math.PI * i / degree + 0.37;
      return c(radius * Math.cos(angle), radius * Math.sin(angle));
    });

    for (let iter = 0; iter < 240; iter += 1) {
      let maxDelta = 0;
      for (let i = 0; i < degree; i += 1) {
        let denominator = c(1, 0);
        for (let j = 0; j < degree; j += 1) {
          if (i !== j) denominator = cmul(denominator, csub(roots[i], roots[j]));
        }
        const delta = cdiv(evalComplexPolynomial(normalized, roots[i]), denominator);
        roots[i] = csub(roots[i], delta);
        maxDelta = Math.max(maxDelta, cabs(delta));
      }
      if (maxDelta < 1e-12) break;
    }

    return roots.map(root => c(
      Math.abs(root.re) < 1e-9 ? 0 : root.re,
      Math.abs(root.im) < 1e-9 ? 0 : root.im
    )).sort((a,b) => a.re - b.re || a.im - b.im);
  }

  function formatComplex(value) {
    if (Math.abs(value.im) < 1e-8) return formatNumber(value.re);
    const sign = value.im >= 0 ? '+' : '−';
    return `${formatNumber(value.re)} ${sign} ${formatNumber(Math.abs(value.im))}i`;
  }

  equationDegree.addEventListener('change', renderEquationInputs);
  panel.querySelector('#calc-equation-solve').addEventListener('click', () => {
    try {
      const coefficients = Array.from(equationInputs.querySelectorAll('input')).map(readNumber);
      if (Math.abs(coefficients[0]) < EPS) throw new Error('Hệ số bậc cao nhất phải khác 0.');
      const roots = solvePolynomial(coefficients);
      outputRows(equationOutput, roots.map((root, index) => [`x${index+1}`, formatComplex(root)]));
    } catch (error) {
      outputError(equationOutput, error.message || 'Không thể giải phương trình.');
    }
  });

  // Linear systems
  const systemSize = panel.querySelector('#calc-system-size');
  const systemGrid = panel.querySelector('#calc-system-grid');
  const systemOutput = panel.querySelector('#calc-system-output');
  const variables = ['x','y','z','w'];

  function renderSystemGrid() {
    const size = Number(systemSize.value);
    const rows = [];
    for (let r = 0; r < size; r += 1) {
      const cells = [];
      for (let col = 0; col < size; col += 1) {
        cells.push(`<label><input type="number" step="any" inputmode="decimal" value="${r===col ? 1 : 0}" data-row="${r}" data-col="${col}"><span>${variables[col]}</span></label>`);
      }
      cells.push(`<span class="calc-equals-sign">=</span><input class="calc-system-constant" type="number" step="any" inputmode="decimal" value="0" data-row="${r}" data-constant="1">`);
      rows.push(`<div class="calc-system-row" style="--system-size:${size}">${cells.join('')}</div>`);
    }
    systemGrid.innerHTML = rows.join('');
    systemOutput.innerHTML = '';
  }

  function solveLinearSystem(matrix, constants) {
    const n = matrix.length;
    const a = matrix.map((row, i) => [...row, constants[i]]);
    for (let col = 0; col < n; col += 1) {
      let pivot = col;
      for (let r = col + 1; r < n; r += 1) {
        if (Math.abs(a[r][col]) > Math.abs(a[pivot][col])) pivot = r;
      }
      if (Math.abs(a[pivot][col]) < EPS) throw new Error('Hệ không có nghiệm duy nhất.');
      [a[col], a[pivot]] = [a[pivot], a[col]];

      const div = a[col][col];
      for (let j = col; j <= n; j += 1) a[col][j] /= div;

      for (let r = 0; r < n; r += 1) {
        if (r === col) continue;
        const factor = a[r][col];
        for (let j = col; j <= n; j += 1) a[r][j] -= factor * a[col][j];
      }
    }
    return a.map(row => row[n]);
  }

  systemSize.addEventListener('change', renderSystemGrid);
  panel.querySelector('#calc-system-solve').addEventListener('click', () => {
    try {
      const size = Number(systemSize.value);
      const matrix = Array.from({length:size}, () => Array(size).fill(0));
      const constants = Array(size).fill(0);
      systemGrid.querySelectorAll('input[data-col]').forEach(input => {
        matrix[Number(input.dataset.row)][Number(input.dataset.col)] = readNumber(input);
      });
      systemGrid.querySelectorAll('input[data-constant]').forEach(input => {
        constants[Number(input.dataset.row)] = readNumber(input);
      });
      const solution = solveLinearSystem(matrix, constants);
      outputRows(systemOutput, solution.map((value,index) => [variables[index], formatNumber(value)]));
    } catch (error) {
      outputError(systemOutput, error.message || 'Không thể giải hệ.');
    }
  });

  // Statistics
  const statMode = panel.querySelector('#calc-stat-mode');
  const statX = panel.querySelector('#calc-stat-x');
  const statY = panel.querySelector('#calc-stat-y');
  const statYWrap = panel.querySelector('.calc-stat-y-wrap');
  const statOutput = panel.querySelector('#calc-stat-output');

  function parseDataset(text) {
    const values = text.trim().split(/[\s,;]+/).filter(Boolean).map(Number);
    if (!values.length || values.some(value => !Number.isFinite(value))) throw new Error('Dữ liệu phải là các số, cách nhau bằng dấu phẩy hoặc khoảng trắng.');
    return values;
  }

  function median(sorted) {
    const n = sorted.length;
    const mid = Math.floor(n / 2);
    return n % 2 ? sorted[mid] : (sorted[mid-1] + sorted[mid]) / 2;
  }

  function quartiles(values) {
    const sorted = [...values].sort((a,b) => a-b);
    const n = sorted.length;
    const mid = Math.floor(n/2);
    const lower = sorted.slice(0, mid);
    const upper = sorted.slice(n % 2 ? mid+1 : mid);
    return {
      min: sorted[0],
      q1: lower.length ? median(lower) : sorted[0],
      med: median(sorted),
      q3: upper.length ? median(upper) : sorted[sorted.length-1],
      max: sorted[sorted.length-1]
    };
  }

  function oneVariableStats(values) {
    const n = values.length;
    const sum = values.reduce((a,b) => a+b, 0);
    const sumSq = values.reduce((a,b) => a+b*b, 0);
    const mean = sum/n;
    const ss = values.reduce((a,b) => a + (b-mean)**2, 0);
    const pop = Math.sqrt(ss/n);
    const sample = n > 1 ? Math.sqrt(ss/(n-1)) : NaN;
    return {n,sum,sumSq,mean,pop,sample,...quartiles(values)};
  }

  function twoVariableStats(xs, ys) {
    if (xs.length !== ys.length) throw new Error('Dữ liệu X và Y phải có cùng số phần tử.');
    if (xs.length < 2) throw new Error('Cần ít nhất 2 cặp dữ liệu.');
    const n = xs.length;
    const sx = xs.reduce((a,b)=>a+b,0);
    const sy = ys.reduce((a,b)=>a+b,0);
    const mx = sx/n, my = sy/n;
    let sxx=0, syy=0, sxy=0, sumXY=0, sumX2=0, sumY2=0;
    for(let i=0;i<n;i+=1){
      const dx=xs[i]-mx, dy=ys[i]-my;
      sxx += dx*dx; syy += dy*dy; sxy += dx*dy;
      sumXY += xs[i]*ys[i]; sumX2 += xs[i]*xs[i]; sumY2 += ys[i]*ys[i];
    }
    if (sxx < EPS || syy < EPS) throw new Error('Không thể tính hồi quy khi X hoặc Y không có độ biến thiên.');
    const b = sxy/sxx;
    const a = my-b*mx;
    const r = sxy/Math.sqrt(sxx*syy);
    return {n,mx,my,sumX:sx,sumY:sy,sumX2,sumY2,sumXY,sx:Math.sqrt(sxx/(n-1)),sy:Math.sqrt(syy/(n-1)),a,b,r};
  }

  statMode.addEventListener('change', () => {
    statYWrap.hidden = statMode.value !== 'two';
    statOutput.innerHTML = '';
  });
  panel.querySelector('#calc-stat-solve').addEventListener('click', () => {
    try {
      const xs = parseDataset(statX.value);
      if (statMode.value === 'one') {
        const s = oneVariableStats(xs);
        outputRows(statOutput, [
          ['n', String(s.n)], ['Σx', formatNumber(s.sum)], ['Σx²', formatNumber(s.sumSq)],
          ['x̄', formatNumber(s.mean)], ['σx', formatNumber(s.pop)], ['sx', Number.isFinite(s.sample) ? formatNumber(s.sample) : '—'],
          ['Min', formatNumber(s.min)], ['Q1', formatNumber(s.q1)], ['Median', formatNumber(s.med)],
          ['Q3', formatNumber(s.q3)], ['Max', formatNumber(s.max)]
        ]);
      } else {
        const ys = parseDataset(statY.value);
        const s = twoVariableStats(xs,ys);
        outputRows(statOutput, [
          ['n', String(s.n)], ['x̄', formatNumber(s.mx)], ['ȳ', formatNumber(s.my)],
          ['Σx', formatNumber(s.sumX)], ['Σy', formatNumber(s.sumY)], ['Σx²', formatNumber(s.sumX2)],
          ['Σy²', formatNumber(s.sumY2)], ['Σxy', formatNumber(s.sumXY)],
          ['sx', formatNumber(s.sx)], ['sy', formatNumber(s.sy)],
          ['r', formatNumber(s.r)], ['Hồi quy', `y = ${formatNumber(s.a)} + ${formatNumber(s.b)}x`]
        ]);
      }
    } catch (error) {
      outputError(statOutput, error.message || 'Không thể tính thống kê.');
    }
  });

  // Matrix
  const matrixSize = panel.querySelector('#calc-matrix-size');
  const matrixAEl = panel.querySelector('#calc-matrix-a');
  const matrixBEl = panel.querySelector('#calc-matrix-b');
  const matrixOutput = panel.querySelector('#calc-matrix-output');

  function renderMatrixEditor(target, size, identity = false) {
    target.style.setProperty('--matrix-size', size);
    target.innerHTML = Array.from({length:size*size}, (_, i) => {
      const row = Math.floor(i/size), col = i%size;
      return `<input type="number" step="any" inputmode="decimal" value="${identity && row===col ? 1 : 0}" data-row="${row}" data-col="${col}">`;
    }).join('');
  }

  function renderMatrices() {
    const size = Number(matrixSize.value);
    renderMatrixEditor(matrixAEl,size,true);
    renderMatrixEditor(matrixBEl,size,true);
    matrixOutput.innerHTML='';
  }

  function readMatrix(target,size) {
    const out=Array.from({length:size},()=>Array(size).fill(0));
    target.querySelectorAll('input').forEach(input => {
      out[Number(input.dataset.row)][Number(input.dataset.col)] = readNumber(input);
    });
    return out;
  }

  function matrixMap(a,b,fn){ return a.map((row,i)=>row.map((value,j)=>fn(value,b[i][j]))); }
  function matrixMultiply(a,b){
    const n=a.length;
    return Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>{
      let sum=0; for(let k=0;k<n;k+=1) sum+=a[i][k]*b[k][j]; return sum;
    }));
  }
  function matrixTranspose(a){ return a[0].map((_,j)=>a.map(row=>row[j])); }
  function matrixDeterminant(a){
    const n=a.length, m=a.map(row=>[...row]); let det=1, sign=1;
    for(let col=0;col<n;col+=1){
      let pivot=col;
      for(let r=col+1;r<n;r+=1) if(Math.abs(m[r][col])>Math.abs(m[pivot][col])) pivot=r;
      if(Math.abs(m[pivot][col])<EPS) return 0;
      if(pivot!==col){[m[pivot],m[col]]=[m[col],m[pivot]]; sign*=-1;}
      const p=m[col][col]; det*=p;
      for(let r=col+1;r<n;r+=1){
        const factor=m[r][col]/p;
        for(let j=col+1;j<n;j+=1) m[r][j]-=factor*m[col][j];
      }
    }
    return det*sign;
  }
  function matrixInverse(a){
    const n=a.length;
    const m=a.map((row,i)=>[...row,...Array.from({length:n},(_,j)=>i===j?1:0)]);
    for(let col=0;col<n;col+=1){
      let pivot=col;
      for(let r=col+1;r<n;r+=1) if(Math.abs(m[r][col])>Math.abs(m[pivot][col])) pivot=r;
      if(Math.abs(m[pivot][col])<EPS) throw new Error('Ma trận không khả nghịch.');
      [m[pivot],m[col]]=[m[col],m[pivot]];
      const p=m[col][col];
      for(let j=0;j<2*n;j+=1) m[col][j]/=p;
      for(let r=0;r<n;r+=1){
        if(r===col) continue;
        const factor=m[r][col];
        for(let j=0;j<2*n;j+=1) m[r][j]-=factor*m[col][j];
      }
    }
    return m.map(row=>row.slice(n));
  }

  function outputMatrix(target,matrix,label='Kết quả'){
    target.innerHTML=`<div class="calc-output-title">${escapeHtml(label)}</div><div class="calc-matrix-result" style="--matrix-size:${matrix.length}">${matrix.flat().map(v=>`<span>${escapeHtml(formatNumber(v))}</span>`).join('')}</div>`;
  }

  matrixSize.addEventListener('change',renderMatrices);
  panel.querySelector('#calc-matrix-ops').addEventListener('click', event => {
    const button=event.target.closest('[data-matrix-op]');
    if(!button) return;
    try{
      const size=Number(matrixSize.value);
      const A=readMatrix(matrixAEl,size), B=readMatrix(matrixBEl,size);
      const op=button.dataset.matrixOp;
      if(op==='add') outputMatrix(matrixOutput,matrixMap(A,B,(a,b)=>a+b),'A + B');
      else if(op==='subtract') outputMatrix(matrixOutput,matrixMap(A,B,(a,b)=>a-b),'A − B');
      else if(op==='multiply') outputMatrix(matrixOutput,matrixMultiply(A,B),'A × B');
      else if(op==='multiply-reverse') outputMatrix(matrixOutput,matrixMultiply(B,A),'B × A');
      else if(op==='det-a') outputRows(matrixOutput,[['det(A)',formatNumber(matrixDeterminant(A))]]);
      else if(op==='det-b') outputRows(matrixOutput,[['det(B)',formatNumber(matrixDeterminant(B))]]);
      else if(op==='inv-a') outputMatrix(matrixOutput,matrixInverse(A),'A⁻¹');
      else if(op==='inv-b') outputMatrix(matrixOutput,matrixInverse(B),'B⁻¹');
      else if(op==='transpose-a') outputMatrix(matrixOutput,matrixTranspose(A),'Aᵀ');
      else if(op==='transpose-b') outputMatrix(matrixOutput,matrixTranspose(B),'Bᵀ');
    }catch(error){outputError(matrixOutput,error.message||'Không thể tính ma trận.');}
  });

  // Vector
  const vectorSize = panel.querySelector('#calc-vector-size');
  const vectorAEl = panel.querySelector('#calc-vector-a');
  const vectorBEl = panel.querySelector('#calc-vector-b');
  const vectorOutput = panel.querySelector('#calc-vector-output');

  function renderVectorEditor(target,size,first=false){
    target.innerHTML=Array.from({length:size},(_,i)=>`<label><span>${variables[i]}</span><input type="number" step="any" inputmode="decimal" value="${first && i===0 ? 1 : 0}"></label>`).join('');
  }
  function renderVectors(){
    const size=Number(vectorSize.value);
    renderVectorEditor(vectorAEl,size,true);
    renderVectorEditor(vectorBEl,size,false);
    if(size===3) vectorBEl.querySelectorAll('input')[1].value='1';
    else if(size===2) vectorBEl.querySelectorAll('input')[1].value='1';
    panel.querySelector('[data-vector-op="cross"]').disabled=size!==3;
    vectorOutput.innerHTML='';
  }
  function readVector(target){return Array.from(target.querySelectorAll('input')).map(readNumber);}
  function vectorDot(a,b){return a.reduce((sum,v,i)=>sum+v*b[i],0);}
  function vectorMag(a){return Math.sqrt(vectorDot(a,a));}
  function formatVector(v){return `[${v.map(value => formatNumber(value)).join(', ')}]`;}

  vectorSize.addEventListener('change',renderVectors);
  panel.querySelector('#calc-vector-ops').addEventListener('click',event=>{
    const button=event.target.closest('[data-vector-op]');
    if(!button) return;
    try{
      const A=readVector(vectorAEl), B=readVector(vectorBEl), op=button.dataset.vectorOp;
      if(op==='add') outputRows(vectorOutput,[['A + B',formatVector(A.map((v,i)=>v+B[i]))]]);
      else if(op==='subtract') outputRows(vectorOutput,[['A − B',formatVector(A.map((v,i)=>v-B[i]))]]);
      else if(op==='dot') outputRows(vectorOutput,[['A · B',formatNumber(vectorDot(A,B))]]);
      else if(op==='cross'){
        if(A.length!==3) throw new Error('Tích có hướng chỉ áp dụng cho vector 3D.');
        const C=[A[1]*B[2]-A[2]*B[1],A[2]*B[0]-A[0]*B[2],A[0]*B[1]-A[1]*B[0]];
        outputRows(vectorOutput,[['A × B',formatVector(C)]]);
      } else if(op==='mag-a') outputRows(vectorOutput,[['|A|',formatNumber(vectorMag(A))]]);
      else if(op==='mag-b') outputRows(vectorOutput,[['|B|',formatNumber(vectorMag(B))]]);
      else if(op==='angle'){
        const ma=vectorMag(A), mb=vectorMag(B);
        if(ma<EPS||mb<EPS) throw new Error('Không thể tính góc với vector 0.');
        const cos=Math.min(1,Math.max(-1,vectorDot(A,B)/(ma*mb)));
        const rad=Math.acos(cos);
        outputRows(vectorOutput,[['Góc',`${formatNumber(rad*180/Math.PI)}°`],['Radian',formatNumber(rad)]]);
      }
    }catch(error){outputError(vectorOutput,error.message||'Không thể tính vector.');}
  });

  function clampPosition(left, top) {
    const rect = panel.getBoundingClientRect();
    const maxLeft = Math.max(8, window.innerWidth - rect.width - 8);
    const maxTop = Math.max(8, window.innerHeight - rect.height - 8);
    return {
      left: Math.min(Math.max(8, left), maxLeft),
      top: Math.min(Math.max(8, top), maxTop)
    };
  }

  function placeDefault() {
    panel.style.left = 'auto';
    panel.style.top = 'auto';
    panel.style.right = '18px';
    panel.style.bottom = '18px';
    const rect = panel.getBoundingClientRect();
    let left = window.innerWidth - rect.width - 18;
    let top = Math.max(72, Math.min(window.innerHeight - rect.height - 18, 92));

    if (window.innerWidth <= 560) {
      left = Math.max(8, (window.innerWidth - rect.width) / 2);
      top = Math.max(58, Math.min(window.innerHeight - rect.height - 8, 72));
    }

    const pos = clampPosition(left, top);
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
    panel.style.left = `${pos.left}px`;
    panel.style.top = `${pos.top}px`;
    lastPosition = pos;
  }

  function openCalculator() {
    panel.hidden = false;
    panel.classList.add('is-open');
    requestAnimationFrame(() => {
      if (lastPosition) {
        const pos = clampPosition(lastPosition.left, lastPosition.top);
        panel.style.left = `${pos.left}px`;
        panel.style.top = `${pos.top}px`;
      } else {
        placeDefault();
      }
      closeBtn.focus({ preventScroll: true });
    });

    if (window.innerWidth <= 900) {
      const sidebarClose = document.querySelector('#sidebar-close-btn');
      if (sidebarClose && document.querySelector('#sidebar')?.classList.contains('open')) sidebarClose.click();
    }
  }

  function closeCalculator() {
    panel.hidden = true;
    panel.classList.remove('is-open');
    launchers[0]?.focus({ preventScroll: true });
  }

  launchers.forEach(button => {
    button.addEventListener('click', event => {
      event.preventDefault();
      if (panel.hidden) openCalculator();
      else closeCalculator();
    });
  });

  closeBtn.addEventListener('click', closeCalculator);

  panel.querySelector('.calc-modes').addEventListener('click', event => {
    const tab=event.target.closest('[data-mode]');
    if(tab) setMode(tab.dataset.mode);
  });
  panel.querySelectorAll('.calc-mode-tab').forEach(tab => {
    tab.addEventListener('focus', () => {
      if (panel.hidden) return;
      panel.classList.add('menu-open');
    });
  });

  panel.querySelector('[data-mode-panel="calculate"]').addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;

    if (button.dataset.insert) {
      insert(button.dataset.insert);
      setShift(false);
      setAlpha(false);
      return;
    }

    if (button.dataset.fn) {
      let fn = button.dataset.fn;
      if (shiftActive) {
        if (fn === 'sin') fn = 'asin';
        else if (fn === 'cos') fn = 'acos';
        else if (fn === 'tan') fn = 'atan';
        else if (fn === 'log') fn = 'pow10';
        else if (fn === 'ln') fn = 'exp';
      }
      insert(`${fn}(`);
      setShift(false);
      setAlpha(false);
      return;
    }

    const action = button.dataset.action;
    if (action === 'equals') evaluate();
    else if (action === 'clear') clearAll();
    else if (action === 'delete') deleteLast();
    else if (action === 'square') squareCurrent();
    else if (action === 'cube') {
      if (!expression) expression = 'Ans';
      expression += '^3';
      render();
    }
    else if (action === 'reciprocal') {
      expression = `1/(${expression || 'Ans'})`;
      render();
    }
    else if (action === 'fraction') toggleFraction();
    else if (action === 'angle') toggleAngle();
    else if (action === 'shift') setShift();
    else if (action === 'alpha') setAlpha();
    else if (action === 'menu') toggleMenu();
    else if (action === 'on') {
      clearAll();
      setMode('calculate');
      setShift(false);
      setAlpha(false);
    }
    else if (action === 'nav-left' || action === 'nav-up') {
      if (panel.classList.contains('menu-open')) moveMenu(-1);
    }
    else if (action === 'nav-right' || action === 'nav-down') {
      if (panel.classList.contains('menu-open')) moveMenu(1);
    }
    else if (action === 'nav-ok') {
      if (panel.classList.contains('menu-open')) {
        const focused = document.activeElement?.closest?.('.calc-mode-tab');
        if (focused?.dataset.mode) setMode(focused.dataset.mode);
      } else {
        evaluate();
      }
    }
  });

  dragHandle.addEventListener('pointerdown', event => {
    if (event.target.closest('button,select,input,textarea')) return;
    const rect = panel.getBoundingClientRect();
    dragState = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top
    };
    dragHandle.setPointerCapture?.(event.pointerId);
    panel.classList.add('is-dragging');
    event.preventDefault();
  });

  dragHandle.addEventListener('pointermove', event => {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    const pos = clampPosition(event.clientX - dragState.offsetX, event.clientY - dragState.offsetY);
    panel.style.left = `${pos.left}px`;
    panel.style.top = `${pos.top}px`;
    lastPosition = pos;
  });

  function stopDrag(event) {
    if (!dragState || (event && event.pointerId !== dragState.pointerId)) return;
    dragHandle.releasePointerCapture?.(dragState.pointerId);
    dragState = null;
    panel.classList.remove('is-dragging');
  }

  dragHandle.addEventListener('pointerup', stopDrag);
  dragHandle.addEventListener('pointercancel', stopDrag);

  window.addEventListener('resize', () => {
    if (panel.hidden) return;
    const rect = panel.getBoundingClientRect();
    const pos = clampPosition(rect.left, rect.top);
    panel.style.left = `${pos.left}px`;
    panel.style.top = `${pos.top}px`;
    lastPosition = pos;
  });

  document.addEventListener('keydown', event => {
    if (panel.hidden) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeCalculator();
      return;
    }

    const active = document.activeElement;
    const editable = active && ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName);
    if (editable || activeMode !== 'calculate') return;

    let handled = true;
    if (/^[0-9]$/.test(event.key)) insert(event.key);
    else if (event.key === '.') insert('.');
    else if (event.key === '+') insert('+');
    else if (event.key === '-') insert('-');
    else if (event.key === '*') insert('*');
    else if (event.key === '/') insert('/');
    else if (event.key === '^') insert('^');
    else if (event.key === '%') insert('%');
    else if (event.key === '(' || event.key === ')') insert(event.key);
    else if (event.key === 'Enter' || event.key === '=') evaluate();
    else if (event.key === 'Backspace' || event.key === 'Delete') deleteLast();
    else handled = false;

    if (handled) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);

  renderEquationInputs();
  renderSystemGrid();
  renderMatrices();
  renderVectors();
  render();
})();