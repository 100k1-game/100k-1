const LobbyPanel = {
    template: `
        <div class="lobby-panel glass-panel rounded-2xl p-5">
            <div v-if="!connected && connecting" class="text-center py-4">
                <div class="w-10 h-10 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-3"></div>
                <p class="text-gray-400 text-sm">Подключение...</p>
            </div>

            <div v-else-if="!inLobby">
                <div v-if="connected" class="flex items-center gap-2 mb-4">
                    <span class="w-2 h-2 rounded-full bg-green-400"></span>
                    <span class="text-green-300 text-sm font-medium">Онлайн</span>
                </div>

                <label class="block text-xs text-gray-400 uppercase tracking-wider mb-2">Ключ лобби</label>
                <input v-model="keyInput" @keyup.enter="joinWithKey" @input="formatInput"
                       class="w-full bg-black/50 text-white text-center text-xl font-mono font-bold tracking-[0.2em] px-4 py-3 rounded-xl border border-white/10 focus:border-blue-500/50 outline-none uppercase mb-3"
                       placeholder="100K-XXXX-XXXX" maxlength="13">

                <button @click="joinWithKey" class="btn-modern w-full bg-blue-600/40 hover:bg-blue-600/60 border border-blue-500/40 py-3 rounded-xl font-bold text-sm mb-4">
                    <i class="fas fa-sign-in-alt mr-2"></i> Войти по ключу
                </button>

                <div class="border-t border-white/5 pt-4">
                    <p class="text-xs text-gray-500 mb-3 uppercase tracking-wider">Или выберите лобби {{ roleLabel }}:</p>
                    <div class="grid grid-cols-5 gap-2">
                        <button v-for="lb in lobbies" :key="lb.id" @click="joinLobby(lb.id)"
                                class="lobby-slot btn-modern rounded-xl py-3 text-center border border-white/10 bg-white/5 hover:border-blue-500/40 hover:bg-blue-500/10 transition-all">
                            <div class="text-lg font-bold">{{ lb.id }}</div>
                            <div class="text-[10px] mt-1 text-gray-500 uppercase">{{ lb.name }}</div>
                        </button>
                    </div>
                </div>

                <p v-if="error" class="text-red-400 text-xs mt-3 text-center">{{ error }}</p>
            </div>

            <div v-else>
                <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center gap-2">
                        <span class="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                        <span class="text-green-300 text-sm font-medium">{{ lobby.name }}</span>
                    </div>
                    <span class="text-xs px-2 py-1 rounded-full border"
                          :class="lobby.status === 'playing' ? 'border-green-500/40 text-green-300 bg-green-500/10' : 'border-yellow-500/40 text-yellow-300 bg-yellow-500/10'">
                        {{ lobby.status === 'playing' ? 'Игра идёт' : 'Ожидание' }}
                    </span>
                </div>

                <div v-if="role === 'host' && lobbyKey" class="bg-black/40 rounded-xl p-4 mb-3 border border-blue-500/20">
                    <p class="text-xs text-gray-400 mb-1">Ключ для табло:</p>
                    <div class="flex items-center gap-2 mb-3">
                        <code class="text-xl font-mono font-bold text-blue-300 tracking-wider flex-1">{{ lobbyKey }}</code>
                        <button @click="copyKey" class="btn-modern bg-white/10 px-3 py-2 rounded-lg text-xs"><i class="fas fa-copy"></i></button>
                    </div>
                    <button @click="copyShareLink" class="btn-modern w-full bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 py-2 rounded-lg text-xs text-blue-200">
                        <i class="fas fa-link mr-1"></i> Копировать ссылку для табло
                    </button>
                    <p v-if="linkCopied" class="text-green-400 text-xs mt-2 text-center">Ссылка скопирована!</p>
                </div>

                <div class="flex gap-4 text-xs text-gray-400">
                    <span><i class="fas fa-microphone mr-1 text-purple-400"></i> Ведущий</span>
                    <span><i class="fas fa-tv mr-1" :class="lobby.displayCount > 0 ? 'text-blue-400' : 'text-gray-600'"></i> Табло: {{ lobby.displayCount || 0 }}</span>
                    <span><i class="fas fa-edit mr-1" :class="lobby.editorCount > 0 ? 'text-green-400' : 'text-gray-600'"></i> Редактор: {{ lobby.editorCount || 0 }}</span>
                </div>
            </div>
        </div>
    `,
    props: {
        role: { type: String, default: 'display' }
    },
    setup(props) {
        const { ref, computed, onMounted } = Vue;
        const connected = ref(sync.connected);
        const connecting = ref(false);
        const inLobby = ref(sync.inLobby);
        const lobby = ref(sync.lobby);
        const lobbies = ref(LobbyKeys.getPublicList());
        const keyInput = ref(sync.getSavedKey() || '');
        const lobbyKey = ref(sync.getSavedKey() || '');
        const error = ref('');
        const linkCopied = ref(false);

        const roleLabel = computed(() => {
            if (props.role === 'host') return '(ведущий)';
            if (props.role === 'editor') return '(редактор)';
            return '(табло)';
        });

        const updateStatus = () => {
            connected.value = sync.connected;
            inLobby.value = sync.inLobby;
            lobby.value = sync.lobby;
            if (sync.lobbyKey) lobbyKey.value = sync.lobbyKey;
            if (sync.connected || sync.inLobby) connecting.value = false;
        };

        onMounted(() => {
            updateStatus();
            sync.onStatus(updateStatus);
            sync.onLobby((lb) => { lobby.value = lb; inLobby.value = true; connecting.value = false; });
            sync.onError((msg) => { error.value = msg; connecting.value = false; });

            window.addEventListener('sync-status', updateStatus);
            window.addEventListener('lobby-updated', (e) => { lobby.value = e.detail; });
            window.addEventListener('lobby-key', (e) => { lobbyKey.value = e.detail; });
            window.addEventListener('sync-error', (e) => { error.value = e.detail; setTimeout(() => error.value = '', 5000); });

            const urlKey = new URLSearchParams(location.search).get('key');
            if (urlKey && !sync.inLobby) {
                keyInput.value = urlKey;
                connecting.value = true;
                sync.join(urlKey, props.role);
            }
        });

        const formatInput = () => {
            keyInput.value = keyInput.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
        };

        const joinWithKey = () => {
            error.value = '';
            if (!keyInput.value.trim()) { error.value = 'Введите ключ'; return; }
            connecting.value = true;
            sync.join(keyInput.value.trim(), props.role);
        };

        const joinLobby = (id) => {
            error.value = '';
            connecting.value = true;
            sync.join(id, props.role);
        };

        const copyKey = () => navigator.clipboard.writeText(lobbyKey.value).catch(() => {});
        const copyShareLink = () => {
            navigator.clipboard.writeText(sync.getShareLink('game.html', lobbyKey.value)).then(() => {
                linkCopied.value = true;
                setTimeout(() => { linkCopied.value = false; }, 2500);
            }).catch(() => {});
        };

        return {
            connected, connecting, inLobby, lobby, lobbies, keyInput, lobbyKey, error, linkCopied, roleLabel,
            formatInput, joinWithKey, joinLobby, copyKey, copyShareLink, role: props.role
        };
    }
};
