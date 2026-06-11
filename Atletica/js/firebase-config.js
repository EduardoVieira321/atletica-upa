// 1. CONFIGURAÇÕES
const firebaseConfig = {
  apiKey: "AIzaSyBkszNTXtdArT9Oi7S3CIMqHevecgBGSPc",
  authDomain: "atletica-upa-32124.firebaseapp.com",
  projectId: "atletica-upa-32124",
  storageBucket: "tletica-upa-32124.firebasestorage.app",
  messagingSenderId: "99901278770",
  appId: "1:99901278770:web:35b4713a1a11afe2ec8a2b",
  measurementId: "G-R012PS8932"
};
// ===== 2. INICIALIZAÇÃO BLINDADA =====
// Verifica se o Firebase já não foi inicializado para evitar erros no console
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log('[AAAUPA] Firebase inicializado globalmente.');
}

// Funções utilitárias para garantir que sempre pegamos a instância ativa do Firebase
const getDb = () => firebase.firestore();
const getAuth = () => firebase.auth();

// ===== 3. FUNÇÕES DE AUTENTICAÇÃO =====
async function loginUser(email, senha) {
  return await getAuth().signInWithEmailAndPassword(email, senha);
}

async function logoutUser() {
  return await getAuth().signOut();
}

function onAuthChange(callback) {
  getAuth().onAuthStateChanged(callback);
}

// ===== 4. FUNÇÕES DO FIRESTORE (BANCO DE DADOS) =====
async function saveContato(dados) {
  return await getDb().collection('contatos').add(dados);
}

async function saveInscricao(dados) {
  return await getDb().collection('inscricoes').add(dados);
}

async function getInscricoes() {
  const snap = await getDb().collection('inscricoes').orderBy('data', 'desc').get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function getContatos() {
  const snap = await getDb().collection('contatos').orderBy('data', 'desc').get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}