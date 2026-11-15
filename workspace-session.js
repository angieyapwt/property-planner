(() => {
  'use strict';
  const navigation = performance.getEntriesByType('navigation')[0]?.type;
  const previous = navigation === 'reload' || navigation === 'back_forward' ? history.state?.estateWorkspaceId : null;
  const workspaceId = previous || crypto.randomUUID();
  history.replaceState({...history.state, estateWorkspaceId:workspaceId}, '');
  window.EstateDraft = {
    getItem(key) { return sessionStorage.getItem(workspaceId + ':' + key); },
    setItem(key,value) { sessionStorage.setItem(workspaceId + ':' + key,value); }
  };

  document.addEventListener('input',event => {
    const input = event.target;
    if (!input.matches?.('input[data-live-price],input[data-currency]')) return;
    const original = input.value;
    const raw = original.replace(/[$,\s]/g,'');
    if (!/^\d*(?:\.\d*)?$/.test(raw)) return;
    const before = original.slice(0,input.selectionStart).replace(/[^\d.]/g,'').length;
    const [integer, fraction] = raw.split('.');
    const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g,',') + (fraction === undefined ? '' : '.' + fraction);
    const value = grouped && input.hasAttribute('data-currency') ? '$'+grouped : grouped;
    if (value === original) return;
    input.value = value;
    let position = 0, digits = 0;
    while (position < value.length && digits < before) {
      if (/[\d.]/.test(value[position])) digits++;
      position++;
    }
    input.setSelectionRange(position,position);
  },true);
})();
