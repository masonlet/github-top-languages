export const sanitize = (str) => {
  if (typeof str !== 'string') return '';
  return str.replace(/[<>&"']/g, (m) => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    '"': '&quot;',
    "'": '&#39;'
  }[m]));
};

