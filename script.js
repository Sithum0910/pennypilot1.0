/**** basic SPA + dark-mode toggle (mobile friendly) ****/

// mobile nav toggle
const hamburger = document.getElementById("hamburger");
const navLinks  = document.querySelector(".nav-links");
hamburger.addEventListener("click", () => navLinks.classList.toggle("open"));

// page router
document.querySelectorAll(".nav-links li").forEach(li=>{
  li.onclick=()=>{
    document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
    document.getElementById(li.dataset.page).classList.add("active");
    document.querySelectorAll(".nav-links li").forEach(l=>l.classList.remove("active"));
    li.classList.add("active");
    navLinks.classList.remove("open");      // auto close on mobile
  };
});

// dark-mode toggle
const modeToggle = document.getElementById("modeToggle");
if(localStorage.theme==='dark') {
  document.documentElement.setAttribute("data-theme","dark");
  modeToggle.checked = true;
}
modeToggle.addEventListener("change", e=>{
  const theme = e.target.checked ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.theme = theme;
});

// demo chart
const ctx = document.getElementById("dashChart");
if(ctx){
  new Chart(ctx, {
    type: "doughnut",
    data: {
      labels:["Food","Transport","Rent","Other"],
      datasets:[{ data:[200,150,620,90], backgroundColor:["#2563eb","#4ade80","#fbbf24","#f87171"] }]
    },
    options:{plugins:{legend:{position:"bottom"}}}
  });
}

// transactions demo (no Firebase yet)
document.getElementById("txForm").onsubmit=e=>{
  e.preventDefault();
  const amt=+txAmount.value;
  if(!amt) return;
  const li=document.createElement("li");
  li.textContent=`${txType.value.toUpperCase()} — $${amt}`;
  txList.prepend(li);
  e.target.reset();
};
