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
          <strong>FX-580VN X</strong>
          <span>Máy tính khoa học</span>
        </div>
        <button class="calc-close" type="button" aria-label="Đóng máy tính" title="Đóng">×</button>
      </header>

      <div class="calc-screen" aria-live="polite">
        <div class="calc-screen-top">
          <span class="calc-angle-mode">DEG</span>
          <span class="calc-screen-hint">Math</span>
        </div>
        <div class="calc-expression" aria-label="Biểu thức">0</div>
        <div class="calc-result" aria-label="Kết quả">0</div>
      </div>

      <div class="calc-keypad" aria-label="Bàn phím máy tính">
        <button type="button" class="calc-key calc-key-soft calc-mode-key" data-action="angle">DEG</button>
        <button type="button" class="calc-key calc-key-soft" data-action="fraction">S⇔D</button>
        <button type="button" class="calc-key calc-key-soft" data-insert="(">(</button>
        <button type="button" class="calc-key calc-key-soft" data-insert=")">)</button>
        <button type="button" class="calc-key calc-key-ac" data-action="clear">AC</button>

        <button type="button" class="calc-key calc-key-fn" data-fn="sin">sin</button>
        <button type="button" class="calc-key calc-key-fn" data-fn="cos">cos</button>
        <button type="button" class="calc-key calc-key-fn" data-fn="tan">tan</button>
        <button type="button" class="calc-key calc-key-fn" data-fn="log">log</button>
        <button type="button" class="calc-key calc-key-fn" data-fn="ln">ln</button>

        <button type="button" class="calc-key calc-key-fn" data-fn="sqrt">√</button>
        <button type="button" class="calc-key calc-key-fn" data-action="square">x²</button>
        <button type="button" class="calc-key calc-key-fn" data-insert="^">xʸ</button>
        <button type="button" class="calc-key calc-key-fn" data-insert="!">x!</button>
        <button type="button" class="calc-key calc-key-del" data-action="delete">DEL</button>

        <button type="button" class="calc-key" data-insert="7">7</button>
        <button type="button" class="calc-key" data-insert="8">8</button>
        <button type="button" class="calc-key" data-insert="9">9</button>
        <button type="button" class="calc-key calc-key-op" data-insert="/">÷</button>
        <button type="button" class="calc-key calc-key-const" data-insert="pi">π</button>

        <button type="button" class="calc-key" data-insert="4">4</button>
        <button type="button" class="calc-key" data-insert="5">5</button>
        <button type="button" class="calc-key" data-insert="6">6</button>
        <button type="button" class="calc-key calc-key-op" data-insert="*">×</button>
        <button type="button" class="calc-key calc-key-const" data-insert="e">e</button>

        <button type="button" class="calc-key" data-insert="1">1</button>
        <button type="button" class="calc-key" data-insert="2">2</button>
        <button type="button" class="calc-key" data-insert="3">3</button>
        <button type="button" class="calc-key calc-key-op" data-insert="-">−</button>
        <button type="button" class="calc-key calc-key-soft" data-insert="Ans">Ans</button>

        <button type="button" class="calc-key calc-key-zero" data-insert="0">0</button>
        <button type="button" class="calc-key" data-insert=".">.</button>
        <button type="button" class="calc-key calc-key-fn" data-fn="pow10">10ˣ</button>
        <button type="button" class="calc-key calc-key-op" data-insert="+">+</button>
        <button type="button" class="calc-key calc-key-equals" data-action="equals">=</button>
      </div>

      <div class="calc-footnote">Kéo thanh trên cùng để di chuyển · Esc để đóng</div>
    </div>
  `;
  document.body.appendChild(panel);

  const expressionEl = panel.querySelector('.calc-expression');
  const resultEl = panel.querySelector('.calc-result');
  const angleLabel = panel.querySelector('.calc-angle-mode');
  const modeKey = panel.querySelector('.calc-mode-key');
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

  const DISPLAY_REPLACEMENTS = [
    [/sqrt\(/g, '√('],
    [/pow10\(/g, '10^('],
    [/pi/g, 'π'],
    [/Ans/g, 'Ans'],
    [/\*/g, '×'],
    [/\//g, '÷'],
    [/-/g, '−']
  ];

  function displayExpression(value) {
    let text = value || '0';
    DISPLAY_REPLACEMENTS.forEach(([pattern, replacement]) => {
      text = text.replace(pattern, replacement);
    });
    return text;
  }

  function formatNumber(value) {
    if (!Number.isFinite(value)) throw new Error('Math ERROR');
    if (Object.is(value, -0)) value = 0;
    const abs = Math.abs(value);
    if (abs !== 0 && (abs >= 1e12 || abs < 1e-9)) {
      return value.toExponential(10).replace(/\.0+(?=e)/, '').replace(/(\.\d*?[1-9])0+(?=e)/, '$1');
    }
    return Number(value.toPrecision(12)).toString();
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
    if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n) || n > 170) {
      throw new Error('Math ERROR');
    }
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
    constructor(tokens) {
      this.tokens = tokens;
      this.index = 0;
    }

    peek(type) {
      return this.tokens[this.index]?.type === type;
    }

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
      if (this.peek('+')) {
        this.index += 1;
        return this.parseUnary();
      }
      if (this.peek('-')) {
        this.index += 1;
        return -this.parseUnary();
      }
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
        throw new Error('Syntax ERROR');
      }

      throw new Error('Syntax ERROR');
    }
  }

  function calculate(source) {
    if (!source.trim()) return 0;
    const parser = new Parser(tokenize(source));
    return parser.parse();
  }

  function render() {
    expressionEl.textContent = displayExpression(expression);
    angleLabel.textContent = angleMode;
    modeKey.textContent = angleMode;
    if (!hasResult) {
      resultEl.textContent = '0';
      resultEl.classList.remove('is-error');
      return;
    }

    try {
      resultEl.classList.remove('is-error');
      resultEl.textContent = showingFraction ? (toFraction(numericResult) || formatNumber(numericResult)) : formatNumber(numericResult);
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
    const namedTokens = ['sqrt(', 'pow10(', 'sin(', 'cos(', 'tan(', 'log(', 'ln(', 'Ans', 'pi'];
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
    let top = Math.max(72, Math.min(window.innerHeight - rect.height - 18, 120));

    if (window.innerWidth <= 560) {
      left = Math.max(8, (window.innerWidth - rect.width) / 2);
      top = Math.max(64, Math.min(window.innerHeight - rect.height - 12, 88));
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

  panel.addEventListener('click', event => {
    const button = event.target.closest('.calc-key');
    if (!button) return;

    if (button.dataset.insert) {
      insert(button.dataset.insert);
      return;
    }

    if (button.dataset.fn) {
      insert(`${button.dataset.fn}(`);
      return;
    }

    const action = button.dataset.action;
    if (action === 'equals') evaluate();
    else if (action === 'clear') clearAll();
    else if (action === 'delete') deleteLast();
    else if (action === 'square') squareCurrent();
    else if (action === 'fraction') toggleFraction();
    else if (action === 'angle') toggleAngle();
  });

  dragHandle.addEventListener('pointerdown', event => {
    if (event.target.closest('button')) return;
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

    const active = document.activeElement;
    const editable = active && ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName);
    if (editable && !panel.contains(active)) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeCalculator();
      return;
    }

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

  render();
})();