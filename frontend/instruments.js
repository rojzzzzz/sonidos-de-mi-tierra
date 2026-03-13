const instruments = [

{
id:"acordeon",
name:"Acordeón",
desc:"El acordeón trae consigo un sonido fuerte y lleno de vida que anima cualquier fiesta. Sus notas pueden ser alegres y bailables o profundas y sentimentales. En muchas regiones de Nicaragua, su presencia convierte cualquier reunión en una verdadera celebración musical. de viento con fuelle muy utilizado en la música popular y campesina."
},

{
id:"guiro",
name:"Güiro",
desc:"Instrumento El güiro aporta un ritmo constante y muy característico a muchas piezas de música popular. Al raspar su superficie con una varilla, se crea un sonido que marca el compás y le da identidad a numerosos ritmos latinoamericanos. percusión raspado que produce un ritmo característico en la música folclórica."
},

{
id:"guitarra",
name:"Guitarra",
desc:"Instrumento La guitarra ha sido compañera fiel de cantautores y trovadores en Nicaragua. Con ella se han cantado historias de amor, de lucha y de identidad. Su sonido cálido acompaña desde reuniones familiares hasta grandes escenarios, siendo uno de los instrumentos más queridos por nuestro pueblo. cuerda fundamental en la música latinoamericana."
},

{
id:"maracas",
name:"Maracas",
desc:"Instrumentos de Las maracas son instrumentos sencillos pero llenos de ritmo. Con solo agitarlas, producen un sonido que acompaña bailes y canciones tradicionales. Representan la alegría y el movimiento que caracteriza a la música de nuestro pueblo. que generan ritmo al agitarse."
},

{
id:"marimba",
name:"Marimba",
desc:"La marimba es uno de los sonidos más alegres y representativos de nuestra Nicaragua. Con sus teclas de madera y su ritmo contagioso, ha acompañado fiestas, bailes y tradiciones por generaciones. Escuchar la marimba es sentir la energía de nuestro folclore y el orgullo de nuestra tierra."
},

{
id:"quijongo",
name:"Quijongo",
desc:"El quijongo es un instrumento ancestral que nos conecta con las raíces indígenas de Nicaragua. Su sonido profundo y vibrante se produce al tensar una cuerda sobre un arco y hacerlo resonar con una jícara. Es un símbolo de creatividad y tradición que ha sobrevivido al paso del tiempo. tradicional nicaragüense de cuerda asociado al folclore campesino."
},

{
id:"requinto",
name:"Requinto",
desc:"Pequeña El requinto es una guitarra pequeña pero con una voz brillante y llena de sentimiento. En muchas canciones latinoamericanas y nicaragüenses, el requinto lleva la melodía con notas agudas que emocionan al oyente. Su sonido es perfecto para expresar nostalgia, amor y pasión por la música. de sonido agudo usada en música regional."
},

{
id:"tambor",
name:"Tambor",
desc:"El tambor es el corazón de la percusión en muchas tradiciones musicales. Su golpe profundo marca el ritmo de bailes y celebraciones. Desde tiempos antiguos, el sonido del tambor ha unido a las comunidades alrededor de la música y la danza. de percusión utilizado en muchas expresiones culturales."
}

];

const grid = document.getElementById("instrumentGrid");

let currentAudio = null;
let currentButton = null;

// ... (mismo código inicial)
function createCard(inst){

const card = document.createElement("div");
card.className = "card instrument-card";

const img = document.createElement("img");
img.className = "thumb instrument-thumb";
img.src = `assets/instruments/${inst.id}.jpg`;

img.onerror = () => {
img.onerror = null;
img.src = `assets/instruments/${inst.id}.jpeg`;
};

const body = document.createElement("div");
body.className = "card-body";

const title = document.createElement("div");
title.className = "card-title";
title.textContent = inst.name;

const desc = document.createElement("div");
desc.className = "meta";
desc.textContent = inst.desc;

const button = document.createElement("button");
button.className = "button instrument-btn";
button.innerHTML = "<span>🔊</span> Escuchar";

button.onclick = () => playSound(inst.id, button);

body.appendChild(title);
body.appendChild(desc);
body.appendChild(button);

card.appendChild(img);
card.appendChild(body);

return card;
}

function playSound(id,btn){

if(currentAudio){
currentAudio.pause();
currentAudio.currentTime=0;

if(currentButton){
currentButton.textContent="🔊 Escuchar";
}
}

const audio=new Audio(`assets/sounds/${id}.mp3`);

audio.play();

btn.textContent="⏸ Sonando...";
currentAudio=audio;
currentButton=btn;

audio.onended=()=>{
btn.textContent="🔊 Escuchar";
currentAudio=null;
currentButton=null;
};

}

instruments.forEach(inst=>{
grid.appendChild(createCard(inst));
});