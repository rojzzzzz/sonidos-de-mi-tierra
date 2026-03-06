const QUESTIONS = [
{
question: "¿Qué instrumento es característico de muchas agrupaciones de música tradicional nicaragüense?",
options: [
"Marimba",
"Violín",
"Piano",
"Trompeta"
],
correctIndex: 0
},

{
question: "¿Qué ciudad es ampliamente reconocida como cuna del folklore nicaragüense?",
options: [
"Granada",
"Masaya",
"León",
"Estelí"
],
correctIndex: 1
},

{
question: "¿Qué tipo de ritmo representa el 'Son Nica'?",
options: [
"Ritmo tradicional nicaragüense",
"Género de música electrónica",
"Estilo de rock",
"Tipo de jazz"
],
correctIndex: 0
},

{
question: "La canción 'Nicaragua, Nicaragüita' es conocida por:",
options: [
"Ser un himno cultural muy querido por los nicaragüenses",
"Ser una canción infantil",
"Ser un bolero mexicano",
"Ser música instrumental"
],
correctIndex: 0
},

{
question: "¿Qué instrumento se toca golpeando láminas de madera y es común en Centroamérica?",
options: [
"Marimba",
"Guitarra",
"Arpa",
"Acordeón"
],
correctIndex: 0
},

{
question: "Muchas canciones tradicionales nicaragüenses hablan sobre:",
options: [
"Historias del campo, la vida cotidiana y la identidad cultural",
"Viajes espaciales",
"Programación informática",
"Carreras de autos"
],
correctIndex: 0
},

{
question: "En la música tradicional, los ritmos suelen acompañar:",
options: [
"Danzas folklóricas",
"Solo conciertos de piano",
"Óperas europeas",
"Ballet clásico ruso"
],
correctIndex: 0
},

{
question: "¿Qué busca preservar una biblioteca musical como 'Sonidos de mi tierra'?",
options: [
"La cultura musical e identidad del país",
"Solo música extranjera",
"Noticias deportivas",
"Videojuegos"
],
correctIndex: 0
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
      <div class="reward-sub">Un sticker digital nica para tu perfil 🎁</div>
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
