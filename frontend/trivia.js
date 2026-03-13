const QUESTIONS = [
  {
    question: "¿A qué género musical pertenece 'El Solar de Monimbó'?",
    options: [
      "Polka",
      "Mazurca",
      "Son Nica",
      "Vals"
    ],
    correctIndex: 2
  },
  {
    question: "¿Qué ciudad es ampliamente reconocida como cuna del folklore nicaragüense y hogar de Monimbó?",
    options: [
      "Granada",
      "León",
      "Estelí",
      "Masaya"
    ],
    correctIndex: 3
  },
  {
    question: "¿Quién es el autor de esta obra maestra del folklore nicaragüense?",
    options: [
      "Otto de la Rocha",
      "Camilo Zapata",
      "Erwin Krüger",
      "Tino López Guerra"
    ],
    correctIndex: 1
  },
  {
    question: "'El Solar de Monimbó' es considerado el himno de...",
    options: [
      "Las fiestas patronales de Agosto",
      "El son Nica",
      "La musica coral nicaragüense"
    ],
    correctIndex: 1
  },
  {
    question: "¿Qué instrumento es el alma de la melodía en las presentaciones de esta danza?",
    options: [
      "Guitarra",
      "Marimba",
      "Piano",
      "Acordeón"
    ],
    correctIndex: 1
  }
];

let currentIndex = 0;
const answers = Array(QUESTIONS.length).fill(null);

function el(id) {
  return document.getElementById(id);
}

function renderQuestion() {
    const q = QUESTIONS[currentIndex];
    const fb = el("feedback");
    if (fb) {
        fb.style.display = "none";
        fb.textContent = "";
        fb.className = "feedback";
}
  
  el("progressBadge").textContent = `Pregunta ${currentIndex + 1}/${QUESTIONS.length}`;
  el("questionText").textContent = q.question;

  const form = el("optionsForm");
  form.innerHTML = "";

  q.options.forEach((option, idx) => {
    const row = document.createElement("label");
    row.className = "small";
    row.style.display = "flex";
    row.style.gap = "8px";
    row.style.marginBottom = "8px";

    const input = document.createElement("input");
    input.type = "radio";
    input.name = "triviaOption";
    input.value = String(idx);
    input.checked = answers[currentIndex] === idx;
    input.addEventListener("change", () => {
      answers[currentIndex] = idx;
    });



    const text = document.createElement("span");
    text.textContent = option;
    row.appendChild(input);
    row.appendChild(text);
    form.appendChild(row);
  });

  el("backBtn").disabled = currentIndex === 0;
  el("nextBtn").textContent = currentIndex === QUESTIONS.length - 1 ? "Finalizar" : "Siguiente";
}

function getResultMessage(score) {
  if (score <= 3) return "Seguimos aprendiendo. ¡Dale otra vuelta al catálogo!";
  if (score <= 6) return "Buen nivel. Ya vas agarrando el son nica.";
  return "¡Sos puro nica! Nivel leyenda.";
}

function renderResults() {
  let score = 0;
  QUESTIONS.forEach((q, idx) => {
    if (answers[idx] === q.correctIndex) score += 1;
  });

  const card = el("triviaCard");
  const message = getResultMessage(score);
  card.innerHTML = `
  <div class="section-title">
    <h2>Resultados</h2>
    <span class="badge">${score}/${QUESTIONS.length}</span>
  </div>

  <p class="small">${message}</p>

  <div class="reward">
    <div class="stamp">🏅</div>
    <div>
      <div class="reward-title">Recompensa desbloqueada (demo)</div>
      <div class="reward-sub">Un nacatamal 🍴
    </div>
  </div>

  <a class="btn button" href="./index.html">Volver al catálogo</a>
`;
}

function onNext() {
  // validar que haya respuesta
  if (answers[currentIndex] === undefined) {
    const fb = el("feedback");
    if (fb) {
      fb.style.display = "";
      fb.className = "feedback bad";
      fb.textContent = "Elegí una opción para continuar 🙂";
    }
    return;
  }

  // mostrar feedback (sin cambiar de pregunta todavía)
  const q = QUESTIONS[currentIndex];
  const chosen = answers[currentIndex];
  const ok = chosen === q.correctIndex;

  const fb = el("feedback");
  if (fb) {
    fb.style.display = "";
    fb.className = ok ? "feedback ok" : "feedback bad";
    fb.textContent = ok
      ? "✅ ¡Correcto!"
      : `❌ Casi. La respuesta correcta era: ${q.options[q.correctIndex]}`;
  }

  // pasar a la siguiente con un pequeño delay (se siente pro)
  setTimeout(() => {
    if (currentIndex < QUESTIONS.length - 1) {
      currentIndex += 1;
      renderQuestion();
    } else {
      renderResults();
    }
  }, 1500);
}

function onBack() {
  if (currentIndex > 0) {
    currentIndex -= 1;
    renderQuestion();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  renderQuestion();
  el("nextBtn").addEventListener("click", onNext);
  el("backBtn").addEventListener("click", onBack);
});
