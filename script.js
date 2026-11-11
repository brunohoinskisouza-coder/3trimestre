const canvas = document.getElementById('jogoEnduro');
const ctx = canvas.getContext('2d');

// Configurações Gerais
const LARGURA = canvas.width;
const ALTURA = canvas.height;
const HORIZONTE = ALTURA * 0.42;

// Estados do Jogo
let estado = 'MENU'; // MENU, JOGANDO, GAMEOVER
let dia = 1;
let metaUltrapassagens = 20;
let carrosUltrapassados = 0;
let tempoRestante = 60; // Segundos por dia
let ultimoTempo = 0;

// Climas: 0 = Dia, 1 = Pôr do Sol, 2 = Noite, 3 = Neblina
let climaAtual = 0;
let tempoClima = 0;

// Variáveis da Pista
let distanciaPercorrida = 0;
let curvaturaAtual = 0;
let curvaturaAlvo = 0;
let tempoCurva = 0;

// Jogador
const jogador = {
    x: 0, // -1 (esquerda) a 1 (direita)
    velocidade: 0,
    velMax: 14,
    largura: 64,
    altura: 34,
    cor: '#e60000'
};

// Inimigos
let inimigos = [];
const CORES_INIMIGOS = ['#0066ff', '#00cc44', '#ffcc00', '#cc00cc', '#00cccc', '#ff6600'];

// Controles
const teclas = {
    ArrowLeft: false,
    ArrowRight: false,
    ArrowUp: false,
    ArrowDown: false
};

window.addEventListener('keydown', (e) => {
    if (teclas.hasOwnProperty(e.code)) {
        e.preventDefault(); // Evita rolar a página com as setas
        teclas[e.code] = true;
    }
    if (e.code === 'Space' && (estado === 'MENU' || estado === 'GAMEOVER')) {
        iniciarJogo();
    }
});

window.addEventListener('keyup', (e) => {
    if (teclas.hasOwnProperty(e.code)) {
        teclas[e.code] = false;
    }
});

// Suporte a clique para iniciar/reiniciar
canvas.addEventListener('click', () => {
    if (estado === 'MENU' || estado === 'GAMEOVER') {
        iniciarJogo();
    }
});

function iniciarJogo() {
    dia = 1;
    metaUltrapassagens = 15;
    carrosUltrapassados = 0;
    tempoRestante = 60;
    climaAtual = 0;
    tempoClima = 0;
    jogador.x = 0;
    jogador.velocidade = 4;
    inimigos = [];
    curvaturaAtual = 0;
    curvaturaAlvo = 0;
    estado = 'JOGANDO';
    ultimoTempo = performance.now();
}

function avancarDia() {
    dia++;
    metaUltrapassagens += 5;
    carrosUltrapassados = 0;
    tempoRestante = 60;
}

// Gerador de Inimigos
function gerenciarInimigos() {
    if (inimigos.length < 4 && Math.random() < 0.03) {
        // Evita nascer muito perto de outro carro
        const podeNascer = inimigos.every(inimigo => inimigo.z < 0.8);
        if (podeNascer) {
            inimigos.push({
                x: (Math.random() * 1.4) - 0.7, // Posição na pista (-0.7 a 0.7)
                z: 1.0, // 1.0 = horizonte, 0.0 = câmera
                velocidade: 4 + Math.random() * 4,
                cor: CORES_INIMIGOS[Math.floor(Math.random() * CORES_INIMIGOS.length)],
                ultrapassado: false
            });
        }
    }
}

// Atualização da Lógica
function atualizar(dt) {
    if (estado !== 'JOGANDO') return;

    // Cronômetro do Dia
    tempoRestante -= dt;
    if (tempoRestante <= 0) {
        if (carrosUltrapassados >= metaUltrapassagens) {
            avancarDia();
        } else {
            estado = 'GAMEOVER';
            return;
        }
    }

    // Mudança de Clima a cada 15 segundos
    tempoClima += dt;
    if (tempoClima >= 15) {
        tempoClima = 0;
        climaAtual = (climaAtual + 1) % 4;
    }

    // Aceleração e Frenagem
    if (teclas.ArrowUp) {
        jogador.velocidade += 6 * dt;
    } else if (teclas.ArrowDown) {
        jogador.velocidade -= 14 * dt;
    } else {
        jogador.velocidade -= 2 * dt; // Desaceleração natural
    }

    // Limites de velocidade (mínimo 2 para manter o jogo andando)
    jogador.velocidade = Math.max(2, Math.min(jogador.velMax, jogador.velocidade));

    // Movimento Lateral do Jogador
    const sensibilidade = 1.4 * (jogador.velocidade / jogador.velMax + 0.3);
    if (teclas.ArrowLeft) jogador.x -= sensibilidade * dt;
    if (teclas.ArrowRight) jogador.x += sensibilidade * dt;

    // Força centrífuga nas curvas
    jogador.x -= curvaturaAtual * (jogador.velocidade / jogador.velMax) * 0.65 * dt;

    // Penalidade ao sair da pista (grama/neve)
    if (Math.abs(jogador.x) > 0.95) {
        jogador.velocidade *= 0.95; // Reduz velocidade na borda
        jogador.x = Math.max(-1.25, Math.min(1.25, jogador.x));
    }

    // Distância e Curvas
    distanciaPercorrida += jogador.velocidade * dt * 15;
    tempoCurva -= dt;
    if (tempoCurva <= 0) {
        tempoCurva = 3 + Math.random() * 4;
        curvaturaAlvo = (Math.random() * 2 - 1) * 1.2; // -1.2 a 1.2
    }
    curvaturaAtual += (curvaturaAlvo - curvaturaAtual) * dt * 1.5;

    // Atualizar Inimigos
    gerenciarInimigos();
    for (let i = inimigos.length - 1; i >= 0; i--) {
        let ini = inimigos[i];
        let velRelativa = (jogador.velocidade - ini.velocidade) * 0.08;
        ini.z -= velRelativa * dt;

        // Contar ultrapassagem
        if (ini.z < 0.12 && !ini.ultrapassado) {
            ini.ultrapassado = true;
            carrosUltrapassados++;
            if (carrosUltrapassados >= metaUltrapassagens) {
                // Bônus visual ou preparação para o próximo dia
            }
        }

        // Detecção de Colisão
        if (ini.z > 0.05 && ini.z < 0.16) {
            if (Math.abs(jogador.x - ini.x) < 0.26) {
                // Bateu! Perde velocidade e empurra o carro
                jogador.velocidade = 2;
                ini.z += 0.15;
            }
        }

        // Remover inimigos que ficaram para trás ou muito longe
        if (ini.z < -0.1 || ini.z > 1.2) {
            inimigos.splice(i, 1);
        }
    }
}

// Renderização Gráfica
function desenhar() {
    // 1. Definir cores com base no clima
    let corCeu = '#4da6ff';
    let corChao1 = '#2eb82e';
    let corChao2 = '#248f24';
    let corPista1 = '#555555';
    let corPista2 = '#4d4d4d';
    let corZebra1 = '#ffffff';
    let corZebra2 = '#ff0000';

    if (climaAtual === 1) { // Pôr do Sol
        corCeu = '#ff704d';
        corChao1 = '#b35900';
        corChao2 = '#804000';
    } else if (climaAtual === 2) { // Noite
        corCeu = '#0a0a29';
        corChao1 = '#001a00';
        corChao2 = '#000d00';
        corPista1 = '#1a1a1a';
        corPista2 = '#111111';
        corZebra1 = '#666666';
        corZebra2 = '#440000';
    } else if (climaAtual === 3) { // Neblina
        corCeu = '#cccccc';
        corChao1 = '#999999';
        corChao2 = '#8c8c8c';
    }

    // Desenhar Céu
    ctx.fillStyle = corCeu;
    ctx.fillRect(0, 0, LARGURA, HORIZONTE);

    // Montanhas simples no horizonte
    ctx.fillStyle = climaAtual === 2 ? '#050514' : '#3d3d5c';
    ctx.beginPath();
    ctx.moveTo(0, HORIZONTE);
    for (let x = 0; x <= LARGURA; x += 60) {
        let offset = (curvaturaAtual * 30);
        let alturaMonte = Math.sin((x + offset) * 0.02) * 25 + 30;
        ctx.lineTo(x, HORIZONTE - alturaMonte);
    }
    ctx.lineTo(LARGURA, HORIZONTE);
    ctx.fill();

    // 2. Desenhar Pista fatia por fatia (Efeito Pseudo-3D)
    const totalFatias = ALTURA - HORIZONTE;
    for (let y = 0; y < totalFatias; y++) {
        let p = y / totalFatias; // 0 no horizonte, 1 na base da tela
        let z = 1 / (p + 0.05);
        let faixa = Math.floor(z * 2 + distanciaPercorrida) % 2 === 0;

        // Chão lateral
        ctx.fillStyle = faixa ? corChao1 : corChao2;
        ctx.fillRect(0, HORIZONTE + y, LARGURA, 1);

        // Cálculo da curva e largura da pista
        let curvaOffset = curvaturaAtual * Math.pow(1 - p, 2) * 220;
        let centroPista = (LARGURA / 2) + curvaOffset - (jogador.x * p * 180);
        let larguraPista = (LARGURA * 0.85) * p + 20;
        let larguraZebra = larguraPista * 0.08;

        // Zebras
        ctx.fillStyle = faixa ? corZebra1 : corZebra2;
        ctx.fillRect(centroPista - larguraPista / 2 - larguraZebra, HORIZONTE + y, larguraPista + larguraZebra * 2, 1);

        // Asfalto
        ctx.fillStyle = faixa ? corPista1 : corPista2;
        ctx.fillRect(centroPista - larguraPista / 2, HORIZONTE + y, larguraPista, 1);

        // Faixa central tracejada
        if (faixa && p > 0.05) {
            ctx.fillStyle = climaAtual === 2 ? '#555555' : '#ffffff';
            ctx.fillRect(centroPista - (2 * p), HORIZONTE + y, 4 * p, 1);
        }
    }

    // 3. Desenhar Inimigos (ordenados do mais distante para o mais próximo)
    inimigos.sort((a, b) => b.z - a.z);
    inimigos.forEach(ini => {
        let p = 1 - ini.z;
        if (p < 0 || p > 1) return;

        let curvaOffset = curvaturaAtual * Math.pow(1 - p, 2) * 220;
        let centroPista = (LARGURA / 2) + curvaOffset - (jogador.x * p * 180);
        let larguraPista = (LARGURA * 0.85) * p + 20;

        let screenX = centroPista + (ini.x * (larguraPista * 0.45));
        let screenY = HORIZONTE + (p * totalFatias);
        let escala = Math.max(0.15, p);

        desenharCarro(screenX, screenY, 64 * escala, 34 * escala, ini.cor, climaAtual === 2);
    });

    // 4. Efeito de Neblina densa (cobre o horizonte)
    if (climaAtual === 3) {
        let grad = ctx.createLinearGradient(0, HORIZONTE - 10, 0, HORIZONTE + 160);
        grad.addColorStop(0, 'rgba(204, 204, 204, 1)');
        grad.addColorStop(1, 'rgba(204, 204, 204, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, HORIZONTE - 10, LARGURA, 170);
    }

    // 5. Desenhar Carro do Jogador
    let tremida = (jogador.velocidade > 10 || Math.abs(jogador.x) > 0.95) ? (Math.random() * 2 - 1) : 0;
    desenharCarro(LARGURA / 2, ALTURA - 45 + tremida, jogador.largura, jogador.altura, jogador.cor, false);

    // 6. Desenhar Painel HUD (Placar)
    desenharHUD();

    // 7. Telas de Menu / Game Over
    if (estado === 'MENU' || estado === 'GAMEOVER') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(0, 0, LARGURA, ALTURA);

        ctx.fillStyle = '#ffcc00';
        ctx.font = 'bold 36px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText(estado === 'MENU' ? 'ENDURO JS' : 'FIM DE JOGO', LARGURA / 2, ALTURA / 2 - 30);

        ctx.fillStyle = '#ffffff';
ctx.font = '18px Courier New';
if (estado === 'GAMEOVER') {
ctx.fillText(Você chegou até o Dia ${dia}!, LARGURA / 2, ALTURA / 2 + 10);
}
ctx.fillText('Pressione ESPAÇO ou CLIQUE para jogar', LARGURA / 2, ALTURA / 2 + 50);
}
}
