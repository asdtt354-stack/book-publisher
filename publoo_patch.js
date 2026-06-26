// =====================================================
// Publoo 앱 패치 스크립트 v6
// 수정 내용:
//   1. 이미지 자유 드래그 + 중앙배치 버튼
//   2. 표지 펼침 PDF 출력 (뒤표지+등+앞표지) — 부크크 규격 + 재단 여유 자동 적용
//   3. 뒤표지 모달에 본문 페이지 수 직접 입력
//   4. PDF 출력 시 표지/뒤표지 배경이미지 정상 출력
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

      // ★ 모달 재오픈 시 이전 입력값 복원
      if(window.S && window.S.backCover && window.S.backCover._manualPageCount){
        const inp = document.getElementById('manual-page-count');
        const res = document.getElementById('manual-spine-result');
        if(inp) inp.value = S.backCover._manualPageCount;
        if(res){
          res.textContent = '→ 책등 ' + S.backCover._manualSpineW + 'mm';
          res.style.color = '#7acc7a';
        }
        const thick = S.backCover.paperThick || 0.06;
        spineCalc.textContent = '책등 너비: ' + S.backCover._manualSpineW + 'mm (' + S.backCover._manualPageCount + '페이지 × ' + thick + 'mm)';
        const spineEl = document.getElementById('bc-prev-spine');
        if(spineEl) spineEl.style.width = Math.max(S.backCover._manualSpineW * 2, 6) + 'px';
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();

window._publoo_manualSpineW = null;
window._publoo_manualPageCount = null;

window.applyManualPageCount = function(){
  const input = document.getElementById('manual-page-count');
  const result = document.getElementById('manual-spine-result');
  const val = parseInt(input.value);
  if(!val || val < 1){ result.textContent = '페이지 수를 입력해주세요'; result.style.color = '#e94560'; return; }
  const thickEl = document.getElementById('bc-paper-thick');
  const thick = thickEl ? parseFloat(thickEl.value) : 0.06;
  const spineW = Math.round(val * thick * 10) / 10;
  result.textContent = '→ 책등 ' + spineW + 'mm';
  result.style.color = '#7acc7a';
  const spineCalc = document.getElementById('spine-calc');
  if(spineCalc) spineCalc.textContent = '책등 너비: ' + spineW + 'mm (' + val + '페이지 × ' + thick + 'mm)';

  window._publoo_manualSpineW = spineW;
  window._publoo_manualPageCount = val;
  if(window.S && window.S.backCover){
    S.backCover._manualPageCount = val;
    S.backCover._manualSpineW = spineW;
  }

  const spineEl = document.getElementById('bc-prev-spine');
  if(spineEl) spineEl.style.width = Math.max(spineW * 2, 6) + 'px';
  if(window.notify) notify('책등 너비 ' + spineW + 'mm 적용됨 (' + val + '페이지 × ' + thick + 'mm)');
};

const _origCalcSpineWidth = window.calcSpineWidth;
window.calcSpineWidth = function(){
  if(window._publoo_manualSpineW){
    return window._publoo_manualSpineW;
  }
  if(window.S && window.S.backCover && window.S.backCover._manualSpineW){
    return window.S.backCover._manualSpineW;
  }
  if(typeof _origCalcSpineWidth === 'function') return _origCalcSpineWidth();
  const bodyPages = S.pages.filter(p => p.type === 'content').length;
  const thick = (S.backCover && S.backCover.paperThick) || 0.06;
  return Math.round(bodyPages * thick * 10) / 10;
};


// ── 4. PDF 출력 표지 배경이미지 수정 ─────────────
function makePrintCoverEl(w, h, cv2){
  const mm = v => v + 'mm';
  const esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  const inner = document.createElement('div');
  inner.style.cssText = [
    'position:absolute',
    'top:0', 'left:0',
    'width:' + mm(w),
    'height:' + mm(h),
    'overflow:hidden',
    'background-color:' + (cv2.bgColor || '#2c3e50')
  ].join(';');

  if(cv2.bgImage){
    const bgImg = document.createElement('img');
    bgImg.src = cv2.bgImage;
    bgImg.style.cssText = [
      'position:absolute',
      'top:0', 'left:0',
      'width:100%',
      'height:100%',
      'object-fit:cover',
      'object-position:center',
      'z-index:0'
    ].join(';');
    inner.appendChild(bgImg);

    const ov = document.createElement('div');
    ov.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.45);z-index:1';
    inner.appendChild(ov);
  }

  const body = document.createElement('div');
  const titleStyle = cv2.titleStyle || 'classic';
  let justifyContent = 'center';
  let alignItems = 'flex-start';
  let textAlign = 'left';
  if(titleStyle === 'dramatic'){ alignItems = 'center'; textAlign = 'center'; }
  if(titleStyle === 'poster'){ justifyContent = 'flex-end'; alignItems = 'center'; textAlign = 'center'; }
  if(titleStyle === 'essay'){ justifyContent = 'flex-end'; }
  if(titleStyle === 'top'){ justifyContent = 'flex-start'; alignItems = 'center'; textAlign = 'center'; }

  body.style.cssText = [
    'position:relative',
    'z-index:2',
    'width:100%',
    'height:100%',
    'display:flex',
    'flex-direction:column',
    'padding:18mm 14mm 12mm',
    'box-sizing:border-box'
  ].join(';');

  const tw = document.createElement('div');
  tw.style.cssText = [
    'flex:1',
    'display:flex',
    'flex-direction:column',
    'justify-content:' + justifyContent,
    'align-items:' + alignItems,
    'text-align:' + textAlign,
    'gap:5pt'
  ].join(';');

  const titleEl = document.createElement('div');
  const titleFontSize = titleStyle === 'dramatic' ? '36pt' : titleStyle === 'poster' ? '28pt' : titleStyle === 'essay' ? '22pt' : '28pt';
  titleEl.style.cssText = [
    'font-size:' + titleFontSize,
    'font-weight:900',
    'line-height:1.2',
    'color:#fff',
    'text-shadow:0 2px 18px rgba(0,0,0,.9)',
    'word-break:keep-all'
  ].join(';');
  titleEl.textContent = cv2.title || '책 제목';
  tw.appendChild(titleEl);

  if(cv2.subtitle){
    const subEl = document.createElement('div');
    subEl.style.cssText = 'font-size:11pt;color:rgba(255,255,255,.92);text-shadow:0 1px 8px rgba(0,0,0,.8);margin-top:3pt;word-break:keep-all';
    subEl.textContent = cv2.subtitle;
    tw.appendChild(subEl);
  }
  body.appendChild(tw);

  if(cv2.publisher){
    const bot = document.createElement('div');
    bot.style.cssText = 'padding-top:5mm;border-top:.5pt solid rgba(255,255,255,.35)';
    const pubEl = document.createElement('span');
    pubEl.style.cssText = 'font-size:7.5pt;color:rgba(255,255,255,.78)';
    pubEl.textContent = cv2.publisher;
    bot.appendChild(pubEl);
    body.appendChild(bot);
  }

  inner.appendChild(body);
  return inner;
}

function makePrintBackCoverEl(w, h, bc2, cv2){
  const mm = v => v + 'mm';

  const inner = document.createElement('div');
  inner.style.cssText = [
    'position:absolute',
    'top:0', 'left:0',
    'width:' + mm(w),
    'height:' + mm(h),
    'overflow:hidden',
    'background-color:' + (bc2.bgColor || '#2c3e50'),
    'color:' + (bc2.textColor || '#fff')
  ].join(';');

  if(bc2.bgImage){
    const bgImg = document.createElement('img');
    bgImg.src = bc2.bgImage;
    bgImg.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;object-position:center;z-index:0';
    inner.appendChild(bgImg);
    const ov = document.createElement('div');
    ov.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.55);z-index:1';
    inner.appendChild(ov);
  }

  const body = document.createElement('div');
  body.style.cssText = [
    'position:relative',
    'z-index:2',
    'width:100%',
    'height:100%',
    'display:flex',
    'flex-direction:column',
    'padding:14mm 13mm 10mm',
    'box-sizing:border-box',
    'color:' + (bc2.textColor || '#fff')
  ].join(';');

  body.innerHTML = `
    <div style="flex:1;overflow:hidden">
      <div style="font-size:6.5pt;font-weight:700;letter-spacing:2px;text-transform:uppercase;opacity:.55;margin-bottom:3pt">Synopsis</div>
      <div style="font-size:9.5pt;line-height:1.9;text-align:justify;word-break:keep-all">${bc2.synopsis || ''}</div>
    </div>
    ${cv2.author || bc2.authorBio ? `
    <div style="padding-top:5mm;margin-top:5mm;border-top:.5pt solid rgba(255,255,255,.22)">
      <div style="font-size:6.5pt;font-weight:700;letter-spacing:2px;opacity:.55;margin-bottom:3pt">저자 소개</div>
      ${cv2.author ? `<div style="font-size:9pt;font-weight:700">${cv2.author}</div>` : ''}
      ${bc2.authorBio ? `<div style="font-size:8pt;opacity:.88;line-height:1.7">${bc2.authorBio}</div>` : ''}
    </div>` : ''}
    <div style="display:flex;align-items:center;gap:5mm;padding-top:5mm;margin-top:5mm;border-top:.5pt solid rgba(255,255,255,.22)">
      <div style="flex:1">
        ${cv2.publisher ? `<div style="font-size:9pt;font-weight:700">${cv2.publisher}</div>` : ''}
        ${bc2.isbn ? `<div style="font-size:7.5pt;opacity:.75">ISBN ${bc2.isbn}</div>` : ''}
      </div>
      ${bc2.price ? `<div style="font-size:9pt;font-weight:700">${bc2.price}</div>` : ''}
    </div>
  `;

  inner.appendChild(body);
  return inner;
}

// ── 5. exportPDF 함수 오버라이드 (본문 PDF) ──────
const _origExportPDF = window.exportPDF;
window.exportPDF = function(){
  const {w, h} = fmt();
  const mm = v => v + 'mm';

  const pw = document.getElementById('print-wrap');
  pw.innerHTML = '';
  pw.style.display = 'block';

  const offscreen = document.createElement('div');
  offscreen.style.cssText = 'position:fixed;left:-9999px;top:0;visibility:hidden';
  document.body.appendChild(offscreen);

  S.pages.forEach((pg, i) => {
    if(pg.type === 'content' && !pg.bgImage){
      const txt = (pg.content || '').replace(/<[^>]+>/g, '').trim();
      if(!txt) return;
    }

    const div = document.createElement('div');
    div.className = 'print-pg';
    div.style.cssText = 'width:' + mm(w) + ';height:' + mm(h) + ';position:relative;overflow:hidden;background:#fff;box-sizing:border-box';

    if(pg.type === 'cover'){
      div.appendChild(makePrintCoverEl(w, h, S.cover));

    } else if(pg.type === 'backcover'){
      div.appendChild(makePrintBackCoverEl(w, h, S.backCover, S.cover));

    } else if(pg.type === 'endpaper'){
      div.style.background = S.endpaper.color || '#f5f0e8';
      const ep = document.createElement('div');
      ep.style.cssText = 'position:absolute;left:-9999px;top:0;width:' + mm(w) + ';height:' + mm(h);
      offscreen.appendChild(ep);
      const cvs = document.createElement('canvas');
      cvs.width = 200; cvs.height = Math.round(200 * h / w);
      const PATTERNS = window.PATTERNS;
      if(PATTERNS){
        const pat = PATTERNS.find(p => p.id === S.endpaper.pattern) || PATTERNS[0];
        pat.render(cvs.getContext('2d'), S.endpaper.color);
        const imgEl = document.createElement('img');
        imgEl.src = cvs.toDataURL();
        imgEl.style.cssText = 'position:absolute;top:0;left:0;width:' + mm(w) + ';height:' + mm(h) + ';object-fit:cover';
        div.appendChild(imgEl);
      }

    } else {
      const cp = document.createElement('div');
      cp.style.cssText = 'position:absolute;top:0;left:0;width:' + mm(w) + ';height:' + mm(h) + ';overflow:hidden;background:#fff';

      if(pg.bgImage){
        const bgImg = document.createElement('img');
        bgImg.src = pg.bgImage;
        bgImg.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;object-position:center;z-index:0';
        cp.appendChild(bgImg);
      }

      const margins = (idx) => {
        const m = S.margins;
        const isOdd = idx % 2 !== 0;
        return { top:m.top, bot:m.bot, left:isOdd?m.inner:m.outer, right:isOdd?m.outer:m.inner };
      };
      const m = margins(i);

      const textDiv = document.createElement('div');
      textDiv.className = 'pg-content';
      textDiv.style.cssText = [
        'position:absolute',
        'top:' + mm(m.top),
        'bottom:' + mm(m.bot),
        'left:' + mm(m.left),
        'right:' + mm(m.right),
        'font-family:\'' + S.font.family + '\',serif',
        'font-size:' + S.font.size + 'pt',
        'line-height:' + S.font.lh,
        'color:#1a1a1a',
        'overflow:hidden',
        'z-index:1'
      ].join(';');
      textDiv.innerHTML = pg.content || '';
      cp.appendChild(textDiv);

      const getPageNumStr = window.getPageNumStr;
      if(getPageNumStr){
        const pn = getPageNumStr(i);
        if(pn.show){
          const numEl = document.createElement('div');
          const bottom = mm(Math.floor(m.bot / 2));
          numEl.style.cssText = 'position:absolute;font-size:9pt;color:#444;bottom:' + bottom + ';' + (pn.align === 'right' ? 'right:' + mm(m.right) : 'left:' + mm(m.left)) + ';z-index:2';
          numEl.textContent = pn.str;
          cp.appendChild(numEl);
        }
      }
      div.appendChild(cp);
    }

    pw.appendChild(div);
  });

  document.body.removeChild(offscreen);

  let style = document.getElementById('print-style');
  if(!style){ style = document.createElement('style'); style.id = 'print-style'; document.head.appendChild(style); }
  style.textContent = '@media print{@page{size:' + mm(w) + ' ' + mm(h) + ' portrait;margin:0}body>*:not(#print-wrap){display:none!important}#print-wrap{display:block!important;background:#fff!important}.print-pg{page-break-after:always;page-break-inside:avoid;position:relative;background:#fff!important}.print-pg:last-child{page-break-after:avoid!important}.pg-sec-badge,.page-label,.img-drag-del,.img-drag-resize,.img-drag-handle,.img-center-btn{display:none!important}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}}';

  setTimeout(() => {
    window.print();
    setTimeout(() => { pw.style.display = 'none'; pw.innerHTML = ''; }, 500);
  }, 300);

  if(window.notify) notify('PDF 인쇄 창을 열었습니다. "PDF로 저장"을 선택하세요.');
};


// ── 6. 표지 펼침 PDF 함수 (부크크 규격 + 재단 여유 자동 적용) ──
window.exportCoverSpreadPDF = function(){
  const {w, h} = fmt();
  const spineW = calcSpineWidth();
  const BLEED = 3;  // 재단 여유 사방 3mm (부크크 권장)
  const innerW = Math.round((w * 2 + spineW) * 10) / 10;
  const totalW = Math.round((w * 2 + spineW + BLEED * 2) * 10) / 10;
  const totalH = Math.round((h + BLEED * 2) * 10) / 10;
  const mm = v => v + 'mm';

  const pw = document.getElementById('print-wrap');
  pw.innerHTML = '';
  pw.style.display = 'block';

  // 외곽 wrapper (재단 여유 포함된 전체 영역, 책 배경색으로 채워짐)
  const outerWrap = document.createElement('div');
  outerWrap.className = 'print-pg';
  outerWrap.style.cssText = 'position:relative;margin:0;padding:0;overflow:hidden;width:' + mm(totalW) + ';height:' + mm(totalH) + ';background:' + (S.backCover.bgColor || '#2c3e50');

  // 안쪽 spread (실제 콘텐츠, BLEED만큼 안쪽에 배치)
  const spread = document.createElement('div');
  spread.style.cssText = 'position:absolute;top:' + mm(BLEED) + ';left:' + mm(BLEED) + ';display:flex;width:' + mm(innerW) + ';height:' + mm(h) + ';overflow:hidden';

  // ① 뒤표지
  const bcWrap = document.createElement('div');
  bcWrap.style.cssText = 'position:relative;flex-shrink:0;width:' + mm(w) + ';height:' + mm(h) + ';overflow:hidden';
  bcWrap.appendChild(makePrintBackCoverEl(w, h, S.backCover, S.cover));
  spread.appendChild(bcWrap);

  // ② 등
  const spine = document.createElement('div');
  const sfPx = Math.max(Math.round(spineW * 3.7795 * 0.55), 7);
  spine.style.cssText = 'flex-shrink:0;overflow:hidden;display:flex;align-items:center;justify-content:center;width:' + mm(spineW) + ';height:' + mm(h) + ';background:' + (S.backCover.bgColor || '#2c3e50') + ';filter:brightness(.82)';
  const st = document.createElement('div');
  st.style.cssText = 'writing-mode:vertical-rl;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:' + sfPx + 'px;color:' + (S.backCover.textColor || '#fff') + ';padding:2mm;max-height:' + (h * 0.92) + 'mm';
  st.textContent = S.cover.title + (S.cover.author ? ' — ' + S.cover.author : '');
  spine.appendChild(st);
  spread.appendChild(spine);

  // ③ 앞표지
  const cvWrap = document.createElement('div');
  cvWrap.style.cssText = 'position:relative;flex-shrink:0;width:' + mm(w) + ';height:' + mm(h) + ';overflow:hidden';
  cvWrap.appendChild(makePrintCoverEl(w, h, S.cover));
  spread.appendChild(cvWrap);

  outerWrap.appendChild(spread);
  pw.appendChild(outerWrap);

  // ★ @page size 강제 + 브라우저 기본 여백/스케일 모두 차단
  let style = document.getElementById('print-style');
  if(!style){ style = document.createElement('style'); style.id = 'print-style'; document.head.appendChild(style); }
  style.textContent = `
    @page{size:${totalW}mm ${totalH}mm;margin:0!important}
    @media print{
      html,body{margin:0!important;padding:0!important;width:${totalW}mm!important;height:${totalH}mm!important}
      body>*:not(#print-wrap){display:none!important}
      #print-wrap{display:block!important;margin:0!important;padding:0!important;width:${totalW}mm!important;height:${totalH}mm!important}
      .print-pg{width:${totalW}mm!important;height:${totalH}mm!important;page-break-after:avoid!important;margin:0!important;padding:0!important}
      *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
      .img-drag-del,.img-drag-resize,.img-drag-handle,.img-center-btn,.pg-sec-badge,.page-label{display:none!important}
    }
  `;

  setTimeout(() => {
    window.print();
    setTimeout(() => { pw.style.display = 'none'; pw.innerHTML = ''; }, 600);
  }, 300);

  if(window.notify) notify('표지 PDF — ' + totalW + ' × ' + totalH + 'mm (콘텐츠 ' + innerW + 'mm + 재단여유 사방 ' + BLEED + 'mm)');
};


// ── 7. 툴바에 표지PDF 버튼 추가 ───────────────────
(function addSpreadButton(){
  const btns = document.querySelectorAll('#toolbar button');
  let pdfBtn = null;
  btns.forEach(b => { if(b.textContent.includes('PDF 출력')) pdfBtn = b; });
  if(pdfBtn && !document.getElementById('btn-cover-spread')){
    const coverBtn = document.createElement('button');
    coverBtn.id = 'btn-cover-spread';
    coverBtn.className = 'tb';
    coverBtn.style.color = '#f4a636';
    coverBtn.title = '뒤표지+등+앞표지 펼침 PDF 출력 (부크크 업로드용 — 재단 여유 자동 포함)';
    coverBtn.textContent = '📄 표지PDF';
    coverBtn.onclick = () => exportCoverSpreadPDF();
    pdfBtn.parentNode.insertBefore(coverBtn, pdfBtn.nextSibling);
  }
})();

console.log('✅ Publoo 패치 v6 완료! 부크크 규격 + 재단 여유 자동 적용');
