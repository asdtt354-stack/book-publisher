// =====================================================
// ⭐ Publoo 통합 패치 — 전체 합본판 (v11 + 책등너비직접입력 + 보안패치 + 텍스트되돌리기 + 되돌리기버튼개선 + 후기버튼 + 책등seam수정)
//
// 이 파일 하나만 있으면 됩니다. 기존 publoo_patch.js를
// 이 파일로 통째로 교체(덮어쓰기)하세요.
// HTML은 그대로: <script src="publoo_patch.js"></script>
//
// ⚠️ 주의: 이 파일을 다른 패치 파일로 다시 교체하지 마세요.
//         모든 기능(페이지수 입력, 책등너비 입력, seam 수정 등)이
//         이 파일 하나에 전부 들어있습니다. 부분 파일로 덮어쓰면
//         다른 기능이 사라집니다.
//
// 포함된 기능:
//  1) v11 — 이미지 드래그, 페이지수/두께 직접입력, 표지PDF
//  2) 책등 너비(mm) 직접 입력 — 인쇄소 확정값 최우선 적용
//  3) 보안 패치 — .bookpub 파일 불러오기 시 악성 콘텐츠 자동 정제
//  4) 텍스트 입력 되돌리기 — 타이핑 멈춘 후 자동 스냅샷(Ctrl+Z 지원)
//  5) 되돌리기/다시실행 버튼을 툴바 맨 앞으로 이동 + 글자 라벨 추가
//  6) "💬 후기 남기기" 버튼 — 구글 폼으로 연결 (아래 GOOGLE_FORM_URL 수정 필요)
//  7) 책등 경계 얼룩(seam) 버그 수정 — 책등을 항상 맨 위 레이어로 그림
// =====================================================


// =====================================================
// [1/3] Publoo 앱 통합 패치 스크립트 v11 (완전판 — v10 병합)
// =====================================================

// ── 1. 드래그 스타일 추가 ───────────────
(function addDragStyles(){
  if(document.getElementById('publoo-drag-style')) return;
  const style = document.createElement('style');
  style.id = 'publoo-drag-style';
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


// ── 2. 이미지 자유 드래그 함수 ─────────
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


// ── 3. 뒤표지 모달 입력 박스들 ───
function ensurePageCountBox(){
  const spineCalc = document.getElementById('spine-calc');
  const paperSel = document.getElementById('bc-paper-thick');
  if(document.getElementById('manual-page-count-wrap')) return true;
  if(!spineCalc && !paperSel) return false;

  const wrap = document.createElement('div');
  wrap.id = 'manual-page-count-wrap';
  wrap.style.cssText = 'margin-bottom:8px;padding:8px;background:rgba(106,204,138,.08);border:1px solid rgba(106,204,138,.25);border-radius:5px';
  wrap.innerHTML = `
    <div style="font-size:11px;color:#7acc7a;font-weight:bold;margin-bottom:6px">📄 본문 페이지 수 직접 입력</div>
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
      <input type="number" id="manual-page-count" min="1" max="2000" placeholder="예: 120"
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

  if(spineCalc){
    spineCalc.parentNode.insertBefore(wrap, spineCalc);
  } else if(paperSel){
    const parent = paperSel.parentNode;
    parent.insertBefore(wrap, parent.firstChild);
  } else {
    return false;
  }

  if(window.S && window.S.backCover && window.S.backCover._manualPageCount){
    const inp = document.getElementById('manual-page-count');
    const res = document.getElementById('manual-spine-result');
    if(inp) inp.value = S.backCover._manualPageCount;
    if(res){
      res.textContent = '→ 책등 ' + S.backCover._manualSpineW + 'mm';
      res.style.color = '#7acc7a';
    }
    if(spineCalc){
      const thick = S.backCover.paperThick || 0.06;
      spineCalc.textContent = '책등 너비: ' + S.backCover._manualSpineW + 'mm (' + S.backCover._manualPageCount + '페이지 × ' + thick + 'mm)';
    }
    const spineEl = document.getElementById('bc-prev-spine');
    if(spineEl) spineEl.style.width = Math.max(S.backCover._manualSpineW * 2, 6) + 'px';
  }

  return true;
}

function ensurePaperThickBox(){
  const sel = document.getElementById('bc-paper-thick');
  if(!sel) return false;

  if(!sel.dataset.publooV10){
    sel.dataset.publooV10 = '1';
    const hasBookkOption = Array.from(sel.options).some(o => o.value === '0.0683');
    if(!hasBookkOption){
      const opt = document.createElement('option');
      opt.value = '0.0683';
      opt.textContent = '0.0683mm (부크크 실측 ⭐ 컬러/100g)';
      let inserted = false;
      for(let i = 0; i < sel.options.length; i++){
        if(sel.options[i].value === '0.06'){
          sel.options[i].insertAdjacentElement('afterend', opt);
          inserted = true;
          break;
        }
      }
      if(!inserted) sel.appendChild(opt);
    }
  }

  if(!document.getElementById('bc-paper-thick-custom-wrap')){
    const wrap = document.createElement('div');
    wrap.id = 'bc-paper-thick-custom-wrap';
    wrap.style.cssText = 'margin-top:8px;padding:8px;background:rgba(244,166,54,.08);border:1px solid rgba(244,166,54,.3);border-radius:5px';
    wrap.innerHTML = `
      <div style="font-size:11px;color:#f4a636;font-weight:bold;margin-bottom:6px">⚙️ 용지 두께 사용자 정의</div>
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <input type="number" id="bc-paper-thick-custom" step="0.001" min="0.04" max="0.2" placeholder="예: 0.0683"
          style="width:90px;background:#252540;border:1px solid #444;color:#fff;padding:4px 8px;border-radius:4px;font-size:12px;font-family:inherit">
        <span style="font-size:11px;color:#aaa">mm/장</span>
        <button onclick="applyCustomPaperThick()"
          style="background:#f4a636;border:none;color:#000;padding:4px 12px;border-radius:4px;font-size:11px;cursor:pointer;font-weight:bold;font-family:inherit">
          적용
        </button>
        <span id="bc-paper-thick-custom-result" style="font-size:11px;color:#7acc7a"></span>
      </div>
      <div style="font-size:10px;color:#999;margin-top:4px">인쇄소가 알려준 정확한 값(소수점 셋째 자리)을 입력하세요</div>
    `;
    sel.parentNode.appendChild(wrap);
  }

  return true;
}

(function setupBoxObserver(){
  const tryEnsure = () => {
    try {
      ensurePageCountBox();
      ensurePaperThickBox();
    } catch(e){
      console.warn('Publoo v11 박스 생성 중 오류:', e);
    }
  };
  tryEnsure();
  const observer = new MutationObserver(tryEnsure);
  observer.observe(document.body, { childList: true, subtree: true });
  setInterval(() => {
    if(document.getElementById('spine-calc') || document.getElementById('bc-paper-thick')){
      tryEnsure();
    }
  }, 1500);
})();


// ── 4. 페이지수 적용 함수 ──
window._publoo_manualSpineW = null;
window._publoo_manualPageCount = null;

window.applyManualPageCount = function(){
  const input = document.getElementById('manual-page-count');
  const result = document.getElementById('manual-spine-result');
  const val = parseInt(input.value);
  if(!val || val < 1){
    result.textContent = '페이지 수를 입력해주세요';
    result.style.color = '#e94560';
    return;
  }
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


// ── 5. 사용자 정의 두께 적용 함수 ──
window.applyCustomPaperThick = function(){
  const inp = document.getElementById('bc-paper-thick-custom');
  const resEl = document.getElementById('bc-paper-thick-custom-result');
  const val = parseFloat(inp.value);

  if(!val || val < 0.04 || val > 0.2){
    if(resEl){ resEl.textContent = '0.04~0.2 범위로 입력'; resEl.style.color = '#e94560'; }
    return;
  }

  const sel = document.getElementById('bc-paper-thick');
  if(!sel) return;

  Array.from(sel.options).forEach(o => {
    if(o.dataset.custom === '1') sel.removeChild(o);
  });

  const opt = document.createElement('option');
  opt.value = String(val);
  opt.textContent = val + 'mm (사용자 정의) ✓';
  opt.dataset.custom = '1';
  opt.selected = true;
  sel.appendChild(opt);

  if(window.S && window.S.backCover){
    S.backCover.paperThick = val;
  }

  const pageInput = document.getElementById('manual-page-count');
  const pages = (pageInput && parseInt(pageInput.value)) || window._publoo_manualPageCount;

  if(pages){
    const spineW = Math.round(pages * val * 10) / 10;
    window._publoo_manualSpineW = spineW;
    window._publoo_manualPageCount = pages;

    if(window.S && window.S.backCover){
      S.backCover._manualSpineW = spineW;
      S.backCover._manualPageCount = pages;
    }

    const spineCalc = document.getElementById('spine-calc');
    if(spineCalc) spineCalc.textContent = '책등 너비: ' + spineW + 'mm (' + pages + '페이지 × ' + val + 'mm)';

    const manualResult = document.getElementById('manual-spine-result');
    if(manualResult){
      manualResult.textContent = '→ 책등 ' + spineW + 'mm';
      manualResult.style.color = '#7acc7a';
    }

    const spineEl = document.getElementById('bc-prev-spine');
    if(spineEl) spineEl.style.width = Math.max(spineW * 2, 6) + 'px';

    if(resEl){
      resEl.textContent = '✓ 책등 ' + spineW + 'mm';
      resEl.style.color = '#7acc7a';
    }

    if(window.notify) notify('두께 ' + val + 'mm → 책등 ' + spineW + 'mm (' + pages + 'p)');
  } else {
    if(resEl){
      resEl.textContent = '✓ ' + val + 'mm 적용 (페이지수 입력 필요)';
      resEl.style.color = '#f4a636';
    }
    if(window.notify) notify('두께 ' + val + 'mm 적용 - 페이지 수도 입력해주세요');
  }

  sel.dispatchEvent(new Event('change'));
};


// ── 6. calcSpineWidth 오버라이드 (1차) ──
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


// ── 7. PDF 출력 표지 요소 함수 ─────────
function makePrintCoverEl(w, h, cv2){
  const mm = v => v + 'mm';
  const inner = document.createElement('div');
  inner.style.cssText = [
    'position:absolute','top:0','left:0','width:' + mm(w),'height:' + mm(h),
    'overflow:hidden','background-color:' + (cv2.bgColor || '#2c3e50')
  ].join(';');

  if(cv2.bgImage){
    const bgImg = document.createElement('img');
    bgImg.src = cv2.bgImage;
    bgImg.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;object-position:center;z-index:0';
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

  body.style.cssText = ['position:relative','z-index:2','width:100%','height:100%','display:flex','flex-direction:column','padding:18mm 14mm 12mm','box-sizing:border-box'].join(';');

  const tw = document.createElement('div');
  tw.style.cssText = ['flex:1','display:flex','flex-direction:column','justify-content:' + justifyContent,'align-items:' + alignItems,'text-align:' + textAlign,'gap:5pt'].join(';');

  const titleEl = document.createElement('div');
  const titleFontSize = titleStyle === 'dramatic' ? '36pt' : titleStyle === 'poster' ? '28pt' : titleStyle === 'essay' ? '22pt' : '28pt';
  titleEl.style.cssText = 'font-size:' + titleFontSize + ';font-weight:900;line-height:1.2;color:#fff;text-shadow:0 2px 18px rgba(0,0,0,.9);word-break:keep-all';
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
  inner.style.cssText = ['position:absolute','top:0','left:0','width:' + mm(w),'height:' + mm(h),'overflow:hidden','background-color:' + (bc2.bgColor || '#2c3e50'),'color:' + (bc2.textColor || '#fff')].join(';');

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
  body.style.cssText = ['position:relative','z-index:2','width:100%','height:100%','display:flex','flex-direction:column','padding:14mm 13mm 10mm','box-sizing:border-box','color:' + (bc2.textColor || '#fff')].join(';');

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


// ── 8. 본문 PDF 출력 ────────────────────
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
      textDiv.style.cssText = ['position:absolute','top:' + mm(m.top),'bottom:' + mm(m.bot),'left:' + mm(m.left),'right:' + mm(m.right),'font-family:\'' + S.font.family + '\',serif','font-size:' + S.font.size + 'pt','line-height:' + S.font.lh,'color:#1a1a1a','overflow:hidden','z-index:1'].join(';');
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


// ★★ ── 9. 표지 펼침 PDF (v11 — 책등: 제목 + "OOO 지음") — 이후 [7/7]에서 최종 오버라이드됨 ★★
window.exportCoverSpreadPDF = function(){
  const {w, h} = fmt();
  const spineW = calcSpineWidth();
  const BLEED = 3;
  const totalW = Math.round((w * 2 + spineW + BLEED * 2) * 10) / 10;
  const totalH = Math.round((h + BLEED * 2) * 10) / 10;
  const mm = v => v + 'mm';

  const pw = document.getElementById('print-wrap');
  pw.innerHTML = '';
  pw.style.display = 'block';

  const outerWrap = document.createElement('div');
  outerWrap.className = 'print-pg';
  outerWrap.style.cssText = 'position:relative;margin:0;padding:0;overflow:hidden;width:' + mm(totalW) + ';height:' + mm(totalH) + ';background:' + (S.backCover.bgColor || '#2c3e50');

  const bcArea = document.createElement('div');
  bcArea.style.cssText = 'position:absolute;top:0;left:0;width:' + mm(w + BLEED) + ';height:' + mm(totalH) + ';overflow:hidden;background:' + (S.backCover.bgColor || '#2c3e50');

  if(S.backCover.bgImage){
    const bgImg = document.createElement('img');
    bgImg.src = S.backCover.bgImage;
    bgImg.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;object-position:center;z-index:0';
    bcArea.appendChild(bgImg);
    const ov = document.createElement('div');
    ov.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.55);z-index:1';
    bcArea.appendChild(ov);
  }

  const bcContent = makePrintBackCoverEl(w, h, Object.assign({}, S.backCover, {bgImage: null, bgColor: 'transparent'}), S.cover);
  bcContent.style.top = mm(BLEED);
  bcContent.style.left = mm(BLEED);
  bcContent.style.zIndex = '2';
  bcArea.appendChild(bcContent);

  outerWrap.appendChild(bcArea);

  const spineArea = document.createElement('div');
  spineArea.style.cssText = 'position:absolute;top:0;left:' + mm(w + BLEED) + ';width:' + mm(spineW) + ';height:' + mm(totalH) + ';background:' + (S.backCover.bgColor || '#2c3e50') + ';filter:brightness(.82);display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden';

  const title = S.cover.title || '책 제목';
  const author = S.cover.author || '';

  const titlePx = Math.max(Math.round(spineW * 3.7795 * 0.46), 7);
  const titleEl = document.createElement('div');
  titleEl.style.cssText = 'writing-mode:vertical-rl;text-orientation:mixed;white-space:nowrap;font-size:' + titlePx + 'px;color:' + (S.backCover.textColor || '#fff') + ';text-align:center;max-height:' + (h * 0.62) + 'mm;overflow:hidden;font-weight:700';
  titleEl.textContent = title;
  spineArea.appendChild(titleEl);

  if(author){
    const bylinePx = Math.max(Math.round(spineW * 3.7795 * 0.26), 6);
    const bylineEl = document.createElement('div');
    bylineEl.style.cssText = 'writing-mode:vertical-rl;text-orientation:mixed;white-space:nowrap;font-size:' + bylinePx + 'px;color:' + (S.backCover.textColor || '#fff') + ';text-align:center;max-height:' + (h * 0.22) + 'mm;overflow:hidden;font-weight:400;opacity:.92;margin-top:' + Math.round(titlePx * 0.7) + 'px';
    bylineEl.textContent = author + ' 지음';
    spineArea.appendChild(bylineEl);
  }

  outerWrap.appendChild(spineArea);

  const fcArea = document.createElement('div');
  fcArea.style.cssText = 'position:absolute;top:0;left:' + mm(w + BLEED + spineW) + ';width:' + mm(w + BLEED) + ';height:' + mm(totalH) + ';overflow:hidden;background:' + (S.cover.bgColor || '#2c3e50');

  if(S.cover.bgImage){
    const bgImg = document.createElement('img');
    bgImg.src = S.cover.bgImage;
    bgImg.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;object-position:center;z-index:0';
    fcArea.appendChild(bgImg);
    const ov = document.createElement('div');
    ov.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.45);z-index:1';
    fcArea.appendChild(ov);
  }

  const fcContent = makePrintCoverEl(w, h, Object.assign({}, S.cover, {bgImage: null, bgColor: 'transparent'}));
  fcContent.style.top = mm(BLEED);
  fcContent.style.left = '0';
  fcContent.style.zIndex = '2';
  fcArea.appendChild(fcContent);

  outerWrap.appendChild(fcArea);

  pw.appendChild(outerWrap);

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

  if(window.notify) notify('표지 PDF v11 — 책등: 제목 + 저자명 (' + totalW + ' × ' + totalH + 'mm)');
};


// ── 10. 툴바 표지PDF 버튼 ────────────────
(function addSpreadButton(){
  const tryAdd = () => {
    const btns = document.querySelectorAll('#toolbar button');
    let pdfBtn = null;
    btns.forEach(b => { if(b.textContent.includes('PDF 출력')) pdfBtn = b; });
    if(pdfBtn && !document.getElementById('btn-cover-spread')){
      const coverBtn = document.createElement('button');
      coverBtn.id = 'btn-cover-spread';
      coverBtn.className = 'tb';
      coverBtn.style.color = '#f4a636';
      coverBtn.title = '뒤표지+등+앞표지 펼침 PDF 출력 (부크크 업로드용)';
      coverBtn.textContent = '📄 표지PDF';
      coverBtn.onclick = () => exportCoverSpreadPDF();
      pdfBtn.parentNode.insertBefore(coverBtn, pdfBtn.nextSibling);
    }
  };
  tryAdd();
  const obs = new MutationObserver(tryAdd);
  obs.observe(document.body, { childList: true, subtree: true });
})();


console.log('✅ Publoo 통합 패치 v11 로드 완료!');


// =====================================================
// [2/3] Publoo 패치 v12 추가분 — 책등 너비(mm) 직접 입력
// 우선순위: 책등 너비 직접 입력 > 페이지수×두께 계산값
// =====================================================

(function(){

  function ensureSpineWidthBox(){
    const spineCalc = document.getElementById('spine-calc');
    if(!spineCalc) return false;
    if(document.getElementById('manual-spine-width-wrap')) return true;

    const wrap = document.createElement('div');
    wrap.id = 'manual-spine-width-wrap';
    wrap.style.cssText = 'margin-bottom:8px;padding:8px;background:rgba(233,69,96,.08);border:1px solid rgba(233,69,96,.3);border-radius:5px';
    wrap.innerHTML = `
      <div style="font-size:11px;color:#e94560;font-weight:bold;margin-bottom:6px">📏 책등 너비(mm) 직접 입력 <span style="font-weight:normal;color:#999">— 인쇄소 확정값 우선 적용</span></div>
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <input type="number" id="manual-spine-width" step="0.1" min="1" max="100" placeholder="예: 8.5"
          style="width:80px;background:#252540;border:1px solid #444;color:#fff;padding:4px 8px;border-radius:4px;font-size:12px;font-family:inherit">
        <span style="font-size:11px;color:#aaa">mm</span>
        <button onclick="applyManualSpineWidth()"
          style="background:#e94560;border:none;color:#fff;padding:4px 12px;border-radius:4px;font-size:11px;cursor:pointer;font-family:inherit">
          적용
        </button>
        <button onclick="clearManualSpineWidth()"
          style="background:transparent;border:1px solid #555;color:#aaa;padding:4px 10px;border-radius:4px;font-size:11px;cursor:pointer;font-family:inherit">
          해제 (자동계산으로)
        </button>
      </div>
      <div style="font-size:10px;color:#999;margin-top:4px">※ 값을 입력하면 아래 페이지수×두께 계산은 무시되고 이 값이 그대로 사용됩니다</div>
    `;
    spineCalc.parentNode.insertBefore(wrap, spineCalc);

    if(window.S && S.backCover && S.backCover._directSpineW){
      const inp = document.getElementById('manual-spine-width');
      if(inp) inp.value = S.backCover._directSpineW;
      updateSpineDisplays(S.backCover._directSpineW, true);
    }
    return true;
  }

  function updateSpineDisplays(spineW, isDirect){
    const spineCalc = document.getElementById('spine-calc');
    if(spineCalc){
      spineCalc.textContent = isDirect
        ? `책등 너비: ${spineW}mm (직접 입력값 사용 중)`
        : spineCalc.textContent;
    }
    const spineEl = document.getElementById('bc-prev-spine');
    if(spineEl) spineEl.style.width = Math.max(spineW * 2, 6) + 'px';
  }

  window.applyManualSpineWidth = function(){
    const inp = document.getElementById('manual-spine-width');
    const val = parseFloat(inp.value);
    if(!val || val < 1 || val > 100){
      if(window.notify) notify('1~100mm 범위로 정확한 책등 너비를 입력해주세요');
      return;
    }
    window._publoo_directSpineW = val;
    if(window.S && S.backCover){
      S.backCover._directSpineW = val;
    }
    updateSpineDisplays(val, true);
    const manualResult = document.getElementById('manual-spine-result');
    if(manualResult){ manualResult.textContent = ''; }
    if(window.notify) notify(`책등 너비 ${val}mm 직접 적용됨 (인쇄소 확정값)`);
  };

  window.clearManualSpineWidth = function(){
    window._publoo_directSpineW = null;
    if(window.S && S.backCover){ delete S.backCover._directSpineW; }
    const inp = document.getElementById('manual-spine-width');
    if(inp) inp.value = '';
    if(typeof previewBackCover === 'function') previewBackCover();
    if(window.notify) notify('직접 입력 해제 — 자동 계산 값으로 복귀');
  };

  const _prevCalc = window.calcSpineWidth;
  window.calcSpineWidth = function(){
    if(window._publoo_directSpineW) return window._publoo_directSpineW;
    if(window.S && S.backCover && S.backCover._directSpineW) return S.backCover._directSpineW;
    if(typeof _prevCalc === 'function') return _prevCalc();
    return 8;
  };

  const tryEnsure = () => { try{ ensureSpineWidthBox(); }catch(e){} };
  tryEnsure();
  const observer = new MutationObserver(tryEnsure);
  observer.observe(document.body, { childList: true, subtree: true });
  setInterval(() => { if(document.getElementById('spine-calc')) tryEnsure(); }, 1500);

  console.log('✅ 책등 너비 직접 입력 기능(v12 addon) 로드 완료 — 인쇄소 확정값 우선 적용 가능');
})();


// =====================================================
// [3/3] Publoo 보안 패치 — .bookpub 파일 불러오기 시 콘텐츠 정제
// =====================================================

(function(){

  const ALLOWED_TAGS = new Set([
    'P','H1','H2','H3','B','STRONG','I','EM','U','S','DEL','INS',
    'SUB','SUP','SPAN','FIGURE','FIGCAPTION','IMG','TABLE','TBODY',
    'THEAD','TR','TD','TH','BR','UL','OL','LI','A','DIV'
  ]);
  const ALLOWED_ATTRS = new Set(['src','alt','style','class','href','colspan','rowspan']);

  function sanitizeNode(node){
    if(node.nodeType !== 1) return;

    if(!ALLOWED_TAGS.has(node.tagName)){
      node.remove();
      return;
    }

    [...node.attributes].forEach(attr => {
      const name = attr.name.toLowerCase();
      const value = attr.value || '';
      const isEventAttr = name.startsWith('on');
      const isDangerousUrl = /^\s*javascript:/i.test(value) || /^\s*data:text\/html/i.test(value);
      if(isEventAttr || isDangerousUrl || !ALLOWED_ATTRS.has(name)){
        node.removeAttribute(attr.name);
      }
    });

    if(node.hasAttribute('style')){
      let styleVal = node.getAttribute('style');
      if(/javascript:|expression\(/i.test(styleVal)){
        node.removeAttribute('style');
      }
    }

    [...node.children].reverse().forEach(child => sanitizeNode(child));
  }

  window.sanitizeLoadedContent = function(html){
    if(!html) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    [...tmp.children].forEach(child => sanitizeNode(child));
    return tmp.innerHTML;
  };

  const _origOnProjectLoaded = window.onProjectLoaded;
  window.onProjectLoaded = function(e){
    const file = e.target.files[0];
    if(!file) return;
    const r = new FileReader();
    r.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);

        if(Array.isArray(data.pages)){
          data.pages = data.pages.map(pg => {
            if(pg && typeof pg.content === 'string'){
              pg.content = window.sanitizeLoadedContent(pg.content);
            }
            return pg;
          });
        }

        Object.assign(S, {
          format: data.format || 'B5',
          margins: data.margins || S.margins,
          master: data.master || S.master,
          cover: data.cover || S.cover,
          backCover: data.backCover || S.backCover,
          endpaper: data.endpaper || S.endpaper,
          font: data.font || S.font,
          pages: data.pages || [],
          projectName: data.projectName || '책',
          dirty: false
        });

        coverImageData = S.cover.bgImage || null;
        document.getElementById('sel-format').value = S.format;
        if(S.format === '사용자 정의' && data.customSize){
          FORMATS['사용자 정의'] = { w: data.customSize.w, h: data.customSize.h };
          document.getElementById('custom-w').value = data.customSize.w;
          document.getElementById('custom-h').value = data.customSize.h;
          document.getElementById('custom-size-ui').style.display = 'inline-flex';
        } else {
          document.getElementById('custom-size-ui').style.display = 'none';
        }
        document.getElementById('sel-font').value = S.font.family;
        document.getElementById('sel-size').value = S.font.size;
        document.getElementById('sel-lh').value = S.font.lh;
        document.getElementById('m-top').value = S.margins.top;
        document.getElementById('m-bot').value = S.margins.bot;
        document.getElementById('m-in').value = S.margins.inner;
        document.getElementById('m-out').value = S.margins.outer;
        document.getElementById('m-hdr').value = S.margins.hdr;
        document.getElementById('m-ftr').value = S.margins.ftr;

        renderAll();
        selectPage(0);
        updateStatus();
        notify('프로젝트 불러오기 완료 (보안 검사 적용됨): ' + S.projectName);

        const pni = document.getElementById('project-name-inp');
        if(pni) pni.value = S.projectName;

      } catch(err){
        notify('파일을 읽을 수 없습니다: ' + err.message);
      }
    };
    r.readAsText(file);
    e.target.value = '';
  };

  console.log('✅ 보안 패치 로드 완료 — .bookpub 파일 불러오기 시 악성 콘텐츠 자동 정제');
})();


// =====================================================
// [4/4] Publoo 패치 추가 — 텍스트 입력에도 되돌리기(Ctrl+Z) 적용
// =====================================================

(function(){
  if(typeof window.onContentChange !== 'function'){
    console.warn('onContentChange 함수를 찾을 수 없어 텍스트 되돌리기 패치를 건너뜁니다.');
    return;
  }

  const _origOnContentChange = window.onContentChange;
  let debounceTimer = null;
  const DEBOUNCE_MS = 1200;

  window.onContentChange = function(i){
    _origOnContentChange(i);

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if(typeof window.snapshotState === 'function') window.snapshotState();
    }, DEBOUNCE_MS);
  };

  document.addEventListener('focusout', (e) => {
    if(e.target && e.target.classList && e.target.classList.contains('pg-content')){
      clearTimeout(debounceTimer);
      if(typeof window.snapshotState === 'function') window.snapshotState();
    }
  }, true);

  console.log('✅ 텍스트 입력 되돌리기(Ctrl+Z) 패치 로드 완료 — 타이핑 멈춘 후 자동 스냅샷');
})();


// =====================================================
// [5/5] Publoo 패치 추가 — 되돌리기/다시실행 버튼 위치 개선
// =====================================================

(function(){
  function relocateUndoRedo(){
    const undoBtn = document.getElementById('btn-undo');
    const redoBtn = document.getElementById('btn-redo');
    const toolbar = document.getElementById('toolbar');
    if(!undoBtn || !redoBtn || !toolbar) return false;
    if(document.getElementById('undo-redo-group')) return true;

    undoBtn.innerHTML = '↩ 되돌리기';
    redoBtn.innerHTML = '↪ 다시실행';
    undoBtn.style.cssText += ';font-size:11px;padding:4px 9px;white-space:nowrap';
    redoBtn.style.cssText += ';font-size:11px;padding:4px 9px;white-space:nowrap';

    const group = document.createElement('div');
    group.className = 'tg';
    group.id = 'undo-redo-group';
    group.appendChild(undoBtn);
    group.appendChild(redoBtn);

    const appTitle = document.getElementById('app-title');
    if(appTitle && appTitle.nextSibling){
      toolbar.insertBefore(group, appTitle.nextSibling);
    } else {
      toolbar.insertBefore(group, toolbar.firstChild.nextSibling);
    }
    return true;
  }

  const tryRelocate = () => { try{ relocateUndoRedo(); }catch(e){} };
  tryRelocate();
  document.addEventListener('DOMContentLoaded', tryRelocate);
  setTimeout(tryRelocate, 300);
  setTimeout(tryRelocate, 1000);

  console.log('✅ 되돌리기/다시실행 버튼 위치 개선 패치 로드 완료 — 툴바 맨 앞으로 이동 + 글자 라벨 추가');
})();


// =====================================================
// [6/6] Publoo 패치 추가 — "후기 남기기" 버튼 (구글 폼 연동)
// =====================================================

(function(){
  const GOOGLE_FORM_URL = 'https://forms.google.com/YOUR_FORM_LINK_HERE';

  function addFeedbackButton(){
    if(document.getElementById('btn-feedback')) return true;
    const toolbar = document.getElementById('toolbar');
    if(!toolbar) return false;

    const lastGroup = toolbar.querySelector('.tg:last-child');
    if(!lastGroup) return false;

    const btn = document.createElement('button');
    btn.id = 'btn-feedback';
    btn.className = 'tb';
    btn.style.color = '#7acc7a';
    btn.title = '사용 후기를 남겨주세요 (구글 폼으로 연결됩니다)';
    btn.textContent = '💬 후기 남기기';
    btn.onclick = () => {
      window.open(GOOGLE_FORM_URL, '_blank', 'noopener,noreferrer');
      if(window.notify) notify('후기 작성 페이지를 새 탭에서 열었어요. 소중한 의견 감사합니다!');
    };

    lastGroup.insertBefore(btn, lastGroup.lastElementChild);
    return true;
  }

  const tryAdd = () => { try{ addFeedbackButton(); }catch(e){} };
  tryAdd();
  document.addEventListener('DOMContentLoaded', tryAdd);
  setTimeout(tryAdd, 300);
  setTimeout(tryAdd, 1000);

  console.log('✅ 후기 남기기 버튼 패치 로드 완료 — GOOGLE_FORM_URL 값을 실제 폼 링크로 바꿔주세요');
})();


// =====================================================
// [7/7] Publoo 패치 추가 — 책등 경계 얼룩(seam) 버그 수정
// (반드시 맨 마지막에 위치해야 exportCoverSpreadPDF를
//  최종적으로 덮어써서 seam 수정이 적용됩니다)
// =====================================================

(function(){

  if(typeof window.calcSpineWidth !== 'function' ||
     typeof window.makePrintBackCoverEl !== 'function' ||
     typeof window.makePrintCoverEl !== 'function' ||
     typeof window.fmt !== 'function'){
    console.warn('필요한 함수를 찾을 수 없어 책등 seam 수정 패치를 건너뜁니다.');
    return;
  }

  const SEAM_GUARD = 0.5;

  window.exportCoverSpreadPDF = function(){
    const {w, h} = fmt();
    const spineW = calcSpineWidth();
    const BLEED = 3;
    const totalW = Math.round((w * 2 + spineW + BLEED * 2) * 10) / 10;
    const totalH = Math.round((h + BLEED * 2) * 10) / 10;
    const mm = v => v + 'mm';

    const pw = document.getElementById('print-wrap');
    pw.innerHTML = '';
    pw.style.display = 'block';

    const outerWrap = document.createElement('div');
    outerWrap.className = 'print-pg';
    outerWrap.style.cssText = 'position:relative;margin:0;padding:0;overflow:hidden;width:' + mm(totalW) + ';height:' + mm(totalH) + ';background:' + (S.backCover.bgColor || '#2c3e50');

    const bcArea = document.createElement('div');
    bcArea.style.cssText = 'position:absolute;top:0;left:0;width:' + mm(w + BLEED) + ';height:' + mm(totalH) + ';overflow:hidden;background:' + (S.backCover.bgColor || '#2c3e50');

    if(S.backCover.bgImage){
      const bgImg = document.createElement('img');
      bgImg.src = S.backCover.bgImage;
      bgImg.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;object-position:center;z-index:0';
      bcArea.appendChild(bgImg);
      const ov = document.createElement('div');
      ov.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.55);z-index:1';
      bcArea.appendChild(ov);
    }

    const bcContent = makePrintBackCoverEl(w, h, Object.assign({}, S.backCover, {bgImage: null, bgColor: 'transparent'}), S.cover);
    bcContent.style.top = mm(BLEED);
    bcContent.style.left = mm(BLEED);
    bcContent.style.zIndex = '2';
    bcArea.appendChild(bcContent);

    outerWrap.appendChild(bcArea);

    const fcArea = document.createElement('div');
    fcArea.style.cssText = 'position:absolute;top:0;left:' + mm(w + BLEED + spineW) + ';width:' + mm(w + BLEED) + ';height:' + mm(totalH) + ';overflow:hidden;background:' + (S.cover.bgColor || '#2c3e50');

    if(S.cover.bgImage){
      const bgImg = document.createElement('img');
      bgImg.src = S.cover.bgImage;
      bgImg.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;object-position:center;z-index:0';
      fcArea.appendChild(bgImg);
      const ov = document.createElement('div');
      ov.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.45);z-index:1';
      fcArea.appendChild(ov);
    }

    const fcContent = makePrintCoverEl(w, h, Object.assign({}, S.cover, {bgImage: null, bgColor: 'transparent'}));
    fcContent.style.top = mm(BLEED);
    fcContent.style.left = '0';
    fcContent.style.zIndex = '2';
    fcArea.appendChild(fcContent);

    outerWrap.appendChild(fcArea);

    const spineArea = document.createElement('div');
    const spineLeft = w + BLEED - SEAM_GUARD;
    const spineAreaW = spineW + SEAM_GUARD * 2;
    spineArea.style.cssText = 'position:absolute;top:0;left:' + mm(spineLeft) + ';width:' + mm(spineAreaW) + ';height:' + mm(totalH) + ';background:' + (S.backCover.bgColor || '#2c3e50') + ';filter:brightness(.82);display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;z-index:3';

    const title = S.cover.title || '책 제목';
    const author = S.cover.author || '';

    const titlePx = Math.max(Math.round(spineW * 3.7795 * 0.46), 7);
    const titleEl = document.createElement('div');
    titleEl.style.cssText = 'writing-mode:vertical-rl;text-orientation:mixed;white-space:nowrap;font-size:' + titlePx + 'px;color:' + (S.backCover.textColor || '#fff') + ';text-align:center;max-height:' + (h * 0.62) + 'mm;overflow:hidden;font-weight:700';
    titleEl.textContent = title;
    spineArea.appendChild(titleEl);

    if(author){
      const bylinePx = Math.max(Math.round(spineW * 3.7795 * 0.26), 6);
      const bylineEl = document.createElement('div');
      bylineEl.style.cssText = 'writing-mode:vertical-rl;text-orientation:mixed;white-space:nowrap;font-size:' + bylinePx + 'px;color:' + (S.backCover.textColor || '#fff') + ';text-align:center;max-height:' + (h * 0.22) + 'mm;overflow:hidden;font-weight:400;opacity:.92;margin-top:' + Math.round(titlePx * 0.7) + 'px';
      bylineEl.textContent = author + ' 지음';
      spineArea.appendChild(bylineEl);
    }

    outerWrap.appendChild(spineArea);

    pw.appendChild(outerWrap);

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

    if(window.notify) notify('표지 PDF — 책등 경계 얼룩 수정판 (' + totalW + ' × ' + totalH + 'mm, 책등 ' + spineW + 'mm)');
  };

  console.log('✅ 책등 경계 얼룩(seam) 수정 패치 로드 완료 — 책등을 항상 맨 위 레이어로 그려 표지 이미지 침범 방지');
})();
