const LobbyPanel = {
    template: `
        <div class="lobby-panel glass-panel rounded-2xl p-5">
            <div v-if="connecting" class="text-center py-6">
                <div class="spinner mx-auto mb-3"></div>
                <p class="text-gray-400 text-sm">{{ statusText }}</p>
            </div>

            <div v-else-if="!inLobby">
                <div class="text-center mb-5">
                    <h3 style="justify-content:center;margin-bottom:1.5rem;font-size:1.25rem;font-weight:700;"><i class="fas fa-key text-yellow-400"></i> Введите код комнаты</h3>
                </div>

                <input v-model="keyInput" @keyup.enter="joinWithKey" @input="formatInput"
                       class="key-input glass-card mb-4"
                       placeholder="100K-XXXX-XXXX" maxlength="14">

                <button @click="joinWithKey" class="btn-modern w-full glass-panel py-3 rounded-xl font-bold text-sm mt-2">
                    <i class="fas fa-sign-in-alt mr-2"></i> Подключиться
                </button>

                <p v-if="error" class="error-text">{{ error }}</p>
            </div>

            <div v-else>
                <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center gap-2">
                        <span class="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                        <span class="text-green-300 text-sm font-medium">{{ lobby.name }}</span>
                    </div>
                    <span class="status-badge" :class="lobby.status === 'playing' ? 'status-badge--play' : 'status-badge--wait'">
                        {{ lobby.status === 'playing' ? 'Игра' : 'Ожидание' }}
                    </span>
                </div>

                <div v-if="role === 'host' && lobbyKey" class="bg-black/40 rounded-xl p-4 mb-3 border border-blue-500/20">
                    <p class="text-xs text-gray-400 mb-1">Ключ для табло:</p>
                    <div class="flex items-center gap-2 mb-3">
                        <code class="text-lg font-mono font-bold text-blue-300 tracking-wider flex-1">{{ lobbyKey }}</code>
                        <button @click="copyKey" class="btn-modern bg-white/10 px-3 py-2 rounded-lg text-xs"><i class="fas fa-copy"></i></button>
                    </div>
                    <button @click="copyShareLink" class="btn-modern w-full bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 py-2 rounded-lg text-xs text-blue-200">
                        <i class="fas fa-link mr-1"></i> Ссылка для табло
                    </button>
                    <p v-if="linkCopied" class="text-green-400 text-xs mt-2 text-center">Скопировано!</p>
                </div>

                <div class="flex gap-3 text-xs text-gray-400">
                    <span><i class="fas fa-tv mr-1" :class="lobby.displayCount > 0 ? 'text-blue-400' : 'text-gray-600'"></i> Табло: {{ lobby.displayCount || 0 }}</span>
                    <span><i class="fas fa-edit mr-1" :class="lobby.editorCount > 0 ? 'text-green-400' : 'text-gray-600'"></i> Редактор: {{ lobby.editorCount || 0 }}</span>
                </div>
            </div>
        </div>
    `,
    props: {
        role: { type: String, default: 'display' },
        autoJoin: { type: Boolean, default: true }
    },
    setup(props) {
        const { ref, onMounted } = Vue;
        const connecting = ref(false);
        const inLobby = ref(sync.inLobby);
        const lobby = ref(sync.lobby);
        const keyInput = ref('');
        const lobbyKey = ref('');
        const error = ref('');
        const linkCopied = ref(false);
        const statusText = ref('Подключение...');

        const updateStatus = () => {
            inLobby.value = sync.inLobby;
            lobby.value = sync.lobby;
            if (sync.lobbyKey) lobbyKey.value = sync.lobbyKey;
            if (sync.inLobby) connecting.value = false;
        };

        onMounted(() => {
            updateStatus();
            sync.onStatus(updateStatus);
            sync.onLobby((lb) => { lobby.value = lb; inLobby.value = true; connecting.value = false; });
            sync.onError((msg) => { error.value = msg; connecting.value = false; });

            window.addEventListener('sync-status', updateStatus);
            window.addEventListener('lobby-updated', (e) => { lobby.value = e.detail; });
            window.addEventListener('lobby-key', (e) => { lobbyKey.value = e.detail; });
            window.addEventListener('sync-error', (e) => { error.value = e.detail; });

            const urlKey = new URLSearchParams(location.search).get('key');
            if (urlKey) keyInput.value = urlKey;

            if (props.autoJoin && urlKey && !sync.inLobby) {
                connecting.value = true;
                statusText.value = 'Подключение к лобби...';
                sync.join(urlKey, props.role);
            }
        });

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

            if (formatted.length === 14 && !inLobby.value) {
                joinWithKey();
            }
        };

        const joinWithKey = () => {
            error.value = '';
            const key = keyInput.value.trim();
            if (!key) { error.value = 'Введите ключ'; return; }
            if (!LobbyKeys.validate(key)) { error.value = 'Неверный ключ доступа'; return; }

            connecting.value = true;
            statusText.value = props.role === 'host' ? 'Создание лобби...' : 'Поиск ведущего...';
            sync.join(key, props.role);
        };

        const copyKey = () => navigator.clipboard.writeText(lobbyKey.value).catch(() => {});
        const copyShareLink = () => {
            navigator.clipboard.writeText(sync.getShareLink('game.html', lobbyKey.value)).then(() => {
                linkCopied.value = true;
                setTimeout(() => { linkCopied.value = false; }, 2500);
            }).catch(() => {});
        };

        return {
            connecting, inLobby, lobby, keyInput, lobbyKey, error, linkCopied, statusText,
            formatInput, joinWithKey, copyKey, copyShareLink, role: props.role
        };
    }
};
