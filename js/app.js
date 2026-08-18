const { createApp, ref } = Vue;

createApp({
    setup() {
        const keyValidated = ref(false);
        const keyInput = ref('');
        const error = ref('');

        const formatInput = () => {
            keyInput.value = keyInput.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
        };

        const validateKey = () => {
            error.value = '';
            const key = keyInput.value.trim();
            if (!key) { error.value = 'Введите ключ'; return; }
            if (!LobbyKeys.validate(key)) { error.value = 'Неверный ключ доступа'; return; }
            keyValidated.value = true;
            sync.saveKey(LobbyKeys.getKey(LobbyKeys.validate(key).id));
        };

        const openPage = (page) => {
            if (!keyValidated.value) return;
            const lb = LobbyKeys.validate(keyInput.value.trim());
            const key = LobbyKeys.getKey(lb.id);
            window.location.href = APP_CONFIG.pageUrl(page, { key });
        };

        return { keyValidated, keyInput, error, formatInput, validateKey, openPage };
    }
}).mount('#app');
