// =====================================================
// Publoo 앱 패치 스크립트
// 브라우저 콘솔에서 실행하거나 원본 HTML에 직접 붙여넣기
// 수정 내용:
//   1. 이미지 자유 드래그 + 중앙배치 버튼
//   2. 표지 펼침 PDF 출력 (뒤표지+등+앞표지)
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

  // 컨테이너
  const container = document.createElement('div');
  container.className = 'img-drag-container';
  container.style.width = Math.round(pageW * 0.5) + 'px';
  container.style.left  = Math.round(pageW * 0.25) + 'px';
  container.style.top   = Math.round(pageH * 0.2)  + 'px';

  // 레이블
  const handleLbl = document.createElement('div');
  handleLbl.className = 'img-drag-handle';
  handleLbl.textContent = '↕ 드래그로 이동';
  container.appendChild(handleLbl);

  // 이미지
  const img = document.createElement('img');
  img.src = src;
  img.style.cssText = 'width:100%;height:auto;display:block;pointer-events:none';
  container.appendChild(img);

  // 중앙 배치 버튼
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

  // 삭제 버튼
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

  // 크기 조절 핸들
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

  // 드래그 이동
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

  // 로드 후 자동 중앙 배치
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


// ── 3. 표지 펼침 PDF 함수 추가 ────────────────────
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

  // 인쇄 스타일
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


// ── 4. 툴바에 표지PDF 버튼 추가 ───────────────────
(function addSpreadButton(){
  // exportPDF 버튼 찾기
  const btns = document.querySelectorAll('#toolbar button');
  let pdfBtn = null;
  btns.forEach(b => { if(b.textContent.includes('PDF 출력')) pdfBtn = b; });

  if(pdfBtn && !document.getElementById('btn-cover-spread')){
    // 버튼 텍스트 변경
    pdfBtn.textContent = '📄 본문PDF';

    // 표지PDF 버튼 삽입
    const coverBtn = document.createElement('button');
    coverBtn.id = 'btn-cover-spread';
    coverBtn.className = 'tb';
    coverBtn.style.color = '#f4a636';
    coverBtn.title = '뒤표지+등+앞표지 펼침 PDF 출력 (부크크 업로드용)';
    coverBtn.textContent = '📄 표지PDF';
    coverBtn.onclick = () => exportCoverSpreadPDF();
    pdfBtn.parentNode.insertBefore(coverBtn, pdfBtn.nextSibling);
    console.log('✅ 표지PDF 버튼 추가됨');
  } else if(!pdfBtn) {
    console.warn('PDF 출력 버튼을 찾지 못했습니다. 수동으로 exportCoverSpreadPDF() 호출 가능');
  }
})();

console.log('✅ Publoo 패치 완료! 수정사항: 이미지 자유드래그 + 중앙배치 + 표지 펼침PDF');
