/**
 * SY Login System — SDK para outros sites
 * --------------------------------------
 * Permite que outro site use o mesmo sistema de login (Firebase).
 *
 * MODO 1 — Redirect (recomendado)
 *   SyAuth.login({ redirectUrl: 'https://meusite.com/callback.html' });
 *
 * MODO 2 — Mesmo projeto Firebase no outro site
 *   Inclua Firebase + este SDK e use SyAuth.init() + listeners.
 *
 * IMPORTANTE no Firebase Console:
 *   Authentication → Settings → Authorized domains
 *   Adicione o domínio de CADA site que for usar o login.
 */
(function (global) {
  'use strict';

  const DEFAULT_LOGIN_URL = null; // definido em init, ex: https://user.github.io/repo/
  const STORAGE_KEY = 'sy_auth_session';

  const SyAuth = {
    _config: {
      loginUrl: null,
      firebaseConfig: null,
      app: null,
      auth: null,
      db: null
    },

    /**
     * Inicializa o SDK.
     * @param {Object} options
     * @param {string} options.loginUrl - URL da página de login (seu site)
     * @param {Object} [options.firebaseConfig] - config do Firebase (se o outro site também usar Firebase direto)
     */
    init(options = {}) {
      this._config.loginUrl = options.loginUrl || this._config.loginUrl;
      if (options.firebaseConfig && global.firebase) {
        this._config.firebaseConfig = options.firebaseConfig;
        if (!firebase.apps.length) {
          firebase.initializeApp(options.firebaseConfig);
        }
        this._config.auth = firebase.auth();
        this._config.db = firebase.firestore();
      }
      return this;
    },

    /**
     * Abre a tela de login do seu sistema e volta para redirectUrl após autenticar.
     * @param {Object} options
     * @param {string} options.redirectUrl - para onde voltar depois do login
     * @param {string} [options.loginUrl] - sobrescreve a URL de login
     */
    login(options = {}) {
      const redirectUrl = options.redirectUrl || global.location.href;
      const loginUrl = options.loginUrl || this._config.loginUrl;

      if (!loginUrl) {
        console.error('[SyAuth] Defina loginUrl no init() ou em login({ loginUrl })');
        return;
      }

      // Valida redirect (só http/https)
      try {
        const u = new URL(redirectUrl);
        if (u.protocol !== 'http:' && u.protocol !== 'https:') {
          console.error('[SyAuth] redirectUrl inválida');
          return;
        }
      } catch {
        console.error('[SyAuth] redirectUrl inválida');
        return;
      }

      const url = new URL(loginUrl);
      url.searchParams.set('redirect', redirectUrl);
      global.location.href = url.toString();
    },

    /**
     * Use na página de callback do outro site.
     * Lê o token da URL, valida sessão e limpa a query.
     * @returns {Promise<{user: object, token: string}|null>}
     */
    async handleCallback() {
      const params = new URLSearchParams(global.location.search);
      const token = params.get('token');
      const uid = params.get('uid');
      const error = params.get('auth_error');

      if (error) {
        console.error('[SyAuth] Erro no login:', error);
        return null;
      }

      if (!token || !uid) {
        return this.getSession();
      }

      const session = {
        token,
        uid,
        email: params.get('email') || null,
        displayName: params.get('name') || null,
        photoURL: params.get('photo') || null,
        savedAt: Date.now()
      };

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      } catch (e) {
        console.warn('[SyAuth] Não foi possível salvar sessão local', e);
      }

      // Limpa token da URL (segurança)
      params.delete('token');
      params.delete('uid');
      params.delete('email');
      params.delete('name');
      params.delete('photo');
      params.delete('auth_error');
      const clean = params.toString();
      const newUrl = global.location.pathname + (clean ? '?' + clean : '') + global.location.hash;
      global.history.replaceState({}, '', newUrl);

      return session;
    },

    /** Retorna sessão salva no localStorage (se existir). */
    getSession() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
      } catch {
        return null;
      }
    },

    /** Remove sessão local. */
    logout() {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (_) {}
      if (this._config.auth) {
        return this._config.auth.signOut();
      }
      return Promise.resolve();
    },

    /**
     * Se o outro site tiver Firebase configurado com o MESMO projeto,
     * observa o estado de auth nativo.
     */
    onAuthStateChanged(callback) {
      if (!this._config.auth) {
        console.warn('[SyAuth] Firebase Auth não inicializado neste site. Use handleCallback/getSession.');
        const session = this.getSession();
        callback(session);
        return () => {};
      }
      return this._config.auth.onAuthStateChanged(callback);
    },

    /** Obtém perfil do Firestore (requer Firebase no site cliente). */
    async getProfile(uid) {
      if (!this._config.db) {
        throw new Error('[SyAuth] Firestore não inicializado neste site');
      }
      const id = uid || this.getSession()?.uid;
      if (!id) return null;
      const doc = await this._config.db.collection('users').doc(id).get();
      return doc.exists ? doc.data() : null;
    }
  };

  global.SyAuth = SyAuth;
})(typeof window !== 'undefined' ? window : globalThis);
