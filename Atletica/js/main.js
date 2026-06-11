// ===== INICIALIZAÇÃO SEGURA DO DOM =====
document.addEventListener('DOMContentLoaded', () => {

  // Variável de controle assíncrona para rastrear o estado real do login
  let usuarioConectado = null;

  // Escuta ativa do Firebase para capturar a sessão assim que a página for aberta
  if (typeof firebase !== 'undefined') {
    firebase.auth().onAuthStateChanged((user) => {
      if (user) {
        console.log('[AAAUPA] Usuário reconhecido na sessão atual:', user.email);
        usuarioConectado = user;
      } else {
        console.warn('[AAAUPA] Nenhum usuário logado detectado na página atual.');
        usuarioConectado = null;
      }
    });
  }

  // ===== ELEMENTOS DA NAVBAR =====
  const navbar = document.querySelector('.navbar');
  const hamburger = document.querySelector('.nav-hamburger');
  const navLinks = document.querySelector('.nav-links');

  // Efeito de Scroll na Navbar
  if (navbar) {
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 40);
    });
  }

  // Menu Hambúrguer (Mobile)
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('open');
      navLinks.classList.toggle('open');
    });

    // Fecha o menu mobile ao clicar em um link
    document.querySelectorAll('.nav-links a').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('open');
        navLinks.classList.remove('open');
      });
    });
  }

  // Marcador de Página Ativa no Menu
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });

  // ===== INTERSECTION OBSERVER — FADE-IN =====
  const fadeEls = document.querySelectorAll('.fade-in');
  if (fadeEls.length > 0) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    fadeEls.forEach(el => observer.observe(el));
  }

  // ===== ANIMÇÃO DO CONTADOR DE STATS =====
  const statsSection = document.querySelector('.hero-stats');
  if (statsSection) {
    const statsObserver = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        document.querySelectorAll('.stat-number[data-count]').forEach(el => {
          animateCounter(el, parseInt(el.dataset.count));
        });
        statsObserver.disconnect();
      }
    }, { threshold: 0.5 });
    statsObserver.observe(statsSection);
  }

  // ===== MÁSCARA DE WHATSAPP AUTOMÁTICA =====
  const inputWhatsApp = document.getElementById('insc-whatsapp');
  if (inputWhatsApp) {
    inputWhatsApp.addEventListener('input', (e) => {
      let v = e.target.value.replace(/\D/g, '');
      v = v.replace(/^(\d{2})(\d)/g, "($1) $2");
      v = v.replace(/(\d{5})(\d)/, "$1-$2");
      e.target.value = v;
    });
  }

  // Máscara de Telefone Automática para o formulário de contato
  const inputTelefoneContato = document.getElementById('contato-telefone');
  if (inputTelefoneContato) {
    inputTelefoneContato.addEventListener('input', (e) => {
      let v = e.target.value.replace(/\D/g, '');
      v = v.replace(/^(\d{2})(\d)/g, "($1) $2");
      v = v.replace(/(\d{5})(\d)/, "$1-$2");
      e.target.value = v;
    });
  }

  // ===== FORMULÁRIO DE CONTATO =====
  const contatoForm = document.getElementById('form-contato');
  if (contatoForm) {
    contatoForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (!usuarioConectado) {
        showToast('Acesso restrito', 'Você precisa fazer login para enviar mensagens.', 'error');
        setTimeout(() => window.location.href = 'login-usuarios.html', 2000);
        return;
      }

      const telefone = contatoForm.querySelector('#contato-telefone').value;
      if (!validarTelefone(telefone)) {
        showToast('Telefone inválido', 'Digite o DDD e o número completo.', 'error');
        return;
      }

      const btn = contatoForm.querySelector('button[type="submit"]');
      const textoOriginal = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Enviando...';

      const dadosContato = {
        nome: contatoForm.querySelector('#nome').value,
        email: usuarioConectado.email,
        telefone: telefone,
        assunto: contatoForm.querySelector('#assunto').value,
        mensagem: contatoForm.querySelector('#mensagem').value,
        data: new Date().toISOString()
      };

      try {
        if (typeof saveContato === 'function') {
          await saveContato(dadosContato);
          showToast('Mensagem enviada!', 'Obrigado pelo contato. Responderemos em breve.', 'success');
          contatoForm.reset();
        } else {
          throw new Error('Função saveContato não mapeada no arquivo de configuração.');
        }
      } catch (err) {
        console.error(err);
        showToast('Erro ao enviar', 'Tente novamente em breve.', 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = textoOriginal;
      }
    });
  }

  // ===== FORMULÁRIO DE INSCRIÇÃO =====
  const inscricaoForm = document.getElementById('form-inscricao');
  if (inscricaoForm) {
    inscricaoForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (!usuarioConectado) {
        showToast('Acesso restrito', 'Você precisa estar logado para se inscrever. Aguarde a validação da sessão.', 'error');
        setTimeout(() => window.location.href = 'login-usuarios.html', 2000);
        return;
      }

      const whatsapp = inscricaoForm.querySelector('#insc-whatsapp').value;

      if (!validarTelefone(whatsapp)) {
        showToast('WhatsApp inválido', 'Digite o DDD e o número completo.', 'error');
        return;
      }

      const btn = inscricaoForm.querySelector('button[type="submit"]');
      const textoOriginal = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Enviando...';

      const dados = {
        nome: inscricaoForm.querySelector('#insc-nome').value,
        email: usuarioConectado.email,
        curso: inscricaoForm.querySelector('#insc-curso').value,
        periodo: inscricaoForm.querySelector('#insc-periodo').value,
        modalidade: inscricaoForm.querySelector('#insc-modalidade').value,
        whatsapp: whatsapp,
        data: new Date().toISOString(),
      };

      try {
        if (typeof saveInscricao === 'function') {
          await saveInscricao(dados);
          showToast('Inscrição enviada!', 'Entraremos em contato pelo WhatsApp.', 'success');
          inscricaoForm.reset();
        } else {
          throw new Error('Função saveInscricao não mapeada no arquivo de configuração.');
        }
      } catch (err) {
        console.error(err);
        showToast('Erro na inscrição', 'Tente novamente em breve.', 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = textoOriginal;
      }
    });
  }

  // ===== GESTÃO DE ACESSO UNIFICADA (APENAS LOGIN ATIVO) =====
  const loginForm = document.getElementById('form-login');
  if (loginForm) {
    const btnSubmit = document.getElementById('btn-submit') || loginForm.querySelector('button[type="submit"]');
    
    // Oculta elementos visuais de cadastro caso ainda existam no HTML
    const containerAlternar = document.getElementById('texto-alternar')?.parentElement;
    if (containerAlternar) containerAlternar.style.display = 'none';
    
    const groupConfirmarSenha = document.getElementById('group-confirmar-senha');
    if (groupConfirmarSenha) groupConfirmarSenha.style.display = 'none';

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const firebaseAuth = firebase.auth();
      const email = loginForm.querySelector('#login-email').value;
      const senha = loginForm.querySelector('#login-senha').value;

      if (!validarEmail(email)) {
        showToast('E-mail inválido', 'Verifique o formato digitado.', 'error');
        return;
      }

      btnSubmit.disabled = true;
      const textoOriginalBotao = btnSubmit.innerText;
      btnSubmit.innerText = 'Entrando...';

      // --- ROTA DE LOGIN DEFINITIVA ---
      try {
        await firebaseAuth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        const userCredential = await firebaseAuth.signInWithEmailAndPassword(email, senha);
        
        if (!userCredential.user.emailVerified) {
          await firebaseAuth.signOut();
          showToast('Conta inativa', 'Por favor, valide seu e-mail antes de acessar a gestão.', 'error');
          btnSubmit.disabled = false;
          btnSubmit.innerText = textoOriginalBotao;
          return;
        }

        showToast('Login realizado!', 'Bem-vindo à área de gestão.', 'success');
        btnSubmit.innerText = 'Carregando painel...';
        
        setTimeout(() => {
          window.location.href = 'gestao.html';
        }, 1500);

      } catch (err) {
        console.error(err);
        showToast('Erro no login', 'E-mail ou senha incorretos.', 'error');
        btnSubmit.disabled = false;
        btnSubmit.innerText = textoOriginalBotao;
      }
    });
  }
});
      
// ===== FUNÇÕES GLOBAIS (FORA DO DOM PARA ACESSO EXTERNO) =====
function animateCounter(el, target, duration = 1500) {
  const isPlus = el.dataset.suffix === '+';
  let start = 0;
  const step = target / (duration / 16);
  const timer = setInterval(() => {
    start += step;
    if (start >= target) {
      clearInterval(timer);
      el.textContent = target + (isPlus ? '+' : '');
    } else {
      el.textContent = Math.floor(start) + (isPlus ? '+' : '');
    }
  }, 16);
}

function showToast(title, message, type = 'default') {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    toast.innerHTML = `<div class="toast-title"></div><div class="toast-msg"></div>`;
    document.body.appendChild(toast);
  }
  toast.querySelector('.toast-title').textContent = title;
  toast.querySelector('.toast-msg').textContent = message;
  toast.className = `toast ${type}`;
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => toast.classList.remove('show'), 4000);
}

const validarEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validarTelefone = (tel) => {
  const numeros = tel.replace(/\D/g, '');
  return numeros.length >= 10 && numeros.length <= 11;
};