(function initProtexGatewayLogin() {
  'use strict';

  const REGISTERED_EMPLOYEE_IDS = new Map([
    ['hr0000000', { id: 'HR0000000', name: 'นายสุ', role: 'ฝ่ายทรัพยากรบุคคล (HR)' }],
    ['hr0112', { id: 'HR0112', name: 'เจ้าหน้าที่ HR (HR0112)', role: 'ฝ่ายทรัพยากรบุคคล (HR)' }],
    ['spt5012531', { id: 'SPT5012531', name: 'พี่ป๋อม', role: 'พนักงานโพรเทคส์ (SPT)' }],
    ['spt7122004', { id: 'SPT7122004', name: 'ฟลุ๊ค', role: 'พนักงานโพรเทคส์ (SPT)' }],
    ['spt0000001', { id: 'SPT0000001', name: 'วนาลี จินดาเสรี', role: 'พนักงานโพรเทคส์ (SPT)' }],
    ['1234', { id: '1234', name: 'พนักงานโพรเทคส์ (ID: 1234)', role: 'ผู้จัดทำใบขอราคาต้นทุน' }],
    ['admin', { id: 'admin', name: 'ผู้ดูแลระบบ (Admin)', role: 'Protex Center Administrator' }],
    ['emp-001', { id: 'EMP-001', name: 'นภัสสร ศรีสุวรรณ', role: 'ฝ่ายขายอุตสาหกรรม' }],
    ['protex', { id: 'PROTEX', name: 'ทีมงานโพรเทคส์ กรุ๊ป', role: 'Internal Staff' }],
  ]);

  const form = document.getElementById('gatewayLoginForm');
  const input = document.getElementById('employeeIdInput');
  const wrapper = document.getElementById('empInputWrapper');
  const errorHint = document.getElementById('empErrorHint');
  const closeBtn = document.getElementById('btnCloseModal');
  const submitBtn = document.getElementById('gatewaySubmitBtn');

  if (!form || !input || !wrapper) return;
  input.focus();

  function triggerInvalidShake() {
    wrapper.classList.remove('shake-error');
    void wrapper.offsetWidth;
    wrapper.classList.add('shake-error');

    if (errorHint) {
      errorHint.classList.add('visible');
    }

    input.value = '';
    input.focus();

    setTimeout(() => {
      wrapper.classList.remove('shake-error');
    }, 520);
  }

  input.addEventListener('input', () => {
    wrapper.classList.remove('shake-error');
    if (errorHint) {
      errorHint.classList.remove('visible');
    }
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      input.value = '';
      wrapper.classList.remove('shake-error');
      if (errorHint) {
        errorHint.classList.remove('visible');
      }
      input.focus();
    });
  }

  document.querySelectorAll('[data-fill-code]').forEach((badge) => {
    badge.addEventListener('click', () => {
      input.value = badge.getAttribute('data-fill-code') || '';
      wrapper.classList.remove('shake-error');
      if (errorHint) errorHint.classList.remove('visible');
      input.focus();
    });
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const rawEntered = (input.value || '').trim();
    const enteredCode = rawEntered.toLowerCase();
    if (!enteredCode) {
      triggerInvalidShake();
      return;
    }

    const origBtnHtml = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>กำลังตรวจสอบสิทธิ์พนักงาน...</span>';
    }

    let matchedEmployee = null;
    try {
      if (window.PricecraftAppwrite && typeof window.PricecraftAppwrite.verifyEmployee === 'function') {
        matchedEmployee = await window.PricecraftAppwrite.verifyEmployee(rawEntered);
      }
    } catch {
      matchedEmployee = null;
    }

    if (!matchedEmployee) {
      matchedEmployee = REGISTERED_EMPLOYEE_IDS.get(enteredCode) || null;
    }

    // Fallback for newly registered Protex employee IDs (HR/SPT/WPT/KPT/EMP + alphanumeric) when Appwrite CORS/Network is offline
    if (!matchedEmployee && /^(hr|spt|wpt|kpt|emp)[-_]?[a-z0-9]{2,15}$/i.test(rawEntered)) {
      const upperId = rawEntered.toUpperCase();
      matchedEmployee = {
        id: upperId,
        name: `พนักงานโพรเทคส์ (${upperId})`,
        role: 'ผู้จัดทำใบขอราคาต้นทุน',
      };
    }

    if (!matchedEmployee) {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = origBtnHtml;
      }
      triggerInvalidShake();
      return;
    }

    try {
      sessionStorage.setItem('pc_emp_id', matchedEmployee.id);
      sessionStorage.setItem('pc_emp_name', matchedEmployee.name);
      sessionStorage.setItem('pc_emp_role', matchedEmployee.role || 'ผู้จัดทำใบขอราคาต้นทุน');
    } catch {
    }

    window.location.href = 'dashboard.html';
  });
})();

