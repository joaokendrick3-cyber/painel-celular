import { useEffect, useRef } from 'react'
import './capa.css'

// Capa de abertura do PAINEL: a mesma do Portfólio (fundo de bolinhas que reagem ao mouse, título grande com
// letras que sobem, frases digitadas e o "deslize para entrar"), só que em roxo no lugar do preto.
// Enquanto a capa aparece o app já está carregado por trás. Depois de entrar, a animação do fundo PARA.

const FRASES = ['Seu semestre em um só lugar', 'Faltas · Notas · Provas', 'SISAV e Classroom sincronizados', 'Materiais e estudos']

const CFG = {
  espaco: 14, // distância entre as bolinhas
  raioBase: 0.8, // bolinha apagada
  raioMax: 2.6, // bolinha acesa
  alcance: 95, // raio da área que o mouse acende
  desvanecer: 0.95, // duração do rastro
  repulsao: 10 // quanto as bolinhas fogem do mouse
}
// Cor das bolinhas: de um roxo apagado a um lilás claro (o fundo roxo vem do CSS).
const COR_BASE = [118, 90, 232]
const COR_MAX = [232, 222, 255]

const NIVEIS = 28

export default function Capa({ onEntrou, onSaindo, voltando = false }: { onEntrou: () => void; onSaindo: () => void; voltando?: boolean }) {
  const capaRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const tituloRef = useRef<HTMLHeadingElement>(null)
  const digitandoRef = useRef<HTMLSpanElement>(null)
  const controleRef = useRef<HTMLDivElement>(null)
  const bolaRef = useRef<HTMLButtonElement>(null)
  const entrarRef = useRef<() => void>(() => {})

  useEffect(() => {
    const capa = capaRef.current!
    const canvas = canvasRef.current!
    const titulo = tituloRef.current!
    const alvoTexto = digitandoRef.current!
    const controle = controleRef.current!
    const bola = bolaRef.current!
    const ctx = canvas.getContext('2d')!
    const reduzirMovimento = false // a capa sempre anima

    let largura = 0, altura = 0, colunas = 0, linhas = 0, offX = 0, offY = 0, total = 0
    let px = new Float32Array(0), py = new Float32Array(0), dx = new Float32Array(0), dy = new Float32Array(0)
    let vx = new Float32Array(0), vy = new Float32Array(0), brilho = new Float32Array(0), balde = new Uint8Array(0)
    const mouse = { x: -9999, y: -9999, antX: -9999, antY: -9999, ultimoMov: 0 }
    const ondas: { x: number; y: number; inicio: number; forca: number }[] = []
    let animando = true
    const timers: number[] = []

    function montarGrade(): void {
      const dpr = 1 // bolinhas minúsculas: resolução 1x basta e poupa a placa de vídeo em telas de alta densidade
      largura = window.innerWidth
      altura = window.innerHeight
      canvas.width = largura * dpr
      canvas.height = altura * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      colunas = Math.ceil(largura / CFG.espaco) + 1
      linhas = Math.ceil(altura / CFG.espaco) + 1
      offX = (largura - (colunas - 1) * CFG.espaco) / 2
      offY = (altura - (linhas - 1) * CFG.espaco) / 2
      total = colunas * linhas
      px = new Float32Array(total); py = new Float32Array(total)
      dx = new Float32Array(total); dy = new Float32Array(total)
      vx = new Float32Array(total); vy = new Float32Array(total)
      brilho = new Float32Array(total); balde = new Uint8Array(total)
      for (let i = 0; i < colunas; i++) {
        for (let j = 0; j < linhas; j++) {
          const k = i * linhas + j
          px[k] = offX + i * CFG.espaco
          py[k] = offY + j * CFG.espaco
        }
      }
    }

    function acender(x: number, y: number, empurrar: boolean): void {
      const R = CFG.alcance
      const i1 = Math.max(0, Math.floor((x - R - offX) / CFG.espaco))
      const i2 = Math.min(colunas - 1, Math.ceil((x + R - offX) / CFG.espaco))
      const j1 = Math.max(0, Math.floor((y - R - offY) / CFG.espaco))
      const j2 = Math.min(linhas - 1, Math.ceil((y + R - offY) / CFG.espaco))
      for (let i = i1; i <= i2; i++) {
        for (let j = j1; j <= j2; j++) {
          const k = i * linhas + j
          const ddx = px[k] - x, ddy = py[k] - y
          const d = Math.hypot(ddx, ddy)
          if (d >= R) continue
          const f = 1 - d / R
          brilho[k] = Math.max(brilho[k], f * f)
          if (empurrar && d > 0.001) {
            const forca = f * f * CFG.repulsao * 0.08
            vx[k] += (ddx / d) * forca
            vy[k] += (ddy / d) * forca
          }
        }
      }
    }

    function novaOnda(x: number, y: number, forca = 1): void {
      ondas.push({ x, y, inicio: performance.now(), forca })
      if (ondas.length > 6) ondas.shift()
    }

    const contagem = new Uint32Array(NIVEIS + 1)
    let ordem = new Uint32Array(0)

    function quadro(agora: number): void {
      if (!animando) return
      const t = agora / 1000

      if (mouse.antX > -9000) {
        const dist = Math.hypot(mouse.x - mouse.antX, mouse.y - mouse.antY)
        const passos = Math.max(1, Math.ceil(dist / 12))
        for (let s = 1; s <= passos; s++) {
          acender(mouse.antX + (mouse.x - mouse.antX) * (s / passos), mouse.antY + (mouse.y - mouse.antY) * (s / passos), s === passos && dist > 0.5)
        }
      }
      mouse.antX = mouse.x
      mouse.antY = mouse.y

      for (let o = ondas.length - 1; o >= 0; o--) {
        const onda = ondas[o]
        const idade = agora - onda.inicio
        if (idade > 2200) { ondas.splice(o, 1); continue }
        const raio = idade * 0.55
        const intensidade = (1 - idade / 2200) * onda.forca
        const lim = raio + 30
        for (let k = 0; k < total; k++) {
          const ddx = px[k] - onda.x, ddy = py[k] - onda.y
          if (ddx > lim || ddx < -lim || ddy > lim || ddy < -lim) continue // longe demais da onda: nem calcula
          const d = Math.hypot(ddx, ddy)
          const faixa = Math.abs(d - raio)
          if (faixa < 30) {
            const f = (1 - faixa / 30) * intensidade
            brilho[k] = Math.max(brilho[k], f * 0.9)
            if (d > 0.001) { vx[k] += (ddx / d) * f * 0.35; vy[k] += (ddy / d) * f * 0.35 }
          }
        }
      }

      if (!reduzirMovimento && agora - mouse.ultimoMov > 3500 && Math.random() < 0.006) {
        novaOnda(Math.random() * largura, Math.random() * altura, 0.6)
      }
      for (let s = 0; s < 3; s++) {
        const k = (Math.random() * total) | 0
        brilho[k] = Math.max(brilho[k], 0.35 + Math.random() * 0.4)
      }

      contagem.fill(0)
      for (let k = 0; k < total; k++) {
        vx[k] += -dx[k] * 0.06; vy[k] += -dy[k] * 0.06
        vx[k] *= 0.82; vy[k] *= 0.82
        dx[k] += vx[k]; dy[k] += vy[k]
        brilho[k] *= CFG.desvanecer
        if (brilho[k] < 0.003) brilho[k] = 0
        let amb = 0
        if (!reduzirMovimento) {
          const w = Math.sin(px[k] * 0.009 + t * 0.7) * Math.sin(py[k] * 0.011 - t * 0.5)
          amb = w > 0 ? w * w * w * 0.22 : 0
        }
        const b = Math.round(Math.min(1, brilho[k] + amb) * (NIVEIS - 1))
        balde[k] = b
        contagem[b]++
      }

      if (ordem.length !== total) ordem = new Uint32Array(total)
      const inicio = new Uint32Array(NIVEIS + 1)
      for (let b = 1; b <= NIVEIS; b++) inicio[b] = inicio[b - 1] + contagem[b - 1]
      const cursor = inicio.slice()
      for (let k = 0; k < total; k++) ordem[cursor[balde[k]]++] = k

      ctx.clearRect(0, 0, largura, altura)
      for (let b = 0; b < NIVEIS; b++) {
        const n = contagem[b]
        if (!n) continue
        const nivel = b / (NIVEIS - 1)
        const cor = COR_BASE.map((c, i) => Math.round(c + (COR_MAX[i] - c) * nivel))
        const r = CFG.raioBase + (CFG.raioMax - CFG.raioBase) * nivel
        ctx.beginPath()
        for (let q = inicio[b]; q < inicio[b] + n; q++) {
          const k = ordem[q]
          const x = px[k] + dx[k], y = py[k] + dy[k]
          if (r < 1.2) ctx.rect(x - r, y - r, r * 2, r * 2)
          else { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, Math.PI * 2) }
        }
        ctx.fillStyle = `rgb(${cor[0]},${cor[1]},${cor[2]})`
        ctx.fill()
      }
      requestAnimationFrame(quadro)
    }

    // ---- mouse no fundo
    const mover = (x: number, y: number): void => {
      if (mouse.antX < -9000) { mouse.antX = x; mouse.antY = y }
      mouse.x = x; mouse.y = y
      mouse.ultimoMov = performance.now()
    }
    const aoMover = (e: PointerEvent): void => mover(e.clientX, e.clientY)
    const aoSair = (): void => { mouse.x = mouse.antX = -9999 }
    const aoClicar = (e: PointerEvent): void => {
      if (!(e.target as HTMLElement).closest('.deslizar')) novaOnda(e.clientX, e.clientY)
    }
    capa.addEventListener('pointermove', aoMover)
    capa.addEventListener('pointerleave', aoSair)
    capa.addEventListener('pointerup', aoSair)
    capa.addEventListener('pointerdown', aoClicar)
    let esperaResize = 0
    const aoRedimensionar = (): void => {
      if (!animando) return
      clearTimeout(esperaResize)
      esperaResize = window.setTimeout(montarGrade, 120)
    }
    window.addEventListener('resize', aoRedimensionar)

    // ---- título: uma letra por <span> (sobem quando o mouse passa)
    titulo.innerHTML = ''
    ;[...'PAINEL'].forEach((l, i) => {
      const s = document.createElement('span')
      s.className = 'letra'
      s.style.setProperty('--i', String(i))
      s.textContent = l
      titulo.appendChild(s)
    })

    // ---- frases digitadas
    let fraseAtual = 0, letraAtual = 0, apagando = false
    function digitar(): void {
      if (!animando) return
      const frase = FRASES[fraseAtual]
      if (!apagando) {
        letraAtual++
        if (letraAtual > frase.length) { apagando = true; timers.push(window.setTimeout(digitar, 2200)); return }
      } else {
        letraAtual--
        if (letraAtual === 0) { apagando = false; fraseAtual = (fraseAtual + 1) % FRASES.length }
      }
      alvoTexto.textContent = frase.slice(0, letraAtual)
      timers.push(window.setTimeout(digitar, apagando ? 28 : 60))
    }

    // ---- deslize para entrar
    const LIMIAR = 0.88
    let arrasto: { inicioX: number } | null = null
    let x = 0
    const maximo = (): number => controle.clientWidth - bola.offsetWidth - (controle.clientHeight - bola.offsetHeight) - 2
    function posicionar(novoX: number): void {
      const max = maximo()
      x = Math.max(0, Math.min(max, novoX))
      controle.style.setProperty('--x', `${x}px`)
      controle.style.setProperty('--progresso', (x / max).toFixed(3))
    }
    const aoBaixar = (e: PointerEvent): void => {
      arrasto = { inicioX: e.clientX - x }
      try { bola.setPointerCapture(e.pointerId) } catch { /* o arrasto ainda funciona dentro da bola */ }
      controle.classList.add('arrastando')
      controle.classList.remove('voltando')
    }
    const aoArrastar = (e: PointerEvent): void => {
      if (!arrasto) return
      posicionar(e.clientX - arrasto.inicioX)
      const r = bola.getBoundingClientRect()
      acender(r.left + r.width / 2, r.top + r.height / 2, true)
    }
    const soltar = (): void => {
      if (!arrasto) return
      arrasto = null
      controle.classList.remove('arrastando')
      if (x >= maximo() * LIMIAR) entrar()
      else { controle.classList.add('voltando'); posicionar(0) }
    }
    const aoTeclar = (e: KeyboardEvent): void => {
      if (e.key === 'Enter' || e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); entrar() }
    }
    bola.addEventListener('pointerdown', aoBaixar)
    bola.addEventListener('pointermove', aoArrastar)
    bola.addEventListener('pointerup', soltar)
    bola.addEventListener('pointercancel', soltar)
    window.addEventListener('keydown', aoTeclar) // teclado em qualquer lugar da capa (a bola não fica com foco: o anel de foco a deixava quadrada)

    let entrou = false
    function entrar(): void {
      if (entrou) return
      entrou = true
      controle.classList.add('completando')
      posicionar(maximo())
      animando = false // para o fundo antes da saída (milhares de pontos disputariam o processador com a animação)
      timers.push(window.setTimeout(() => {
        void capa.offsetWidth
        capa.classList.add('saindo')
        onSaindo() // o app começa a "chegar" por trás enquanto a capa se desfaz
      }, 220))
      timers.push(window.setTimeout(onEntrou, 1100))
    }
    entrarRef.current = entrar

    // ---- início
    montarGrade()
    novaOnda(largura / 2, altura / 2, 1)
    timers.push(window.setTimeout(digitar, 900))
    requestAnimationFrame(quadro)

    return () => {
      animando = false
      timers.forEach(clearTimeout)
      clearTimeout(esperaResize)
      window.removeEventListener('resize', aoRedimensionar)
      capa.removeEventListener('pointermove', aoMover)
      capa.removeEventListener('pointerleave', aoSair)
      capa.removeEventListener('pointerup', aoSair)
      capa.removeEventListener('pointerdown', aoClicar)
      window.removeEventListener('keydown', aoTeclar)
    }
  }, [onEntrou, onSaindo])

  return (
    <div className={voltando ? 'capa voltando' : 'capa'} ref={capaRef}>
      <canvas className="capa-fundo" ref={canvasRef} />
      <div className="capa-arrastar" />
      <div className="capa-conteudo">
        <h1 className="titulo" ref={tituloRef}>PAINEL</h1>
        <p className="subtitulo"><span ref={digitandoRef} /><span className="cursor">|</span></p>
        <div className="deslizar" ref={controleRef}>
          <div className="deslizar-trilha" />
          <span className="deslizar-texto"><span className="pulso">deslize para entrar</span></span>
          <button className="deslizar-bola" ref={bolaRef} aria-label="Arraste para a direita para entrar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
          </button>
        </div>
      </div>
    </div>
  )
}
