import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import {
  getAuth,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
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

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCnodPUZZs4smAyw-9JQx1_3-iWIJzQeWU",
  authDomain: "pennypilot2-c0c07.firebaseapp.com",
  projectId: "pennypilot2-c0c07",
  storageBucket: "pennypilot2-c0c07.appspot.com",
  messagingSenderId: "158582559799",
  appId: "1:158582559799:web:c756507f5ffdb1fcc89bb2",
  measurementId: "G-QRLW06V5T8"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// UI elements
const googleBtn = document.getElementById('googleSignIn');
const skipBtn = document.getElementById('skipSignIn');
const signOutBtn = document.getElementById('signOut');
const themeToggle = document.getElementById('themeToggle');
const appDiv = document.getElementById('app');
const addBtn = document.getElementById('add');
const txList = document.getElementById('transactions');
const balanceEl = document.getElementById('balance');
const csvBtn = document.getElementById('csvBtn');
const chartCanvas = document.getElementById('chart');

let uid = null;
let transactionData = [];
let chartInstance = null;
let usingLocal = false;

// Load theme preference
if (localStorage.getItem('theme') === 'dark') {
  document.body.classList.add('dark');
}

themeToggle.onclick = () => {
  document.body.classList.toggle('dark');
  localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
};

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

googleBtn.onclick = () => {
  signInWithPopup(auth, provider).catch(err => {
    if (err.code === 'auth/popup-blocked' || err.code === 'auth/operation-not-supported-in-this-environment') {
      signInWithRedirect(auth, provider);
    } else {
      alert(err.message);
    }
  });
};

getRedirectResult(auth).catch(err => console.warn(err));

// When user clicks "Use without signing in"
skipBtn.onclick = () => {
  usingLocal = true;
  uid = null;
  googleBtn.classList.add('hidden');
  skipBtn.classList.add('hidden');
  signOutBtn.classList.remove('hidden');
  appDiv.classList.remove('hidden');
  loadTransactions();
};

// Sign out handler
signOutBtn.onclick = async () => {
  if (usingLocal) {
    // Clear local session data
    usingLocal = false;
    clearLocalStorage();
    appDiv.classList.add('hidden');
    googleBtn.classList.remove('hidden');
    skipBtn.classList.remove('hidden');
    signOutBtn.classList.add('hidden');
  } else {
    await signOut(auth);
  }
};

// Auth state listener
onAuthStateChanged(auth, user => {
  if (user) {
    uid = user.uid;
    usingLocal = false;
    googleBtn.classList.add('hidden');
    skipBtn.classList.add('hidden');
    signOutBtn.classList.remove('hidden');
    appDiv.classList.remove('hidden');
    loadTransactions();
  } else if (!usingLocal) {
    uid = null;
    googleBtn.classList.remove('hidden');
    skipBtn.classList.remove('hidden');
    signOutBtn.classList.add('hidden');
    appDiv.classList.add('hidden');
  }
});

// Add new transaction
addBtn.onclick = async () => {
  const amount = parseFloat(document.getElementById('amount').value);
  const type = document.getElementById('type').value;
  const category = document.getElementById('category').value || 'General';
  const note = document.getElementById('note').value || '';

  if (!amount) return;

  if (usingLocal) {
    // Save locally
    const tx = { amount, type, category, note, date: Date.now() };
    saveTransactionLocal(tx);
    loadTransactions();
  } else {
    // Save in Firestore
    await addDoc(collection(db, 'users', uid, 'transactions'), {
      amount,
      type,
      category,
      note,
      date: Date.now()
    });
    loadTransactions();
  }

  // Clear inputs
  ['amount', 'category', 'note'].forEach(id => document.getElementById(id).value = '');
};

// Load transactions from Firestore or localStorage
async function loadTransactions() {
  if (usingLocal) {
    const txs = getTransactionsLocal();
    displayTransactions(txs);
  } else {
    const q = query(collection(db, 'users', uid, 'transactions'), orderBy('date', 'desc'));
    const snap = await getDocs(q);
    const txs = [];
    snap.forEach(docSnap => txs.push(docSnap.data()));
    displayTransactions(txs);
  }
}

function displayTransactions(txs) {
  txList.innerHTML = '';
  transactionData = txs;
  let balance = 0;
  const catMap = {};

  txs.forEach(tx => {
    const li = document.createElement('li');
    li.textContent = `${tx.type.toUpperCase()} • ${tx.category} • ${tx.amount}`;
    li.style.borderLeftColor = tx.type === 'income' ? 'green' : 'red';

    li.onclick = async () => {
      if (!confirm('Delete this transaction?')) return;
      if (usingLocal) {
        deleteTransactionLocal(tx);
        loadTransactions();
      } else {
        // Find doc id to delete
        const q = query(collection(db, 'users', uid, 'transactions'), orderBy('date', 'desc'));
        const snap = await getDocs(q);
        let docIdToDelete = null;
        snap.forEach(docSnap => {
          const data = docSnap.data();
          if (
            data.amount === tx.amount &&
            data.type === tx.type &&
            data.category === tx.category &&
            data.note === tx.note &&
            data.date === tx.date
          ) {
            docIdToDelete = docSnap.id;
          }
        });
        if (docIdToDelete) {
          await deleteDoc(doc(db, 'users', uid, 'transactions', docIdToDelete));
          loadTransactions();
        }
      }
    };

    txList.appendChild(li);
    balance += tx.type === 'income' ? tx.amount : -tx.amount;
    catMap[tx.category] = (catMap[tx.category] || 0) + tx.amount * (tx.type === 'income' ? 1 : -1);
  });

  balanceEl.textContent = balance.toFixed(2);
  renderChart(catMap);
}

// Chart rendering
function renderChart(dataMap) {
  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(chartCanvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels: Object.keys(dataMap),
      datasets: [{
        label: 'Balance by Category',
        data: Object.values(dataMap),
        backgroundColor: '#16a34a'
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        title: { display: true, text: 'Category Summary' }
      }
    }
  });
}

// LocalStorage helpers
function getTransactionsLocal() {
  const data = localStorage.getItem('transactions');
  return data ? JSON.parse(data) : [];
}

function saveTransactionLocal(tx) {
  const arr = getTransactionsLocal();
  arr.unshift(tx);
  localStorage.setItem('transactions', JSON.stringify(arr));
}

function deleteTransactionLocal(tx) {
  let arr = getTransactionsLocal();
  arr = arr.filter(t =>
    !(
      t.amount === tx.amount &&
      t.type === tx.type &&
      t.category === tx.category &&
      t.note === tx.note &&
      t.date === tx.date
    )
  );
  localStorage.setItem('transactions', JSON.stringify(arr));
}

function clearLocalStorage() {
  localStorage.removeItem('transactions');
}
