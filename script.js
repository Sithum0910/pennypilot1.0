// ========================= script.js ========================= import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js"; import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js"; import { getFirestore, collection, addDoc, getDocs, query, orderBy, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

// Firebase config const firebaseConfig = { apiKey: "AIzaSyCnodPUZZs4smAyw-9JQx1_3-iWIJzQeWU", authDomain: "pennypilot2-c0c07.firebaseapp.com", projectId: "pennypilot2-c0c07", storageBucket: "pennypilot2-c0c07.firebasestorage.app", messagingSenderId: "158582559799", appId: "1:158582559799:web:c756507f5ffdb1fcc89bb2", measurementId: "G-QRLW06V5T8" };

const app = initializeApp(firebaseConfig); const auth = getAuth(app); const db = getFirestore(app);

const googleBtn = document.getElementById('googleSignIn'); const signOutBtn = document.getElementById('signOut'); const themeToggle = document.getElementById('themeToggle'); const appDiv = document.getElementById('app'); const addBtn = document.getElementById('add'); const txList = document.getElementById('transactions'); const balanceEl = document.getElementById('balance');

let uid = null; let transactionData = [];

// Add chart container const chartCanvas = document.createElement('canvas'); chartCanvas.id = 'chart'; txList.parentElement.appendChild(chartCanvas);

// Download CSV button const csvBtn = document.createElement('button'); csvBtn.textContent = "Download CSV"; csvBtn.className = "btn-primary"; txList.parentElement.appendChild(csvBtn);

csvBtn.addEventListener('click', () => { const csv = "type,category,amount,note,date\n" + transactionData.map(tx => ${tx.type},${tx.category},${tx.amount},${tx.note},${new Date(tx.date).toLocaleString()} ).join("\n");

const blob = new Blob([csv], { type: 'text/csv' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'transactions.csv'; link.click(); });

if (localStorage.getItem('theme') === 'dark') document.body.classList.add('dark');

themeToggle.addEventListener('click', () => { document.body.classList.toggle('dark'); localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light'); });

googleBtn.addEventListener('click', () => { const provider = new GoogleAuthProvider(); signInWithPopup(auth, provider).catch(err => alert(err.message)); });

signOutBtn.addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, user => { if (user) { uid = user.uid; googleBtn.classList.add('hidden'); appDiv.classList.remove('hidden'); loadTransactions(); } else { uid = null; appDiv.classList.add('hidden'); googleBtn.classList.remove('hidden'); } });

addBtn.addEventListener('click', async () => { const amount = parseFloat(document.getElementById('amount').value); const type = document.getElementById('type').value; const category = document.getElementById('category').value || 'General'; const note = document.getElementById('note').value || '';

if (!amount) return;

await addDoc(collection(db, 'users', uid, 'transactions'), { amount, type, category, note, date: Date.now() });

document.getElementById('amount').value = ''; document.getElementById('category').value = ''; document.getElementById('note').value = '';

loadTransactions(); });

async function loadTransactions() { const q = query(collection(db, 'users', uid, 'transactions'), orderBy('date', 'desc')); const snap = await getDocs(q);

txList.innerHTML = ''; transactionData = []; let balance = 0; let chartMap = {};

snap.forEach(docSnap => { const tx = docSnap.data(); transactionData.push(tx);

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

chartMap[tx.category] = (chartMap[tx.category] || 0) + tx.amount * (tx.type === 'income' ? 1 : -1);

});

balanceEl.textContent = balance.toFixed(2); renderChart(chartMap); }

function renderChart(dataMap) { if (window.myChart) window.myChart.destroy();

const ctx = document.getElementById('chart').getContext('2d'); window.myChart = new Chart(ctx, { type: 'bar', data: { labels: Object.keys(dataMap), datasets: [{ label: 'Balance by Category', data: Object.values(dataMap), backgroundColor: '#0068f0' }] }, options: { responsive: true, plugins: { legend: { display: false }, title: { display: true, text: 'Category Summary' } } } }); }

