// =====================================================
// Publoo 앱 통합 패치 스크립트 v11
// v10 기반 + 책등에 저자명 다시 추가 (제목 크게 + "OOO 지음" 작게)
//
// 변경 사항 (v10 → v11):
//   ✅ 책등에 제목만 있던 v10의 문제를 해결
//      → 부크크 반려사유 "표지 저자명 누락" 재발 방지
//   ✅ 책등에 제목(위, 크게) + "저자명 지음"(아래, 작게)을 세로로 함께 표시
//   ✅ 세로줄/구분선 없이 여백만으로 분리 (v9에서 문제됐던 " — " 구분자 사용 안 함)
//   ✅ 그 외 v10의 모든 기능(페이지수 입력, 두께 사용자 정의) 그대로 유지
//
// 적용 방법: HTML에서 v10 다음에 이 스크립트를 추가로 불러오세요
//   <script src="publoo_patch_v10.js"></script>
//   <script src="publoo_patch_v11.js"></script>
// =====================================================

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

  // 뒤표지 영역
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

  // ── 책등 영역 (v11: 제목 + 저자명 "OOO 지음") ──────────
  const spineArea = document.createElement('div');
  spineArea.style.cssText = 'position:absolute;top:0;left:' + mm(w + BLEED) + ';width:' + mm(spineW) + ';height:' + mm(totalH) + ';background:' + (S.backCover.bgColor || '#2c3e50') + ';filter:brightness(.82);display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden';

  const title = S.cover.title || '책 제목';
  const author = S.cover.author || '';

  // 제목 (크게)
  const titlePx = Math.max(Math.round(spineW * 3.7795 * 0.46), 7);
  const titleEl = document.createElement('div');
  titleEl.style.cssText = 'writing-mode:vertical-rl;text-orientation:mixed;white-space:nowrap;font-size:' + titlePx + 'px;color:' + (S.backCover.textColor || '#fff') + ';text-align:center;max-height:' + (h * 0.62) + 'mm;overflow:hidden;font-weight:700';
  titleEl.textContent = title;
  spineArea.appendChild(titleEl);

  // 저자명 "OOO 지음" (작게, 제목 아래 여백만으로 구분 — 구분선/세로줄 없음)
  if(author){
    const bylinePx = Math.max(Math.round(spineW * 3.7795 * 0.26), 6);
    const bylineEl = document.createElement('div');
    bylineEl.style.cssText = 'writing-mode:vertical-rl;text-orientation:mixed;white-space:nowrap;font-size:' + bylinePx + 'px;color:' + (S.backCover.textColor || '#fff') + ';text-align:center;max-height:' + (h * 0.22) + 'mm;overflow:hidden;font-weight:400;opacity:.92;margin-top:' + Math.round(titlePx * 0.7) + 'px';
    bylineEl.textContent = author + ' 지음';
    spineArea.appendChild(bylineEl);
  }

  outerWrap.appendChild(spineArea);

  // 앞표지 영역
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

console.log('✅ Publoo 패치 v11 로드 완료!');
console.log('   📚 책등에 저자명 복원: 제목(크게) + "OOO 지음"(작게)');
console.log('   ⚠️ v10보다 반드시 나중에 로드되어야 적용됩니다');
