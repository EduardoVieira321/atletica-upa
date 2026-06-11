// ===== CONTROLE DE ACESSO COM PERMISSÃO COMPLETA (AUTH GUARD) =====
document.addEventListener('DOMContentLoaded', () => {
  if (typeof firebase === 'undefined') {
    console.error('[AAAUPA] Firebase não carregado no HTML.');
    return;
  }

  const loadingScreen = document.querySelector('.auth-loading');
  const gestaoLayout = document.querySelector('.gestao-layout');

  // Monitora o estado do login de forma ativa
  firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {
      try {
        // BUSCA A SUA PERMISSÃO NO BANCO DE DADOS (FIRESTORE)
        const db = firebase.firestore();
        const userDoc = await db.collection('usuarios').doc(user.uid).get();

        // Verifica se o documento existe e se a propriedade 'autorizado' é true
        if (userDoc.exists && userDoc.data().autorizado === true) {
          console.log('[AAAUPA] Gestor autorizado:', user.email);
          
          // Libera a tela (Esconde tela de carregamento e exibe o painel)
          if (loadingScreen) loadingScreen.style.display = 'none';
          if (gestaoLayout) gestaoLayout.classList.remove('auth-guard');

          // Carrega os dados das tabelas
          carregarDadosPainel();
        } else {
          // Usuário logado no Auth, mas configurado como 'autorizado: false' no Firestore
          console.warn('[AAAUPA] Usuário não possui permissão de gestão.');
          alert('Acesso negado: Sua conta ainda não foi autorizada pela administração.');
          await firebase.auth().signOut();
          window.location.href = 'login-usuarios.html';
        }

      } catch (err) {
        console.error('Erro ao verificar permissões do usuário no Firestore:', err);
        window.location.href = 'login-usuarios.html';
      }
    } else {
      console.warn('[AAAUPA] Nenhum utilizador logado. Aguardando tolerância local...');
      
      // Dá 2 segundos de tolerância para o Live Server / Cookie processar o token.
      setTimeout(() => {
        if (!firebase.auth().currentUser) {
          console.warn('[AAAUPA] Sessão inexistente confirmada. Redirecionando para o login.');
          window.location.href = 'login-usuarios.html';
        }
      }, 2000);
    }
  });
});
// ===== LOGOUT (SAIR) =====
async function doLogout() {
  try {
    await firebase.auth().signOut();
    window.location.href = 'login.html';
  } catch (err) {
    console.error('Erro ao efetuar logout:', err);
  }
}

// ===== ALTERNAÇÃO DE PAINÉIS (SIDEBAR) =====
function switchPanel(panelName, buttonEl) {
  document.querySelectorAll('.gestao-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sidebar-link').forEach(b => b.classList.remove('active'));

  const targetPanel = document.getElementById(`panel-${panelName}`);
  if (targetPanel) targetPanel.classList.add('active');
  if (buttonEl) buttonEl.classList.add('active');
}
// ===== BUSCAR TODOS OS USUÁRIOS DO FIRESTORE =====
async function getUsuarios() {
  try {
    const db = firebase.firestore();
    const snapshot = await db.collection('usuarios').get();
    
    // Transforma o retorno em uma lista (array) de objetos JavaScript
    return snapshot.docs.map(doc => ({
      id: doc.id, // O ID do documento é o próprio UID do usuário
      ...doc.data()
    }));
  } catch (error) {
    console.error('[AAAUPA] Erro ao buscar lista de usuários:', error);
    return [];
  }
}

// ===== ALTERNAR STATUS DE AUTORIZAÇÃO (PROCESSO COMPLETO) =====
async function alternarAutorizacaoUsuario(uid, statusAtual) {
  try {
    const db = firebase.firestore();
    const novoStatus = !statusAtual; // Se era true vira false, se era false vira true

    console.log(`[AAAUPA] Mudando status do usuário ${uid} para:`, novoStatus);
    
    // Atualiza diretamente no documento do usuário usando o UID dele
    await db.collection('usuarios').doc(uid).update({
      autorizado: novoStatus
    });

    showToast('Sucesso!', `Permissão atualizada com sucesso.`, 'success');
    
    // Recarrega o painel chamando a função que está aqui embaixo
    await carregarDadosPainel();

  } catch (error) {
    console.error('[AAAUPA] Erro ao atualizar permissão:', error);
    showToast('Erro', 'Não foi possível alterar a permissão deste usuário.', 'error');
  }
}

// ===== BUSCA E RENDERIZAÇÃO DOS DADOS DO FIRESTORE =====
async function carregarDadosPainel() {
  try {
    console.log('[AAAUPA] Buscando dados do Firestore...');
    
    // Busca todas as coleções, incluindo a de usuários!
    const listaInscricoes = await getInscricoes();
    const listaContatos = await getContatos();
    const listaUsuarios = await getUsuarios(); 

    // Atualiza os Cards de Estatísticas Superiores do Dashboard
    const statInsc = document.getElementById('stat-inscricoes');
    const statMsg = document.getElementById('stat-mensagens');
    if (statInsc) statInsc.textContent = listaInscricoes.length;
    if (statMsg) statMsg.textContent = listaContatos.length;

    // Renderiza todas as Tabelas na Tela
    renderizarInscricoes(listaInscricoes);
    renderizarContatos(listaContatos);
    renderizarUsuariosGestao(listaUsuarios); 

  } catch (error) {
    console.error('Erro ao renderizar dados no painel:', error);
    const erroMsg = `<p style="padding:1rem; color:#ef4444; font-weight:bold;">Falha ao carregar dados do banco de dados. Verifique o console (F12).</p>`;
    
    if (document.getElementById('table-inscricoes-preview')) document.getElementById('table-inscricoes-preview').innerHTML = erroMsg;
    if (document.getElementById('table-inscricoes-full')) document.getElementById('table-inscricoes-full').innerHTML = erroMsg;
    if (document.getElementById('table-contatos-full')) document.getElementById('table-contatos-full').innerHTML = erroMsg;
    if (document.getElementById('table-usuarios-full')) document.getElementById('table-usuarios-full').innerHTML = erroMsg;
  }
}

// ===== GERADOR DA TABELA DE INSCRIÇÕES (CORRIGIDO COM VALIDAÇÃO SEGURA) =====
function renderizarInscricoes(dados) {
  const previewContainer = document.getElementById('table-inscricoes-preview');
  const fullContainer = document.getElementById('table-inscricoes-full');

  if (!previewContainer || !fullContainer) return;

  if (dados.length === 0) {
    const semDados = `<div class="sem-dados" style="padding:1rem; color:#64748b;">Nenhuma inscrição registrada ainda.</div>`;
    previewContainer.innerHTML = semDados;
    fullContainer.innerHTML = semDados;
    return;
  }

  // Função interna corrigida para evitar quebras se o whatsapp não existir no documento
  const criarTabelaHTML = (dadosLista) => `
    <div style="overflow-x: auto;">
      <table class="gestao-tabela">
        <thead>
          <tr>
            <th>Nome</th>
            <th>E-mail</th>
            <th>Curso</th>
            <th>Período</th>
            <th>Modalidade</th>
            <th>WhatsApp</th>
            <th>Data</th>
          </tr>
        </thead>
        <tbody>
          ${dadosLista.map(item => {
            // Garante que o valor vire string mesmo se for nulo ou indefinido antes do replace
            const whatsSeguro = item.whatsapp ? String(item.whatsapp) : '';
            const whatsLimpo = whatsSeguro.replace(/\D/g, '');
            
            const linkWhats = whatsLimpo 
              ? `<a href="https://wa.me/55${whatsLimpo}" target="_blank" style="color:#10b981; text-decoration:none; font-weight:bold;">🟩 ${whatsSeguro}</a>`
              : '<span style="color:#94a3b8;">—</span>';

            return `
              <tr>
                <td><strong>${item.nome || '—'}</strong></td>
                <td><a href="mailto:${item.email || ''}" style="color:var(--brand-primary); text-decoration:none;">${item.email || '—'}</a></td>
                <td>${item.curso || '—'}</td>
                <td>${item.periodo || '—'}</td>
                <td><span class="badge-modalidade">${item.modalidade || '—'}</span></td>
                <td>${linkWhats}</td>
                <td>${item.data ? new Date(item.data).toLocaleDateString('pt-BR') : '—'}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;

  previewContainer.innerHTML = criarTabelaHTML(dados.slice(0, 5));
  fullContainer.innerHTML = criarTabelaHTML(dados);
}

// ===== GERADOR DA TABELA DE MENSAGENS DE CONTATO (CORRIGIDO COM VALIDAÇÃO SEGURA) =====
function renderizarContatos(dados) {
  const container = document.getElementById('table-contatos-full');
  if (!container) return;

  if (dados.length === 0) {
    container.innerHTML = `<div class="sem-dados" style="padding:1rem; color:#64748b;">Nenhuma mensagem recebida ainda.</div>`;
    return;
  }

  container.innerHTML = `
    <div style="overflow-x: auto;">
      <table class="gestao-tabela">
        <thead>
          <tr>
            <th>Nome</th>
            <th>E-mail</th>
            <th>Telefone</th>
            <th>Assunto</th>
            <th>Mensagem</th>
            <th>Data</th>
          </tr>
        </thead>
        <tbody>
          ${dados.map(item => {
            // Evita quebra se o telefone for undefined no documento antigo do banco
            const telSeguro = item.telefone ? String(item.telefone) : '';
            const telLimpo = telSeguro.replace(/\D/g, '');
            
            const linkWhats = telLimpo 
              ? `<a href="https://wa.me/55${telLimpo}" target="_blank" style="color:#10b981; text-decoration:none; font-weight:bold;">🟩 ${telSeguro}</a>`
              : '<span style="color:#94a3b8;">—</span>';

            return `
              <tr>
                <td><strong>${item.nome || '—'}</strong></td>
                <td><a href="mailto:${item.email || ''}" style="color:var(--brand-primary); text-decoration:none;">${item.email || '—'}</a></td>
                <td>${linkWhats}</td>
                <td><span style="font-weight:600; color:#475569;">${item.assunto || '—'}</span></td>
                <td style="max-width: 300px; white-space: normal; word-break: break-word; font-size:0.85rem; color:#64748b;">
                  ${item.mensagem || '—'}
                </td>
                <td>${item.data ? new Date(item.data).toLocaleDateString('pt-BR') : '—'}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}
// ===== GERADOR DA TABELA DE GERENCIAMENTO DE USUÁRIOS =====
function renderizarUsuariosGestao(dados) {
  const container = document.getElementById('table-usuarios-full');
  if (!container) return; // Só executa se esse container existir no seu HTML

  if (dados.length === 0) {
    container.innerHTML = `<div class="sem-dados" style="padding:1rem; color:#64748b;">Nenhum usuário cadastrado no sistema.</div>`;
    return;
  }

  container.innerHTML = `
    <div style="overflow-x: auto;">
      <table class="gestao-tabela">
        <thead>
          <tr>
            <th>ID (UID)</th>
            <th>E-mail do Gestor</th>
            <th>Status de Acesso</th>
            <th>Ações de Controle</th>
          </tr>
        </thead>
        <tbody>
          ${dados.map(user => {
            // Define o design visual baseado no status atual do banco
            const badgeClass = user.autorizado ? 'badge-autorizado' : 'badge-bloqueado';
            const badgeTexto = user.autorizado ? 'Autorizado' : 'Pendente / Bloqueado';
            
            const btnTexto = user.autorizado ? 'Revogar Acesso' : 'Dar Acesso';
            const btnStyle = user.autorizado 
              ? 'background-color: #ef4444; color: white;' // Vermelho para revogar
              : 'background-color: #10b981; color: white;'; // Verde para aceitar

            return `
              <tr>
                <td style="font-size:0.8rem; color:#64748b; font-family: monospace;">${user.id}</td>
                <td><strong>${user.email || '—'}</strong></td>
                <td>
                  <span class="${badgeClass}" style="padding: 0.25rem 0.6rem; border-radius: 4px; font-weight: 600; font-size: 0.85rem;">
                    ${badgeTexto}
                  </span>
                </td>
                <td>
                  <button 
                    onclick="alternarAutorizacaoUsuario('${user.id}', ${user.autorizado})"
                    style="${btnStyle} border: none; padding: 0.4rem 0.8rem; border-radius: 4px; font-weight: bold; cursor: pointer; transition: 0.2s;"
                    onmouseover="this.style.opacity='0.8'" 
                    onmouseout="this.style.opacity='1'"
                  >
                    ${btnTexto}
                  </button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}