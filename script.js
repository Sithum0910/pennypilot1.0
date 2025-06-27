import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  doc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCnodPUZZs4smAyw-9JQx1_3-iWIJzQeWU",
  authDomain: "pennypilot2-c0c07.firebaseapp.com",
  projectId: "pennypilot2-c0c07",
  storageBucket: "pennypilot2-c0c07.firebasestorage.app",
  messagingSenderId: "158582559799",
  appId: "1:158582559799:web:c756507f5ffdb1fcc89bb2",
  measurementId: "G-QRLW06V5T8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// UI elements
const googleBtn = document.getElementById('googleSignIn');
const signOutBtn = document.getElementById('signOut');
const themeToggle = document.getElementById('themeToggle');
const appDiv = document.getElementById('app');
const addBtn = document.getElementById('add');
const txList = document.getElementById('transactions');
const balanceEl = document.getElementById('balance');

let uid = null;

// Theme load & toggle
if (localStorage.getItem('theme') === 'dark') document.body.classList.add('dark');

themeToggle.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
});

// Google login
googleBtn.addEventListener('click', () => {
  const provider = new GoogleAuthProvider();
  signInWithPopup(auth, provider).catch(err => alert(err.message));
});

// Sign out
signOutBtn.addEventListener('click', () => signOut(auth));

// Auth state
onAuthStateChanged(auth, user => {
  if (user) {
    uid = user.uid;
    googleBtn.classList.add('hidden');
    appDiv.classList.remove('hidden');
    loadTransactions();
  } else {
    uid = null;
    appDiv.classList.add('hidden');
    googleBtn.classList.remove('hidden');
  }
});

// Add transaction
addBtn.addEventListener('click', async () => {
  const amount = parseFloat(document.getElementById('amount').value);
  const type = document.getElementById('type').value;
  const category = document.getElementById('category').value || 'General';
  const note = document.getElementById('note').value || '';

  if (!amount) return;

  await addDoc(collection(db, 'users', uid, 'transactions'), {
    amount,
    type,
    category,
    note,
    date: Date.now()
  });

  document.getElementById('amount').value = '';
  document.getElementById('category').value = '';
  document.getElementById('note').value = '';

  loadTransactions();
});

// Load transactions
async function loadTransactions() {
  const q = query(collection(db, 'users', uid, 'transactions'), orderBy('date', 'desc'));
  const snap = await getDocs(q);

  txList.innerHTML = '';
  let balance = 0;

  snap.forEach(docSnap => {
    const tx = docSnap.data();
    const li = document.createElement('li');
    li.textContent = `${tx.type.toUpperCase()} • ${tx.category} • ${tx.amount}`;
    li.style.borderLeftColor = tx.type === 'income' ? 'green' : 'red';

    li.addEventListener('click', async () => {
      if (confirm('Delete this transaction?')) {
        await deleteDoc(doc(db, 'users', uid, 'transactions', docSnap.id));
        loadTransactions();
      }
    });

    txList.appendChild(li);
    balance += tx.type === 'income' ? tx.amount : -tx.amount;
  });

  balanceEl.textContent = balance.toFixed(2);
}
