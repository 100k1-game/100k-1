/**
 * 5 лобби с зашифрованными ключами (base64 + reverse).
 * Расшифровка только внутри игры — plain-ключи храните в KEYS.md
 */
const LobbyKeys = {
    lobbies: [
        { id: 1, name: 'Лобби 1', enc: 'MTlCOC0yQTRGLUswMDE=' },
        { id: 2, name: 'Лобби 2', enc: 'NjVDMS0zRTdELUswMDE=' },
        { id: 3, name: 'Лобби 3', enc: 'MzJGNS00QjlBLUswMDE=' },
        { id: 4, name: 'Лобби 4', enc: 'MTdFNS04RDJDLUswMDE=' },
        { id: 5, name: 'Лобби 5', enc: 'ODRBOS0xRjZCLUswMDE=' }
    ],

    _dec(enc) {
        try {
            return atob(enc).split('').reverse().join('');
        } catch (e) {
            return null;
        }
    },

    getKey(id) {
        const lb = this.lobbies.find(l => l.id === id);
        return lb ? this._dec(lb.enc) : null;
    },

    getById(id) {
        return this.lobbies.find(l => l.id === id) || null;
    },

    validate(raw) {
        const key = raw.toUpperCase().trim().replace(/\s+/g, '');
        for (const lb of this.lobbies) {
            if (this._dec(lb.enc) === key) return lb;
        }
        return null;
    },

    getPublicList() {
        return this.lobbies.map(lb => ({
            id: lb.id,
            name: lb.name,
            status: 'waiting',
            hostOnline: false,
            displayCount: 0,
            editorCount: 0
        }));
    }
};
