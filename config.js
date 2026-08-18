/** Конфигурация для GitHub Pages */
window.APP_CONFIG = {
    getBasePath() {
        const parts = location.pathname.split('/').filter(Boolean);
        const pages = ['index.html', 'game.html', 'host.html', 'editor.html'];
        if (parts.length && pages.includes(parts[parts.length - 1])) parts.pop();
        return parts.length ? '/' + parts.join('/') : '';
    },

    pageUrl(page, params) {
        const base = location.origin + this.getBasePath();
        let url = base + '/' + page.replace(/^\//, '');
        if (params) {
            const qs = new URLSearchParams(params).toString();
            if (qs) url += '?' + qs;
        }
        return url;
    }
};
