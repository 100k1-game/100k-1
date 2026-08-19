const { createApp, ref } = Vue;

createApp({
    setup() {
        const keyValidated = ref(false);
        const keyInput = ref('');
        const error = ref('');

        const formatInput = () => {
            error.value = '';
            let val = keyInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
            if (val.startsWith('100K')) {
                val = val.substring(4);
            }
            if (val.length === 0) {
                keyInput.value = '';
                return;
            }
            // Форматируем как 100K-XXXX-XXXX
            let formatted = '100K';
            if (val.length > 0) formatted += '-' + val.substring(0, 4);
            if (val.length > 4) formatted += '-' + val.substring(4, 8);
            
            keyInput.value = formatted;

            if (formatted.length === 14 && !keyValidated.value) {
                validateKey();
            }
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
