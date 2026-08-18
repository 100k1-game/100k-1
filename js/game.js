const { createApp, ref, computed, onMounted, watch } = Vue;

createApp({
    components: { 'lobby-panel': LobbyPanel },
    setup() {
        const state = ref(store.getState());
        const inLobby = ref(sync.inLobby);
        const lobby = ref(sync.lobby);
        const lobbyKey = ref(sync.getSavedKey());
        const countdown = ref(null);
        const strikeShake = ref(false);
        const bankPulse = ref(false);
        const overlay = ref(null);
        const scoreAnim = ref({ team1: false, team2: false });

        const isWaiting = computed(() => inLobby.value && lobby.value && lobby.value.status === 'waiting');
        const isPlaying = computed(() => inLobby.value && lobby.value && lobby.value.status === 'playing');
        const team1Ready = computed(() => state.value.team1Name && state.value.team1Name !== 'Команда 1');
        const team2Ready = computed(() => state.value.team2Name && state.value.team2Name !== 'Команда 2');

        const displayAnswers = computed(() => {
            const slots = Array(8).fill(null);
            if (state.value.currentQuestion?.answers) {
                state.value.currentQuestion.answers.forEach((ans, idx) => {
                    if (idx < 8) slots[idx] = ans;
                });
            }
            return slots;
        });

        const applyState = (s) => {
            if (!s) return;
            state.value = { ...store.getState(), ...s };
        };

        const playSound = (id) => {
            const audio = document.getElementById(id);
            if (audio) { audio.currentTime = 0; audio.play().catch(() => {}); }
        };

        const flashScore = (team) => {
            const key = team === 1 ? 'team1' : 'team2';
            scoreAnim.value[key] = true;
            setTimeout(() => { scoreAnim.value[key] = false; }, 600);
        };

        const refreshLobby = () => {
            inLobby.value = sync.inLobby;
            lobby.value = sync.lobby;
            if (sync.lobbyKey) lobbyKey.value = sync.lobbyKey;
        };

        watch(() => state.value.lastAction, (action, prev) => {
            if (!action || (prev && action.timestamp === prev.timestamp)) return;
            switch (action.type) {
                case 'reveal':
                    playSound('sound-reveal');
                    bankPulse.value = true;
                    setTimeout(() => { bankPulse.value = false; }, 500);
                    break;
                case 'revealAll': playSound('sound-reveal'); break;
                case 'strike':
                    playSound('sound-strike');
                    strikeShake.value = true;
                    setTimeout(() => { strikeShake.value = false; }, 600);
                    break;
                case 'steal':
                    playSound('sound-steal');
                    overlay.value = { type: 'steal', text: 'БАНК УКРАДЕН!' };
                    setTimeout(() => { overlay.value = null; }, 2000);
                    break;
                case 'gameStart':
                    playSound('sound-start');
                    break;
            }
        });

        watch(() => state.value.team1Score, (n, o) => { if (n !== o) flashScore(1); });
        watch(() => state.value.team2Score, (n, o) => { if (n !== o) flashScore(2); });

        onMounted(() => {
            store.subscribe((s) => { if (s) applyState(s); });
            sync.onState((s) => applyState(s));
            sync.onStatus(refreshLobby);
            sync.onLobby((lb) => { lobby.value = lb; inLobby.value = true; });
            window.addEventListener('sync-status', refreshLobby);
            window.addEventListener('lobby-updated', (e) => { lobby.value = e.detail; inLobby.value = true; });

            window.addEventListener('game-started', (e) => {
                refreshLobby();
                if (e.detail?.state) applyState(e.detail.state);
                overlay.value = { type: 'steal', text: 'ПОЕХАЛИ!' };
                countdown.value = 3;
                const tick = () => {
                    countdown.value--;
                    if (countdown.value > 0) setTimeout(tick, 1000);
                    else { countdown.value = null; overlay.value = null; }
                };
                setTimeout(tick, 1000);
            });

            document.addEventListener('keydown', (e) => {
                if (e.key === 'f' || e.key === 'F') {
                    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
                    else document.exitFullscreen();
                }
            });
        });

        return {
            state, inLobby, lobby, lobbyKey, isWaiting, isPlaying, team1Ready, team2Ready, countdown,
            displayAnswers, strikeShake, bankPulse, overlay, scoreAnim
        };
    }
}).mount('#app');
