// Aplica el tema antes del primer pintado para evitar parpadeos. Va en un archivo aparte (no en
// línea) para que la política de seguridad de contenido pueda prohibir scripts en línea.
try {
  var p = JSON.parse(localStorage.getItem('forja-theme') || '{}').state?.preference || 'dark'
  var dark = p === 'dark' || (p === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
  if (!dark) document.querySelector('meta[name="theme-color"]').setAttribute('content', '#f7f3ee')
} catch (e) {}
