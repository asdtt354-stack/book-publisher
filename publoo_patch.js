// =====================================================
// [7/7] Publoo 패치 추가 — 책등 경계 얼룩(seam) 버그 수정
//
// 문제: exportCoverSpreadPDF()에서 뒤표지→책등→앞표지 순서로
//       DOM에 쌓이는데, z-index가 없어서 "나중에 추가된 요소"인
//       앞표지가 책등보다 위에 그려짐. 브라우저 프린트 렌더링 시
//       앞/뒤표지 이미지 가장자리에 서브픽셀 안티앨리어싱이 생겨
//       책등 색과 같은 얇은 띠(약 0.4~0.5mm)가 표지 이미지 안에
//       박혀서, 실제 인쇄 PDF의 책등 폭이 계산값보다 넓어 보이는
//       현상이 발생함 (부크크 "책등너비 안맞음" 반려의 실제 원인).
//
// 해결: exportCoverSpreadPDF()를 오버라이드하여, 책등(spineArea)을
//       DOM에 가장 마지막에 추가 → 항상 맨 위에 그려지도록 하고,
//       앙쪽으로 0.5mm씩 여유를 더 줘서 표지 이미지 경계 얼룩을
//       확실히 덮음. 책등 안의 텍스트(제목/저자명) 위치·크기는
//       기존과 동일하게 유지됨.
//
// 적용 방법: 기존 publoo_patch.js(v11 + v12 + 보안패치 + ... 합본)
//           맨 아래에 이 코드를 그대로 이어 붙이면 됩니다.
// =====================================================

(function(){

  if(typeof window.calcSpineWidth !== 'function' ||
     typeof window.makePrintBackCoverEl !== 'function' ||
     typeof window.makePrintCoverEl !== 'function' ||
     typeof window.fmt !== 'function'){
    console.warn('필요한 함수를 찾을 수 없어 책등 seam 수정 패치를 건너뜁니다.');
    return;
  }

  // 표지 이미지 경계의 안티앨리어싱 얼룩을 덮기 위한 여유폭(mm)
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

    // ── 뒤표지 영역 ──────────────────────
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

    // ── 앞표지 영역 (책등보다 먼저 추가 — 아래 레이어) ──
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

    // ── 책등 영역 (★ 가장 마지막에 추가 → 항상 맨 위에 그려짐) ──
    // 앞/뒤표지 이미지 경계의 안티앨리어싱 얼룩을 덮도록 양쪽으로
    // SEAM_GUARD(0.5mm)씩 여유를 더 넓게 잡되, 안의 텍스트는
    // 원래 spineW 기준 그대로 중앙 정렬되어 보이는 위치와 크기 유지.
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

    outerWrap.appendChild(spineArea); // ← 항상 마지막(최상단)

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
