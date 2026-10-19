// =========================
// FIREBASE CONFIG
// =========================
const firebaseConfig = {
  apiKey: "AIzaSyBNgsi5flTXGJIHwjP05KDWNltw14Y5ha4",
  authDomain: "sy-login-system.firebaseapp.com",
  projectId: "sy-login-system",
  storageBucket: "sy-login-system.firebasestorage.app",
  messagingSenderId: "1009006907062",
  appId: "1:1009006907062:web:29b87b659b191ff4982017",
  measurementId: "G-V4YGJX5FJT"
};

// Inicializa Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// =========================
// APP
// =========================
document.addEventListener('DOMContentLoaded', () => {
  const authSection = document.getElementById('authSection');
  const profileSection = document.getElementById('profileSection');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const formTitle = document.getElementById('formTitle');
  const formSubtitle = document.getElementById('formSubtitle');
  const switchText = document.getElementById('switchText');

  let currentUser = null;
  let userProfile = null;

  // =========================
  // OBSERVA ESTADO DE AUTH
  // =========================
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      currentUser = user;
      await loadUserProfile(user);
      showProfile();
    } else {
      currentUser = null;
      userProfile = null;
      showAuth();
    }
  });

  // =========================
  // CARREGA PERFIL DO FIRESTORE
  // =========================
  async function loadUserProfile(user) {
    try {
      const docRef = db.collection('users').doc(user.uid);
      const doc = await docRef.get();

      if (doc.exists) {
        userProfile = doc.data();
      } else {
        // Cria perfil padrão na primeira vez
        userProfile = {
          displayName: user.displayName || user.email.split('@')[0],
          email: user.email,
          photoURL: user.photoURL || null,
          username: user.email.split('@')[0],
          preferences: {
            notifications: true,
            privateMode: false
          },
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          linkedProviders: user.providerData.map(p => p.providerId)
        };
        await docRef.set(userProfile);
      }

      updateProfileUI();
    } catch (err) {
      console.error('Erro ao carregar perfil:', err);
      showToast('Erro ao carregar perfil', 'error');
    }
  }

  // =========================
  // ATUALIZA UI DO PERFIL
  // =========================
  function updateProfileUI() {
    if (!currentUser || !userProfile) return;

    const isPrivate = userProfile.preferences?.privateMode ?? false;
    const email = userProfile.email || currentUser.email;

    document.getElementById('displayName').textContent = userProfile.displayName || 'Jogador';
    document.getElementById('infoUsername').textContent = userProfile.username || '—';

    // Modo privado: esconde o e-mail
    const profileEmailEl = document.getElementById('profileEmail');
    const infoEmailEl = document.getElementById('infoEmail');
    if (isPrivate) {
      profileEmailEl.textContent = '••••••••@••••••';
      profileEmailEl.style.opacity = '0.5';
      infoEmailEl.textContent = 'Oculto (modo privado)';
      infoEmailEl.style.opacity = '0.5';
    } else {
      profileEmailEl.textContent = email;
      profileEmailEl.style.opacity = '1';
      infoEmailEl.textContent = email;
      infoEmailEl.style.opacity = '1';
    }

    // Data de criação
    if (userProfile.createdAt && userProfile.createdAt.toDate) {
      const date = userProfile.createdAt.toDate();
      const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
      document.getElementById('infoMemberSince').textContent = `${months[date.getMonth()]} ${date.getFullYear()}`;
    } else {
      document.getElementById('infoMemberSince').textContent = 'Recém criado';
    }

    // Avatar (padrão = figura com capuz)
    const avatarImg = document.getElementById('profileAvatar');
    const avatarPlaceholder = document.getElementById('avatarPlaceholder');
    const defaultAvatar = 'assets/icons/logo-hooded.png';
    const photo = userProfile.photoURL || currentUser.photoURL || defaultAvatar;

    avatarImg.src = photo;
    avatarImg.classList.remove('hidden');
    avatarPlaceholder.classList.add('hidden');

    // Preferências
    document.getElementById('prefNotifications').checked = userProfile.preferences?.notifications ?? true;
    document.getElementById('prefPrivate').checked = isPrivate;

    // Status Google
    const isGoogle = currentUser.providerData.some(p => p.providerId === 'google.com');
    const googleStatus = document.getElementById('googleStatus');
    if (googleStatus) {
      googleStatus.textContent = isGoogle ? 'Vinculado' : 'Não vinculado';
    }
  }

  // =========================
  // MOSTRAR / ESCONDER TELAS
  // =========================
  function showProfile() {
    authSection.classList.add('hidden');
    profileSection.classList.remove('hidden');
  }

  function showAuth() {
    profileSection.classList.add('hidden');
    authSection.classList.remove('hidden');
  }

  // =========================
  // ALTERNAR LOGIN / CADASTRO
  // =========================
  let isLogin = true;

  function switchForm(toRegister) {
    isLogin = !toRegister;
    loginForm.classList.toggle('active', isLogin);
    registerForm.classList.toggle('active', !isLogin);

    if (isLogin) {
      formTitle.textContent = 'Entrar';
      formSubtitle.textContent = 'Bem-vindo de volta à experiência';
      switchText.innerHTML = 'Não tem uma conta? <a href="#" id="switchLink">Cadastre-se</a>';
    } else {
      formTitle.textContent = 'Criar Conta';
      formSubtitle.textContent = 'Junte-se à experiência agora';
      switchText.innerHTML = 'Já tem uma conta? <a href="#" id="switchLink">Entrar</a>';
    }

    const link = document.getElementById('switchLink');
    if (link) {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        switchForm(isLogin);
      });
    }
  }

  document.getElementById('switchToRegister')?.addEventListener('click', (e) => {
    e.preventDefault();
    switchForm(true);
  });

  // =========================
  // TOGGLE SENHA
  // =========================
  document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      const icon = btn.querySelector('i');
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      icon.classList.toggle('fa-eye', !isPassword);
      icon.classList.toggle('fa-eye-slash', isPassword);
    });
  });

  // =========================
  // LOGIN COM EMAIL/SENHA
  // =========================
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const btn = loginForm.querySelector('.btn-primary');
    const original = btn.innerHTML;

    if (!email || !password) {
      showToast('Preencha todos os campos', 'error');
      return;
    }

    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Entrando...';
    btn.disabled = true;

    try {
      await auth.signInWithEmailAndPassword(email, password);
      showToast('Login realizado com sucesso!', 'success');
    } catch (err) {
      console.error(err);
      let msg = 'Erro ao fazer login';
      if (err.code === 'auth/user-not-found') msg = 'Conta não encontrada';
      if (err.code === 'auth/wrong-password') msg = 'Senha incorreta';
      if (err.code === 'auth/invalid-email') msg = 'E-mail inválido';
      if (err.code === 'auth/invalid-credential') msg = 'E-mail ou senha incorretos';
      showToast(msg, 'error');
    } finally {
      btn.innerHTML = original;
      btn.disabled = false;
    }
  });

  // =========================
  // CADASTRO
  // =========================
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('regUsername').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const passwordConfirm = document.getElementById('regPasswordConfirm').value;
    const terms = document.getElementById('terms').checked;
    const btn = registerForm.querySelector('.btn-primary');
    const original = btn.innerHTML;

    if (!username || !email || !password || !passwordConfirm) {
      showToast('Preencha todos os campos', 'error');
      return;
    }
    if (password.length < 6) {
      showToast('A senha deve ter pelo menos 6 caracteres', 'error');
      return;
    }
    if (password !== passwordConfirm) {
      showToast('As senhas não coincidem', 'error');
      return;
    }
    if (!terms) {
      showToast('Você precisa aceitar os Termos de Uso', 'error');
      return;
    }

    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Criando conta...';
    btn.disabled = true;

    try {
      const cred = await auth.createUserWithEmailAndPassword(email, password);
      
      // Atualiza displayName no Auth
      await cred.user.updateProfile({ displayName: username });

      // Cria documento no Firestore
      await db.collection('users').doc(cred.user.uid).set({
        displayName: username,
        username: username,
        email: email,
        photoURL: null,
        preferences: {
          notifications: true,
          privateMode: false
        },
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        linkedProviders: ['password']
      });

      showToast('Conta criada com sucesso!', 'success');
    } catch (err) {
      console.error(err);
      let msg = 'Erro ao criar conta';
      if (err.code === 'auth/email-already-in-use') msg = 'Este e-mail já está em uso';
      if (err.code === 'auth/weak-password') msg = 'Senha muito fraca';
      if (err.code === 'auth/invalid-email') msg = 'E-mail inválido';
      showToast(msg, 'error');
    } finally {
      btn.innerHTML = original;
      btn.disabled = false;
    }
  });

  // =========================
  // LOGIN SOCIAL
  // Google = funcionando | Outros = em breve
  // =========================
  document.getElementById('loginGoogle')?.addEventListener('click', async () => {
    try {
      showToast('Abrindo Google...', 'info');
      await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
      showToast('Logado com Google!', 'success');
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/popup-closed-by-user') return;
      if (err.code === 'auth/unauthorized-domain') {
        showToast('Domínio não autorizado no Firebase (Authorized domains).', 'error');
        return;
      }
      if (err.code === 'auth/operation-not-allowed') {
        showToast('Google não está ativado no Firebase Console.', 'error');
        return;
      }
      showToast('Erro ao entrar com Google', 'error');
    }
  });

  // Botões ainda não disponíveis
  document.querySelectorAll('.social-btn.coming-soon').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.getAttribute('data-provider') || 'Este método';
      showToast(`${name} ainda não está funcionando. Em breve!`, 'info');
    });
  });



  // =========================
  // ESQUECEU A SENHA
  // =========================
  document.getElementById('forgotPassword').addEventListener('click', async (e) => {
    e.preventDefault();
    const email = document.getElementById('username').value.trim();
    
    if (!email) {
      showToast('Digite seu e-mail primeiro', 'error');
      return;
    }

    try {
      await auth.sendPasswordResetEmail(email);
      showToast('E-mail de recuperação enviado!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Erro ao enviar e-mail de recuperação', 'error');
    }
  });

  // =========================
  // EDITAR NOME
  // =========================
  const editNameBtn = document.getElementById('editNameBtn');
  const nameDisplay = document.getElementById('nameDisplay');
  const nameEdit = document.getElementById('nameEdit');
  const nameInput = document.getElementById('nameInput');
  const saveNameBtn = document.getElementById('saveNameBtn');
  const cancelNameBtn = document.getElementById('cancelNameBtn');

  editNameBtn.addEventListener('click', () => {
    nameInput.value = userProfile?.displayName || '';
    nameDisplay.classList.add('hidden');
    nameEdit.classList.remove('hidden');
    nameInput.focus();
    nameInput.select();
  });

  cancelNameBtn.addEventListener('click', () => {
    nameEdit.classList.add('hidden');
    nameDisplay.classList.remove('hidden');
  });

  saveNameBtn.addEventListener('click', async () => {
    const newName = nameInput.value.trim();
    if (!newName) {
      showToast('O nome não pode ficar vazio', 'error');
      return;
    }
    if (newName.length > 32) {
      showToast('Nome muito longo (máx. 32 caracteres)', 'error');
      return;
    }

    try {
      await currentUser.updateProfile({ displayName: newName });
      await db.collection('users').doc(currentUser.uid).update({
        displayName: newName,
        username: newName
      });

      userProfile.displayName = newName;
      userProfile.username = newName;
      document.getElementById('displayName').textContent = newName;
      document.getElementById('infoUsername').textContent = newName;

      nameEdit.classList.add('hidden');
      nameDisplay.classList.remove('hidden');
      showToast('Nome atualizado!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Erro ao atualizar nome', 'error');
    }
  });

  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveNameBtn.click();
    if (e.key === 'Escape') cancelNameBtn.click();
  });

  // =========================
  // MUDAR FOTO DE PERFIL
  // =========================
  document.getElementById('changeAvatarBtn').addEventListener('click', () => {
    document.getElementById('avatarInput').click();
  });

  document.getElementById('avatarInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Selecione uma imagem válida', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Imagem muito grande (máx. 5MB)', 'error');
      return;
    }

    try {
      showToast('Enviando foto...', 'info');

      const ref = storage.ref(`avatars/${currentUser.uid}/profile.jpg`);
      await ref.put(file);
      const url = await ref.getDownloadURL();

      await currentUser.updateProfile({ photoURL: url });
      await db.collection('users').doc(currentUser.uid).update({ photoURL: url });

      userProfile.photoURL = url;
      updateProfileUI();
      showToast('Foto de perfil atualizada!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Erro ao enviar foto. Verifique se o Storage está ativado.', 'error');
    }
  });

  // =========================
  // PREFERÊNCIAS
  // =========================
  document.getElementById('prefNotifications').addEventListener('change', async (e) => {
    try {
      await db.collection('users').doc(currentUser.uid).update({
        'preferences.notifications': e.target.checked
      });
      if (userProfile.preferences) userProfile.preferences.notifications = e.target.checked;
    } catch (err) {
      console.error(err);
    }
  });

  document.getElementById('prefPrivate').addEventListener('change', async (e) => {
    try {
      await db.collection('users').doc(currentUser.uid).update({
        'preferences.privateMode': e.target.checked
      });
      if (!userProfile.preferences) userProfile.preferences = {};
      userProfile.preferences.privateMode = e.target.checked;
      updateProfileUI(); // Atualiza a UI imediatamente (esconde/mostra e-mail)
      showToast(e.target.checked ? 'Modo privado ativado' : 'Modo privado desativado', 'info');
    } catch (err) {
      console.error(err);
      showToast('Erro ao salvar preferência', 'error');
    }
  });

  // =========================
  // LOGOUT
  // =========================
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    try {
      await auth.signOut();
      showToast('Você saiu da conta', 'info');
      loginForm.reset();
      registerForm.reset();
      switchForm(false);
    } catch (err) {
      console.error(err);
      showToast('Erro ao sair', 'error');
    }
  });

  // =========================
  // TOAST
  // =========================
  function showToast(message, type = 'info') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    Object.assign(toast.style, {
      position: 'fixed',
      bottom: '30px',
      left: '50%',
      transform: 'translateX(-50%)',
      padding: '14px 24px',
      borderRadius: '12px',
      color: 'white',
      fontWeight: '600',
      fontSize: '0.9rem',
      zIndex: '9999',
      boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
      animation: 'slideUp 0.3s ease',
      background: type === 'success' ? '#22c55e' :
                  type === 'error' ? '#ef4444' : '#3b82f6'
    });

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // Animação toast
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideUp {
      from { opacity: 0; transform: translate(-50%, 20px); }
      to { opacity: 1; transform: translate(-50%, 0); }
    }
  `;
  document.head.appendChild(style);
});
