const { createApp, ref, onMounted } = Vue;

createApp({
    setup() {
        const lobbies = ref(LobbyKeys.getPublicList());

        const openPage = (page) => {
            window.open(APP_CONFIG.pageUrl(page), '_blank');
        };

        onMounted(() => {
            window.addEventListener('lobby-updated', () => {
                if (sync.lobby) {
                    const list = LobbyKeys.getPublicList();
                    const idx = list.findIndex(l => l.id === sync.lobby.id);
                    if (idx >= 0) list[idx] = { ...list[idx], ...sync.lobby };
                    lobbies.value = list;
                }
            });
        });

        return { lobbies, openPage };
    }
}).mount('#app');
