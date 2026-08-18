const defaultState = {
    team1Name: 'Команда 1',
    team1Score: 0,
    team2Name: 'Команда 2',
    team2Score: 0,
    roundScore: 0,
    strikes: 0,
    roundNumber: 1,
    activeTeam: null,
    gameMode: 'classic',
    currentQuestion: null,
    questions: [],
    usedQuestionIds: [],
    lastAction: null,
    history: []
};

const store = {
    _remote: false,
    _initialized: false,

    getState() {
        try {
            const data = localStorage.getItem('100k1_state');
            if (data) return { ...defaultState, ...JSON.parse(data) };
        } catch (e) { console.error('Store read error:', e); }
        return { ...defaultState };
    },

    _saveLocal(state) {
        try { localStorage.setItem('100k1_state', JSON.stringify(state)); }
        catch (e) { console.error('Store save error:', e); }
    },

    _notify(state) {
        window.dispatchEvent(new CustomEvent('state-updated', { detail: state }));
    },

    saveState(state) {
        this._saveLocal(state);
        this._notify(state);
        if (!this._remote && typeof sync !== 'undefined' && sync.inLobby && sync.role === 'host') {
            sync.sendState(state);
        }
    },

    applyRemoteState(state) {
        this._remote = true;
        this._saveLocal(state);
        this._notify(state);
        this._remote = false;
    },

    update(updates) {
        const newState = { ...this.getState(), ...updates };
        this._saveLocal(newState);
        this._notify(newState);
        if (!this._remote && typeof sync !== 'undefined' && sync.inLobby) {
            if (sync.role === 'host') sync.sendState(newState);
            else if (sync.role === 'editor') sync.sendUpdate(updates);
        }
        return newState;
    },

    updateSetup(updates) {
        const newState = { ...this.getState(), ...updates };
        this._saveLocal(newState);
        this._notify(newState);
        if (!this._remote && typeof sync !== 'undefined' && sync.role === 'host' && sync.isWaiting()) {
            sync.sendSetup(updates);
        }
        return newState;
    },

    undo() {
        const state = this.getState();
        if (!state.history || state.history.length === 0) return null;
        const history = [...state.history];
        const prev = history.pop();
        const newState = { ...state, ...prev, history };
        this.saveState(newState);
        return newState;
    },

    reset() {
        const questions = this.getState().questions;
        const newState = { ...defaultState, questions, usedQuestionIds: [] };
        this.saveState(newState);
        if (typeof sync !== 'undefined' && sync.role === 'host') sync.sendReset();
        return newState;
    },

    subscribe(callback) {
        window.addEventListener('storage', (e) => {
            if (e.key === '100k1_state' && e.newValue) callback(JSON.parse(e.newValue));
        });
        window.addEventListener('state-updated', (e) => callback(e.detail));
    },

    init() {
        if (this._initialized) return;
        this._initialized = true;
        if (typeof sync !== 'undefined') {
            sync.onState((s) => this.applyRemoteState(s));
            sync.init();
        }
    }
};

store.init();
