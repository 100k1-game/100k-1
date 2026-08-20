/** P2P-синхронизация через PeerJS */
const PEER_SERVER = {
    host: '0.peerjs.com',
    port: 443,
    path: '/',
    secure: true,
    pingInterval: 5000
};

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
    _retryTimer: null,

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

    _applyState(state) {
        if (!state) return;
        this.gameState = state;
        this.stateListeners.forEach(cb => cb(state));
    },

    _updateCounts() {
        if (!this.lobby) return;
        let display = 0, editor = 0;
        this.connections.forEach(conn => {
            const r = conn.metadata?.role;
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

    /** Только вход по ключу (не по номеру лобби) */
    join(key, role) {
        if (typeof key === 'number') {
            this._error('Используйте ключ доступа, а не номер лобби');
            return;
        }

        const lobby = LobbyKeys.validate(key);
        if (!lobby) {
            this._error('Неверный ключ доступа');
            return;
        }

        this.role = role;
        this.lobbyId = lobby.id;
        this.lobbyKey = LobbyKeys.getKey(lobby.id);
        this.saveKey(this.lobbyKey);
        localStorage.setItem('100k1_role', role);

        if (role === 'host') this._joinHost(lobby);
        else this._joinClient(lobby, role);
    },

    _joinHost(lobby) {
        this._clearRetry();
        if (this.peer) this.peer.destroy();

        this.peer = new Peer(this._hostId(lobby.id), PEER_SERVER);
        this.gameState = typeof store !== 'undefined' ? store.getState() : {};

        this.peer.on('open', () => {
            this.connected = true;
            this.inLobby = true;
            this.lobby = this._makeLobby(lobby, 'waiting');
            this._emitJoined();
        });

        this.peer.on('disconnected', () => {
            if (this.peer && !this.peer.destroyed) {
                this.peer.reconnect();
            }
        });

        this.peer.on('connection', (conn) => {
            conn.on('open', () => {
                if (!this.connections.includes(conn)) this.connections.push(conn);
                this._updateCounts();
                conn.send({
                    type: 'joined',
                    lobby: this.lobby,
                    state: this.gameState,
                    key: this.lobbyKey
                });
            });
            conn.on('close', () => {
                this.connections = this.connections.filter(c => c !== conn);
                this._updateCounts();
            });
            conn.on('data', (data) => {
                if (data.type === 'editorUpdate' && data.updates?.questions) {
                    this.gameState = { ...this.gameState, questions: data.updates.questions };
                    this._broadcast({ type: 'state', state: this.gameState });
                }
            });
        });

        this.peer.on('error', (err) => {
            if (err.type === 'unavailable-id') {
                this._error('Этот ключ уже используется другим ведущим');
            } else if (err.type === 'network' || err.message.includes('Lost connection')) {
                console.warn('PeerJS network error:', err);
                // Игнорируем показ ошибки, так как работает авто-реконнект
            } else {
                this._error('Ошибка: ' + (err.message || err.type));
            }
        });
    },

    _joinClient(lobby, role) {
        this._clearRetry();
        if (this.peer) this.peer.destroy();

        this.peer = new Peer(undefined, PEER_SERVER);
        this.peer.on('open', () => this._connectToHost(lobby, role, 0));
        
        this.peer.on('disconnected', () => {
            if (this.peer && !this.peer.destroyed) {
                this.peer.reconnect();
            }
        });

        this.peer.on('error', (err) => {
            if (err.type === 'network' || (err.message && err.message.includes('Lost connection'))) {
                console.warn('PeerJS network error:', err);
            } else {
                this._error('Ошибка сети. Обновите страницу.');
            }
        });
    },

    _connectToHost(lobby, role, attempt) {
        const max = 30;
        const hostId = this._hostId(lobby.id);

        if (this.hostConn) {
            try { this.hostConn.close(); } catch (e) {}
        }

        this.hostConn = this.peer.connect(hostId, { metadata: { role }, reliable: true });
        let settled = false;

        const retryOrFail = () => {
            if (settled) return;
            settled = true;
            if (attempt < max) {
                this._retryTimer = setTimeout(() => this._connectToHost(lobby, role, attempt + 1), 1200);
            } else {
                this._error('Ведущий не найден. Сначала откройте панель ведущего с тем же ключом.');
            }
        };

        const connectTimeout = setTimeout(() => {
            if (!this.inLobby && !settled) retryOrFail();
        }, 4000);

        this.hostConn.on('open', () => {
            settled = true;
            clearTimeout(connectTimeout);
            this.connected = true;
            this._clearRetry();
        });

        this.hostConn.on('data', (data) => this._handleMessage(data));

        this.hostConn.on('close', () => {
            clearTimeout(connectTimeout);
            this.connected = false;
            if (this.inLobby && this.lobby?.status === 'playing') return;
            this.inLobby = false;
            this._notifyStatus('disconnected');
        });

        this.hostConn.on('error', () => {
            clearTimeout(connectTimeout);
            retryOrFail();
        });
    },

    _clearRetry() {
        if (this._retryTimer) {
            clearTimeout(this._retryTimer);
            this._retryTimer = null;
        }
    },

    _emitJoined() {
        this._notifyLobby(this.lobby);
        this._applyState(this.gameState);
        this._notifyStatus('joined');
        window.dispatchEvent(new CustomEvent('lobby-key', { detail: this.lobbyKey }));
    },

    _handleMessage(msg) {
        switch (msg.type) {
            case 'joined':
                this.inLobby = true;
                this.connected = true;
                this.lobby = msg.lobby;
                if (msg.key) { this.lobbyKey = msg.key; this.saveKey(msg.key); }
                if (msg.state) this._applyState(msg.state);
                this._notifyStatus('joined');
                break;
            case 'lobby':
                this.lobby = msg.lobby;
                this._notifyLobby(msg.lobby);
                break;
            case 'state':
                this._applyState(msg.state);
                break;
            case 'started':
                this.inLobby = true;
                this.lobby = msg.lobby;
                if (msg.state) this._applyState(msg.state);
                this._notifyLobby(msg.lobby);
                this._notifyStatus('playing');
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
        this.gameState = { ...(this.gameState || {}), ...updates };
        this._broadcast({ type: 'state', state: this.gameState });
        this.lobby = this._makeLobby(LobbyKeys.getById(this.lobbyId), this.lobby?.status || 'waiting');
        this._notifyLobby(this.lobby);
    },

    startGame() {
        if (this.role !== 'host') return;

        if (typeof store !== 'undefined') {
            this.gameState = store.getState();
        }

        this.lobby = this._makeLobby(LobbyKeys.getById(this.lobbyId), 'playing');
        this.gameState = {
            ...this.gameState,
            lastAction: { type: 'gameStart', timestamp: Date.now() }
        };

        const payload = { type: 'started', lobby: this.lobby, state: this.gameState };
        this._broadcast(payload);
        this._broadcast({ type: 'state', state: this.gameState });
        this._applyState(this.gameState);
        this._notifyLobby(this.lobby);
        window.dispatchEvent(new CustomEvent('game-started', { detail: payload }));
    },

    sendState(state) {
        if (this.role !== 'host') return;
        this.gameState = state;
        this._broadcast({ type: 'state', state });
    },

    sendUpdate(updates) {
        if (this.role === 'host') {
            this.gameState = { ...(this.gameState || {}), ...updates };
            this._broadcast({ type: 'state', state: this.gameState });
        } else if (this.role === 'editor' && this.hostConn?.open) {
            this.hostConn.send({ type: 'editorUpdate', updates });
        }
    },

    sendReset() {
        if (this.role !== 'host') return;
        const questions = this.gameState?.questions || [];
        this.gameState = {
            ...(typeof store !== 'undefined' ? store.getState() : {}),
            questions,
            usedQuestionIds: [],
            team1Score: 0, team2Score: 0, roundScore: 0, strikes: 0,
            currentQuestion: null, roundNumber: 1, lastAction: null, history: []
        };
        this.lobby = this._makeLobby(LobbyKeys.getById(this.lobbyId), 'waiting');
        this._broadcast({ type: 'state', state: this.gameState });
        this._broadcast({ type: 'lobby', lobby: this.lobby });
    },

    formatKey(raw) {
        return raw.toUpperCase().trim().replace(/\s+/g, '');
    },

    saveKey(key) {
        localStorage.setItem('100k1_key', key);
        sessionStorage.setItem('100k1_key_ok', key);
    },

    getSavedKey() {
        return localStorage.getItem('100k1_key') || '';
    },

    isKeyOk() {
        const k = sessionStorage.getItem('100k1_key_ok') || this.getSavedKey();
        return k && LobbyKeys.validate(k);
    },

    getShareLink(page, key) {
        return APP_CONFIG.pageUrl(page || 'game.html', key ? { key } : null);
    },

    isPlaying() {
        return this.inLobby && this.lobby && this.lobby.status === 'playing';
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

    init() {}
};
