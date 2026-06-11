document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('form-login-usuarios');
  if (!loginForm) return;

  const subtitulo = document.getElementById('login-subtitulo');
  const groupConfirmarSenha = document.getElementById('group-confirmar-senha');
  const inputConfirmarSenha = document.getElementById('login-confirmar-senha');
  const btnSubmit = document.getElementById('btn-submit');
  const textoAlternar = document.getElementById('texto-alternar');
  const linkAlternar = document.getElementById('link-alternar');

  let modoAtual = 'login';
  const validarEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // Alternador visual (Login <-> Cadastro) sem falar em Gestão
  if (linkAlternar && groupConfirmarSenha) {
    linkAlternar.addEventListener('click', (e) => {
      e.preventDefault();
      if (modoAtual === 'login') {
        modoAtual = 'cadastro';
        if (subtitulo) subtitulo.innerText = 'Criar Nova Conta';
        groupConfirmarSenha.style.display = 'block';
        if (inputConfirmarSenha) inputConfirmarSenha.required = true;
        btnSubmit.innerText = 'Criar Minha Conta';
        if (textoAlternar) textoAlternar.innerText = 'Já possui uma conta?';
        linkAlternar.innerText = 'Fazer Login';
      } else {
        modoAtual = 'login';
        if (subtitulo) subtitulo.innerText = 'Identifique-se para Continuar';
        groupConfirmarSenha.style.display = 'none';
        if (inputConfirmarSenha) inputConfirmarSenha.required = false;
        btnSubmit.innerText = 'Entrar';
        if (textoAlternar) textoAlternar.innerText = 'Não tem uma conta?';
        linkAlternar.innerText = 'Cadastre-se';
      }
    });
  }

  // Processamento do formulário
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (typeof firebase === 'undefined') {
      alert('Erro ao conectar com o servidor. Tente novamente mais tarde.');
      return;
    }

    const firebaseAuth = firebase.auth();
    const email = loginForm.querySelector('#login-email').value;
    const senha = loginForm.querySelector('#login-senha').value;

    if (!validarEmail(email)) {
      alert('Por favor, digite um e-mail válido.');
      return;
    }

    btnSubmit.disabled = true;
    const textoOriginal = btnSubmit.innerText;
    btnSubmit.innerText = modoAtual === 'cadastro' ? 'Processando...' : 'Autenticando...';

    // CADASTRO DE ALUNO SIMPLES (Não cria trava no Firestore)
    if (modoAtual === 'cadastro') {
      const confirmarSenha = inputConfirmarSenha ? inputConfirmarSenha.value : '';
      if (senha !== confirmarSenha) {
        alert('As senhas não coincidem.');
        btnSubmit.disabled = false;
        btnSubmit.innerText = textoOriginal;
        return;
      }

      try {
        const userCredential = await firebaseAuth.createUserWithEmailAndPassword(email, senha);
        await userCredential.user.sendEmailVerification();
        
        alert('Cadastro realizado! Enviamos um link de ativação para o seu e-mail.');
        if (linkAlternar) linkAlternar.click();
        loginForm.reset();
      } catch (err) {
        console.error(err);
        alert('Erro ao cadastrar: ' + err.message);
      } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerText = 'Entrar';
      }
    } 
    // LOGIN DO ALUNO
  // LOGIN DO ALUNO COERENTE
    else {
      try {
        // 1. GARANTE QUE A SESSÃO SERÁ LEMBRADA NAS OUTRAS PÁGINAS (INDEX.HTML)
        await firebaseAuth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        
        const userCredential = await firebaseAuth.signInWithEmailAndPassword(email, senha);
        
        if (!userCredential.user.emailVerified) {
          await firebaseAuth.signOut();
          alert('Por favor, clique no link de ativação enviado para o seu e-mail antes de continuar.');
          btnSubmit.disabled = false;
          btnSubmit.innerText = textoOriginal;
          return;
        }

        btnSubmit.innerText = 'Redirecionando...';
        
        // 2. Aguarda um instante para garantir a gravação do token antes de mudar de página
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 800);

      } catch (err) {
        console.error(err);
        alert('E-mail ou senha incorretos.');
        // Só reativa o botão se houver erro, permitindo nova tentativa
        btnSubmit.disabled = false;
        btnSubmit.innerText = textoOriginal;
      }
    }
  });
});