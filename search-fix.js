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

  function installDigitalStubSearchFix() {
    if (typeof attendees === 'undefined' || typeof renderSearchResults !== 'function') return;

    window.searchAttendees = improvedSearch;

    const input = document.getElementById('releaseSearch');
    const button = document.getElementById('releaseSearchBtn');
    if (!input || !button) return;

    input.type = 'search';
    input.autocomplete = 'off';
    input.enterKeyHint = 'search';
    input.setAttribute('inputmode', 'search');
    input.placeholder = 'Type parent or child name';

    const run = () => renderSearchResults('releaseResults', input.value, 'release');

    input.addEventListener('input', run);
    input.addEventListener('search', run);
    input.addEventListener('focus', () => {
      if (input.value.trim()) run();
    });

    button.textContent = 'Search Name';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installDigitalStubSearchFix, { once: true });
  } else {
    installDigitalStubSearchFix();
  }
})();
