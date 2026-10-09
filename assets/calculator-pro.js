(() => {
  'use strict';

  const panel=document.querySelector('#lms-calculator');
  const engine=window.__lmsCalculatorEngine;
  if(!panel||!engine) return;

  const esc=engine.escapeHtml;
  const fmt=engine.formatNumber;
  const modes=panel.querySelector('.calc-modes');
  const footnote=panel.querySelector('.calc-footnote');

  modes.innerHTML=[
    ['calculate','Calculate'],['complex','Complex'],['basen','Base-N'],
    ['matrix','Matrix'],['vector','Vector'],['statistics','Statistics'],
    ['distribution','Distribution'],['table','Table'],['equation','Equation/Func'],
    ['inequality','Inequality'],['verify','Verify'],['ratio','Ratio']
  ].map(([mode,label])=>`<button type="button" class="calc-mode-tab${mode==='calculate'?' active':''}" data-mode="${mode}">${label}</button>`).join('');

  const internalSystem=document.createElement('button');
  internalSystem.type='button';
  internalSystem.className='calc-mode-tab calc-mode-internal';
  internalSystem.dataset.mode='system';
  internalSystem.hidden=true;
  modes.appendChild(internalSystem);

  const extraPanels=document.createElement('div');
  extraPanels.className='calc-pro-panels';
  extraPanels.innerHTML=`
    <section class="calc-mode-panel calc-tool-panel" data-mode-panel="complex">
      <div class="calc-tool-head"><div><strong>Complex</strong><span>Số phức dạng a + bi và r∠θ</span></div></div>
      <div class="calc-pair-grid">
        <fieldset class="calc-pro-box"><legend>A = a + bi</legend>
          <label class="calc-number-field"><span>Re(A)</span><input id="calc-complex-ar" type="number" step="any" value="1"></label>
          <label class="calc-number-field"><span>Im(A)</span><input id="calc-complex-ai" type="number" step="any" value="1"></label>
        </fieldset>
        <fieldset class="calc-pro-box"><legend>B = c + di</legend>
          <label class="calc-number-field"><span>Re(B)</span><input id="calc-complex-br" type="number" step="any" value="1"></label>
          <label class="calc-number-field"><span>Im(B)</span><input id="calc-complex-bi" type="number" step="any" value="-1"></label>
        </fieldset>
      </div>
      <div class="calc-operation-grid calc-pro-ops" id="calc-complex-ops">
        <button data-complex-op="add">A+B</button><button data-complex-op="sub">A−B</button>
        <button data-complex-op="mul">A×B</button><button data-complex-op="div">A÷B</button>
        <button data-complex-op="conj-a">Conjg(A)</button><button data-complex-op="abs-a">Abs(A)</button>
        <button data-complex-op="arg-a">Arg(A)</button><button data-complex-op="polar-a">A → r∠θ</button>
        <button data-complex-op="conj-b">Conjg(B)</button><button data-complex-op="polar-b">B → r∠θ</button>
      </div>
      <div class="calc-output" id="calc-complex-output"></div>
    </section>

    <section class="calc-mode-panel calc-tool-panel" data-mode-panel="basen">
      <div class="calc-tool-head"><div><strong>Base-N</strong><span>BIN · OCT · DEC · HEX và phép logic 32-bit</span></div></div>
      <div class="calc-pro-form-grid">
        <label class="calc-field"><span>Cơ số nhập</span><select id="calc-base-in"><option value="10">DEC</option><option value="2">BIN</option><option value="8">OCT</option><option value="16">HEX</option></select></label>
        <label class="calc-field"><span>Giá trị A</span><input id="calc-base-a" class="calc-pro-input" value="10"></label>
        <label class="calc-field"><span>Giá trị B</span><input id="calc-base-b" class="calc-pro-input" value="12"></label>
        <label class="calc-field"><span>Phép toán</span><select id="calc-base-op"><option value="convert">Convert</option><option value="and">AND</option><option value="or">OR</option><option value="xor">XOR</option><option value="xnor">XNOR</option><option value="not">NOT A</option><option value="shl">A &lt;&lt; B</option><option value="shr">A &gt;&gt; B</option></select></label>
      </div>
      <button class="calc-solve-btn" id="calc-base-run">EXE</button>
      <div class="calc-output" id="calc-base-output"></div>
    </section>

    <section class="calc-mode-panel calc-tool-panel" data-mode-panel="distribution">
      <div class="calc-tool-head"><div><strong>Distribution</strong><span>7 kiểu phân phối chuẩn theo MENU Casio</span></div>
        <label class="calc-inline-select">Type<select id="calc-dist-type">
          <option value="normal-pd">Normal PD</option><option value="normal-cd">Normal CD</option>
          <option value="inv-normal">Inverse Normal</option><option value="bin-pd">Binomial PD</option>
          <option value="bin-cd">Binomial CD</option><option value="pois-pd">Poisson PD</option>
          <option value="pois-cd">Poisson CD</option>
        </select></label>
      </div>
      <div class="calc-pro-form-grid" id="calc-dist-fields"></div>
      <button class="calc-solve-btn" id="calc-dist-run">EXE</button>
      <div class="calc-output" id="calc-dist-output"></div>
    </section>

    <section class="calc-mode-panel calc-tool-panel" data-mode-panel="table">
      <div class="calc-tool-head"><div><strong>Table</strong><span>Tạo bảng từ f(x), g(x)</span></div></div>
      <label class="calc-field"><span>f(x)</span><input id="calc-table-f" class="calc-pro-input" value="x^2"></label>
      <label class="calc-field"><span>g(x) · có thể để trống</span><input id="calc-table-g" class="calc-pro-input" value=""></label>
      <div class="calc-pro-form-grid calc-three">
        <label class="calc-field"><span>Start</span><input id="calc-table-start" class="calc-pro-input" type="number" step="any" value="1"></label>
        <label class="calc-field"><span>End</span><input id="calc-table-end" class="calc-pro-input" type="number" step="any" value="5"></label>
        <label class="calc-field"><span>Step</span><input id="calc-table-step" class="calc-pro-input" type="number" step="any" value="1"></label>
      </div>
      <button class="calc-solve-btn" id="calc-table-run">Tạo bảng</button>
      <div class="calc-output calc-table-output" id="calc-table-output"></div>
    </section>

    <section class="calc-mode-panel calc-tool-panel" data-mode-panel="inequality">
      <div class="calc-tool-head"><div><strong>Inequality</strong><span>Bất phương trình bậc 2, 3, 4</span></div>
        <label class="calc-inline-select">Bậc<select id="calc-ineq-degree"><option value="2">2</option><option value="3">3</option><option value="4">4</option></select></label>
      </div>
      <div class="calc-equation-preview" id="calc-ineq-preview">ax² + bx + c ≥ 0</div>
      <label class="calc-field"><span>Quan hệ</span><select id="calc-ineq-rel"><option value=">=">≥ 0</option><option value=">">&gt; 0</option><option value="<=">≤ 0</option><option value="<">&lt; 0</option></select></label>
      <div class="calc-input-grid" id="calc-ineq-inputs"></div>
      <button class="calc-solve-btn" id="calc-ineq-run">Giải bất phương trình</button>
      <div class="calc-output" id="calc-ineq-output"></div>
    </section>

    <section class="calc-mode-panel calc-tool-panel" data-mode-panel="verify">
      <div class="calc-tool-head"><div><strong>Verify</strong><span>Kiểm tra quan hệ giữa hai biểu thức</span></div></div>
      <label class="calc-field"><span>Biểu thức trái</span><input id="calc-verify-left" class="calc-pro-input" value="sin(30)"></label>
      <label class="calc-field"><span>Quan hệ</span><select id="calc-verify-op"><option value="=">=</option><option value="!=">≠</option><option value="<">&lt;</option><option value="<=">≤</option><option value=">">&gt;</option><option value=">=">≥</option></select></label>
      <label class="calc-field"><span>Biểu thức phải</span><input id="calc-verify-right" class="calc-pro-input" value="0.5"></label>
      <div class="calc-pro-form-grid calc-three">
        <label class="calc-field"><span>x</span><input id="calc-verify-x" class="calc-pro-input" type="number" value="0"></label>
        <label class="calc-field"><span>y</span><input id="calc-verify-y" class="calc-pro-input" type="number" value="0"></label>
        <label class="calc-field"><span>z</span><input id="calc-verify-z" class="calc-pro-input" type="number" value="0"></label>
      </div>
      <button class="calc-solve-btn" id="calc-verify-run">Verify</button>
      <div class="calc-output" id="calc-verify-output"></div>
    </section>

    <section class="calc-mode-panel calc-tool-panel" data-mode-panel="ratio">
      <div class="calc-tool-head"><div><strong>Ratio</strong><span>Giải tỷ lệ thức</span></div></div>
      <label class="calc-field"><span>Dạng</span><select id="calc-ratio-type"><option value="right">A:B = C:X</option><option value="left">A:B = X:D</option></select></label>
      <div class="calc-pro-form-grid calc-four">
        <label class="calc-field"><span>A</span><input id="calc-ratio-a" class="calc-pro-input" type="number" value="2"></label>
        <label class="calc-field"><span>B</span><input id="calc-ratio-b" class="calc-pro-input" type="number" value="3"></label>
        <label class="calc-field"><span>C</span><input id="calc-ratio-c" class="calc-pro-input" type="number" value="4"></label>
        <label class="calc-field"><span>D</span><input id="calc-ratio-d" class="calc-pro-input" type="number" value="5"></label>
      </div>
      <button class="calc-solve-btn" id="calc-ratio-run">Giải tỷ lệ</button>
      <div class="calc-output" id="calc-ratio-output"></div>
    </section>
  `;
  footnote.before(extraPanels);

  // Equation/Func keeps the existing polynomial and simultaneous solvers.
  const equationPanel=panel.querySelector('[data-mode-panel="equation"]');
  const systemPanel=panel.querySelector('[data-mode-panel="system"]');
  equationPanel?.insertAdjacentHTML('afterbegin',`<div class="calc-submode-row"><button class="active" type="button">Polynomial</button><button type="button" data-open-system>Simultaneous</button></div>`);
  systemPanel?.insertAdjacentHTML('afterbegin',`<div class="calc-submode-row"><button type="button" data-back-equation>← Equation/Func</button></div>`);
  panel.querySelector('[data-open-system]')?.addEventListener('click',()=>engine.setMode('system'));
  panel.querySelector('[data-back-equation]')?.addEventListener('click',()=>engine.setMode('equation'));

  // CALCULATE auxiliary strip: Casio-style option tools without changing the approved face.
  const controlDeck=panel.querySelector('.calc-control-deck');
  controlDeck?.insertAdjacentHTML('afterend',`
    <div class="calc-pro-keystrip">
      <button type="button" data-pro-drawer="optn">OPTN</button>
      <button type="button" data-pro-drawer="calc">CALC</button>
      <button type="button" data-pro-drawer="solve">SOLVE</button>
      <button type="button" data-pro-drawer="const">CONST</button>
      <button type="button" data-pro-drawer="conv">CONV</button>
      <button type="button" data-pro-drawer="mem">MEM</button>
    </div>
    <div class="calc-pro-drawer" hidden>
      <section data-pro-section="optn">
        <div class="calc-function-grid">
          <button data-fn="sinh">sinh</button><button data-fn="cosh">cosh</button><button data-fn="tanh">tanh</button>
          <button data-fn="asinh">sinh⁻¹</button><button data-fn="acosh">cosh⁻¹</button><button data-fn="atanh">tanh⁻¹</button>
          <button data-fn="abs">Abs</button><button data-fn="cbrt">∛</button><button data-fn="logb">logₐ</button>
          <button data-fn="gcd">GCD</button><button data-fn="lcm">LCM</button><button data-fn="mod">Rmdr</button>
          <button data-fn="npr">nPr</button><button data-fn="ncr">nCr</button><button data-fn="root">x√y</button>
          <button data-fn="floor">Floor</button><button data-fn="ceil">Ceil</button><button data-fn="int">Int</button>
          <button data-insert="rand()">Ran#</button><button data-fn="randint">RanInt</button><button data-insert="PreAns">PreAns</button>
        </div>
        <div class="calc-calculus-grid">
          <label class="calc-field"><span>Numerical calculus</span><select id="calc-calculus-type"><option value="derivative">d/dx</option><option value="integral">∫</option><option value="sum">Σ</option><option value="product">Π</option></select></label>
          <label class="calc-field calc-wide"><span>f(x)</span><input id="calc-calculus-expr" class="calc-pro-input" value="x^2"></label>
          <label class="calc-field"><span>a / x₀</span><input id="calc-calculus-a" class="calc-pro-input" type="number" value="0"></label>
          <label class="calc-field"><span>b</span><input id="calc-calculus-b" class="calc-pro-input" type="number" value="1"></label>
        </div>
        <button class="calc-solve-btn" id="calc-calculus-run">EXE</button>
        <div class="calc-output" id="calc-calculus-output"></div>
      </section>

      <section data-pro-section="calc" hidden>
        <label class="calc-field"><span>Expression</span><input id="calc-calc-expr" class="calc-pro-input" value="x^2+y"></label>
        <div class="calc-pro-form-grid calc-three">
          <label class="calc-field"><span>x</span><input id="calc-calc-x" class="calc-pro-input" type="number" value="2"></label>
          <label class="calc-field"><span>y</span><input id="calc-calc-y" class="calc-pro-input" type="number" value="3"></label>
          <label class="calc-field"><span>z</span><input id="calc-calc-z" class="calc-pro-input" type="number" value="0"></label>
        </div>
        <button class="calc-solve-btn" id="calc-calc-run">CALC</button><div class="calc-output" id="calc-calc-output"></div>
      </section>

      <section data-pro-section="solve" hidden>
        <label class="calc-field"><span>f(x) = 0</span><input id="calc-solve-expr" class="calc-pro-input" value="x^2-2"></label>
        <label class="calc-field"><span>Initial value</span><input id="calc-solve-guess" class="calc-pro-input" type="number" value="1"></label>
        <button class="calc-solve-btn" id="calc-solve-run">SOLVE</button><div class="calc-output" id="calc-solve-output"></div>
      </section>

      <section data-pro-section="const" hidden>
        <label class="calc-field"><span>Scientific constant</span><select id="calc-const-select"></select></label>
        <button class="calc-solve-btn" id="calc-const-run">Hiển thị</button><div class="calc-output" id="calc-const-output"></div>
      </section>

      <section data-pro-section="conv" hidden>
        <div class="calc-pro-form-grid calc-three">
          <label class="calc-field"><span>Value</span><input id="calc-conv-value" class="calc-pro-input" type="number" value="1"></label>
          <label class="calc-field"><span>From</span><select id="calc-conv-from"></select></label>
          <label class="calc-field"><span>To</span><select id="calc-conv-to"></select></label>
        </div>
        <button class="calc-solve-btn" id="calc-conv-run">Convert</button><div class="calc-output" id="calc-conv-output"></div>
      </section>

      <section data-pro-section="mem" hidden>
        <div class="calc-pro-form-grid">
          <label class="calc-field"><span>Display</span><select id="calc-display-mode"><option>NORM</option><option>FIX</option><option>SCI</option><option>ENG</option></select></label>
          <label class="calc-field"><span>Digits</span><input id="calc-display-digits" class="calc-pro-input" type="number" min="0" max="10" value="10"></label>
        </div>
        <div class="calc-memory-grid" id="calc-memory-grid"></div>
        <div class="calc-operation-grid"><button id="calc-memory-store-ans">STO Ans</button><button id="calc-memory-clear">CLR Memory</button><button id="calc-history-refresh">Replay</button></div>
        <div class="calc-output" id="calc-memory-output"></div>
      </section>
    </div>
  `);

  const outputRows=(target,rows)=>engine.outputRows(target,rows);
  const outputError=(target,error)=>engine.outputError(target,error?.message||String(error));

  // Drawer switching
  const drawer=panel.querySelector('.calc-pro-drawer');
  panel.querySelector('.calc-pro-keystrip')?.addEventListener('click',event=>{
    const btn=event.target.closest('[data-pro-drawer]'); if(!btn) return;
    const name=btn.dataset.proDrawer;
    const currently=!drawer.hidden && drawer.dataset.open===name;
    drawer.hidden=currently;
    drawer.dataset.open=currently?'':name;
    panel.querySelectorAll('[data-pro-section]').forEach(sec=>{sec.hidden=sec.dataset.proSection!==name;});
    panel.querySelectorAll('.calc-pro-keystrip button').forEach(b=>b.classList.toggle('active',!currently&&b===btn));
  });

  // Numerical calculus
  function derivative(expr,x){
    const h=Math.max(1e-6,Math.abs(x)*1e-5);
    const f=v=>engine.evaluate(expr,{x:v});
    return (f(x-2*h)-8*f(x-h)+8*f(x+h)-f(x+2*h))/(12*h);
  }
  function integral(expr,a,b){
    if(a===b) return 0;
    let sign=1;if(b<a){[a,b]=[b,a];sign=-1;}
    const n=1200,h=(b-a)/n,f=v=>engine.evaluate(expr,{x:v});
    let sum=f(a)+f(b);
    for(let i=1;i<n;i+=1) sum+=(i%2?4:2)*f(a+i*h);
    return sign*sum*h/3;
  }
  panel.querySelector('#calc-calculus-run')?.addEventListener('click',()=>{
    const out=panel.querySelector('#calc-calculus-output');
    try{
      const type=panel.querySelector('#calc-calculus-type').value;
      const expr=panel.querySelector('#calc-calculus-expr').value;
      const a=Number(panel.querySelector('#calc-calculus-a').value);
      const b=Number(panel.querySelector('#calc-calculus-b').value);
      let value,label;
      if(type==='derivative'){value=derivative(expr,a);label=`f′(${a})`;}
      else if(type==='integral'){value=integral(expr,a,b);label='∫ f(x) dx';}
      else {
        if(!Number.isInteger(a)||!Number.isInteger(b)||Math.abs(b-a)>100000) throw new Error('Σ/Π yêu cầu cận nguyên hợp lý.');
        const step=b>=a?1:-1;value=type==='sum'?0:1;
        for(let x=a;step>0?x<=b:x>=b;x+=step){
          const v=engine.evaluate(expr,{x});
          value=type==='sum'?value+v:value*v;
          if(!Number.isFinite(value)) throw new Error('Math ERROR');
        }
        label=type==='sum'?'Σ':'Π';
      }
      outputRows(out,[[label,fmt(value)]]);
    }catch(e){outputError(out,e);}
  });

  // CALC and SOLVE
  panel.querySelector('#calc-calc-run')?.addEventListener('click',()=>{
    const out=panel.querySelector('#calc-calc-output');
    try{
      const value=engine.evaluate(panel.querySelector('#calc-calc-expr').value,{
        x:Number(panel.querySelector('#calc-calc-x').value),y:Number(panel.querySelector('#calc-calc-y').value),z:Number(panel.querySelector('#calc-calc-z').value)
      });
      outputRows(out,[['Ans',fmt(value)]]);
    }catch(e){outputError(out,e);}
  });
  function solveNumeric(expr,guess){
    let x=guess;
    for(let i=0;i<80;i+=1){
      const fx=engine.evaluate(expr,{x});
      if(Math.abs(fx)<1e-12) return {x,residual:fx,iterations:i+1};
      const h=Math.max(1e-6,Math.abs(x)*1e-6);
      const d=(engine.evaluate(expr,{x:x+h})-engine.evaluate(expr,{x:x-h}))/(2*h);
      if(!Number.isFinite(d)||Math.abs(d)<1e-12) x+=0.137;
      else {
        const next=x-fx/d;
        if(!Number.isFinite(next)) throw new Error('Không hội tụ.');
        if(Math.abs(next-x)<1e-12) return {x:next,residual:engine.evaluate(expr,{x:next}),iterations:i+1};
        x=next;
      }
    }
    const residual=engine.evaluate(expr,{x});
    if(Math.abs(residual)>1e-7) throw new Error('Không tìm được nghiệm từ giá trị khởi tạo này.');
    return {x,residual,iterations:80};
  }
  panel.querySelector('#calc-solve-run')?.addEventListener('click',()=>{
    const out=panel.querySelector('#calc-solve-output');
    try{
      const r=solveNumeric(panel.querySelector('#calc-solve-expr').value,Number(panel.querySelector('#calc-solve-guess').value));
      outputRows(out,[['x',fmt(r.x)],['L−R',fmt(r.residual)],['Iterations',String(r.iterations)]]);
    }catch(e){outputError(out,e);}
  });

  // Constants
  const constants=[
    ['c','Speed of light',299792458,'m/s'],['G','Gravitational constant',6.67430e-11,'m³·kg⁻¹·s⁻²'],
    ['h','Planck constant',6.62607015e-34,'J·s'],['ħ','Reduced Planck constant',1.054571817e-34,'J·s'],
    ['e','Elementary charge',1.602176634e-19,'C'],['mₑ','Electron mass',9.1093837139e-31,'kg'],
    ['mₚ','Proton mass',1.67262192595e-27,'kg'],['Nₐ','Avogadro constant',6.02214076e23,'mol⁻¹'],
    ['k','Boltzmann constant',1.380649e-23,'J/K'],['R','Gas constant',8.31446261815324,'J·mol⁻¹·K⁻¹'],
    ['g','Standard gravity',9.80665,'m/s²'],['atm','Standard atmosphere',101325,'Pa'],
    ['ε₀','Vacuum permittivity',8.8541878128e-12,'F/m'],['μ₀','Vacuum permeability',1.25663706212e-6,'N/A²'],
    ['eV','Electron volt',1.602176634e-19,'J']
  ];
  const constSelect=panel.querySelector('#calc-const-select');
  constSelect.innerHTML=constants.map((item,i)=>`<option value="${i}">${item[0]} · ${item[1]}</option>`).join('');
  panel.querySelector('#calc-const-run')?.addEventListener('click',()=>{
    const item=constants[Number(constSelect.value)];
    outputRows(panel.querySelector('#calc-const-output'),[[item[0],`${item[2]} ${item[3]}`]]);
  });

  // Unit conversion
  const units={
    m:['Length',1],km:['Length',1000],cm:['Length',.01],mm:['Length',.001],in:['Length',.0254],ft:['Length',.3048],yd:['Length',.9144],mi:['Length',1609.344],
    kg:['Mass',1],g:['Mass',.001],lb:['Mass',.45359237],oz:['Mass',.028349523125],
    Pa:['Pressure',1],kPa:['Pressure',1000],bar:['Pressure',100000],atm:['Pressure',101325],psi:['Pressure',6894.757293168],
    'm/s':['Speed',1],'km/h':['Speed',1/3.6],mph:['Speed',.44704],knot:['Speed',.5144444444],
    J:['Energy',1],kJ:['Energy',1000],cal:['Energy',4.184],kcal:['Energy',4184],eV:['Energy',1.602176634e-19],kWh:['Energy',3.6e6],
    rad:['Angle',1],deg:['Angle',Math.PI/180],grad:['Angle',Math.PI/200]
  };
  const unitOptions=Object.entries(units).map(([u,[group]])=>`<option value="${u}">${u} · ${group}</option>`).join('')+`<option value="C">°C · Temperature</option><option value="F">°F · Temperature</option><option value="K">K · Temperature</option>`;
  panel.querySelector('#calc-conv-from').innerHTML=unitOptions;
  panel.querySelector('#calc-conv-to').innerHTML=unitOptions;
  panel.querySelector('#calc-conv-to').value='km';
  function convertTemp(v,from,to){
    const K=from==='K'?v:from==='C'?v+273.15:(v-32)*5/9+273.15;
    return to==='K'?K:to==='C'?K-273.15:(K-273.15)*9/5+32;
  }
  panel.querySelector('#calc-conv-run')?.addEventListener('click',()=>{
    const out=panel.querySelector('#calc-conv-output');
    try{
      const v=Number(panel.querySelector('#calc-conv-value').value),from=panel.querySelector('#calc-conv-from').value,to=panel.querySelector('#calc-conv-to').value;
      if(!Number.isFinite(v)) throw new Error('Giá trị không hợp lệ.');
      let result;
      if(['C','F','K'].includes(from)||['C','F','K'].includes(to)){
        if(!['C','F','K'].includes(from)||!['C','F','K'].includes(to)) throw new Error('Hai đơn vị phải cùng đại lượng.');
        result=convertTemp(v,from,to);
      }else{
        if(units[from][0]!==units[to][0]) throw new Error('Hai đơn vị phải cùng đại lượng.');
        result=v*units[from][1]/units[to][1];
      }
      outputRows(out,[[`${v} ${from}`,`${fmt(result)} ${to}`]]);
    }catch(e){outputError(out,e);}
  });

  // Memory, replay, display
  const memNames=['A','B','C','D','E','F','x','y','z','M'];
  const memoryGrid=panel.querySelector('#calc-memory-grid');
  function renderMemory(){
    memoryGrid.innerHTML=memNames.map(name=>`<label><span>${name}</span><input type="number" step="any" data-memory="${name}" value="${engine.getMemory(name)}"></label>`).join('');
  }
  renderMemory();
  memoryGrid.addEventListener('change',event=>{
    const input=event.target.closest('[data-memory]');if(!input)return;
    try{engine.setMemory(input.dataset.memory,Number(input.value));}catch{}
  });
  panel.querySelector('#calc-memory-store-ans')?.addEventListener('click',()=>{
    engine.setMemory('M',engine.getAnswer());renderMemory();
    outputRows(panel.querySelector('#calc-memory-output'),[['M',fmt(engine.getMemory('M'))]]);
  });
  panel.querySelector('#calc-memory-clear')?.addEventListener('click',()=>{engine.clearMemory();renderMemory();outputRows(panel.querySelector('#calc-memory-output'),[['Memory','Cleared']]);});
  panel.querySelector('#calc-history-refresh')?.addEventListener('click',()=>{
    const rows=engine.getHistory().slice(0,8);
    panel.querySelector('#calc-memory-output').innerHTML=rows.length?`<div class="calc-history-list">${rows.map(r=>`<div><code>${esc(r.expression)}</code><strong>${esc(fmt(r.result))}</strong></div>`).join('')}</div>`:'<div class="calc-output-error">Chưa có lịch sử.</div>';
  });
  panel.querySelector('#calc-display-mode')?.addEventListener('change',event=>engine.setDisplay(event.target.value,Number(panel.querySelector('#calc-display-digits').value)));
  panel.querySelector('#calc-display-digits')?.addEventListener('change',event=>engine.setDisplay(panel.querySelector('#calc-display-mode').value,Number(event.target.value)));

  // Complex
  const c=(re,im=0)=>({re,im});
  const cadd=(a,b)=>c(a.re+b.re,a.im+b.im), csub=(a,b)=>c(a.re-b.re,a.im-b.im);
  const cmul=(a,b)=>c(a.re*b.re-a.im*b.im,a.re*b.im+a.im*b.re);
  const cdiv=(a,b)=>{const d=b.re*b.re+b.im*b.im;if(Math.abs(d)<1e-15)throw new Error('Math ERROR');return c((a.re*b.re+a.im*b.im)/d,(a.im*b.re-a.re*b.im)/d);};
  const cfmt=z=>Math.abs(z.im)<1e-12?fmt(z.re):`${fmt(z.re)} ${z.im>=0?'+':'−'} ${fmt(Math.abs(z.im))}i`;
  function readComplex(prefix){return c(Number(panel.querySelector(`#calc-complex-${prefix}r`).value),Number(panel.querySelector(`#calc-complex-${prefix}i`).value));}
  panel.querySelector('#calc-complex-ops')?.addEventListener('click',event=>{
    const b=event.target.closest('[data-complex-op]');if(!b)return;const out=panel.querySelector('#calc-complex-output');
    try{
      const A=readComplex('a'),B=readComplex('b'),op=b.dataset.complexOp;let rows;
      if(op==='add')rows=[['A+B',cfmt(cadd(A,B))]];
      else if(op==='sub')rows=[['A−B',cfmt(csub(A,B))]];
      else if(op==='mul')rows=[['A×B',cfmt(cmul(A,B))]];
      else if(op==='div')rows=[['A÷B',cfmt(cdiv(A,B))]];
      else if(op==='conj-a')rows=[['Conjg(A)',cfmt(c(A.re,-A.im))]];
      else if(op==='conj-b')rows=[['Conjg(B)',cfmt(c(B.re,-B.im))]];
      else if(op==='abs-a')rows=[['Abs(A)',fmt(Math.hypot(A.re,A.im))]];
      else if(op==='arg-a'){
        let ang=Math.atan2(A.im,A.re);const mode=engine.getAngleMode();if(mode==='DEG')ang*=180/Math.PI;else if(mode==='GRA')ang*=200/Math.PI;rows=[['Arg(A)',fmt(ang)]];
      }else{
        const Z=op==='polar-b'?B:A;let theta=Math.atan2(Z.im,Z.re);const mode=engine.getAngleMode();if(mode==='DEG')theta*=180/Math.PI;else if(mode==='GRA')theta*=200/Math.PI;
        rows=[[op==='polar-b'?'B':'A',`${fmt(Math.hypot(Z.re,Z.im))} ∠ ${fmt(theta)}`]];
      }
      outputRows(out,rows);
    }catch(e){outputError(out,e);}
  });

  // Base-N
  function parseBase(text,base){
    const raw=String(text).trim().toUpperCase();if(!raw)throw new Error('Thiếu giá trị.');
    const sign=raw.startsWith('-')?-1n:1n,digits=raw.replace(/^[-+]/,'');
    if(!new RegExp(base===2?'^[01]+$':base===8?'^[0-7]+$':base===10?'^\\d+$':'^[0-9A-F]+$').test(digits))throw new Error('Chữ số không hợp lệ với cơ số đã chọn.');
    return sign*BigInt(parseInt(digits,base));
  }
  function int32(v){return BigInt.asIntN(32,v);}
  function baseRows(v){
    const s=int32(v),u=BigInt.asUintN(32,s),neg=s<0n;
    return [['DEC',s.toString()],['HEX',(neg?u:s).toString(16).toUpperCase()],['OCT',(neg?u:s).toString(8)],['BIN',(neg?u:s).toString(2)]];
  }
  panel.querySelector('#calc-base-run')?.addEventListener('click',()=>{
    const out=panel.querySelector('#calc-base-output');
    try{
      const base=Number(panel.querySelector('#calc-base-in').value),A=parseBase(panel.querySelector('#calc-base-a').value,base),B=parseBase(panel.querySelector('#calc-base-b').value||'0',base),op=panel.querySelector('#calc-base-op').value;
      let v=A;
      if(op==='and')v=A&B;else if(op==='or')v=A|B;else if(op==='xor')v=A^B;else if(op==='xnor')v=~(A^B);else if(op==='not')v=~A;else if(op==='shl')v=A<<BigInt(Number(B));else if(op==='shr')v=A>>BigInt(Number(B));
      outputRows(out,baseRows(v));
    }catch(e){outputError(out,e);}
  });

  // Distributions
  const distConfig={
    'normal-pd':[['x',0],['σ',1],['μ',0]],'normal-cd':[['Lower',-1],['Upper',1],['σ',1],['μ',0]],
    'inv-normal':[['Area',.95],['σ',1],['μ',0]],'bin-pd':[['x',3],['N',10],['p',.5]],'bin-cd':[['x',3],['N',10],['p',.5]],
    'pois-pd':[['x',3],['λ',2]],'pois-cd':[['x',3],['λ',2]]
  };
  const distType=panel.querySelector('#calc-dist-type'),distFields=panel.querySelector('#calc-dist-fields');
  function renderDistFields(){distFields.innerHTML=distConfig[distType.value].map(([name,val],i)=>`<label class="calc-field"><span>${name}</span><input class="calc-pro-input" type="number" step="any" value="${val}" data-dist-index="${i}"></label>`).join('');}
  distType.addEventListener('change',renderDistFields);renderDistFields();
  function erf(x){const sign=x<0?-1:1,a=Math.abs(x),t=1/(1+.3275911*a),y=1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-.284496736)*t+.254829592)*t*Math.exp(-a*a);return sign*y;}
  const phi=z=>Math.exp(-.5*z*z)/Math.sqrt(2*Math.PI),Phi=z=>.5*(1+erf(z/Math.SQRT2));
  function invNorm(p){
    if(!(p>0&&p<1)){if(p===0)return-Infinity;if(p===1)return Infinity;throw new Error('Area phải nằm trong [0,1].');}
    const a=[-39.6968302866538,220.946098424521,-275.928510446969,138.357751867269,-30.6647980661472,2.50662827745924];
    const b=[-54.4760987982241,161.585836858041,-155.698979859887,66.8013118877197,-13.2806815528857];
    const c=[-.00778489400243029,-.322396458041136,-2.40075827716184,-2.54973253934373,4.37466414146497,2.93816398269878];
    const d=[.00778469570904146,.32246712907004,2.445134137143,3.75440866190742],pl=.02425,ph=1-pl;let q,r;
    if(p<pl){q=Math.sqrt(-2*Math.log(p));return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);}
    if(p>ph){q=Math.sqrt(-2*Math.log(1-p));return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);}
    q=p-.5;r=q*q;return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q/(((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
  }
  const binPdf=(x,n,p)=>engine.combination(n,x)*Math.pow(p,x)*Math.pow(1-p,n-x);
  const poisPdf=(x,l)=>Math.exp(-l)*Math.pow(l,x)/engine.factorial(x);
  panel.querySelector('#calc-dist-run')?.addEventListener('click',()=>{
    const out=panel.querySelector('#calc-dist-output');
    try{
      const type=distType.value,v=Array.from(distFields.querySelectorAll('input')).map(i=>Number(i.value));let result;
      if(type==='normal-pd'){const[x,sigma,mu]=v;if(sigma<=0)throw new Error('σ phải > 0.');result=phi((x-mu)/sigma)/sigma;}
      else if(type==='normal-cd'){const[lo,hi,sigma,mu]=v;if(sigma<=0||hi<lo)throw new Error('Kiểm tra Lower, Upper và σ.');result=Phi((hi-mu)/sigma)-Phi((lo-mu)/sigma);}
      else if(type==='inv-normal'){const[p,sigma,mu]=v;if(sigma<=0)throw new Error('σ phải > 0.');result=mu+sigma*invNorm(p);}
      else if(type==='bin-pd'||type==='bin-cd'){let[x,n,p]=v;x=Math.floor(x);if(!Number.isInteger(n)||n<0||p<0||p>1||x<0)throw new Error('Kiểm tra x, N, p.');result=type==='bin-pd'?binPdf(x,n,p):Array.from({length:Math.min(x,n)+1},(_,k)=>binPdf(k,n,p)).reduce((a,b)=>a+b,0);}
      else {let[x,l]=v;x=Math.floor(x);if(x<0||l<0)throw new Error('Kiểm tra x và λ.');result=type==='pois-pd'?poisPdf(x,l):Array.from({length:x+1},(_,k)=>poisPdf(k,l)).reduce((a,b)=>a+b,0);}
      outputRows(out,[['P',fmt(result)]]);
    }catch(e){outputError(out,e);}
  });

  // Table
  panel.querySelector('#calc-table-run')?.addEventListener('click',()=>{
    const out=panel.querySelector('#calc-table-output');
    try{
      const f=panel.querySelector('#calc-table-f').value,g=panel.querySelector('#calc-table-g').value.trim(),start=Number(panel.querySelector('#calc-table-start').value),end=Number(panel.querySelector('#calc-table-end').value),step=Number(panel.querySelector('#calc-table-step').value);
      if(!f||!Number.isFinite(start)||!Number.isFinite(end)||!Number.isFinite(step)||step===0||(end-start)*step<0)throw new Error('Khoảng Table không hợp lệ.');
      const rows=[];for(let i=0,x=start;i<100&& (step>0?x<=end+1e-12:x>=end-1e-12);i+=1,x=start+i*step)rows.push([x,engine.evaluate(f,{x}),g?engine.evaluate(g,{x}):null]);
      if(!rows.length)throw new Error('Không có dòng dữ liệu.');
      out.innerHTML=`<div class="calc-data-table"><div class="head"><span>x</span><span>f(x)</span>${g?'<span>g(x)</span>':''}</div>${rows.map(r=>`<div><span>${esc(fmt(r[0]))}</span><span>${esc(fmt(r[1]))}</span>${g?`<span>${esc(fmt(r[2]))}</span>`:''}</div>`).join('')}</div>`;
    }catch(e){outputError(out,e);}
  });

  // Inequality
  const ineqDegree=panel.querySelector('#calc-ineq-degree'),ineqRel=panel.querySelector('#calc-ineq-rel'),ineqInputs=panel.querySelector('#calc-ineq-inputs'),ineqPreview=panel.querySelector('#calc-ineq-preview');
  function renderIneq(){
    const d=Number(ineqDegree.value),letters=['a','b','c','d','e'].slice(0,d+1);
    ineqInputs.innerHTML=letters.map((l,i)=>`<label class="calc-number-field"><span>${l}</span><input type="number" step="any" value="${i===0?1:0}"></label>`).join('');
    const poly=d===2?'ax² + bx + c':d===3?'ax³ + bx² + cx + d':'ax⁴ + bx³ + cx² + dx + e';
    const sym=ineqRel.value==='>='?'≥':ineqRel.value==='<='?'≤':ineqRel.value;ineqPreview.textContent=`${poly} ${sym} 0`;
  }
  ineqDegree.addEventListener('change',renderIneq);ineqRel.addEventListener('change',renderIneq);renderIneq();
  function polyEval(coeff,x){return coeff.reduce((a,b)=>a*x+b);}
  function satisfies(v,rel){return rel==='>'?v>1e-9:rel==='<'?v<-1e-9:rel==='>='?v>=-1e-9:v<=1e-9;}
  function intervalText(a,b,leftClosed,rightClosed){
    const L=a===-Infinity?'−∞':fmt(a),R=b===Infinity?'∞':fmt(b);
    return `${leftClosed?'[':'('}${L}, ${R}${rightClosed?']':')'}`;
  }
  panel.querySelector('#calc-ineq-run')?.addEventListener('click',()=>{
    const out=panel.querySelector('#calc-ineq-output');
    try{
      const coeff=Array.from(ineqInputs.querySelectorAll('input')).map(i=>Number(i.value));if(Math.abs(coeff[0])<1e-12)throw new Error('Hệ số bậc cao nhất phải khác 0.');
      const rel=ineqRel.value,nonStrict=rel.includes('=');
      const roots=engine.solvePolynomial(coeff).filter(z=>Math.abs(z.im)<1e-8).map(z=>z.re).sort((a,b)=>a-b).filter((v,i,a)=>i===0||Math.abs(v-a[i-1])>1e-7);
      const bounds=[-Infinity,...roots,Infinity],pieces=[];
      for(let i=0;i<bounds.length-1;i+=1){
        const a=bounds[i],b=bounds[i+1],test=a===-Infinity?b-Math.max(1,Math.abs(b)+1):b===Infinity?a+Math.max(1,Math.abs(a)+1):(a+b)/2;
        if(satisfies(polyEval(coeff,test),rel))pieces.push(intervalText(a,b,nonStrict&&a!==-Infinity,nonStrict&&b!==Infinity));
      }
      if(nonStrict) for(const r of roots){if(Math.abs(polyEval(coeff,r))<1e-7&&!pieces.some(p=>p.includes(fmt(r))))pieces.push(`[${fmt(r)}, ${fmt(r)}]`);}
      outputRows(out,[['x',pieces.length?pieces.join(' ∪ '):'∅']]);
    }catch(e){outputError(out,e);}
  });

  // Verify
  panel.querySelector('#calc-verify-run')?.addEventListener('click',()=>{
    const out=panel.querySelector('#calc-verify-output');
    try{
      const vars={x:Number(panel.querySelector('#calc-verify-x').value),y:Number(panel.querySelector('#calc-verify-y').value),z:Number(panel.querySelector('#calc-verify-z').value)};
      const L=engine.evaluate(panel.querySelector('#calc-verify-left').value,vars),R=engine.evaluate(panel.querySelector('#calc-verify-right').value,vars),op=panel.querySelector('#calc-verify-op').value,tol=1e-10*Math.max(1,Math.abs(L),Math.abs(R));
      const ok=op==='='?Math.abs(L-R)<=tol:op==='!='?Math.abs(L-R)>tol:op==='<'?L<R-tol:op==='<='?L<=R+tol:op==='>'?L>R+tol:L>=R-tol;
      outputRows(out,[['Result',ok?'TRUE':'FALSE'],['Left',fmt(L)],['Right',fmt(R)]]);
    }catch(e){outputError(out,e);}
  });

  // Ratio
  panel.querySelector('#calc-ratio-run')?.addEventListener('click',()=>{
    const out=panel.querySelector('#calc-ratio-output');
    try{
      const A=Number(panel.querySelector('#calc-ratio-a').value),B=Number(panel.querySelector('#calc-ratio-b').value),C=Number(panel.querySelector('#calc-ratio-c').value),D=Number(panel.querySelector('#calc-ratio-d').value),type=panel.querySelector('#calc-ratio-type').value;
      const x=type==='right'?(B*C/A):(A*D/B);if(!Number.isFinite(x))throw new Error('Không thể chia cho 0.');
      outputRows(out,[['X',fmt(x)]]);
    }catch(e){outputError(out,e);}
  });

  // Advanced statistics regression types
  const statMode=panel.querySelector('#calc-stat-mode');
  if(statMode){
    [['quadratic','Quadratic'],['logarithmic','Logarithmic'],['exp-e','Exponential e'],['exp-ab','Exponential ab'],['power','Power'],['inverse','Inverse']].forEach(([v,l])=>statMode.insertAdjacentHTML('beforeend',`<option value="${v}">${l}</option>`));
    const statSolve=panel.querySelector('#calc-stat-solve');
    statSolve?.addEventListener('click',event=>{
      if(['one','two'].includes(statMode.value))return;
      event.preventDefault();event.stopImmediatePropagation();
      const out=panel.querySelector('#calc-stat-output');
      try{
        const xs=panel.querySelector('#calc-stat-x').value.trim().split(/[\s,;]+/).filter(Boolean).map(Number),ys=panel.querySelector('#calc-stat-y').value.trim().split(/[\s,;]+/).filter(Boolean).map(Number);
        if(xs.length!==ys.length||xs.length<3||xs.some(v=>!Number.isFinite(v))||ys.some(v=>!Number.isFinite(v)))throw new Error('Dữ liệu X/Y phải hợp lệ và cùng số phần tử.');
        const linear=(X,Y)=>{const n=X.length,mx=X.reduce((a,b)=>a+b,0)/n,my=Y.reduce((a,b)=>a+b,0)/n;let sxx=0,sxy=0,syy=0;for(let i=0;i<n;i++){const dx=X[i]-mx,dy=Y[i]-my;sxx+=dx*dx;sxy+=dx*dy;syy+=dy*dy;}return {a:my-(sxy/sxx)*mx,b:sxy/sxx,r:sxy/Math.sqrt(sxx*syy)};};
        let rows;
        if(statMode.value==='quadratic'){
          const n=xs.length,S=k=>xs.reduce((a,x)=>a+x**k,0),Sy=k=>xs.reduce((a,x,i)=>a+ys[i]*x**k,0);
          const M=[[n,S(1),S(2)],[S(1),S(2),S(3)],[S(2),S(3),S(4)]],Y=[Sy(0),Sy(1),Sy(2)];
          const A=M.map((r,i)=>[...r,Y[i]]);
          for(let c=0;c<3;c++){let p=c;for(let r=c+1;r<3;r++)if(Math.abs(A[r][c])>Math.abs(A[p][c]))p=r;[A[c],A[p]]=[A[p],A[c]];const d=A[c][c];for(let j=c;j<4;j++)A[c][j]/=d;for(let r=0;r<3;r++)if(r!==c){const f=A[r][c];for(let j=c;j<4;j++)A[r][j]-=f*A[c][j];}}
          rows=[['a',fmt(A[0][3])],['b',fmt(A[1][3])],['c',fmt(A[2][3])],['Model',`y=a+bx+cx²`]];
        }else{
          let X=[...xs],Y=[...ys],model=statMode.value;
          if(model==='logarithmic'){if(X.some(x=>x<=0))throw new Error('x phải > 0.');X=X.map(Math.log);}
          else if(model==='exp-e'||model==='exp-ab'){if(Y.some(y=>y<=0))throw new Error('y phải > 0.');Y=Y.map(Math.log);}
          else if(model==='power'){if(X.some(x=>x<=0)||Y.some(y=>y<=0))throw new Error('x,y phải > 0.');X=X.map(Math.log);Y=Y.map(Math.log);}
          else if(model==='inverse'){if(X.some(x=>x===0))throw new Error('x không được bằng 0.');X=X.map(x=>1/x);}
          const lr=linear(X,Y);let a=lr.a,b=lr.b;
          if(model==='exp-e'){a=Math.exp(a);}
          if(model==='exp-ab'){a=Math.exp(a);b=Math.exp(b);}
          if(model==='power'){a=Math.exp(a);}
          rows=[['a',fmt(a)],['b',fmt(b)],['r',fmt(lr.r)],['Model',model]];
        }
        outputRows(out,rows);
      }catch(e){outputError(out,e);}
    },true);
  }

  // Matrix/vector extra operations
  panel.querySelector('#calc-matrix-ops')?.insertAdjacentHTML('beforeend','<button data-pro-matrix="trace-a">Tr(A)</button><button data-pro-matrix="rank-a">Rank(A)</button><button data-pro-matrix="square-a">A²</button>');
  function matrixFrom(el,size){const v=Array.from(el.querySelectorAll('input')).map(i=>Number(i.value));return Array.from({length:size},(_,r)=>v.slice(r*size,(r+1)*size));}
  function matMul(A,B){return A.map((row,i)=>B[0].map((_,j)=>row.reduce((sum,v,k)=>sum+v*B[k][j],0)));}
  function rank(M){const A=M.map(r=>[...r]);let row=0;for(let col=0;col<A[0].length&&row<A.length;col++){let p=row;for(let r=row+1;r<A.length;r++)if(Math.abs(A[r][col])>Math.abs(A[p][col]))p=r;if(Math.abs(A[p][col])<1e-10)continue;[A[row],A[p]]=[A[p],A[row]];const d=A[row][col];for(let j=col;j<A[0].length;j++)A[row][j]/=d;for(let r=0;r<A.length;r++)if(r!==row){const f=A[r][col];for(let j=col;j<A[0].length;j++)A[r][j]-=f*A[row][j];}row++;}return row;}
  panel.querySelector('#calc-matrix-ops')?.addEventListener('click',event=>{
    const b=event.target.closest('[data-pro-matrix]');if(!b)return;const out=panel.querySelector('#calc-matrix-output');
    try{const size=Number(panel.querySelector('#calc-matrix-size').value),A=matrixFrom(panel.querySelector('#calc-matrix-a'),size),op=b.dataset.proMatrix;
      if(op==='trace-a')outputRows(out,[['Tr(A)',fmt(A.reduce((s,r,i)=>s+r[i],0))]]);
      else if(op==='rank-a')outputRows(out,[['Rank(A)',String(rank(A))]]);
      else {const R=matMul(A,A);out.innerHTML=`<div class="calc-output-title">A²</div><div class="calc-matrix-result" style="--matrix-size:${size}">${R.flat().map(v=>`<span>${esc(fmt(v))}</span>`).join('')}</div>`;}
    }catch(e){outputError(out,e);}
  });

  panel.querySelector('#calc-vector-ops')?.insertAdjacentHTML('beforeend','<button data-pro-vector="unit-a">Â</button><button data-pro-vector="unit-b">B̂</button><button data-pro-vector="proj">proj A→B</button>');
  panel.querySelector('#calc-vector-ops')?.addEventListener('click',event=>{
    const b=event.target.closest('[data-pro-vector]');if(!b)return;const out=panel.querySelector('#calc-vector-output');
    try{const A=Array.from(panel.querySelectorAll('#calc-vector-a input')).map(i=>Number(i.value)),B=Array.from(panel.querySelectorAll('#calc-vector-b input')).map(i=>Number(i.value)),mag=v=>Math.hypot(...v),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),op=b.dataset.proVector;
      if(op==='unit-a'||op==='unit-b'){const V=op==='unit-a'?A:B,m=mag(V);if(m<1e-12)throw new Error('Vector 0 không có vector đơn vị.');outputRows(out,[[op==='unit-a'?'Â':'B̂',`[${V.map(x=>fmt(x/m)).join(', ')}]`]]);}
      else{const den=dot(B,B);if(den<1e-12)throw new Error('B không được là vector 0.');const k=dot(A,B)/den;outputRows(out,[['proj',`[${B.map(x=>fmt(k*x)).join(', ')}]`]]);}
    }catch(e){outputError(out,e);}
  });

  // Focus should open the official menu for newly generated mode buttons too.
  modes.addEventListener('focusin',()=>{if(!panel.hidden)panel.classList.add('menu-open');});
})();