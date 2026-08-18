const HostPanel = {
    template: `
        <div class="glass-panel w-full max-w-6xl rounded-3xl p-8 text-white relative overflow-hidden">
            <div class="absolute top-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px] pointer-events-none"></div>

            <div class="flex justify-between items-center mb-6 relative z-10">
                <h2 class="text-3xl font-bold tracking-wide text-glow">Панель ведущего</h2>
                <div v-if="!isWaiting" class="flex items-center gap-3 text-sm">
                    <span class="text-gray-500">Раунд</span>
                    <button @click="changeRound(-1)" class="btn-modern w-8 h-8 bg-white/5 rounded-lg">−</button>
                    <span class="text-xl font-bold text-yellow-400 w-8 text-center">{{ localState.roundNumber }}</span>
                    <button @click="changeRound(1)" class="btn-modern w-8 h-8 bg-white/5 rounded-lg">+</button>
                </div>
            </div>

            <!-- Lobby Setup (waiting phase) -->
            <div v-if="isWaiting" class="lobby-setup relative z-10">
                <div class="lobby-setup-title">
                    <i class="fas fa-hourglass-half text-yellow-400"></i>
                    Подготовка к игре — {{ lobbyInfo?.name || 'Лобби' }}
                </div>
                <p class="text-sm text-gray-400 mb-4">Настройте команды. Табло видит изменения в реальном времени.</p>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                    <div>
                        <label class="text-xs text-gray-500 uppercase tracking-wider mb-2 block">Команда 1</label>
                        <input v-model="localState.team1Name" @input="syncSetupTeams"
                               class="w-full bg-black/40 text-blue-300 px-4 py-3 rounded-xl text-center text-lg font-bold border border-blue-500/20 focus:border-blue-500/50 outline-none"
                               placeholder="Название команды 1">
                    </div>
                    <div>
                        <label class="text-xs text-gray-500 uppercase tracking-wider mb-2 block">Команда 2</label>
                        <input v-model="localState.team2Name" @input="syncSetupTeams"
                               class="w-full bg-black/40 text-purple-300 px-4 py-3 rounded-xl text-center text-lg font-bold border border-purple-500/20 focus:border-purple-500/50 outline-none"
                               placeholder="Название команды 2">
                    </div>
                </div>

                <div class="flex items-center justify-between flex-wrap gap-4">
                    <div class="text-sm text-gray-400">
                        <span v-if="lobbyInfo?.displayCount > 0" class="text-green-400">
                            <i class="fas fa-check-circle mr-1"></i> Табло подключено ({{ lobbyInfo.displayCount }})
                        </span>
                        <span v-else class="text-yellow-400">
                            <i class="fas fa-clock mr-1"></i> Ожидаем подключение табло...
                        </span>
                    </div>
                    <button @click="startGame" :disabled="!canStart" class="start-game-btn btn-modern">
                        <i class="fas fa-play mr-2"></i> Начать игру
                    </button>
                </div>
            </div>

            <template v-if="!isWaiting">
            <!-- Quick Actions -->
            <div class="flex flex-wrap gap-2 mb-6 relative z-10">
                <button @click="undoAction" :disabled="!canUndo" class="btn-modern bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-xl text-xs font-medium disabled:opacity-30">
                    <i class="fas fa-undo mr-1"></i> Отмена
                </button>
                <button @click="revealAll" class="btn-modern bg-green-600/20 hover:bg-green-600/40 border border-green-500/30 px-4 py-2 rounded-xl text-xs font-medium">
                    <i class="fas fa-eye mr-1"></i> Открыть все
                </button>
                <button @click="hideAll" class="btn-modern bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-xl text-xs font-medium">
                    <i class="fas fa-eye-slash mr-1"></i> Скрыть все
                </button>
                <button @click="nextQuestion" class="btn-modern bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 px-4 py-2 rounded-xl text-xs font-medium">
                    <i class="fas fa-forward mr-1"></i> След. вопрос
                </button>
                <button @click="newRound" class="btn-modern bg-yellow-600/20 hover:bg-yellow-600/40 border border-yellow-500/30 px-4 py-2 rounded-xl text-xs font-medium">
                    <i class="fas fa-redo mr-1"></i> Новый раунд
                </button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                <!-- Teams -->
                <div class="glass-card p-6 rounded-2xl">
                    <h3 class="text-lg font-semibold mb-5 text-gray-200">Команды</h3>
                    <div class="flex justify-between items-start mb-4">
                        <div class="w-[45%]">
                            <input v-model="localState.team1Name" @change="syncState" class="w-full bg-black/40 text-blue-300 px-3 py-2 rounded-xl mb-3 text-center font-medium border border-white/5 focus:border-blue-500/50 focus:outline-none" placeholder="Команда 1">
                            <div class="flex items-center justify-center flex-wrap gap-1 mb-2">
                                <button v-for="v in quickScores" :key="'t1-'+v" @click="changeScore('team1', v)" class="btn-modern px-2 py-1 rounded text-xs" :class="v > 0 ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'">{{ v > 0 ? '+' : '' }}{{ v }}</button>
                            </div>
                            <div class="flex items-center justify-center space-x-2">
                                <input v-model.number="localState.team1Score" @change="syncState" class="w-20 bg-black/50 text-center text-2xl font-bold py-1.5 rounded-lg border border-white/5" type="number">
                            </div>
                            <button @click="setActiveTeam(1)" class="mt-2 w-full btn-modern py-1.5 rounded-lg text-xs border transition-colors" :class="localState.activeTeam === 1 ? 'bg-blue-500/30 border-blue-400/50 text-blue-200' : 'bg-white/5 border-white/10 text-gray-400'">
                                {{ localState.activeTeam === 1 ? '● Активна' : 'Сделать активной' }}
                            </button>
                        </div>
                        <div class="text-xl font-bold text-gray-600 pt-8">VS</div>
                        <div class="w-[45%]">
                            <input v-model="localState.team2Name" @change="syncState" class="w-full bg-black/40 text-purple-300 px-3 py-2 rounded-xl mb-3 text-center font-medium border border-white/5 focus:border-purple-500/50 focus:outline-none" placeholder="Команда 2">
                            <div class="flex items-center justify-center flex-wrap gap-1 mb-2">
                                <button v-for="v in quickScores" :key="'t2-'+v" @click="changeScore('team2', v)" class="btn-modern px-2 py-1 rounded text-xs" :class="v > 0 ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'">{{ v > 0 ? '+' : '' }}{{ v }}</button>
                            </div>
                            <div class="flex items-center justify-center space-x-2">
                                <input v-model.number="localState.team2Score" @change="syncState" class="w-20 bg-black/50 text-center text-2xl font-bold py-1.5 rounded-lg border border-white/5" type="number">
                            </div>
                            <button @click="setActiveTeam(2)" class="mt-2 w-full btn-modern py-1.5 rounded-lg text-xs border transition-colors" :class="localState.activeTeam === 2 ? 'bg-purple-500/30 border-purple-400/50 text-purple-200' : 'bg-white/5 border-white/10 text-gray-400'">
                                {{ localState.activeTeam === 2 ? '● Активна' : 'Сделать активной' }}
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Round -->
                <div class="glass-card p-6 rounded-2xl flex flex-col justify-between">
                    <h3 class="text-lg font-semibold mb-4 text-gray-200">Текущий раунд</h3>
                    <div class="flex justify-between items-center mb-4">
                        <span class="text-sm text-gray-400">Банк:</span>
                        <div class="flex items-center gap-2">
                            <button @click="adjustRound(-10)" class="btn-modern bg-red-500/20 text-red-300 px-2 py-1 rounded text-xs">−10</button>
                            <input v-model.number="localState.roundScore" @change="syncState" class="w-24 bg-black/50 text-center text-2xl font-bold py-1.5 rounded-xl text-yellow-400 border border-yellow-500/30" type="number">
                            <button @click="adjustRound(10)" class="btn-modern bg-green-500/20 text-green-300 px-2 py-1 rounded text-xs">+10</button>
                        </div>
                    </div>
                    <div class="flex space-x-3 mb-4">
                        <button @click="transferScore('team1')" class="btn-modern flex-1 bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/30 py-2.5 rounded-xl text-sm font-medium text-blue-200">
                            → {{ localState.team1Name }}
                        </button>
                        <button @click="transferScore('team2')" class="btn-modern flex-1 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/30 py-2.5 rounded-xl text-sm font-medium text-purple-200">
                            → {{ localState.team2Name }}
                        </button>
                    </div>
                    <button @click="stealRound" class="btn-modern w-full bg-orange-600/20 hover:bg-orange-600/40 border border-orange-500/30 py-2 rounded-xl text-sm font-medium text-orange-200 mb-4">
                        <i class="fas fa-hand-rock mr-1"></i> Украсть банк (активная команда)
                    </button>
                    <div class="flex justify-between items-center bg-black/20 p-3 rounded-xl border border-white/5">
                        <span class="text-sm text-gray-400">Промахи:</span>
                        <div class="flex space-x-2 items-center">
                            <button v-for="i in 3" :key="i" @click="setStrikes(i)"
                                    class="w-10 h-10 rounded-full font-bold text-lg btn-modern flex items-center justify-center border"
                                    :class="localState.strikes >= i ? 'bg-red-500/20 text-red-400 border-red-500/50 strike-active' : 'bg-black/50 text-gray-600 border-white/5'">X</button>
                            <button @click="addStrike" class="btn-modern bg-red-500/20 text-red-300 px-3 py-1.5 rounded-lg text-xs">+1</button>
                            <button @click="setStrikes(0)" class="btn-modern bg-white/5 px-3 py-1.5 rounded-lg text-xs">Сброс</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Questions -->
            <div class="mt-6 glass-card p-6 rounded-2xl relative z-10">
                <div class="flex justify-between items-center mb-5">
                    <h3 class="text-lg font-semibold text-gray-200">Вопросы</h3>
                    <input v-model="searchQuery" placeholder="Поиск..." class="bg-black/40 px-3 py-1.5 rounded-lg border border-white/10 text-sm outline-none focus:border-blue-500/50 w-48">
                </div>

                <div v-if="localState.currentQuestion" class="mb-6 bg-black/30 p-5 rounded-xl border border-blue-500/20">
                    <h4 class="text-xl font-medium text-white mb-4">{{ localState.currentQuestion.text }}</h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div v-for="(answer, idx) in localState.currentQuestion.answers" :key="idx"
                             class="flex items-center justify-between bg-black/40 p-3 rounded-xl border transition-all"
                             :class="answer.revealed ? 'border-green-500/50' : 'border-white/5 hover:border-white/20'">
                            <div class="flex-1 truncate pr-2">
                                <kbd class="text-gray-600 text-xs mr-1">{{ idx + 1 }}</kbd>
                                <span class="text-sm" :class="answer.revealed ? 'text-white' : 'text-gray-400'">{{ answer.text }}</span>
                            </div>
                            <span class="font-bold text-yellow-400 mx-2">{{ answer.score }}</span>
                            <button @click="toggleAnswer(idx)" class="btn-modern px-3 py-1 rounded-lg text-xs border"
                                    :class="answer.revealed ? 'bg-white/5 text-gray-300 border-white/5' : 'bg-green-600/30 text-green-300 border-green-500/30'">
                                {{ answer.revealed ? 'Скрыть' : 'Открыть' }}
                            </button>
                        </div>
                    </div>
                </div>
                <div v-else class="text-gray-500 text-sm mb-6 p-6 text-center border border-dashed border-white/10 rounded-xl">Вопрос не выбран</div>

                <div class="max-h-52 overflow-y-auto bg-black/20 rounded-xl p-2 border border-white/5">
                    <div v-if="filteredQuestions.length === 0" class="text-gray-500 text-sm text-center py-6">Нет вопросов</div>
                    <div v-for="(q, idx) in filteredQuestions" :key="q.id || idx"
                         class="flex justify-between items-center p-3 rounded-lg mb-1 transition-colors border"
                         :class="questionClass(q)">
                        <div class="flex-1 truncate pr-4">
                            <span v-if="isUsed(q)" class="text-xs text-gray-600 mr-2">✓</span>
                            <span class="text-sm text-gray-300">{{ q.text }}</span>
                        </div>
                        <button @click="loadQuestion(q)" class="btn-modern bg-white/10 hover:bg-white/20 px-4 py-1.5 rounded-lg text-xs">Выбрать</button>
                    </div>
                </div>
            </div>

            <div class="mt-6 flex justify-between relative z-10">
                <p class="text-xs text-gray-600 self-center">Горячие клавиши: 1–8 открыть ответ, X промах, Ctrl+Z отмена</p>
                <button @click="resetGame" class="btn-modern bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 px-6 py-3 rounded-xl text-red-400 text-sm flex items-center">
                    <i class="fas fa-redo-alt mr-2"></i> Сбросить игру
                </button>
            </div>
            </template>
        </div>
    `,
    setup() {
        const { ref, computed, onMounted, onUnmounted } = Vue;
        const localState = ref(store.getState());
        const searchQuery = ref('');
        const quickScores = [-50, -10, 10, 50, 100];
        const lobbyInfo = ref(sync.lobby);

        const isWaiting = computed(() => sync.inLobby && sync.lobby && sync.lobby.status === 'waiting');
        const canStart = computed(() =>
            localState.value.team1Name.trim().length > 0 &&
            localState.value.team2Name.trim().length > 0
        );

        const canUndo = computed(() => (localState.value.history || []).length > 0);

        const filteredQuestions = computed(() => {
            const q = localState.value.questions || [];
            if (!searchQuery.value.trim()) return q;
            const s = searchQuery.value.toLowerCase();
            return q.filter(item => item.text.toLowerCase().includes(s));
        });

        const snapshot = () => ({
            team1Score: localState.value.team1Score,
            team2Score: localState.value.team2Score,
            roundScore: localState.value.roundScore,
            strikes: localState.value.strikes,
            currentQuestion: localState.value.currentQuestion ? JSON.parse(JSON.stringify(localState.value.currentQuestion)) : null,
            roundNumber: localState.value.roundNumber,
            activeTeam: localState.value.activeTeam,
            usedQuestionIds: [...(localState.value.usedQuestionIds || [])]
        });

        const saveWithHistory = () => {
            const history = [...(localState.value.history || []), snapshot()].slice(-30);
            localState.value.history = history;
        };

        const onKey = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            const key = e.key.toLowerCase();
            if (key >= '1' && key <= '8') {
                const idx = parseInt(key) - 1;
                if (localState.value.currentQuestion?.answers[idx] && !localState.value.currentQuestion.answers[idx].revealed) {
                    toggleAnswer(idx);
                }
            } else if (key === 'x') {
                addStrike();
            } else if (key === 'z' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                undoAction();
            }
        };

        onMounted(() => {
            store.subscribe((newState) => { localState.value = newState; });
            sync.onLobby((lb) => { lobbyInfo.value = lb; });
            window.addEventListener('lobby-updated', (e) => { lobbyInfo.value = e.detail; });
            window.addEventListener('keydown', onKey);
        });

        onUnmounted(() => {
            window.removeEventListener('keydown', onKey);
        });

        const syncState = () => store.update(localState.value);

        const changeScore = (team, amount) => {
            saveWithHistory();
            if (team === 'team1') localState.value.team1Score += amount;
            else localState.value.team2Score += amount;
            syncState();
        };

        const adjustRound = (amount) => {
            saveWithHistory();
            localState.value.roundScore += amount;
            syncState();
        };

        const transferScore = (team) => {
            saveWithHistory();
            if (team === 'team1') localState.value.team1Score += localState.value.roundScore;
            else localState.value.team2Score += localState.value.roundScore;
            localState.value.roundScore = 0;
            localState.value.strikes = 0;
            syncState();
        };

        const stealRound = () => {
            if (!localState.value.activeTeam || localState.value.roundScore <= 0) {
                alert('Выберите активную команду и убедитесь, что банк > 0');
                return;
            }
            saveWithHistory();
            transferScore(localState.value.activeTeam === 1 ? 'team1' : 'team2');
            localState.value.lastAction = { type: 'steal', timestamp: Date.now() };
            syncState();
        };

        const setStrikes = (count) => {
            const prev = localState.value.strikes;
            if (count !== prev) saveWithHistory();
            localState.value.strikes = count;
            if (count > prev) localState.value.lastAction = { type: 'strike', timestamp: Date.now() };
            syncState();
        };

        const addStrike = () => {
            if (localState.value.strikes < 3) setStrikes(localState.value.strikes + 1);
        };

        const toggleAnswer = (idx) => {
            if (!localState.value.currentQuestion) return;
            saveWithHistory();
            const answer = localState.value.currentQuestion.answers[idx];
            answer.revealed = !answer.revealed;
            if (answer.revealed) {
                localState.value.roundScore += answer.score;
                localState.value.lastAction = { type: 'reveal', timestamp: Date.now(), index: idx };
            } else {
                localState.value.roundScore -= answer.score;
            }
            syncState();
        };

        const revealAll = () => {
            if (!localState.value.currentQuestion) return;
            saveWithHistory();
            localState.value.currentQuestion.answers.forEach((a, i) => {
                if (!a.revealed) {
                    a.revealed = true;
                    localState.value.roundScore += a.score;
                }
            });
            localState.value.lastAction = { type: 'revealAll', timestamp: Date.now() };
            syncState();
        };

        const hideAll = () => {
            if (!localState.value.currentQuestion) return;
            saveWithHistory();
            localState.value.currentQuestion.answers.forEach(a => {
                if (a.revealed) localState.value.roundScore -= a.score;
                a.revealed = false;
            });
            syncState();
        };

        const loadQuestion = (q) => {
            saveWithHistory();
            localState.value.currentQuestion = JSON.parse(JSON.stringify(q));
            localState.value.currentQuestion.answers.forEach(a => a.revealed = false);
            localState.value.roundScore = 0;
            localState.value.strikes = 0;
            if (!localState.value.usedQuestionIds) localState.value.usedQuestionIds = [];
            if (q.id && !localState.value.usedQuestionIds.includes(q.id)) {
                localState.value.usedQuestionIds.push(q.id);
            }
            localState.value.lastAction = { type: 'newQuestion', timestamp: Date.now() };
            syncState();
        };

        const nextQuestion = () => {
            const available = (localState.value.questions || []).filter(q => !(localState.value.usedQuestionIds || []).includes(q.id));
            const pool = available.length > 0 ? available : localState.value.questions;
            if (pool.length === 0) { alert('Нет вопросов'); return; }
            const idx = Math.floor(Math.random() * pool.length);
            loadQuestion(pool[idx]);
        };

        const newRound = () => {
            saveWithHistory();
            localState.value.roundScore = 0;
            localState.value.strikes = 0;
            if (localState.value.currentQuestion) {
                localState.value.currentQuestion.answers.forEach(a => a.revealed = false);
            }
            localState.value.roundNumber = (localState.value.roundNumber || 1) + 1;
            syncState();
        };

        const changeRound = (delta) => {
            localState.value.roundNumber = Math.max(1, (localState.value.roundNumber || 1) + delta);
            syncState();
        };

        const setActiveTeam = (n) => {
            localState.value.activeTeam = localState.value.activeTeam === n ? null : n;
            syncState();
        };

        const undoAction = () => {
            const result = store.undo();
            if (result) localState.value = result;
        };

        const isUsed = (q) => (localState.value.usedQuestionIds || []).includes(q.id);

        const questionClass = (q) => {
            const active = localState.value.currentQuestion && localState.value.currentQuestion.id === q.id;
            return {
                'bg-blue-500/10 border-blue-500/30': active,
                'hover:bg-white/5 border-transparent': !active,
                'opacity-50': isUsed(q) && !active
            };
        };

        const syncSetupTeams = () => {
            store.updateSetup({
                team1Name: localState.value.team1Name,
                team2Name: localState.value.team2Name
            });
        };

        const startGame = () => {
            if (!canStart.value) return;
            store.update(localState.value);
            sync.startGame();
        };

        const resetGame = () => {
            if (confirm('Сбросить счёт и раунд? Вопросы сохранятся.')) {
                localState.value = store.reset();
            }
        };

        return {
            localState, searchQuery, quickScores, canUndo, filteredQuestions,
            isWaiting, canStart, lobbyInfo, syncSetupTeams, startGame,
            syncState, changeScore, adjustRound, transferScore, stealRound,
            setStrikes, addStrike, toggleAnswer, revealAll, hideAll,
            loadQuestion, nextQuestion, newRound, changeRound, setActiveTeam,
            undoAction, isUsed, questionClass, resetGame
        };
    }
};
