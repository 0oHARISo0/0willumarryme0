// Page sequence requested: 1 -> 2 -> 5 -> 4 -> 3 -> 6
const pageSequence = [1, 2, 5, 4, 3, 6];
let sequenceIndex = 0;
let selectedFood = "";
let noCount = 0;

async function logEvent(eventName, details = {}) {
  try {
    await fetch("/api/event", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({event: eventName, details, page: currentPage(), timestamp: new Date().toISOString()})
    });
  } catch (error) {
    console.warn("Activity could not be saved. Is the Flask server running?", error);
  }
}

function currentPage() {
  const active = document.querySelector(".page.active");
  return active ? Number(active.id.replace("page", "")) : null;
}

function showPage(page) {
  document.querySelectorAll(".page").forEach(el => el.classList.remove("active"));
  const el = document.getElementById("page" + page);
  if (el) {
    el.classList.add("active");
    sequenceIndex = Math.max(0, pageSequence.indexOf(page));
    window.scrollTo({top: 0, behavior: "smooth"});
    logEvent("page_view", {page});
  }
}

async function recordAndGo(choice, nextPage) {
  await logEvent("button_click", {choice, nextPage});
  showPage(nextPage);
}

async function handleNo() {
  noCount++;
  await logEvent("button_click", {choice: "NO", attempt: noCount});
  const noBtn = document.getElementById("noBtn");
  noBtn.textContent = noCount === 1 ? "ARE YOU SURE? 🥺" : "TRY AGAIN 🙈";
  noBtn.style.transform = `translate(${Math.random()*28-14}px, ${Math.random()*18-9}px)`;
  if (noCount >= 3) {
    noBtn.textContent = "okay, think about it 💙";
    noBtn.style.transform = "none";
  }
}

function selectFood(button, food) {
  document.querySelectorAll(".food").forEach(el => el.classList.remove("selected"));
  button.classList.add("selected");
  selectedFood = food;
  logEvent("food_selected", {food});
}

async function saveFoodAndGo() {
  if (!selectedFood) {
    alert("Choose our celebration dinner first 💙");
    return;
  }
  await logEvent("food_confirmed", {food: selectedFood});
  showPage(4);
}

async function saveDateAndGo() {
  const date = document.getElementById("date").value;
  const time = document.getElementById("time").value;
  if (!date || !time) {
    alert("Choose both a date and a time 💙");
    return;
  }
  await logEvent("date_time_selected", {date, time, food: selectedFood});
  showPage(3);
}

async function finishProposal() {
  await logEvent("proposal_finished", {food: selectedFood, date: document.getElementById("date").value, time: document.getElementById("time").value});
  for (let i = 0; i < 28; i++) {
    const heart = document.createElement("span");
    heart.textContent = ["💙", "♥", "✦"][Math.floor(Math.random() * 3)];
    heart.style.cssText = `position:fixed;left:${Math.random()*100}vw;top:100vh;z-index:20;font-size:${14+Math.random()*20}px;pointer-events:none`;
    document.body.appendChild(heart);
    const animation = heart.animate([{transform:"translateY(0)",opacity:1},{transform:`translateY(-${60+Math.random()*45}vh) rotate(${Math.random()*120-60}deg)`,opacity:0}], {duration:1800+Math.random()*1000,easing:"ease-out"});
    animation.onfinish = () => heart.remove();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  logEvent("site_opened", {path: window.location.pathname});
  const dateInput = document.getElementById("date");
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  dateInput.value = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth()+1).padStart(2,"0")}-${String(tomorrow.getDate()).padStart(2,"0")}`;
});
