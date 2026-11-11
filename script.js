const canvas = document.getElementById('jogoDamas');
const ctx = canvas.getContext('2d');

const turnoTexto = document.getElementById('turnoTexto');
const placarVermelho = document.getElementById('placarVermelho');
const placarPreto = document.getElementById('placarPreto');
const btnReiniciar = document.getElementById('btnReiniciar');

// Configurações do Tabuleiro
const LINHAS = 8;
const COLUNAS = 8;
const TAMANHO_CASA = canvas.width / COLUNAS;

// Constantes de Peças
const VAZIO = 0;
const VERMELHO = 1;
const PRETO = 2;
const DAMA_VERMELHA = 3;
const DAMA_PRETA = 4;

// Estado do Jogo
let tabuleiro = [];
let turnoAtual = VERMELHO;
let pecaSelecionada = null;
let movimentosValidos = [];
let emCapturaMultipla = false;
let vencedor = null;

// Inicializa o jogo
function iniciarJogo() {
    tabuleiro = Array.from({ length: LINHAS }, () => Array(COLUNAS).fill(VAZIO));
    turnoAtual = VERMELHO;
    pecaSelecionada = null;
    movimentosValidos = [];
    emCapturaMultipla = false;
    vencedor = null;

    // Posiciona peças pretas (topo) e vermelhas (base)
    for (let l = 0; l < LINHAS; l++) {
        for (let c = 0; c < COLUNAS; c++) {
            if ((l + c) % 2 !== 0) {
                if (l < 3) tabuleiro[l][c] = PRETO;
                else if (l > 4) tabuleiro[l][c] = VERMELHO;
            }
        }
    }

    atualizarInterface();
    desenhar();
}

// Verifica se a peça pertence ao jogador do turno
function pertenceAoJogador(peca, jogador) {
    if (jogador === VERMELHO) return peca === VERMELHO || peca === DAMA_VERMELHA;
    if (jogador === PRETO) return peca === PRETO || peca === DAMA_PRETA;
    return false;
}

function ehDama(peca) {
    return peca === DAMA_VERMELHA || peca === DAMA_PRETA;
}

// Calcula movimentos possíveis para uma peça
function obterMovimentosPeca(linha, col, apenasCapturas = false) {
    const peca = tabuleiro[linha][col];
    if (peca === VAZIO) return [];

    const movimentos = [];
    const direcoes = [
        [-1, -1], [-1, 1], // Cima-esquerda, Cima-direita
        [1, -1],  [1, 1]   // Baixo-esquerda, Baixo-direita
    ];

    for (const [dl, dc] of direcoes) {
        // Peças comuns só andam para frente em movimentos simples
        const direcaoPermitida = (peca === VERMELHO && dl === -1) || (peca === PRETO && dl === 1) || ehDama(peca);

        const nl = linha + dl;
        const nc = col + dc;

        if (dentroDoTabuleiro(nl, nc)) {
            // Movimento simples
            if (!apenasCapturas && direcaoPermitida && tabuleiro[nl][nc] === VAZIO) {
                movimentos.push({ linha: nl, col: nc, captura: null });
            }

            // Movimento de captura (pode capturar para frente ou para trás)
            const sl = linha + dl * 2;
            const sc = col + dc * 2;
            if (dentroDoTabuleiro(sl, sc)) {
                const pecaMeio = tabuleiro[nl][nc];
                if (pecaMeio !== VAZIO && !pertenceAoJogador(pecaMeio, turnoAtual) && tabuleiro[sl][sc] === VAZIO) {
                    movimentos.push({
                        linha: sl,
                        col: sc,
                        captura: { linha: nl, col: nc }
                    });
                }
            }
        }
    }

    return movimentos;
}

// Verifica se existe alguma captura obrigatória no tabuleiro para o jogador atual
function jogadorTemCapturaObrigatoria() {
    for (let l = 0; l < LINHAS; l++) {
        for (let c = 0; c < COLUNAS; c++) {
            if (pertenceAoJogador(tabuleiro[l][c], turnoAtual)) {
                const movs = obterMovimentosPeca(l, c, true);
                if (movs.some(m => m.captura !== null)) return true;
            }
        }
    }
    return false;
}

function dentroDoTabuleiro(l, c) {
    return l >= 0 && l < LINHAS && c >= 0 && c < COLUNAS;
}

// Clique no tabuleiro
canvas.addEventListener('click', (e) => {
    if (vencedor) return;

    const rect = canvas.getBoundingClientRect();
    const escalaX = canvas.width / rect.width;
    const escalaY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * escalaX;
    const y = (e.clientY - rect.top) * escalaY;

    const col = Math.floor(x / TAMANHO_CASA);
    const linha = Math.floor(y / TAMANHO_CASA);

    if (!dentroDoTabuleiro(linha, col)) return;

    // 1. Verifica se clicou em um destino válido da peça selecionada
    const movimentoEscolhido = movimentosValidos.find(m => m.linha === linha && m.col === col);
    if (pecaSelecionada && movimentoEscolhido) {
        executarMovimento(pecaSelecionada, movimentoEscolhido);
        return;
    }

    // 2. Se estiver no meio de uma captura múltipla, não pode trocar de peça
    if (emCapturaMultipla) return;

    // 3. Seleciona uma peça do jogador atual
    if (pertenceAoJogador(tabuleiro[linha][col], turnoAtual)) {
        const obrigatorioCapturar = jogadorTemCapturaObrigatoria();
        const movs = obterMovimentosPeca(linha, col, obrigatorioCapturar);

        pecaSelecionada = { linha, col };
        movimentosValidos = obrigatorioCapturar ? movs.filter(m => m.captura !== null) : movs;
        desenhar();
    }
});

function executarMovimento(origem, destino) {
    const peca = tabuleiro[origem.linha][origem.col];
    tabuleiro[destino.linha][destino.col] = peca;
    tabuleiro[origem.linha][origem.col] = VAZIO;

    let capturou = false;

    // Remove peça capturada
    if (destino.captura) {
        tabuleiro[destino.captura.linha][destino.captura.col] = VAZIO;
        capturou = true;
    }

    // Verifica promoção a Dama
    let promoveu = false;
    if (peca === VERMELHO && destino.linha === 0) {
        tabuleiro[destino.linha][destino.col] = DAMA_VERMELHA;
        promoveu = true;
    } else if (peca === PRETO && destino.linha === LINHAS - 1) {
        tabuleiro[destino.linha][destino.col] = DAMA_PRETA;
        promoveu = true;
    }

    // Verifica possibilidade de captura múltipla em cadeia
    if (capturou && !promoveu) {
        const novasCapturas = obterMovimentosPeca(destino.linha, destino.col, true).filter(m => m.captura !== null);
        if (novasCapturas.length > 0) {
            emCapturaMultipla = true;
            pecaSelecionada = { linha: destino.linha, col: destino.col };
            movimentosValidos = novasCapturas;
            atualizarInterface();
            desenhar();
            return;
        }
    }

    // Finaliza turno
    emCapturaMultipla = false;
    pecaSelecionada = null;
    movimentosValidos = [];
    turnoAtual = turnoAtual === VERMELHO ? PRETO : VERMELHO;

    verificarVitoria();
    atualizarInterface();
    desenhar();
}

function verificarVitoria() {
    let contVermelho = 0;
    let contPreto = 0;
    let temMovimento = false;

    for (let l = 0; l < LINHAS; l++) {
        for (let c = 0; c < COLUNAS; c++) {
            const p = tabuleiro[l][c];
            if (pertenceAoJogador(p, VERMELHO)) contVermelho++;
            if (pertenceAoJogador(p, PRETO)) contPreto++;

            if (pertenceAoJogador(p, turnoAtual)) {
                if (obterMovimentosPeca(l, c, false).length > 0) {
                    temMovimento = true;
                }
            }
        }
    }

    placarVermelho.textContent = contVermelho;
    placarPreto.textContent = contPreto;

    if (contVermelho === 0 || (turnoAtual === VERMELHO && !temMovimento)) {
        vencedor = 'Pretas';
    } else if (contPreto === 0 || (turnoAtual === PRETO && !temMovimento)) {
        vencedor = 'Vermelhas';
    }
}

function atualizarInterface() {
    if (vencedor) {
        turnoTexto.innerHTML = `Vitória das: <strong>${vencedor}</strong>!`;
        return;
    }

    const corNome = turnoAtual === VERMELHO ? 'Vermelhas' : 'Pretas';
    const avisoCaptura = jogadorTemCapturaObrigatoria() ? ' (Captura obrigatória!)' : '';
    turnoTexto.innerHTML = `Vez das: <strong>${corNome}</strong>${avisoCaptura}`;
}

// Renderização do Tabuleiro e Peças
function desenhar() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let l = 0; l < LINHAS; l++) {
        for (let c = 0; c < COLUNAS; c++) {
            const x = c * TAMANHO_CASA;
            const y = l * TAMANHO_CASA;

            // Casas claras e escuras
            const casaEscura = (l + c) % 2 !== 0;
            ctx.fillStyle = casaEscura ? '#7a4b2a' : '#f0d9b5';
            ctx.fillRect(x, y, TAMANHO_CASA, TAMANHO_CASA);

            // Destaque da peça selecionada
            if (pecaSelecionada && pecaSelecionada.linha === l && pecaSelecionada.col === c) {
                ctx.fillStyle = 'rgba(255, 215, 0, 0.45)';
                ctx.fillRect(x, y, TAMANHO_CASA, TAMANHO_CASA);
            }

            // Destaque dos movimentos válidos
            if (movimentosValidos.some(m => m.linha === l && m.col === c)) {
                ctx.fillStyle = 'rgba(46, 204, 113, 0.55)';
                ctx.beginPath();
                ctx.arc(x + TAMANHO_CASA / 2, y + TAMANHO_CASA / 2, TAMANHO_CASA * 0.22, 0, Math.PI * 2);
                ctx.fill();
            }

            // Desenhar Peça
            const peca = tabuleiro[l][c];
            if (peca !== VAZIO) {
                desenharPeca(x + TAMANHO_CASA / 2, y + TAMANHO_CASA / 2, peca);
            }
        }
    }

    // Tela de Vitória sobreposta
    if (vencedor) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#e0a96d';
        ctx.font = 'bold 34px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`VITÓRIA DAS ${vencedor.toUpperCase()}!`, canvas.width / 2, canvas.height / 2 - 10);

        ctx.fillStyle = '#ffffff';
        ctx.font = '18px Arial';
        ctx.fillText('Clique em "Reiniciar Jogo" para jogar novamente', canvas.width / 2, canvas.height / 2 + 28);
    }
}

function desenharPeca(cx, cy, tipo) {
    const raio = TAMANHO_CASA * 0.38;
    const ehVermelha = tipo === VERMELHO || tipo === DAMA_VERMELHA;

    // Sombra da peça
