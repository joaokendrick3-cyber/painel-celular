import { useMemo, useState } from 'react'
import type { ResumoCelular } from '@shared/celular'
import type { ItemClassroom, MaterialEstudo } from '@shared/tipos'
import { formatarDiaMes } from '@shared/datas'

type Pacote = ResumoCelular['pacotes'][number]

function Topo({ titulo, sub, onVoltar }: { titulo: string; sub?: string; onVoltar: () => void }) {
  return (
    <>
      <button className="voltar" onClick={onVoltar}>‹ Voltar</button>
      <div className="titulo-tela"><h1>{titulo}</h1>{sub && <small>{sub}</small>}</div>
    </>
  )
}

const ROTULO_TIPO: Record<string, string> = {
  drive: 'Arquivo do Drive', email: 'Anexo de e-mail', link: 'Link', youtube: 'Vídeo', formulario: 'Formulário', arquivo: 'Arquivo'
}
const dataCurta = (iso: string): string => formatarDiaMes(iso.slice(0, 10))

// ------------------------------------------------------------------------------------ Materiais
/** Procura o endereço do material nos anexos dos avisos do Classroom (o resumo guarda só os títulos dos materiais). */
function enderecoDoMaterial(m: MaterialEstudo, itens: ItemClassroom[]): string | null {
  for (const i of itens) {
    if (i.disciplinaId !== m.disciplinaId) continue
    const a = i.anexos.find((x) => x.titulo === m.titulo && x.url && !x.url.startsWith('gmail://'))
    if (a) return a.url
  }
  return null
}

export function Materiais({ r, onVoltar }: { r: ResumoCelular; onVoltar: () => void }) {
  const [disciplina, setDisciplina] = useState('todas')
  const [leitura, setLeitura] = useState<'todos' | 'nao' | 'sim'>('todos')
  const [busca, setBusca] = useState('')
  const disciplinas = useMemo(() => [...new Map(r.materiais.map((m) => [m.disciplinaId, m.disciplinaNome])).entries()], [r])
  const lista = r.materiais.filter(
    (m) =>
      (disciplina === 'todas' || String(m.disciplinaId) === disciplina) &&
      (leitura === 'todos' || (leitura === 'nao' ? !m.lido : m.lido)) &&
      m.titulo.toLowerCase().includes(busca.trim().toLowerCase())
  )
  const naoLidos = r.materiais.filter((m) => !m.lido).length

  return (
    <>
      <Topo titulo="Materiais" sub={`${r.materiais.length} no total · ${naoLidos} não lidos`} onVoltar={onVoltar} />
      <section className="cartao filtros">
        <input className="busca" placeholder="Buscar material" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <select value={disciplina} onChange={(e) => setDisciplina(e.target.value)}>
          <option value="todas">Todas as matérias</option>
          {disciplinas.map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
        </select>
        <div className="segmentos">
          {([['todos', 'Todos'], ['nao', 'Não lidos'], ['sim', 'Lidos']] as const).map(([v, t]) => (
            <button key={v} className={leitura === v ? 'ativa' : ''} onClick={() => setLeitura(v)}>{t}</button>
          ))}
        </div>
      </section>
      <section className="cartao">
        {lista.length === 0 && <span className="suave">Nenhum material com esses filtros.</span>}
        {lista.slice(0, 120).map((m) => {
          const url = enderecoDoMaterial(m, r.itens)
          const corpo = (
            <>
              <div className="col">
                <strong>{m.titulo}</strong>
                <small>{m.disciplinaNome} · {ROTULO_TIPO[m.tipo] ?? m.tipo} · {dataCurta(m.publicadoEm)}</small>
              </div>
              <div className="col direita">
                {!m.lido ? <span className="selo roxo">novo</span> : <span className="selo neutro">lido</span>}
                {url && <small className="abrir">Abrir ↗</small>}
              </div>
            </>
          )
          return url
            ? <a className="linha prova material" key={m.id} href={url} target="_blank" rel="noreferrer">{corpo}</a>
            : <div className="linha prova material" key={m.id}>{corpo}</div>
        })}
        {lista.length > 120 && <span className="suave">Mostrando os 120 mais recentes.</span>}
      </section>
    </>
  )
}

// ------------------------------------------------------------------------------------ Estudos
export function Estudos({ r, onVoltar }: { r: ResumoCelular; onVoltar: () => void }) {
  const [pacote, setPacote] = useState<Pacote | null>(null)
  const [revisando, setRevisando] = useState(false)

  if (revisando) {
    const cartoes = r.cartoesDevidos.map((c) => ({ id: c.id, frente: c.frente, verso: c.verso, rotulo: `${c.disciplinaNome} · ${c.pacoteTitulo}` }))
    return (
      <>
        <Topo titulo="Hora de revisar" sub={`${cartoes.length} cartões vencem hoje`} onVoltar={() => setRevisando(false)} />
        <Cartoes cartoes={cartoes} aviso="Para registrar quem você acertou, revise no computador." />
      </>
    )
  }
  if (pacote) return <PacoteTela p={pacote} onVoltar={() => setPacote(null)} />

  const devidos = r.cartoesDevidos.length
  return (
    <>
      <Topo titulo="Estudos" sub={`${r.pacotes.length} ${r.pacotes.length === 1 ? "pacote" : "pacotes"} de estudo`} onVoltar={onVoltar} />
      {devidos > 0 && (
        <section className="cartao destaque" onClick={() => setRevisando(true)}>
          <small className="rotulo">Hora de revisar</small>
          <strong className="grande">{devidos} {devidos === 1 ? 'cartão vence' : 'cartões vencem'} hoje</strong>
          <span className="suave">Toque para ver os cartões (só leitura).</span>
        </section>
      )}
      {r.pacotes.length === 0 && <section className="cartao"><span className="suave">Nenhum pacote ainda. Crie um na aba Estudos do PAINEL no computador.</span></section>}
      {r.pacotes.map((p) => (
        <section className="cartao clicavel" key={p.id} onClick={() => setPacote(p)}>
          <div className="linha topo-cartao"><strong>{p.titulo}</strong>{p.devidos > 0 && <span className="selo roxo">{p.devidos} p/ hoje</span>}</div>
          <small className="suave">{p.disciplinaNome} · criado em {dataCurta(p.criadoEm)}</small>
          <div className="quatro dois">
            <div><small>Flashcards</small><b>{p.flashcards}</b></div>
            <div><small>Simulado</small><b>{p.questoes} questões</b></div>
          </div>
          {p.ultimaTentativa && <small className="suave">Último simulado: {p.ultimaTentativa.acertos} de {p.ultimaTentativa.total}</small>}
        </section>
      ))}
    </>
  )
}

type Parte = 'resumo' | 'caem' | 'cartoes' | 'simulado'

function PacoteTela({ p, onVoltar }: { p: Pacote; onVoltar: () => void }) {
  const [parte, setParte] = useState<Parte>('resumo')
  const partes: [Parte, string][] = [['resumo', 'Resumo'], ['caem', 'Mais cai'], ['cartoes', 'Cartões'], ['simulado', 'Simulado']]
  return (
    <>
      <Topo titulo={p.titulo} sub={p.disciplinaNome} onVoltar={onVoltar} />
      <div className="segmentos fixo">
        {partes.map(([v, t]) => <button key={v} className={parte === v ? 'ativa' : ''} onClick={() => setParte(v)}>{t}</button>)}
      </div>
      {parte === 'resumo' && (
        p.resumo.length === 0 ? <section className="cartao"><span className="suave">Sem resumo neste pacote.</span></section> :
        p.resumo.map((t, i) => (
          <section className="cartao" key={i}>
            <strong>{t.topico}</strong>
            <ul className="pontos">{t.pontos.map((x, j) => <li key={j}>{x}</li>)}</ul>
          </section>
        ))
      )}
      {parte === 'caem' && (
        <section className="cartao">
          {p.maisCaem.length === 0 && <span className="suave">Sem lista de "o que mais cai".</span>}
          <ul className="pontos">{p.maisCaem.map((x, i) => <li key={i}>{x}</li>)}</ul>
        </section>
      )}
      {parte === 'cartoes' && (
        <Cartoes cartoes={p.flashcards_lista.map((c) => ({ id: c.id, frente: c.frente, verso: c.verso, rotulo: `Caixa ${c.caixa}` }))} />
      )}
      {parte === 'simulado' && <Simulado p={p} />}
    </>
  )
}

function Cartoes({ cartoes, aviso }: { cartoes: { id: number; frente: string; verso: string; rotulo: string }[]; aviso?: string }) {
  const [i, setI] = useState(0)
  const [virado, setVirado] = useState(false)
  if (cartoes.length === 0) return <section className="cartao"><span className="suave">Nenhum cartão.</span></section>
  const c = cartoes[Math.min(i, cartoes.length - 1)]
  const ir = (d: number): void => { setI((x) => Math.max(0, Math.min(cartoes.length - 1, x + d))); setVirado(false) }
  return (
    <>
      <section className={`cartao flash ${virado ? 'virado' : ''}`} onClick={() => setVirado(!virado)}>
        <small className="rotulo">{virado ? 'Resposta' : 'Pergunta'} · {c.rotulo}</small>
        <div className="flash-texto">{virado ? c.verso : c.frente}</div>
        <small className="suave">Toque para {virado ? 'voltar à pergunta' : 'ver a resposta'}</small>
      </section>
      <div className="navegar">
        <button className="botao" disabled={i === 0} onClick={() => ir(-1)}>‹ Anterior</button>
        <span className="suave">{Math.min(i, cartoes.length - 1) + 1} de {cartoes.length}</span>
        <button className="botao" disabled={i >= cartoes.length - 1} onClick={() => ir(1)}>Próximo ›</button>
      </div>
      {aviso && <p className="suave centro">{aviso}</p>}
    </>
  )
}

function Simulado({ p }: { p: Pacote }) {
  const [respostas, setRespostas] = useState<Record<number, number>>({})
  const [fim, setFim] = useState(false)
  const qs = p.simulado
  if (qs.length === 0) return <section className="cartao"><span className="suave">Este pacote não tem simulado.</span></section>
  const acertos = qs.filter((q) => respostas[q.id] === q.correta).length
  const LETRAS = 'ABCDEFGH'
  return (
    <>
      {qs.map((q, n) => (
        <section className="cartao" key={q.id}>
          <small className="rotulo">Questão {n + 1}</small>
          <strong className="enunciado">{q.enunciado}</strong>
          <div className="alternativas">
            {q.alternativas.map((a, k) => {
              const marcada = respostas[q.id] === k
              const estado = fim ? (k === q.correta ? 'certa' : marcada ? 'errada' : '') : marcada ? 'marcada' : ''
              return (
                <button key={k} className={`alt ${estado}`} disabled={fim} onClick={() => setRespostas({ ...respostas, [q.id]: k })}>
                  <b>{LETRAS[k]}</b><span>{a}</span>
                </button>
              )
            })}
          </div>
          {fim && q.explicacao && <p className="explicacao">{q.explicacao}</p>}
        </section>
      ))}
      <section className="cartao">
        {!fim ? (
          <button className="botao primario" disabled={Object.keys(respostas).length === 0} onClick={() => setFim(true)}>Corrigir</button>
        ) : (
          <>
            <strong className="grande">Você acertou {acertos} de {qs.length}</strong>
            <button className="botao" onClick={() => { setRespostas({}); setFim(false) }}>Refazer</button>
            <small className="suave">Este resultado fica só no celular; o histórico oficial é o do computador.</small>
          </>
        )}
      </section>
    </>
  )
}
