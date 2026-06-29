// =====================================================
// Publoo 앱 패치 스크립트 v8
// v7 위에 추가 적용 - 부크크 정확한 용지 두께 옵션 추가
//
// 추가 사항:
//   ✅ 1) "0.068mm (부크크 백색모조 80g 실측)" 드롭다운 옵션 자동 삽입
//   ✅ 2) 사용자 정의 두께 입력칸 추가 (0.001 단위까지)
//   ✅ 3) 두께 변경 시 책등 너비 자동 재계산 및 표시
//
// 사용법: HTML에서 v7 다음 줄에 <script src="publoo_patch_v8.js"></script> 추가
// 또는 v7 끝에 이 코드를 그대로 이어붙여도 OK
// =====================================================

(function injectPaperThickOptions(){
  const observer = new MutationObserver(() => {
    const sel = document.getElementById('bc-paper-thick');
    if(!sel || sel.dataset.publooV8) return;
    sel.dataset.publooV8 = '1';

    // ── ① 부크크 실측값 옵션 추가 (0.06 다음에) ──
    const hasBookkOption = Array.from(sel.options).some(o => o.value === '0.068');
    if(!hasBookkOption){
      const opt = document.createElement('option');
      opt.value = '0.068';
      opt.textContent = '0.068mm (부크크 백색모조 80g 실측) ⭐';
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

    // ── ② 사용자 정의 입력칸 추가 (select 다음에) ──
    if(!document.getElementById('bc-paper-thick-custom-wrap')){
      const wrap = document.createElement('div');
      wrap.id = 'bc-paper-thick-custom-wrap';
      wrap.style.cssText = 'margin-top:8px;padding:8px;background:rgba(244,166,54,.08);border:1px solid rgba(244,166,54,.3);border-radius:5px';
      wrap.innerHTML = `
        <div style="font-size:11px;color:#f4a636;font-weight:bold;margin-bottom:6px">⚙️ 용지 두께 사용자 정의</div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <input type="number" id="bc-paper-thick-custom" step="0.001" min="0.04" max="0.2" placeholder="예: 0.068"
            style="width:90px;background:#252540;border:1px solid #444;color:#fff;padding:4px 8px;border-radius:4px;font-size:12px;font-family:inherit">
          <span style="font-size:11px;color:#aaa">mm/장</span>
          <button onclick="applyCustomPaperThick()"
            style="background:#f4a636;border:none;color:#000;padding:4px 12px;border-radius:4px;font-size:11px;cursor:pointer;font-weight:bold;font-family:inherit">
            적용
          </button>
          <span id="bc-paper-thick-custom-result" style="font-size:11px;color:#7acc7a"></span>
        </div>
        <div style="font-size:10px;color:#999;margin-top:4px">인쇄소가 알려준 정확한 값(소수점 셋째 자리)을 입력하면 책등 너비가 자동 재계산됩니다</div>
      `;
      // select가 들어있는 부모 컨테이너 끝에 붙임
      const parent = sel.parentNode;
      parent.appendChild(wrap);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();


// ── 사용자 정의 두께 적용 함수 ──
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

  // 기존 custom 옵션 제거 후 새로 추가
  Array.from(sel.options).forEach(o => {
    if(o.dataset.custom === '1') sel.removeChild(o);
  });

  const opt = document.createElement('option');
  opt.value = String(val);
  opt.textContent = val + 'mm (사용자 정의) ✓';
  opt.dataset.custom = '1';
  opt.selected = true;
  sel.appendChild(opt);

  // S 객체에도 반영
  if(window.S && window.S.backCover){
    S.backCover.paperThick = val;
  }

  // 페이지 수가 이미 입력되어 있으면 책등 너비 자동 재계산
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

    if(window.notify) notify('용지 두께 ' + val + 'mm 적용 → 책등 ' + spineW + 'mm (' + pages + '페이지)');
  } else {
    if(resEl){
      resEl.textContent = '✓ ' + val + 'mm 적용됨 (페이지 수 입력 필요)';
      resEl.style.color = '#f4a636';
    }
    if(window.notify) notify('용지 두께 ' + val + 'mm 적용됨 - 페이지 수도 입력해주세요');
  }

  // select change 이벤트 발생시켜 다른 핸들러도 업데이트
  sel.dispatchEvent(new Event('change'));
};

console.log('✅ Publoo 패치 v8 완료! 부크크 0.068mm 옵션 + 사용자 정의 두께 입력 추가');
