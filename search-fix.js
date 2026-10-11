(() => {
  const HELPER_VERSION = '22';

  function clean(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function say(message) {
    try {
      if (typeof window.toast === 'function') window.toast(message);
      else alert(message);
    } catch {
      alert(message);
    }
  }

  function role() {
    try {
      return typeof window.currentRole === 'function' ? window.currentRole() : 'UNKNOWN';
    } catch {
      return 'UNKNOWN';
    }
  }

  function actor() {
    try {
      return typeof window.currentStaff === 'function' ? window.currentStaff() : 'Unknown';
    } catch {
      return 'Unknown';
    }
  }

  function improvedSearch(q, filter = 'ALL') {
    const tokens = clean(q).split(/\s+/).filter(Boolean);
    return attendees.filter(a => {
      if (filter !== 'ALL' && a.type !== filter) return false;
      if (!tokens.length) return true;
      const haystack = clean([
        a.code,
        a.fullName,
        a.location,
        a.contact,
        a.emergencyContact,
        a.linkedPerson,
        a.familyId,
        a.relationship,
        a.gender,
        a.notes
      ].join(' '));
      return tokens.every(token => haystack.includes(token));
    });
  }

  function findAttendee(id) {
    try {
      if (typeof window.byId === 'function') return window.byId(id);
    } catch {}
    try {
      return attendees.find(a => String(a.id) === String(id)) || null;
    } catch {
      return null;
    }
  }

  function familyMembers(familyId) {
    try {
      return attendees
        .filter(a => a.familyId === familyId)
        .sort((a, b) => a.type === b.type
          ? String(a.fullName || '').localeCompare(String(b.fullName || ''))
          : a.type === 'PARENT' ? -1 : 1);
    } catch {
      return [];
    }
  }

  function allReleased(list) {
    return list.length > 0 && list.every(a => !!a.stubReleasedAt);
  }

  function canEdit() {
    return ['ADMIN', 'REGISTRATION'].includes(role());
  }

  function canRelease() {
    return ['ADMIN', 'STUB'].includes(role());
  }

  function canReissue() {
    return ['ADMIN', 'REGISTRATION', 'STUB'].includes(role());
  }

  function ensureReleaseStyles() {
    if (document.getElementById('releaseFamilyFlowStyles')) return;
    const style = document.createElement('style');
    style.id = 'releaseFamilyFlowStyles';
    style.textContent = `
      #releaseResults .release-family-panel{margin-top:15px;padding-top:14px;border-top:1px solid #e3dccf}
      #releaseResults .release-family-flow{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin-top:10px}
      #releaseResults .release-family-flow button{min-height:48px;width:100%;touch-action:manipulation}
      #releaseResults .release-family-flow .family-release-main{grid-column:1/-1;min-height:56px;font-size:1rem}
      #releaseResults .release-family-summary{margin-top:12px;padding:12px;border:1px solid #d8dfd8;border-radius:14px;background:#edf4ef;color:#103b2d}
      #releaseResults .release-family-summary h4{margin:0 0 9px;font-size:.92rem}
      #releaseResults .release-family-summary-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}
      #releaseResults .release-family-summary-grid div{background:#fff;border:1px solid #dfe6df;border-radius:11px;padding:8px 6px;text-align:center}
      #releaseResults .release-family-summary-grid span{display:block;font-size:.65rem;letter-spacing:.04em;color:#6f756d;text-transform:uppercase}
      #releaseResults .release-family-summary-grid b{display:block;margin-top:3px;font-size:.95rem}
      #releaseResults .release-family-pending{margin:9px 0 0;font-size:.76rem;line-height:1.45;color:#4b504a}
      #releaseResults .result-actions[hidden]{display:none!important}
      @media(max-width:560px){
        #releaseResults .release-family-flow{grid-template-columns:1fr}
        #releaseResults .release-family-flow .family-release-main{grid-column:auto}
        #releaseResults .release-family-summary-grid{grid-template-columns:1fr 1fr 1fr}
      }
    `;
    document.head.appendChild(style);
  }

  function summaryHtml(list) {
    const kids = list.filter(a => a.type === 'KID');
    const released = list.filter(a => a.stubReleasedAt).length;
    const food = list.filter(a => a.foodClaimedAt).length;
    const raffle = kids.filter(a => a.raffleClaimedAt).length;
    const pendingFood = list.filter(a => !a.foodClaimedAt).map(a => a.fullName);
    const pendingRaffle = kids.filter(a => !a.raffleClaimedAt).map(a => a.fullName);
    const pendingParts = [];
    if (pendingFood.length) pendingParts.push(`Food pending: ${pendingFood.join(', ')}`);
    if (pendingRaffle.length) pendingParts.push(`Raffle pending: ${pendingRaffle.join(', ')}`);
    if (!pendingParts.length) pendingParts.push('All available family claims are already processed.');
    return `
      <div class="release-family-summary">
        <h4>Family Claim Summary</h4>
        <div class="release-family-summary-grid">
          <div><span>Stubs</span><b>${released}/${list.length}</b></div>
          <div><span>Food</span><b>${food}/${list.length}</b></div>
          <div><span>Kid Raffle</span><b>${raffle}/${kids.length}</b></div>
        </div>
        <p class="release-family-pending">${pendingParts.map(v => esc(v)).join('<br>')}</p>
      </div>`;
  }

  function familyPanelHtml(parent) {
    const list = familyMembers(parent.familyId);
    if (!list.length) return '';
    const released = allReleased(list);
    const editDisabled = !canEdit();
    const releaseDisabled = !canRelease() || released;
    const reissueDisabled = !released || !canReissue();
    const openDisabled = !released;
    return `
      <div class="release-family-panel" data-release-family-panel="${esc(parent.id)}">
        <div class="release-family-flow">
          <button class="primary-btn family-release-main" type="button" data-family-release-now="${esc(parent.id)}" ${releaseDisabled ? 'disabled' : ''}>
            ${released ? 'Family Stub Released' : `Release Family Stub (${list.length})`}
          </button>
          <button class="ghost-btn" type="button" data-family-open-qr="${esc(parent.id)}" ${openDisabled ? 'disabled' : ''}>Open Family QR</button>
          <button class="ghost-btn" type="button" data-family-edit-now="${esc(parent.id)}" ${editDisabled ? 'disabled' : ''}>Edit Family</button>
          <button class="ghost-btn" type="button" data-family-reissue-now="${esc(parent.id)}" ${reissueDisabled ? 'disabled' : ''}>Reissue QR</button>
        </div>
        ${summaryHtml(list)}
      </div>`;
  }

  function decorateReleaseCards() {
    ensureReleaseStyles();
    const root = document.getElementById('releaseResults');
    if (!root) return;
    root.querySelectorAll('.result-card').forEach(card => {
      const pass = card.querySelector('[data-action="pass"]');
      if (!pass) return;
      const parent = findAttendee(pass.dataset.id);
      if (!parent || parent.type !== 'PARENT' || !parent.familyId) return;

      const oldActions = card.querySelector('.result-actions');
      if (oldActions) oldActions.hidden = true;

      const info = card.firstElementChild || card;
      const oldPanel = card.querySelector('.release-family-panel');
      if (oldPanel) oldPanel.remove();
      info.insertAdjacentHTML('beforeend', familyPanelHtml(parent));
    });
  }

  function renderParentOnlyReleaseSearch(q) {
    const target = document.getElementById('releaseResults');
    if (!target) return;

    const previousSearch = window.searchAttendees;
    window.searchAttendees = query => improvedSearch(query, 'PARENT');

    try {
      if (typeof window.renderSearchResults === 'function') {
        window.renderSearchResults('releaseResults', q, 'release');
      }
    } finally {
      window.searchAttendees = previousSearch;
    }

    if (!target.querySelector('.result-card')) {
      target.classList.add('empty-state');
      target.textContent = q.trim()
        ? 'No matching Parent / Guardian found.'
        : 'Search a Parent / Guardian name.';
      return;
    }

    target.classList.remove('empty-state');
    decorateReleaseCards();
    setTimeout(decorateReleaseCards, 0);
  }

  function rerunReleaseSearch() {
    const input = document.getElementById('releaseSearch');
    if (input) renderParentOnlyReleaseSearch(input.value || '');
  }

  function releaseWholeFamily(parentId) {
    const parent = findAttendee(parentId);
    if (!parent) return say('Parent / Guardian record not found.');
    if (!canRelease()) return say('Digital Stub Release staff access required.');
    const list = familyMembers(parent.familyId);
    if (!list.length) return say('Family record not found.');
    const pending = list.filter(a => !a.stubReleasedAt);
    if (!pending.length) return say('This family stub is already released.');

    const stamp = new Date().toISOString();
    const staffName = actor();
    pending.forEach(a => {
      a.stubReleasedAt = stamp;
      a.stubReleasedBy = staffName;
      try {
        if (typeof window.logAction === 'function') {
          window.logAction('STUB RELEASED', a, `Family ${parent.familyId}; released together from Parent search`);
        }
      } catch {}
    });

    try {
      if (typeof window.save === 'function') window.save();
    } catch {}
    rerunReleaseSearch();
    say(`Family stub released for ${list.length} attendee${list.length === 1 ? '' : 's'}.`);
  }

  function ensureScript(file, test) {
    if (test()) return Promise.resolve();
    const existing = [...document.scripts].find(s => (s.getAttribute('src') || '').split('?')[0].endsWith(file));
    if (existing) {
      return new Promise(resolve => {
        if (test()) return resolve();
        const done = () => resolve();
        existing.addEventListener('load', done, { once: true });
        existing.addEventListener('error', done, { once: true });
        setTimeout(done, 1200);
      });
    }
    return new Promise(resolve => {
      const s = document.createElement('script');
      s.src = `${file}?v=${HELPER_VERSION}`;
      s.defer = true;
      s.dataset.releaseHelper = '1';
      s.onload = () => resolve();
      s.onerror = () => resolve();
      document.body.appendChild(s);
    });
  }

  async function ensureFamilyStubHelper() {
    await ensureScript('family-stub.js', () => typeof window.openFamilyStub === 'function');
  }

  async function ensureEditorHelper() {
    await ensureFamilyStubHelper();
    await ensureScript('demo-enhancements.js', () => typeof window.openFamilyEditor === 'function');
  }

  async function openFamilyQr(parentId, reissue = false) {
    const parent = findAttendee(parentId);
    if (!parent) return say('Parent / Guardian record not found.');
    const list = familyMembers(parent.familyId);
    if (!allReleased(list)) return say('Release the Family Stub first.');
    await ensureFamilyStubHelper();
    if (typeof window.openFamilyStub === 'function') {
      if (reissue) {
        try {
          if (typeof window.logAction === 'function') {
            window.logAction('QR PASS REISSUED', parent, `Family ${parent.familyId}; family QR reopened for resend`);
            if (typeof window.save === 'function') window.save();
          }
        } catch {}
      }
      window.openFamilyStub(parent.familyId, 'general');
      if (reissue) say('Family QR reopened. You can share or save it again.');
      return;
    }
    if (typeof window.openPass === 'function') window.openPass(parent.id);
  }

  async function editFamily(parentId) {
    const parent = findAttendee(parentId);
    if (!parent) return say('Parent / Guardian record not found.');
    if (!canEdit()) return say('Registration Encoder or Administrator access required.');
    await ensureEditorHelper();
    if (typeof window.openFamilyEditor !== 'function') return say('Family editor could not be loaded. Please refresh and try again.');
    window.openFamilyEditor(parent.id);
    setTimeout(() => {
      const dialog = document.getElementById('editFamilyDialog');
      dialog?.addEventListener('close', () => setTimeout(rerunReleaseSearch, 0), { once: true });
    }, 0);
  }

  function installDigitalStubSearchFix() {
    if (typeof attendees === 'undefined' || typeof renderSearchResults !== 'function') return;

    window.searchAttendees = improvedSearch;
    ensureReleaseStyles();

    const oldInput = document.getElementById('releaseSearch');
    const oldButton = document.getElementById('releaseSearchBtn');
    if (!oldInput || !oldButton) return;

    const input = oldInput.cloneNode(true);
    const button = oldButton.cloneNode(true);
    oldInput.replaceWith(input);
    oldButton.replaceWith(button);

    input.type = 'search';
    input.autocomplete = 'off';
    input.enterKeyHint = 'search';
    input.setAttribute('inputmode', 'search');
    input.placeholder = 'Type Parent / Guardian name';
    input.setAttribute('aria-label', 'Search Parent or Guardian name');
    button.textContent = 'Search Parent';

    const note = document.querySelector('#view-release .rule-note');
    if (note) note.textContent = 'Search the Parent / Guardian. Release one Family Stub for the household, then open or reissue the Family QR.';

    const run = () => renderParentOnlyReleaseSearch(input.value);
    input.addEventListener('input', run);
    input.addEventListener('search', run);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        run();
      }
    });
    input.addEventListener('focus', () => {
      if (input.value.trim()) run();
    });
    button.addEventListener('click', run);

    const target = document.getElementById('releaseResults');
    if (target) {
      target.classList.add('empty-state');
      target.textContent = 'Search a Parent / Guardian name.';
    }

    document.addEventListener('click', e => {
      const release = e.target.closest('[data-family-release-now]');
      if (release) {
        e.preventDefault();
        return releaseWholeFamily(release.dataset.familyReleaseNow);
      }

      const open = e.target.closest('[data-family-open-qr]');
      if (open) {
        e.preventDefault();
        return openFamilyQr(open.dataset.familyOpenQr, false);
      }

      const edit = e.target.closest('[data-family-edit-now]');
      if (edit) {
        e.preventDefault();
        return editFamily(edit.dataset.familyEditNow);
      }

      const reissue = e.target.closest('[data-family-reissue-now]');
      if (reissue) {
        e.preventDefault();
        if (!canReissue()) return say('Registration, Stub Release, or Administrator access required.');
        return openFamilyQr(reissue.dataset.familyReissueNow, true);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installDigitalStubSearchFix, { once: true });
  } else {
    installDigitalStubSearchFix();
  }
})();

// First-visit demo bootloader. Load helper files directly so the demo does not
// depend on a second reload or prior service-worker control.
(() => {
  const extras = [
    'reliability-tools.js',
    'family-stub.js',
    'admin-tools.js',
    'demo-enhancements.js'
  ];

  function alreadyLoaded(file) {
    return [...document.scripts].some(s => {
      try { return new URL(s.src, location.href).pathname.endsWith('/' + file); }
      catch { return false; }
    });
  }

  function loadOne(file) {
    if (alreadyLoaded(file)) return Promise.resolve();
    return new Promise(resolve => {
      const s = document.createElement('script');
      s.src = `${file}?v=22`;
      s.async = false;
      s.onload = resolve;
      s.onerror = resolve;
      document.head.appendChild(s);
    });
  }

  (async () => {
    for (const file of extras) await loadOne(file);
  })();
})();
