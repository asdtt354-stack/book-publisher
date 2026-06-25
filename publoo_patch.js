// =====================================================
// Publoo 앱 패치 스크립트 v2
// 수정 내용:
//   1. 이미지 자유 드래그 + 중앙배치 버튼
//   2. 표지 펼침 PDF 출력 (뒤표지+등+앞표지)
//   3. 뒤표지 모달에 본문 페이지 수 직접 입력 칸 추가
// =====================================================

// ── 1. 드래그 스타일 추가 ──────────────────────────
(function addDragStyles(){
  const style = document.createElement('style');
  style.textContent = `
.img-drag-container{position:absolute;display:inline-block;cursor:move;z-index:5;user-select:none}
.img-drag-container img{display:block;max-width:none;border:1.5px dashed rgba(233,69,96,.6)}
.img-drag-container:hover .img-drag-handle,
.img-drag-container:hover .img-drag-del,
.img-drag-container:hover .img-drag-resize,
.img-drag-container:hover .img-center-btn{opacity:1}
.img-drag-handle{position:absolute;top:-22px;left:0;background:rgba(233,69,96,.9);color:#fff;font-size:9px;padding:2px 7px;border-radius:3px;white-space:nowrap;opacity:0;transition:.15s;pointer-events:none}
.img-drag-del{position:absolute;top:-8px;right:-8px;width:18px;height:18px;background:#e94560;color:#fff;font-size:11px;display:flex;align-items:center;justify-content:center;border-radius:50%;cursor:pointer;opacity:0;transition:.15s;z-index:7}
.img-drag-resize{position:absolute;bottom:-6px;right:-6px;width:14px;height:14px;background:#e94560;cursor:se-resize;border-radius:2px;opacity:0;transition:.15s;z-index:7}
.img-center-btn{position:absolute;top:-22px;right:20px;background:rgba(80,180,80,.9);color:#fff;font-size:9px;padding:2px 6px;border-radius:3px;cursor:pointer;opacity:0;transition:.15s;z-index:7}
@media print{.img-drag-del,.img-drag-resize,.img-drag-handle,.img-center-btn{display:none!important}}
  `;
  document.head.appendChild(style);
})();


// ── 2. 이미지 자유 드래그 함수 교체 ──────────────
window.insertImageData = function(src, i){
  const wrap = typeof pageEl === 'function' ? pageEl(i) : document.querySelector(`[data-pgi="${i}"]`);
  const page = wrap ? (wrap.querySelector('.book-page') || wrap) : null;
  if(!page){ console.warn('페이지 엘리먼트를 찾을 수 없습니다'); return; }

  const {w, h} = fmt();
  const PX = 3.7795;
  const pageW = w * PX;
  const pageH = h * PX;

  const container = document.createElement('div');
  container.className = 'img-drag-container';
  container.style.width = Math.round(pageW * 0.5) + 'px';
  container.style.left  = Math.round(pageW * 0.25) + 'px';
  container.style.top   = Math.round(pageH * 0.2)  + 'px';

  const handleLbl = document.createElement('div');
  handleLbl.className = 'img-drag-handle';
  handleLbl.textContent = '↕ 드래그로 이동';
  container.appendChild(handleLbl);

  const img = document.createElement('img');
  img.src = src;
  img.style.cssText = 'width:100%;height:auto;display:block;pointer-events:none';
  container.appendChild(img);

  const centerBtn = document.createElement('div');
  centerBtn.className = 'img-center-btn';
  centerBtn.textContent = '⊕ 중앙';
  centerBtn.onclick = e => {
    e.stopPropagation();
    const cW = container.offsetWidth;
    const cH = container.offsetHeight;
    const pW = page.offsetWidth;
    const pH = page.offsetHeight;
    container.style.left = Math.round((pW - cW) / 2) + 'px';
    container.style.top  = Math.round((pH - cH) / 2) + 'px';
    if(window.S) S.dirty = true;
    if(window.notify) notify('이미지를 페이지 중앙에 배치했어요 ✓');
  };
  container.appendChild(centerBtn);

  const del = document.createElement('div');
  del.className = 'img-drag-del';
  del.textContent = '✕';
  del.onclick = e => {
    e.stopPropagation();
    container.remove();
    if(window.S) S.dirty = true;
    if(window.notify) notify('이미지 삭제됨');
  };
  container.appendChild(del);

  const resizeH = document.createElement('div');
  resizeH.className = 'img-drag-resize';
  resizeH.addEventListener('mousedown', e => {
    e.preventDefault(); e.stopPropagation();
    const startX = e.clientX;
    const startW = container.offsetWidth;
    const onMove = ev => {
      container.style.width = Math.max(40, startW + (ev.clientX - startX)) + 'px';
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      if(window.S) S.dirty = true;
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
  container.appendChild(resizeH);

  container.addEventListener('mousedown', e => {
    if(e.target === del || e.target === resizeH || e.target === centerBtn) return;
    e.preventDefault();
    const startX = e.clientX - container.offsetLeft;
    const startY = e.clientY - container.offsetTop;
    const onMove = ev => {
      container.style.left = (ev.clientX - startX) + 'px';
      container.style.top  = (ev.clientY - startY) + 'px';
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      if(window.S) S.dirty = true;
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });

  page.appendChild(container);

  img.onload = () => {
    const cW = container.offsetWidth;
    const cH = container.offsetHeight || img.offsetHeight;
    const pW = page.offsetWidth;
    const pH = page.offsetHeight;
    container.style.left = Math.round((pW - cW) / 2) + 'px';
    container.style.top  = Math.round((pH - cH) / 2) + 'px';
    img.onload = null;
  };

  if(window.S) S.dirty = true;
  if(window.notify) notify('이미지 삽입됨 — 드래그 이동 | ⊕중앙배치 | 모서리 크기조절 | ✕삭제');
};


// ── 3. 뒤표지 모달에 페이지 수 직접 입력 추가 ────
(function addPageCountInput(){
  // 뒤표지 모달이 열릴 때 페이지 수 입력칸 삽입
  const observer = new MutationObserver(() => {
    const spineCalc = document.getElementById('spine-calc');
    if(spineCalc && !document.getElementById('manual-page-count-wrap')){

      const wrap = document.createElement('div');
      wrap.id = 'manual-page-count-wrap';
      wrap.style.cssText = 'margin-bottom:8px;padding:8px;background:rgba(106,204,138,.08);border:1px solid rgba(106,204,138,.25);border-radius:5px';
      wrap.innerHTML = `
        <div style="font-size:11px;color:#7acc7a;font-weight:bold;margin-bottom:6px">📄 본문 페이지 수 직접 입력</div>
        <div style="display:flex;align-items:center;gap:8px">
          <input type="number" id="manual-page-count" min="1" max="2000" placeholder="예: 112"
            style="width:80px;background:#252540;border:1px solid #444;color:#fff;padding:4px 8px;border-radius:4px;font-size:12px;font-family:inherit">
          <span style="font-size:11px;color:#aaa">페이지</span>
          <button onclick="applyManualPageCount()"
            style="background:#e94560;border:none;color:#fff;padding:4px 12px;border-radius:4px;font-size:11px;cursor:pointer;font-family:inherit">
            적용
          </button>
          <span id="manual-spine-result" style="font-size:11px;color:#7acc7a"></span>
        </div>
        <div style="font-size:10px;color:#666;margin-top:4px">표지만 작업할 때 본문 페이지 수를 입력하면 책등 너비가 정확하게 계산됩니다</div>
      `;
      spineCalc.parentNode.insertBefore(wrap, spineCalc);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();

// 페이지 수 적용 함수
window.applyManualPageCount = function(){
  const input = document.getElementById('manual-page-count');
  const result = document.getElementById('manual-spine-result');
  const val = parseInt(input.value);
  if(!val || val < 1){ result.textContent = '페이지 수를 입력해주세요'; result.style.color = '#e94560'; return; }

  const thickEl = document.getElementById('bc-paper-thick');
  const thick = thickEl ? parseFloat(thickEl.value) : 0.06;
  const spineW = Math.round(val * thick * 10) / 10;

  result.textContent = `→ 책등 ${spineW}mm`;
  result.style.color = '#7acc7a';

  // spine-calc 업데이트
  const spineCalc = document.getElementById('spine-calc');
  if(spineCalc) spineCalc.textContent = `책등 너비: ${spineW}mm (${val}페이지 × ${thick}mm)`;

  // S.backCover에 임시 저장
  if(window.S && window.S.backCover){
    S.backCover._manualPageCount = val;
    S.backCover._manualSpineW = spineW;
  }

  // 미리보기 spine 업데이트
  const spineEl = document.getElementById('bc-prev-spine');
  if(spineEl){
    spineEl.style.width = Math.max(spineW * 2, 6) + 'px';
  }

  if(window.notify) notify(`책등 너비 ${spineW}mm 적용됨 (${val}페이지 × ${thick}mm)`);
};


// ── 4. calcSpineWidth 함수 오버라이드 (수동 입력값 우선) ──
const _origCalcSpineWidth = window.calcSpineWidth;
window.calcSpineWidth = function(){
  // 수동 입력값이 있으면 우선 사용
  if(window.S && window.S.backCover && window.S.backCover._manualSpineW){
    return window.S.backCover._manualSpineW;
  }
  // 없으면 원래 함수 사용
  if(typeof _origCalcSpineWidth === 'function') return _origCalcSpineWidth();
  const bodyPages = S.pages.filter(p => p.type === 'content').length;
  const thick = (S.backCover && S.backCover.paperThick) || 0.06;
  return Math.round(bodyPages * thick * 10) / 10;
};


// ── 5. 표지 펼침 PDF 함수 추가 ────────────────────
window.exportCoverSpreadPDF = function(){
  const {w, h} = fmt();
  const spineW = calcSpineWidth();
  const totalW = Math.round((w * 2 + spineW) * 10) / 10;

  const pw = document.getElementById('print-wrap');
  pw.innerHTML = '';
  pw.style.display = 'block';

  const spread = document.createElement('div');
  spread.className = 'print-pg';
  spread.style.cssText = [
    'display:flex',
    'margin:0',
    'padding:0',
    'overflow:hidden',
    'width:' + totalW + 'mm',
    'height:' + h + 'mm'
  ].join(';');

  // ① 뒤표지
  const bcIdx = S.pages.findIndex(p => p.type === 'backcover');
  const bcEl = makeBackCoverEl(bcIdx >= 0 ? bcIdx : 0);
  bcEl.style.cssText = 'flex-shrink:0;overflow:hidden;width:' + w + 'mm;height:' + h + 'mm';
  spread.appendChild(bcEl);

  // ② 등
  const spine = document.createElement('div');
  const sfPx = Math.max(Math.round(spineW * 3.7795 * 0.55), 7);
  spine.style.cssText = [
    'flex-shrink:0',
    'overflow:hidden',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'width:' + spineW + 'mm',
    'height:' + h + 'mm',
    'background:' + (S.backCover.bgColor || '#2c3e50'),
    'filter:brightness(.82)'
  ].join(';');
  const spineText = document.createElement('div');
  spineText.style.cssText = [
    'writing-mode:vertical-rl',
    'white-space:nowrap',
    'overflow:hidden',
    'text-overflow:ellipsis',
    'font-size:' + sfPx + 'px',
    'color:' + (S.backCover.textColor || '#fff'),
    'padding:2mm',
    'max-height:' + (h * 0.92) + 'mm'
  ].join(';');
  spineText.textContent = S.cover.title + (S.cover.author ? ' — ' + S.cover.author : '');
  spine.appendChild(spineText);
  spread.appendChild(spine);

  // ③ 앞표지
  const cvIdx = S.pages.findIndex(p => p.type === 'cover');
  const cvEl = makeCoverEl(cvIdx >= 0 ? cvIdx : 0);
  cvEl.style.cssText = 'flex-shrink:0;overflow:hidden;width:' + w + 'mm;height:' + h + 'mm';
  spread.appendChild(cvEl);

  pw.appendChild(spread);

  let style = document.getElementById('print-style');
  if(!style){
    style = document.createElement('style');
    style.id = 'print-style';
    document.head.appendChild(style);
  }
  style.textContent = [
    '@media print{',
    '  @page{size:' + totalW + 'mm ' + h + 'mm landscape;margin:0}',
    '  body>*:not(#print-wrap){display:none!important}',
    '  #print-wrap{display:block!important}',
    '  .print-pg{width:' + totalW + 'mm;height:' + h + 'mm;display:flex;overflow:hidden;page-break-after:avoid}',
    '  *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}',
    '  .img-drag-del,.img-drag-resize,.img-drag-handle,.img-center-btn,.pg-sec-badge,.page-label{display:none!important}',
    '}'
  ].join('');

  setTimeout(() => {
    window.print();
    setTimeout(() => { pw.style.display = 'none'; pw.innerHTML = ''; }, 600);
  }, 300);

  notify('표지 펼침 PDF — 총 ' + totalW + 'mm (뒤표지 ' + w + 'mm + 등 ' + spineW + 'mm + 앞표지 ' + w + 'mm)');
};


// ── 6. 툴바에 표지PDF 버튼 추가 ───────────────────
(function addSpreadButton(){
  const btns = document.querySelectorAll('#toolbar button');
  let pdfBtn = null;
  btns.forEach(b => { if(b.textContent.includes('PDF 출력')) pdfBtn = b; });

  if(pdfBtn && !document.getElementById('btn-cover-spread')){
    // ★ 기존 "PDF 출력" 버튼 텍스트 그대로 유지 ★
    const coverBtn = document.createElement('button');
    coverBtn.id = 'btn-cover-spread';
    coverBtn.className = 'tb';
    coverBtn.style.color = '#f4a636';
    coverBtn.title = '뒤표지+등+앞표지 펼침 PDF 출력 (부크크 업로드용)';
    coverBtn.textContent = '📄 표지PDF';
    coverBtn.onclick = () => exportCoverSpreadPDF();
    pdfBtn.parentNode.insertBefore(coverBtn, pdfBtn.nextSibling);
    console.log('✅ 표지PDF 버튼 추가됨');
  }
})();

console.log('✅ Publoo 패치 v2 완료! 이미지 드래그 + 중앙배치 + 표지PDF + 페이지수 직접입력');
