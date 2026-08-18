const EditorPanel = {
    template: `
        <div class="glass-panel w-full max-w-6xl rounded-3xl p-8 text-white relative overflow-hidden">
            <!-- decorative subtle glow -->
            <div class="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none"></div>
            
            <div class="flex justify-between items-center mb-8 relative z-10">
                <h2 class="text-3xl font-bold tracking-wide text-glow">Редактор игры</h2>
                
                <div class="flex space-x-4">
                    <label class="btn-modern bg-white/10 hover:bg-white/20 border border-white/10 cursor-pointer px-5 py-2.5 rounded-xl font-medium text-sm flex items-center transition-colors">
                        <i class="fas fa-file-import mr-2 text-blue-400"></i> Импорт .siq
                        <input type="file" accept=".siq" class="hidden" @change="importSiq">
                    </label>
                    <button @click="exportQuestions" class="btn-modern bg-white/10 hover:bg-white/20 border border-white/10 px-5 py-2.5 rounded-xl font-medium text-sm flex items-center transition-colors">
                        <i class="fas fa-file-export mr-2 text-green-400"></i> Экспорт JSON
                    </button>
                    <label class="btn-modern bg-white/10 hover:bg-white/20 border border-white/10 cursor-pointer px-5 py-2.5 rounded-xl font-medium text-sm flex items-center transition-colors">
                        <i class="fas fa-file-import mr-2 text-yellow-400"></i> Импорт JSON
                        <input type="file" accept=".json" class="hidden" @change="importJson">
                    </label>
                </div>
            </div>

            <!-- Add/Edit Question -->
            <div class="glass-card p-6 rounded-2xl mb-8 relative z-10">
                <h3 class="text-xl font-semibold mb-5 text-gray-200">
                    {{ editingIndex === -1 ? 'Добавить новый вопрос' : 'Редактировать вопрос' }}
                </h3>
                
                <div class="mb-5">
                    <label class="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">Текст вопроса</label>
                    <input v-model="currentForm.text" class="w-full bg-black/40 text-white px-4 py-3 rounded-xl border border-white/10 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 outline-none text-lg transition-all" placeholder="Например: Что чаще всего забывают дома?">
                </div>

                <div class="mb-6">
                    <label class="block text-xs font-medium text-gray-400 mb-3 uppercase tracking-wider">Ответы (макс. 8)</label>
                    
                    <transition-group name="page-transition" tag="div" class="space-y-3">
                        <div v-for="(answer, idx) in currentForm.answers" :key="'ans-'+idx" class="flex items-center space-x-3 bg-black/20 p-2 rounded-xl border border-white/5">
                            <span class="text-gray-500 w-8 text-center font-medium">{{ idx + 1 }}.</span>
                            <input v-model="answer.text" class="flex-1 bg-transparent text-white px-3 py-2 rounded-lg border border-transparent focus:border-white/10 outline-none transition-all" placeholder="Текст ответа">
                            <input v-model.number="answer.score" type="number" class="w-20 bg-black/50 text-yellow-400 px-3 py-2 rounded-lg border border-transparent focus:border-white/10 outline-none text-center font-bold" placeholder="Очки">
                            <button @click="removeAnswer(idx)" class="btn-modern text-gray-400 hover:text-red-400 px-3 py-2 rounded-lg transition-colors" title="Удалить">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </transition-group>
                    
                    <button @click="addAnswer" v-if="currentForm.answers.length < 8" class="mt-4 text-blue-400 hover:text-blue-300 text-sm font-medium flex items-center transition-colors">
                        <i class="fas fa-plus mr-2"></i> Добавить ответ
                    </button>
                </div>

                <div class="flex justify-end space-x-3">
                    <button v-if="editingIndex !== -1" @click="cancelEdit" class="btn-modern bg-white/5 hover:bg-white/10 border border-white/10 px-6 py-2.5 rounded-xl text-sm font-medium transition-colors">
                        Отмена
                    </button>
                    <button @click="saveQuestion" class="btn-modern bg-blue-600/80 hover:bg-blue-500 border border-blue-500/30 px-6 py-2.5 rounded-xl text-sm font-medium transition-colors text-glow">
                        {{ editingIndex === -1 ? 'Добавить в список' : 'Сохранить изменения' }}
                    </button>
                </div>
            </div>

            <!-- Questions List -->
            <div class="glass-card p-6 rounded-2xl relative z-10">
                <div class="flex justify-between items-center mb-5">
                    <h3 class="text-xl font-semibold text-gray-200">Список вопросов ({{ filteredQuestions.length }})</h3>
                    <input v-model="searchQuery" placeholder="Поиск..." class="bg-black/40 px-3 py-1.5 rounded-lg border border-white/10 text-sm outline-none focus:border-blue-500/50 w-48">
                </div>
                
                <div v-if="questions.length === 0" class="text-center py-10 text-gray-500 text-sm border border-dashed border-white/10 rounded-xl">
                    Список вопросов пуст. Добавьте новый вопрос или импортируйте из файла.
                </div>
                
                <div v-else class="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                    <transition-group name="page-transition">
                        <div v-for="(q, idx) in filteredQuestions" :key="q.id || idx" class="bg-black/30 p-4 rounded-xl border border-white/5 flex justify-between items-start hover:border-white/20 transition-colors group">
                            <div class="flex-1">
                                <h4 class="font-medium text-lg text-gray-100 mb-3">{{ q.text }}</h4>
                                <div class="flex flex-wrap gap-2 text-xs">
                                    <div v-for="(a, aIdx) in q.answers" :key="aIdx" class="bg-white/5 border border-white/5 px-2.5 py-1.5 rounded-lg flex items-center space-x-2">
                                        <span class="text-gray-300 max-w-[120px] truncate">{{ a.text }}</span>
                                        <span class="text-yellow-400 font-bold">{{ a.score }}</span>
                                    </div>
                                </div>
                            </div>
                            <div class="flex space-x-2 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button @click="duplicateQuestion(q)" class="btn-modern bg-white/10 hover:bg-white/20 p-2 rounded-lg text-gray-300 transition-colors" title="Дублировать">
                                    <i class="fas fa-copy"></i>
                                </button>
                                <button @click="editQuestionById(q.id)" class="btn-modern bg-white/10 hover:bg-white/20 p-2 rounded-lg text-gray-300 transition-colors" title="Редактировать">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button @click="deleteQuestionById(q.id)" class="btn-modern bg-red-500/20 hover:bg-red-500/40 p-2 rounded-lg text-red-300 transition-colors" title="Удалить">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </transition-group>
                </div>
            </div>
            
            <!-- Loading overlay -->
            <div v-if="isLoading" class="absolute inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 rounded-3xl">
                <div class="flex flex-col items-center">
                    <div class="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                    <span class="text-blue-400 font-medium tracking-wider">Обработка файла...</span>
                </div>
            </div>
        </div>
    `,
    setup() {
        const { ref, computed, onMounted } = Vue;
        
        const questions = ref([]);
        const editingIndex = ref(-1);
        const isLoading = ref(false);
        const searchQuery = ref('');

        const filteredQuestions = computed(() => {
            if (!searchQuery.value.trim()) return questions.value;
            const s = searchQuery.value.toLowerCase();
            return questions.value.filter(q => q.text.toLowerCase().includes(s));
        });
        
        const getEmptyForm = () => ({
            text: '',
            answers: [
                { text: '', score: 0 },
                { text: '', score: 0 },
                { text: '', score: 0 }
            ]
        });
        
        const currentForm = ref(getEmptyForm());

        onMounted(() => {
            questions.value = store.getState().questions || [];
            store.subscribe((state) => {
                if (state.questions) questions.value = state.questions;
            });
        });

        const syncWithStore = () => {
            store.update({ questions: questions.value });
        };

        const addAnswer = () => {
            currentForm.value.answers.push({ text: '', score: 0 });
        };

        const removeAnswer = (idx) => {
            currentForm.value.answers.splice(idx, 1);
        };

        const saveQuestion = () => {
            if (!currentForm.value.text.trim()) {
                alert('Введите текст вопроса');
                return;
            }
            
            // Filter empty answers
            const validAnswers = currentForm.value.answers.filter(a => a.text.trim());
            if (validAnswers.length === 0) {
                alert('Добавьте хотя бы один ответ');
                return;
            }
            
            const questionData = {
                id: Date.now().toString(),
                text: currentForm.value.text,
                answers: validAnswers.sort((a, b) => b.score - a.score) // Sort by score descending
            };
            
            if (editingIndex.value === -1) {
                questions.value.push(questionData);
            } else {
                questionData.id = questions.value[editingIndex.value].id;
                questions.value[editingIndex.value] = questionData;
                editingIndex.value = -1;
            }
            
            currentForm.value = getEmptyForm();
            syncWithStore();
        };

        const editQuestionById = (id) => {
            const idx = questions.value.findIndex(q => q.id === id);
            if (idx !== -1) editQuestion(idx);
        };

        const deleteQuestionById = (id) => {
            const idx = questions.value.findIndex(q => q.id === id);
            if (idx !== -1) deleteQuestion(idx);
        };

        const duplicateQuestion = (q) => {
            questions.value.push({
                ...JSON.parse(JSON.stringify(q)),
                id: Date.now().toString(),
                text: q.text + ' (копия)'
            });
            syncWithStore();
        };

        const editQuestion = (idx) => {
            editingIndex.value = idx;
            // Deep copy
            currentForm.value = JSON.parse(JSON.stringify(questions.value[idx]));
        };

        const cancelEdit = () => {
            editingIndex.value = -1;
            currentForm.value = getEmptyForm();
        };

        const deleteQuestion = (idx) => {
            if (confirm('Удалить этот вопрос?')) {
                questions.value.splice(idx, 1);
                syncWithStore();
                if (editingIndex.value === idx) cancelEdit();
            }
        };

        const exportQuestions = () => {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(questions.value, null, 2));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", "100k1_questions.json");
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
        };

        const importJson = (event) => {
            const file = event.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const imported = JSON.parse(e.target.result);
                    if (Array.isArray(imported)) {
                        questions.value = [...questions.value, ...imported];
                        syncWithStore();
                        alert('Вопросы успешно импортированы!');
                    } else {
                        alert('Неверный формат файла JSON');
                    }
                } catch (err) {
                    alert('Ошибка чтения файла: ' + err.message);
                }
            };
            reader.readAsText(file);
            event.target.value = ''; // reset
        };

        const importSiq = async (event) => {
            const file = event.target.files[0];
            if (!file) return;
            
            isLoading.value = true;
            try {
                // Read as array buffer for JSZip
                const arrayBuffer = await file.arrayBuffer();
                const zip = await JSZip.loadAsync(arrayBuffer);
                
                // SIQ is a zip file, contains content.xml
                const contentXml = await zip.file("content.xml").async("string");
                
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(contentXml, "text/xml");
                
                // For SIGame to 100k1 logic:
                // Theme = Question
                // Questions in theme = Answers for that 100k1 Question
                // Question price = Answer score
                
                const themes = xmlDoc.getElementsByTagNameNS('*', 'theme');
                if (themes.length === 0) {
                    // Fallback to regular getElementsByTagName just in case
                    const fallbackThemes = xmlDoc.getElementsByTagName('theme');
                    if (fallbackThemes.length > 0) {
                        Array.from(fallbackThemes).forEach(t => Array.prototype.push.call(themes, t));
                    }
                }
                const newQuestions = [];
                
                const themesList = themes.length > 0 ? themes : xmlDoc.getElementsByTagName('theme');
                for (let i = 0; i < themesList.length; i++) {
                    const theme = themesList[i];
                    const themeName = theme.getAttribute('name');
                    
                    let qElements = theme.getElementsByTagNameNS('*', 'question');
                    if (qElements.length === 0) qElements = theme.getElementsByTagName('question');
                    
                    const answers = [];
                    
                    for (let j = 0; j < qElements.length; j++) {
                        const q = qElements[j];
                        const price = parseInt(q.getAttribute('price')) || 0;
                        
                        let text = '';
                        
                        let rightEl = q.getElementsByTagNameNS('*', 'right')[0];
                        if (!rightEl) rightEl = q.getElementsByTagName('right')[0];
                        
                        if (rightEl) {
                            let answerEl = rightEl.getElementsByTagNameNS('*', 'answer')[0];
                            if (!answerEl) answerEl = rightEl.getElementsByTagName('answer')[0];
                            if (answerEl) {
                                text = answerEl.textContent;
                            }
                        }
                        
                        if (!text) {
                            let atomEl = q.getElementsByTagNameNS('*', 'atom')[0];
                            if (!atomEl) atomEl = q.getElementsByTagName('atom')[0];
                            if (atomEl) {
                                text = atomEl.textContent;
                            }
                        }
                        
                        if (text) {
                            answers.push({
                                text: text.trim(),
                                score: price
                            });
                        }
                    }
                    
                    if (themeName && answers.length > 0) {
                        newQuestions.push({
                            id: Date.now().toString() + i,
                            text: themeName,
                            answers: answers.sort((a, b) => b.score - a.score).slice(0, 8) // Max 8 answers
                        });
                    }
                }
                
                if (newQuestions.length > 0) {
                    questions.value = [...questions.value, ...newQuestions];
                    syncWithStore();
                    alert('Успешно импортировано ' + newQuestions.length + ' вопросов!');
                } else {
                    alert('Не удалось найти подходящие данные в файле .siq. Убедитесь, что темы содержат вопросы с ответами и стоимостью.');
                }
                
            } catch (err) {
                console.error(err);
                alert('Ошибка при импорте .siq файла: ' + err.message);
            } finally {
                isLoading.value = false;
                event.target.value = ''; // reset
            }
        };

        return {
            questions,
            editingIndex,
            currentForm,
            isLoading,
            searchQuery,
            filteredQuestions,
            addAnswer,
            removeAnswer,
            saveQuestion,
            editQuestion,
            editQuestionById,
            cancelEdit,
            deleteQuestion,
            deleteQuestionById,
            duplicateQuestion,
            exportQuestions,
            importJson,
            importSiq
        };
    }
};