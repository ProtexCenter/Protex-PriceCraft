/**
 * ============================================================================
 * PRICECRAFT — INTERNAL ACCESS GATEWAY AUTHENTICATION (login.js)
 * หจก.โพรเทคส์ แอคเซสโซรี อินดัสเตรียล (Protex Center)
 * Static Frontend Authentication with Apple-UI Keyframe Shake Animation
 * ============================================================================
 */

(function initProtexGatewayLogin() {
  'use strict';

  // รหัสประจำตัวพนักงานที่ลงทะเบียนในระบบ (อ้างอิงจากตาราง Employees + สำรองกรณีออฟไลน์)
  const REGISTERED_EMPLOYEE_IDS = new Map([
    ['hr0000000', { id: 'HR0000000', name: 'พี่สุ', role: 'พนักงานโพรเทคส์' }],
    ['spt5012531', { id: 'SPT5012531', name: 'พี่ป๋อม', role: 'พนักงานโพรเทคส์' }],
    ['spt7122004', { id: 'SPT7122004', name: 'ฟลุ๊ค', role: 'พนักงานโพรเทคส์' }],
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

  if (!form || !input || !wrapper) return;
  input.focus();

  /**
   * Triggers Apple-style horizontal shake animation, red border, and clears input.
   */
  function triggerInvalidShake() {
    // Restart animation cleanly if already applied
    wrapper.classList.remove('shake-error');
    void wrapper.offsetWidth; // Force reflow
    wrapper.classList.add('shake-error');

    if (errorHint) {
      errorHint.classList.add('visible');
    }

    // Clear input field immediately so user can type again
    input.value = '';
    input.focus();

    setTimeout(() => {
      wrapper.classList.remove('shake-error');
    }, 520);
  }

  // Clear error state as soon as the user starts typing again
  input.addEventListener('input', () => {
    wrapper.classList.remove('shake-error');
    if (errorHint) {
      errorHint.classList.remove('visible');
    }
  });

  // Top-right X button resets the field and error state
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

  // Clickable demo code badges for convenience
  document.querySelectorAll('[data-fill-code]').forEach((badge) => {
    badge.addEventListener('click', () => {
      input.value = badge.getAttribute('data-fill-code') || '';
      wrapper.classList.remove('shake-error');
      if (errorHint) errorHint.classList.remove('visible');
      input.focus();
    });
  });

  // Handle Form Submission
  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const rawEntered = (input.value || '').trim();
    const enteredCode = rawEntered.toLowerCase();
    if (!enteredCode) {
      triggerInvalidShake();
      return;
    }

    let matchedEmployee = null;
    if (window.PricecraftAppwrite && typeof window.PricecraftAppwrite.verifyEmployee === 'function') {
      matchedEmployee = await window.PricecraftAppwrite.verifyEmployee(rawEntered);
    }
    if (!matchedEmployee) {
      matchedEmployee = REGISTERED_EMPLOYEE_IDS.get(enteredCode) || null;
    }

    if (!matchedEmployee) {
      triggerInvalidShake();
      return;
    }

    // Store authenticated employee info for workspace header
    try {
      sessionStorage.setItem('pc_emp_id', matchedEmployee.id);
      sessionStorage.setItem('pc_emp_name', matchedEmployee.name);
      sessionStorage.setItem('pc_emp_role', matchedEmployee.role || 'ผู้จัดทำใบขอราคาต้นทุน');
    } catch {
      // Ignore storage restrictions in private mode
    }

    // Redirect immediately to dashboard.html
    window.location.href = 'dashboard.html';
  });
})();

