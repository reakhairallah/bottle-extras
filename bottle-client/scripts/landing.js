// Landing page's ocean canvas - purely decorative (no bottles, no API
// calls). "Play the Game" and "Browse the Archive" are plain <a href>
// links in index.html, not wired here - no click handling needed for
// navigation, and the first real API call (creating the anonymous
// token/cookie, per Phase 1) happens naturally once game.html loads.

const ocean = document.getElementById("ocean");
const octx = ocean.getContext("2d");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let width, height, waterline;

function resize(){
    width = ocean.width = window.innerWidth + 40;
    height = ocean.height = window.innerHeight + 40;
    waterline = height * 0.63;
}
window.addEventListener("resize", resize);
resize();

const layers = [
    { primary: { amplitude: 6,  wavelength: 360, speed: 0.0016, phase: 0.5 }, secondary: { amplitude: 3, wavelength: 110, speed: 0.0026, phase: 0.8 }, bob: { amplitude: 5, period: 10500, phase: 0.5 }, yOffset: -14, fill: "rgba(255,255,255,0.035)" },
    { primary: { amplitude: 9,  wavelength: 300, speed: 0.0022, phase: 0 },   secondary: { amplitude: 4, wavelength: 95,  speed: 0.0035, phase: 1.4 }, bob: { amplitude: 7, period: 9000,  phase: 0 },   yOffset: 4,   fill: "rgba(255,255,255,0.06)" },
    { primary: { amplitude: 10, wavelength: 260, speed: 0.0027, phase: 1.6 }, secondary: { amplitude: 4, wavelength: 85,  speed: 0.004,  phase: 1.0 }, bob: { amplitude: 8, period: 8200,  phase: 1.1 }, yOffset: 22,  fill: "rgba(255,255,255,0.09)" },
    { primary: { amplitude: 12, wavelength: 230, speed: 0.0032, phase: 2.1 }, secondary: { amplitude: 5, wavelength: 80,  speed: 0.0048, phase: 0.6 }, bob: { amplitude: 9, period: 7600,  phase: 2.2 }, yOffset: 40,  fill: "rgba(255,255,255,0.14)" },
    { primary: { amplitude: 8,  wavelength: 160, speed: 0.0044, phase: 4.4 }, secondary: { amplitude: 4, wavelength: 60,  speed: 0.0065, phase: 3.1 }, bob: { amplitude: 6, period: 6200,  phase: 4.1 }, yOffset: 58,  fill: "rgba(234,247,251,0.22)" },
];

function waveY(layer, x, t){
    const p = layer.primary, s = layer.secondary;
    const bob = Math.sin((t / layer.bob.period) * Math.PI * 2 + layer.bob.phase) * layer.bob.amplitude;
    const wave = Math.sin((x / p.wavelength) + t * p.speed + p.phase) * p.amplitude
               + Math.sin((x / s.wavelength) + t * s.speed + s.phase) * s.amplitude;
    return waterline + layer.yOffset + bob + wave;
}

function drawWaveLayer(layer, t){
    octx.beginPath();
    octx.moveTo(0, height);
    octx.lineTo(0, waveY(layer, 0, t));
    for(let x = 0; x <= width; x += 8) octx.lineTo(x, waveY(layer, x, t));
    octx.lineTo(width, height);
    octx.closePath();
    octx.fillStyle = layer.fill;
    octx.fill();
}

let lastT = null;

function frame(t){
    if(lastT === null) lastT = t;
    lastT = t;

    octx.clearRect(0, 0, width, height);
    layers.forEach((layer) => drawWaveLayer(layer, t));
    if(!reduceMotion) requestAnimationFrame(frame);
}

if(reduceMotion){ frame(0); } else { requestAnimationFrame(frame); }
