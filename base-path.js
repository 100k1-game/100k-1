/**
 * Первым скриптом в <head> — фикс путей для GitHub Pages (/repo-name/)
 */
(function () {
    var pages = ['index.html', 'game.html', 'host.html', 'editor.html'];
    var parts = location.pathname.split('/').filter(Boolean);
    if (parts.length && pages.indexOf(parts[parts.length - 1]) !== -1) parts.pop();
    var baseHref = parts.length ? '/' + parts.join('/') + '/' : '/';
    window.__BASE_PATH__ = baseHref === '/' ? '' : baseHref.replace(/\/$/, '');

    var base = document.createElement('base');
    base.href = baseHref;
    document.head.insertBefore(base, document.head.firstChild);
})();
