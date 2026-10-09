(function () {
    try {
        const saved = localStorage.getItem('icaewLMSTheme_v1');
        const theme = (saved === 'light' || saved === 'dark')
            ? saved
            : (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
        document.documentElement.dataset.theme = theme;
    } catch (_) {
        document.documentElement.dataset.theme = 'dark';
    }
})();
