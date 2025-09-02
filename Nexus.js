// script.js — Full functionality for Alpha Nexus
// - Handles: showMemberships, showPayments, showWallet, goBack, copyAddress, markPaid
// - Works with both the simple HTML you have in canvas and the fuller HTML variant.
// - Uses the wallet addresses & Telegram invite you provided.

(function () {
  'use strict';

  // ---------- Configuration ----------
  const TELEGRAM_INVITE = 'https://t.me/+X4_vvwvycvoxYjlk';
  const VERIFICATION_HANDLE = '@RETARDEDLYRICH';
  const SUPPORT_EMAIL = 'Wavemini43@gmail.com';

  // You provided the same BEP20 address for all networks — using exactly as given.
  const wallets = {
    BTC:  '0x8f612f3ddcd2721da663065937a2acef633c57d0',
    ETH:  '0x8f612f3ddcd2721da663065937a2acef633c57d0',
    USDT: '0x8f612f3ddcd2721da663065937a2acef633c57d0',
    SOL:  '0x8f612f3ddcd2721da663065937a2acef633c57d0',
    XRP:  '0x8f612f3ddcd2721da663065937a2acef633c57d0'
  };

  // ---------- Small DOM helpers ----------
  const q = (id) => document.getElementById(id);
  const show = (el) => { if (!el) return; el.style.display = 'block'; el.setAttribute('aria-hidden','false'); };
  const hide = (el) => { if (!el) return; el.style.display = 'none'; el.setAttribute('aria-hidden','true'); };

  // Hide any known section; safe if element missing
  function hideAllSections() {
    const ids = [
      'memberships', 'payments', 'wallet-screen', 'telegram-screen',
      'paidSuccess', 'walletScreen', 'walletScreen', 'onboarding'
    ];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) hide(el);
    });
  }

  // ---------- Core UI actions (exposed globally for inline onclick support) ----------
  window.showMemberships = function showMemberships() {
    hideAllSections();
    const el = q('memberships') || document.querySelector('[data-section="memberships"]');
    if (el) {
      show(el);
      el.scrollIntoView({behavior:'smooth', block:'start'});
    } else {
      console.warn('showMemberships: memberships element not found.');
    }
  };

  window.showPayments = function showPayments() {
    hideAllSections();
    const el = q('payments') || document.querySelector('[data-section="payments"]');
    if (el) {
      show(el);
      el.scrollIntoView({behavior:'smooth', block:'start'});
    } else {
      console.warn('showPayments: payments element not found.');
    }
  };

  // type: 'BTC' | 'ETH' | 'USDT' | 'SOL' | 'XRP'
  window.showWallet = function showWallet(type) {
    if (!type) { console.error('showWallet requires a type (BTC/ETH/USDT/SOL/XRP)'); return; }
    const upper = String(type).toUpperCase();
    // If a payment button exists with a data-address and data-network, prefer that
    const btnWithData = document.querySelector(`.payment-btn[data-method="${upper}"]`) ||
                        document.querySelector(`button[data-method="${upper}"]`);
    if (btnWithData && btnWithData.dataset && btnWithData.dataset.address) {
      wallets[upper] = btnWithData.dataset.address;
    }

    const walletScreen = q('wallet-screen') || q('walletScreen') || document.querySelector('.wallet-screen');
    if (!walletScreen) {
      console.error('showWallet: wallet screen container not found in DOM.');
      showPayments();
      return;
    }

    // Title / label
    const titleEl = q('wallet-title') || walletScreen.querySelector('.wallet-method-label') || walletScreen.querySelector('h2');
    if (titleEl) titleEl.textContent = `${upper} Wallet`;

    // Network info (optional element)
    const networkEl = q('walletNetwork') || walletScreen.querySelector('#walletNetwork') || walletScreen.querySelector('.wallet-network');
    if (networkEl) {
      const network = (btnWithData && btnWithData.dataset.network) || 'BEP20';
      networkEl.textContent = network;
    }

    // Address element (expected id 'wallet-address' or class '.wallet-address')
    const addrEl = q('wallet-address') || walletScreen.querySelector('.wallet-address') || walletScreen.querySelector('pre');
    if (!addrEl) {
      console.error('showWallet: wallet address element not found.');
      return;
    }
    addrEl.textContent = wallets[upper] || '';
    addrEl.setAttribute('data-current-method', upper);

    // Ensure TAP TO COPY control is visible / updated if present
    const tapBtn = q('tapToCopy') || walletScreen.querySelector('.btn-copy') || walletScreen.querySelector('button.copy');
    if (tapBtn) {
      tapBtn.setAttribute('aria-label', `Copy ${upper} address`);
    }

    hideAllSections();
    show(walletScreen);
    walletScreen.scrollIntoView({behavior:'smooth', block:'center'});

    // Remember selection
    try { localStorage.setItem('alphanexus_selected_wallet', upper); } catch(e){}
  };

  window.goBack = function goBack() {
    // Primary behavior: go to payments; fallback to memberships
    const paymentsEl = q('payments') || document.querySelector('[data-section="payments"]');
    if (paymentsEl) {
      hideAllSections();
      show(paymentsEl);
      paymentsEl.scrollIntoView({behavior:'smooth'});
    } else {
      window.showMemberships();
    }
  };

  // Copy wallet address to clipboard with fallback
  window.copyAddress = async function copyAddress() {
    const addrEl = q('wallet-address') || document.querySelector('.wallet-address') || document.querySelector('#wallet-screen pre');
    const text = addrEl ? addrEl.textContent.trim() : '';
    if (!text) { createToast('No address found to copy', 3000); return; }

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback: textarea + execCommand
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        if (!ok) throw new Error('execCommand copy failed');
      }
      createToast('Address copied to clipboard ✅', 2200);
    } catch (err) {
      console.error('copyAddress error', err);
      createToast('Copy failed — long press the address to copy manually', 3000);
    }
  };

  // After user clicks "PAID": show Telegram invite + verification instructions
  window.markPaid = function markPaid() {
    // Try to reveal telegram-screen or paidSuccess (whichever exists in your HTML)
    const telegramScreen = q('telegram-screen') || q('paidSuccess') || document.querySelector('.paid-success') || document.querySelector('#paidSuccess');
    if (telegramScreen) {
      // Ensure the content matches required message
      const p = telegramScreen.querySelector('p') || telegramScreen;
      if (p) {
        p.innerHTML = `SEND THE PROOF OF PAYMENT TO <strong>${VERIFICATION_HANDLE}</strong> TO GET APPROVED`;
      }
      // Update or create the invite button
      let a = telegramScreen.querySelector('a[href*="t.me"]');
      if (!a) {
        a = document.createElement('a');
        a.className = 'btn btn-telegram';
        a.textContent = 'Open Telegram Invite';
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        telegramScreen.appendChild(a);
      }
      a.href = TELEGRAM_INVITE;

      hideAllSections();
      show(telegramScreen);
      telegramScreen.scrollIntoView({behavior:'smooth', block:'center'});
    } else {
      // Fallback: minimal alert + instruction
      alert(`Payment noted. Join the Telegram invite and send proof to ${VERIFICATION_HANDLE}`);
    }

    // store a small flag locally (not required, but convenient)
    try { localStorage.setItem('alphanexus_paid_at', (new Date()).toISOString()); } catch(e){}
  };

  // ---------- Toast UI ----------
  function createToast(message, ms = 3000) {
    const t = document.createElement('div');
    t.className = 'aln-toast';
    t.textContent = message;
    Object.assign(t.style, {
      position: 'fixed',
      left: '50%',
      transform: 'translateX(-50%)',
      bottom: '28px',
      background: 'rgba(0,0,0,0.9)',
      color: '#fff',
      padding: '10px 14px',
      borderRadius: '10px',
      boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
      zIndex: 999999,
      fontSize: '14px',
      opacity: '0',
      transition: 'opacity 180ms ease, transform 180ms ease'
    });
    document.body.appendChild(t);
    // show
    requestAnimationFrame(() => {
      t.style.opacity = '1';
      t.style.transform = 'translateX(-50%) translateY(-6px)';
    });
    setTimeout(() => {
      t.style.opacity = '0';
      t.style.transform = 'translateX(-50%) translateY(0)';
      setTimeout(() => t.remove(), 220);
    }, ms);
  }

  // ---------- Initialization: attach event listeners if present ----------
  function init() {
    // Buttons in header
    const applyNowBtn = document.getElementById('applyNowBtn') || document.querySelector('header button[onclick*="showPayments"]') || document.querySelector('button#applyNow') || document.querySelector('header button:nth-of-type(2)');
    if (applyNowBtn) applyNowBtn.addEventListener('click', showPayments);

    const viewPlansBtn = document.getElementById('viewPlansBtn') || document.querySelector('header button[onclick*="showMemberships"]') || document.querySelector('button#viewPlans') || document.querySelector('header button:nth-of-type(1)');
    if (viewPlansBtn) viewPlansBtn.addEventListener('click', showMemberships);

    // Choose plan buttons (class .choose-plan or inline)
    document.querySelectorAll('.choose-plan, .plan-card .choose-plan, button[data-plan]').forEach(btn => {
      btn.addEventListener('click', () => {
        // store chosen plan if dataset present
        if (btn.dataset && btn.dataset.plan) {
          try { localStorage.setItem('alphanexus_selected_plan', btn.dataset.plan); } catch(e){}
        }
        showPayments();
      });
    });

    // Payment method buttons (.payment-btn or buttons inside payments section)
    document.querySelectorAll('.payment-btn, button[data-method], #payments button').forEach(btn => {
      // find a method value
      let method = (btn.dataset && btn.dataset.method) || btn.textContent || '';
      method = String(method).trim().split(/\s/)[0]; // first word like BTC
      if (!method) return;
      btn.addEventListener('click', () => {
        // If a data-address exists on the button, ensure wallets map updated
        if (btn.dataset && btn.dataset.address) {
          wallets[method.toUpperCase()] = btn.dataset.address;
        }
        showWallet(method.toUpperCase());
      });
    });

    // Wallet screen specific buttons
    const goBackBtn = q('walletGoBack') || document.querySelector('#wallet-screen button[onclick*="goBack()"]') || document.querySelector('#wallet-screen .btn-ghost') || null;
    if (goBackBtn) goBackBtn.addEventListener('click', goBack);

    const tapToCopyBtn = q('tapToCopy') || document.querySelector('#wallet-screen button[onclick*="copyAddress()"]') || document.querySelector('#wallet-screen .btn-copy') || null;
    if (tapToCopyBtn) tapToCopyBtn.addEventListener('click', copyAddress);

    const paidBtn = q('paidBtn') || document.querySelector('#wallet-screen button[onclick*="markPaid()"]') || document.querySelector('#wallet-screen .btn-primary') || null;
    if (paidBtn) paidBtn.addEventListener('click', markPaid);

    // Keyboard UX: Esc -> go back
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        goBack();
      }
    });

    // Make sure sections that were hidden via inline style remain hidden
    ['memberships','payments','wallet-screen','telegram-screen','paidSuccess'].forEach(id => {
      const el = document.getElementById(id);
      if (el && (el.style.display === '' || getComputedStyle(el).display === 'block' && el.hasAttribute('data-start-hidden'))) {
        hide(el);
      }
    });
  }

  // Run init when ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose helpful debug function
  window._alphanexus_debug = {
    wallets, TELEGRAM_INVITE, VERIFICATION_HANDLE, SUPPORT_EMAIL
  };

})();