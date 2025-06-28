// script.js

// Mini SPA Router
const pages = document.querySelectorAll(".page");
const links = document.querySelectorAll(".nav-links li");

links.forEach(link => {
  link.addEventListener("click", () => {
    const page = link.getAttribute("data-page");
    pages.forEach(p => p.classList.remove("active"));
    document.getElementById(page).classList.add("active");
    links.forEach(l => l.classList.remove("active"));
    link.classList.add("active");
  });
});

// Theme Toggle
document.getElementById("themeToggle").addEventListener("click", () => {
  document.body.classList.toggle("dark");
});

// Placeholder Auth (replace with Firebase)
document.getElementById("googleSignIn").addEventListener("click", () => {
  alert("Google Sign In – Connect Firebase here.");
});
document.getElementById("signOut").addEventListener("click", () => {
  alert("Sign Out – Hook into Firebase sign out.");
});

// Budget progress example
function updateBudgetBar(current, goal) {
  const bar = document.getElementById("budgetBar");
  const label = document.getElementById("budgetLabel");
  const percent = (current / goal) * 100;
  bar.style.width = percent + "%";
  label.textContent = `$${goal - current} left of $${goal}`;
}
updateBudgetBar(6500, 10000);

// Example dashboard chart
const ctx = document.getElementById("dashChart").getContext("2d");
new Chart(ctx, {
  type: "bar",
  data: {
    labels: ["Housing", "Food", "Transportation", "Entertainment", "Utilities", "Healthcare"],
    datasets: [{
      label: "Expenses",
      data: [1200, 800, 1300, 200, 100, 950],
      backgroundColor: "#3b82f6"
    }]
  },
  options: { responsive: true, plugins: { legend: { display: false } } }
});
