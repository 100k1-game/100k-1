/** P2P-синхронизация через PeerJS — работает на GitHub Pages без сервера */
const sync = {
    peer: null,
    connections: [],
    hostConn: null,
    connected: false,
    inLobby: false,
    role: null,
    lobby: null,
    lobbyKey: null,
    lobbyId: null,
    gameState: null,

    stateListeners: [],
    lobbyListeners: [],
    statusListeners: [],
    errorListeners: [],

    _hostId(lobbyId) {
        return '100k1-lobby' + lobbyId + '-host';
    },

    _makeLobby(lobby, status, counts) {
        const c = counts || { display: 0, editor: 0 };
        const gs = this.gameState || {};
        return {
            id: lobby.id,
            name: lobby.name,
            status: status || 'waiting',
            hostOnline: this.role === 'host',
            displayCount: c.display,
            editorCount: c.editor,
            team1Name: gs.team1Name,
            team2Name: gs.team2Name,
            totalClients: 1 + c.display + c.editor
        };
    },

    _updateCounts() {
        if (!this.lobby) return;
        let display = 0, editor = 0;
        this.connections.forEach(conn => {
            const r = conn.metadata?.role || conn.metadata?.metadata?.role;
            if (r === 'display') display++;
            else if (r === 'editor') editor++;
        });
        this.lobby = this._makeLobby(
            LobbyKeys.getById(this.lobbyId),
            this.lobby.status,
            { display, editor }
        );
        this._notifyLobby(this.lobby);
    },

    join(keyOrLobbyId, role) {
        this.role = role;
        localStorage.setItem('100k1_role', role);

        let lobby;
        if (typeof keyOrLobbyId === 'number') {
            lobby = LobbyKeys.getById(keyOrLobbyId);
            if (lobby) this.lobbyKey = LobbyKeys.getKey(lobby.id);
        } else {
            lobby = LobbyKeys.validate(keyOrLobbyId);
            if (lobby) this.lobbyKey = LobbyKeys.getKey(lobby.id);
        }

        if (!lobby) {
            this._error('Неверный ключ. Проверьте KEYS.md');
            return;
        }

        this.lobbyId = lobby.id;
        this.saveKey(this.lobbyKey);

        if (role === 'host') this._joinHost(lobby);
        else this._joinClient(lobby, role);
    },

    _joinHost(lobby) {
        if (this.peer) this.peer.destroy();

        this.peer = new Peer(this._hostId(lobby.id));
        this.gameState = typeof store !== 'undefined' ? store.getState() : {};

        this.peer.on('open', () => {
            this.connected = true;
            this.inLobby = true;
            this.lobby = this._makeLobby(lobby, 'waiting');
            this._emitJoined();
        });

        this.peer.on('connection', (conn) => {
            conn.on('open', () => {
                this.connections.push(conn);
                this._updateCounts();
                conn.send({ type: 'joined', role: 'client', lobby: this.lobby, state: this.gameState, key: this.lobbyKey });
            });
            conn.on('close', () => {
                this.connections = this.connections.filter(c => c !== conn);
                this._updateCounts();
            });
            conn.on('data', (data) => {
                if (data.type === 'ping') conn.send({ type: 'pong' });
                if (data.type === 'editorUpdate' && data.updates?.questions) {
                    this.gameState = { ...this.gameState, questions: data.updates.questions };
                    this._broadcast({ type: 'state', state: this.gameState });
                }
            });
        });

        this.peer.on('error', (err) => {
            if (err.type === 'unavailable-id') {
                this._error('Лобби занято — другой ведущий уже использует этот ключ');
            } else {
                this._error('Ошибка подключения: ' + (err.message || err.type));
            }
        });
    },

    _joinClient(lobby, role) {
        if (this.peer) this.peer.destroy();

        this.peer = new Peer();

        this.peer.on('open', () => {
            this.hostConn = this.peer.connect(this._hostId(lobby.id), { metadata: { role } });

            this.hostConn.on('open', () => {
                this.connected = true;
            });

            this.hostConn.on('data', (data) => this._handleMessage(data));

            this.hostConn.on('close', () => {
                this.connected = false;
                this.inLobby = false;
                this._notifyStatus('disconnected');
            });

            this.hostConn.on('error', () => {
                this._error('Ведущий не найден. Убедитесь, что он уже в лобби.');
            });
        });

        this.peer.on('error', () => {
            this._error('Не удалось подключиться к лобби');
        });
    },

    _emitJoined() {
        this._notifyLobby(this.lobby);
        if (this.gameState) this.stateListeners.forEach(cb => cb(this.gameState));
        this._notifyStatus('joined');
        window.dispatchEvent(new CustomEvent('lobby-key', { detail: this.lobbyKey }));
    },

    _handleMessage(msg) {
        switch (msg.type) {
            case 'joined':
                this.inLobby = true;
                this.lobby = msg.lobby;
                if (msg.key) { this.lobbyKey = msg.key; this.saveKey(msg.key); }
                if (msg.state) this.stateListeners.forEach(cb => cb(msg.state));
                this._notifyStatus('joined');
                break;
            case 'lobby':
                this.lobby = msg.lobby;
                this._notifyLobby(msg.lobby);
                break;
            case 'state':
                this.stateListeners.forEach(cb => cb(msg.state));
                break;
            case 'started':
                this.lobby = msg.lobby;
                this._notifyLobby(msg.lobby);
                if (msg.state) this.stateListeners.forEach(cb => cb(msg.state));
                window.dispatchEvent(new CustomEvent('game-started', { detail: msg }));
                break;
            case 'error':
                this._error(msg.message);
                break;
        }
    },

    _broadcast(msg) {
        this.connections.forEach(c => { if (c.open) c.send(msg); });
    },

    sendSetup(updates) {
        if (this.role !== 'host') return;
        this.gameState = { ...this.gameState, ...updates };
        this._broadcast({ type: 'state', state: this.gameState });
        this.lobby = this._makeLobby(LobbyKeys.getById(this.lobbyId), this.lobby?.status || 'waiting');
        this._notifyLobby(this.lobby);
    },

    startGame() {
        if (this.role !== 'host') return;
        this.lobby = this._makeLobby(LobbyKeys.getById(this.lobbyId), 'playing');
        this.gameState = { ...this.gameState, lastAction: { type: 'gameStart', timestamp: Date.now() } };
        this._broadcast({ type: 'started', lobby: this.lobby, state: this.gameState });
        window.dispatchEvent(new CustomEvent('game-started', { detail: { lobby: this.lobby, state: this.gameState } }));
    },

    sendState(state) {
        if (this.role !== 'host') return;
        this.gameState = state;
        this._broadcast({ type: 'state', state });
    },

    sendUpdate(updates) {
        if (this.role === 'host') {
            this.gameState = { ...this.gameState, ...updates };
            this._broadcast({ type: 'state', state: this.gameState });
        } else if (this.role === 'editor' && this.hostConn?.open) {
            this.hostConn.send({ type: 'editorUpdate', updates });
        }
    },

    sendReset() {
        if (this.role !== 'host') return;
        const questions = this.gameState?.questions || [];
        this.gameState = { ...store.getState(), questions, usedQuestionIds: [], team1Score: 0, team2Score: 0, roundScore: 0, strikes: 0, currentQuestion: null, roundNumber: 1, lastAction: null, history: [] };
        this.lobby = this._makeLobby(LobbyKeys.getById(this.lobbyId), 'waiting');
        this._broadcast({ type: 'state', state: this.gameState });
        this._broadcast({ type: 'lobby', lobby: this.lobby });
    },

    formatKey(raw) {
        return raw.toUpperCase().trim().replace(/\s+/g, '');
    },

    saveKey(key) {
        localStorage.setItem('100k1_key', key);
    },

    getSavedKey() {
        return localStorage.getItem('100k1_key') || '';
    },

    getShareLink(page, key) {
        return APP_CONFIG.pageUrl(page || 'game.html', key ? { key } : null);
    },

    isPlaying() {
        return this.lobby && this.lobby.status === 'playing';
    },

    isWaiting() {
        return this.inLobby && this.lobby && this.lobby.status === 'waiting';
    },

    onState(cb) { this.stateListeners.push(cb); },
    onLobby(cb) { this.lobbyListeners.push(cb); },
    onStatus(cb) { this.statusListeners.push(cb); },
    onError(cb) { this.errorListeners.push(cb); },

    _error(msg) {
        this.errorListeners.forEach(cb => cb(msg));
        window.dispatchEvent(new CustomEvent('sync-error', { detail: msg }));
    },

    _notifyStatus(status) {
        window.dispatchEvent(new CustomEvent('sync-status', {
            detail: { status, connected: this.connected, inLobby: this.inLobby, lobby: this.lobby, role: this.role }
        }));
        this.statusListeners.forEach(cb => cb({ connected: this.connected, inLobby: this.inLobby, lobby: this.lobby }));
    },

    _notifyLobby(lobby) {
        this.lobbyListeners.forEach(cb => cb(lobby));
        window.dispatchEvent(new CustomEvent('lobby-updated', { detail: lobby }));
    },

    init() {
        window.dispatchEvent(new CustomEvent('lobbies-list', { detail: LobbyKeys.getPublicList() }));
    }
};
