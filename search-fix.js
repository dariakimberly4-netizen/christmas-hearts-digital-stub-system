(() => {
  function clean(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
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

  function renderParentOnlyReleaseSearch(q) {
    const target = document.getElementById('releaseResults');
    if (!target) return;

    const previousSearch = window.searchAttendees;
    window.searchAttendees = (query) => improvedSearch(query, 'PARENT');

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
    }
  }

  function installDigitalStubSearchFix() {
    if (typeof attendees === 'undefined' || typeof renderSearchResults !== 'function') return;

    window.searchAttendees = improvedSearch;

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
    if (note) note.textContent = 'Search by Parent / Guardian name only. Open the Family Stub to see the children and process the household.';

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
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installDigitalStubSearchFix, { once: true });
  } else {
    installDigitalStubSearchFix();
  }
})();

// First-visit demo bootloader. These files used to depend on service-worker
// HTML injection, which meant a brand-new browser could look unchanged until
// a second reload. Load them directly from a script that is already in index.html.
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
      s.src = `${file}?v=21`;
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
