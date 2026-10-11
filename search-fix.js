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

    // Keep flexible partial-name searching everywhere else in the system.
    window.searchAttendees = improvedSearch;

    const oldInput = document.getElementById('releaseSearch');
    const oldButton = document.getElementById('releaseSearchBtn');
    if (!oldInput || !oldButton) return;

    // Replace these two controls so the old app.js listeners cannot return child results.
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
