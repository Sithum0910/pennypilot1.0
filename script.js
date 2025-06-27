/*******************************
  Budget-Tracker – script.js
  Last updated: redirect-fix
*******************************/

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

/* ─── Firebase config ─── */
const firebaseConfig = {
  apiKey: "AIzaSyCnodPUZZs4smAyw-9JQx1_3-iWIJzQeWU",
  authDomain: "pennypilot2-c0c07.firebaseapp.com",
  projectId: "pennypilot2-c0c07",
  storageBucket: "pennypilot2-c0c07.appspot.com",
  messagingSenderId: "158582559799",
  appId: "1:158582559799:web:c756507f5ffdb1fcc89bb2",
  measurementId: "G-QRLW06V5T8"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

/* ─── UI references ─── */
const googleBtn       = document.getElementById('googleSignIn');
const skipBtn         = document.getElementById('skipSignIn');
const signOutBtn      = document.getElementById('signOut');
const signInLaterBtn  = document.getElementById('signInLater');
const themeToggle     = document.getElementById('themeToggle');
const appDiv          = document.getElementById('app');
const addBtn          = document.getElementById('add');
const txList          = document.getElementById('transactions');
const balanceEl       = document.getElementById('balance');
const csvBtn          = document.getElementById('csvBtn');
const chartCanvas     = document.getElementById('chart');

/* ─── State ─── */
let uid            = null;      // Firebase UID
let usingLocal     = false;     // true = localStorage mode
let transactionData= [];        // array for CSV
let chartInstance  = null;      // Chart.js instance

/* ─── Theme handling ─── */
if (localStorage.getItem('theme') === 'dark') document.body.classList.add('dark');
themeToggle.onclick = () => {
  document.body.classList.toggle('dark');
  localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
};

/* ─── Google Auth provider ─── */
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

/* ─── Sign-in button ─── */
googleBtn.onclick = () => {
  const isMobile = /Mobi|Android/i.test(navigator.userAgent);
  if (isMobile) {
    signInWithRedirect(auth, provider);
  } else {
    signInWithPopup(auth, provider).catch(err => {
      if (err.code === 'auth/popup-blocked') {
        signInWithRedirect(auth, provider);      // fallback
      } else {
        alert(err.message);
      }
    });
  }
};

/* ─── Handle redirect result (mobile or fallback) ─── */
getRedirectResult(auth)
  .then(result => {
    if (result && result.user) {
      // user signed-in after redirect
      signedInState(result.user);
    }
  })
  .catch(err => console.warn("Redirect sign-in error:", err.message));

/* ─── Skip sign-in (local mode) ─── */
skipBtn.onclick = () => {
  usingLocal = true;
  enterAppUI();
  signInLaterBtn.style.display = 'block';
  loadTransactions();
};

/* ─── Sign in later (migrate local->Firebase) ─── */
signInLaterBtn.onclick = async () => {
  try {
    await signInWithPopup(auth, provider);
    // migrate local data
    const localTxs = getLocalTx();
    if (localTxs.length) {
      await Promise.all(localTxs.map(tx =>
        addDoc(collection(db, 'users', auth.currentUser.uid, 'transactions'), tx)
      ));
      clearLocalTx();
    }
    usingLocal = false;
    signInLaterBtn.style.display = 'none';
  } catch (e) {
    alert('Google sign-in failed: ' + e.message);
  }
};

/* ─── Sign-out ─── */
signOutBtn.onclick = async () => {
  if (usingLocal) {
    leaveAppUI();
    clearLocalTx();
  } else {
    await signOut(auth);
  }
};

/* ─── Firebase auth state listener ─── */
onAuthStateChanged(auth, user => {
  if (user) {
    signedInState(user);
  } else if (!usingLocal) {
    leaveAppUI();  // show landing buttons again
  }
});

/* ─── Helpers for UI state ─── */
function signedInState(user) {
  uid = user.uid;
  usingLocal = false;
  enterAppUI();
  signInLaterBtn.style.display = 'none';
  loadTransactions();
}

function enterAppUI() {
  googleBtn.classList.add('hidden');
  skipBtn.classList.add('hidden');
  signOutBtn.classList.remove('hidden');
  appDiv.classList.remove('hidden');
}

function leaveAppUI() {
  uid = null;
  usingLocal = false;
  googleBtn.classList.remove('hidden');
  skipBtn.classList.remove('hidden');
  signOutBtn.classList.add('hidden');
  signInLaterBtn.style.display = 'none';
  appDiv.classList.add('hidden');
}

/* ─── Add transaction ─── */
addBtn.onclick = async () => {
  const amount   = parseFloat(document.getElementById('amount').value);
  const type     = document.getElementById('type').value;
  const category = document.getElementById('category').value || 'General';
  const note     = document.getElementById('note').value || '';

  if (!amount) return;

  const tx = { amount, type, category, note, date: Date.now() };

  if (usingLocal) {
    saveLocalTx(tx);
  } else {
    await addDoc(collection(db, 'users', uid, 'transactions'), tx);
  }
  ['amount','category','note'].forEach(id => document.getElementById(id).value = '');
  loadTransactions();
};

/* ─── Load transactions ─── */
async function loadTransactions() {
  const txs = usingLocal ? getLocalTx()
        : (await getDocs(query(collection(db, 'users', uid, 'transactions'), orderBy('date','desc'))))
          .docs.map(d => ({ id: d.id, ...d.data() }));

  transactionData = txs;
  renderTxList(txs);
  renderChart(calcCategoryMap(txs));
}

/* Render list and balance */
function renderTxList(txs) {
  txList.innerHTML = '';
  let balance = 0;

  txs.forEach(tx => {
    const li = document.createElement('li');
    li.textContent = `${tx.type.toUpperCase()} • ${tx.category} • ${tx.amount}`;
    li.style.borderLeftColor = tx.type === 'income' ? 'green' : 'red';

    li.onclick = () => {
      if (!confirm('Delete this transaction?')) return;
      deleteTx(tx);
    };
    txList.appendChild(li);
    balance += tx.type === 'income' ? tx.amount : -tx.amount;
  });
  balanceEl.textContent = balance.toFixed(2);
}

/* Delete local or Firestore tx */
async function deleteTx(tx) {
  if (usingLocal) {
    removeLocalTx(tx);
    loadTransactions();
  } else {
    if (!tx.id) return; // should not happen
    await deleteDoc(doc(db, 'users', uid, 'transactions', tx.id));
    loadTransactions();
  }
}

/* Build category map for chart */
function calcCategoryMap(txs) {
  const map = {};
  txs.forEach(tx => {
    map[tx.category] = (map[tx.category] || 0) + tx.amount * (tx.type === 'income' ? 1 : -1);
  });
  return map;
}

/* Chart.js bar chart */
function renderChart(map) {
  if (chartInstance) chartInstance.destroy();
  chartInstance = new Chart(chartCanvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels: Object.keys(map),
      datasets: [{
        label: 'Balance by Category',
        data: Object.values(map),
        backgroundColor: '#16a34a'
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        title:  { display: true, text: 'Category Summary' }
      }
    }
  });
}

/* ─── CSV export ─── */
csvBtn.onclick = () => {
  if (!transactionData.length) return alert('No data to export');
  const csv = 'type,category,amount,note,date\n' +
    transactionData.map(t =>
      `${t.type},${t.category},${t.amount},${t.note},${new Date(t.date).toLocaleString()}`
    ).join('\n');
  const blob = new Blob([csv], { type:'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href:url, download:'transactions.csv' });
  a.click(); URL.revokeObjectURL(url);
};

/* ─── localStorage helpers ─── */
function getLocalTx()   { return JSON.parse(localStorage.getItem('transactions') || '[]'); }
function saveLocalTx(t) { const arr=getLocalTx(); arr.unshift(t); localStorage.setItem('transactions', JSON.stringify(arr)); }
function removeLocalTx(t){
  const arr=getLocalTx().filter(x=>!(x.amount===t.amount&&x.type===t.type&&x.category===t.category&&x.note===t.note&&x.date===t.date));
  localStorage.setItem('transactions', JSON.stringify(arr));
}
function clearLocalTx() { localStorage.removeItem('transactions'); }
