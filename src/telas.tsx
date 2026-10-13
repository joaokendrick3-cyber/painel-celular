import { useMemo, useState } from 'react'
import type { ResumoCelular } from '@shared/celular'
import type { Prova } from '@shared/tipos'
import { mediaDoCurso, montarPainel } from '@shared/painel'
import { calcularLimite, formatarAulas, formatarDias } from '@shared/faltas'
import { avaliarDisciplina, formatarMedia, formatarNota, type Situacao } from '@shared/notas'
import { contagem, ordenarProvas } from '@shared/provas'
import { nomeDaProva } from '@shared/regras'
import { diaDaSemana, formatarDiaMes, mesPorExtenso } from '@shared/datas'
import { datasDoDia, datasDoMes, tipoPrincipal } from '@shared/calendarioUEM'
import { Disc, NomeDisc } from './disciplinas'
import { Estudos, Materiais } from './estudos'
import AvisosPush from './avisosPush'

/** Semestre atual da UEM: 1º de março a julho, 2º de agosto a dezembro. */
function semestreAtual(hoje: string): { ano: number; semestre: number } {
  return { ano: Number(hoje.slice(0, 4)), semestre: Number(hoje.slice(5, 7)) >= 8 ? 2 : 1 }
}

const ROTULO: Record<Situacao, string> = {
  'sem-notas': 'Sem notas', parcial: 'Em andamento', aprovado: 'Aprovado',
  exame: 'Exame final', 'aprovado-exame': 'Aprovado no exame', reprovado: 'Reprovado'
}
const COR_SITUACAO: Record<Situacao, string> = {
  'sem-notas': 'neutro', parcial: 'neutro', aprovado: 'verde', exame: 'ciano', 'aprovado-exame': 'verde', reprovado: 'roxo'
}
const COR_URGENCIA = { urgente: 'roxo', proxima: 'ciano', normal: 'neutro', passada: 'neutro' } as const

function useDoSemestre(r: ResumoCelular) {
  const { ano, semestre } = semestreAtual(r.hoje)
  return useMemo(() => {
    const faltas = r.faltas.filter((f) => f.ano === ano && f.semestre === semestre)
    const notas = r.notas.filter((n) => n.ano === ano && n.semestre === semestre)
    const provas = r.provas.filter((p) => p.ano === ano && p.semestre === semestre)
    return { ano, semestre, faltas, notas, provas }
  }, [r, ano, semestre])
}

function Titulo({ children, sub }: { children: string; sub?: string }) {
  return (
    <div className="titulo-tela">
      <h1>{children}</h1>
      {sub && <small>{sub}</small>}
    </div>
  )
}

function nomeAtividade(p: Prova): string {
  return nomeDaProva(p)
}

// ---------------------------------------------------------------------------------------- Início
export function Inicio({ r, irPara }: { r: ResumoCelular; irPara: (aba: string) => void }) {
  const s = useDoSemestre(r)
  const painel = useMemo(
    () => montarPainel({ hoje: r.hoje, faltas: s.faltas, notas: s.notas, provas: s.provas, incluirPlanejadas: r.incluirPlanejadas }),
    [r, s]
  )
  const curso = useMemo(() => mediaDoCurso(r.notas), [r])
  const proxima = painel.proximas[0]
  const cont = proxima?.data ? contagem(proxima.data, r.hoje) : null
  const naoLidas = r.avisos.filter((a) => !a.lida).slice(0, 3)
  const revisar = r.cartoesDevidos.length

  return (
    <>
      <Titulo sub={`${diaDaSemana(r.hoje)}, ${formatarDiaMes(r.hoje)}`}>Hoje</Titulo>

      <section className="grade-2">
        <div className="cartao numero">
          <small>Média do semestre</small>
          <strong className="verde">{painel.mediaSemestre === null ? '–' : formatarMedia(painel.mediaSemestre)}</strong>
        </div>
        <div className="cartao numero">
          <small>Média do curso</small>
          <strong className="verde">{curso.media === null ? '–' : formatarMedia(curso.media)}</strong>
        </div>
      </section>

      <section className="cartao destaque" onClick={() => irPara('provas')}>
        <small className="rotulo">Próxima prova ou entrega</small>
        {proxima && cont ? (
          <>
            <strong className="grande">{nomeAtividade(proxima)}</strong>
            <span><Disc nome={proxima.disciplinaNome} curto /></span>
            <span className={`selo ${COR_URGENCIA[cont.urgencia]}`}>{cont.texto} · {formatarDiaMes(proxima.data!)}</span>
          </>
        ) : (
          <span className="suave">Nada marcado por enquanto.</span>
        )}
      </section>

      {painel.proximas.length > 1 && (
        <section className="cartao">
          <small className="rotulo">Depois disso</small>
          {painel.proximas.slice(1, 5).map((p) => {
            const c = p.data ? contagem(p.data, r.hoje) : null
            return (
              <div className="linha" key={p.id}>
                <div className="col"><strong>{nomeAtividade(p)}</strong><span><Disc nome={p.disciplinaNome} curto /></span></div>
                {c && <span className={`selo ${COR_URGENCIA[c.urgencia]}`}>{c.texto}</span>}
              </div>
            )
          })}
        </section>
      )}

      <section className="cartao" onClick={() => irPara('faltas')}>
        <small className="rotulo">Faltas: onde dá atenção</small>
        {painel.emRisco.length === 0 ? (
          <span className="suave">Tudo tranquilo nas faltas e nas notas.</span>
        ) : (
          painel.emRisco.map((l) => (
            <div className="linha risco" key={l.disciplinaId}>
              <NomeDisc nome={l.nome} curto />
              <div className="motivos">
                {l.motivos.map((m) => <span key={m} className={`selo ${l.semaforo === 'vermelho' ? 'roxo' : 'ciano'}`}>{m}</span>)}
              </div>
            </div>
          ))
        )}
        {painel.emRisco.map((l) => (r.observacoes[l.disciplinaId] ? <p className="obs" key={'o' + l.disciplinaId}>{r.observacoes[l.disciplinaId]}</p> : null))}
      </section>

      {naoLidas.length > 0 && (
        <section className="cartao" onClick={() => irPara('mais')}>
          <small className="rotulo">Avisos novos ({r.naoLidas})</small>
          {naoLidas.map((a) => (
            <div className="linha" key={a.id}><div className="col"><strong>{a.titulo}</strong><small>{a.mensagem}</small></div></div>
          ))}
        </section>
      )}

      {revisar > 0 && <section className="cartao"><small className="rotulo">Hora de revisar</small><span>{revisar} cartões de estudo vencem hoje (no computador).</span></section>}
    </>
  )
}

// ---------------------------------------------------------------------------------------- Faltas
export function Faltas({ r }: { r: ResumoCelular }) {
  const s = useDoSemestre(r)
  const [aberta, setAberta] = useState<number | null>(null)
  const periodo = `${s.ano}-${s.semestre}`
  const faltasDias = r.faltasPorPeriodo[periodo] ?? []
  const meses = s.semestre === 1 ? [3, 4, 5, 6, 7] : [8, 9, 10, 11, 12]
  const mesInicial = meses.includes(Number(r.hoje.slice(5, 7))) ? Number(r.hoje.slice(5, 7)) : meses[0]
  const [mes, setMes] = useState(mesInicial)
  const idx = meses.indexOf(mes)

  return (
    <>
      <Titulo sub={`${s.semestre}º semestre de ${s.ano}`}>Faltas</Titulo>
      {s.faltas.map((f) => {
        const lim = calcularLimite({ cargaHoraria: f.cargaHoraria, realizadasH: f.realizadasH, planejadasH: f.planejadasH, incluirPlanejadas: r.incluirPlanejadas })
        const total = f.realizadasH + f.planejadasH
        const pctReal = Math.min(100, (f.realizadasH / lim.limiteH) * 100)
        const pctPlan = Math.min(100 - pctReal, (f.planejadasH / lim.limiteH) * 100)
        const selo = lim.semaforo === 'vermelho' ? ['Estourou', 'vermelho'] : lim.semaforo === 'amarelo' ? ['Atenção', 'ciano'] : ['Tranquilo', 'verde']
        return (
          <section className="cartao" key={f.disciplinaId} onClick={() => setAberta(aberta === f.disciplinaId ? null : f.disciplinaId)}>
            <div className="linha topo-cartao"><NomeDisc nome={f.nome} /><span className={`selo ${selo[1]}`}>{selo[0]}</span></div>
            <div className="barra-faltas"><i className="real" style={{ width: pctReal + '%' }} /><i className="plan" style={{ width: pctPlan + '%' }} /></div>
            <div className="quatro">
              <div><small>Realizadas</small><b>{formatarAulas(f.realizadasH)}</b></div>
              <div><small>Planejadas</small><b>{formatarAulas(f.planejadasH)}</b></div>
              <div><small>SISAV</small><b>{f.sisavH === null ? '–' : formatarAulas(f.sisavH)}</b></div>
              <div><small>Limite</small><b>{formatarAulas(lim.limiteH)}</b></div>
            </div>
            <div className={`total ${lim.semaforo}`}><small>Faltas totais</small><b>{formatarAulas(total)}</b></div>
            {aberta === f.disciplinaId && (
              <ul className="dias">
                {faltasDias.filter((d) => d.disciplinaId === f.disciplinaId).sort((a, b) => a.data.localeCompare(b.data)).map((d) => (
                  <li key={d.data + d.origem}>
                    <span>{formatarDiaMes(d.data)} ({diaDaSemana(d.data)})</span>
                    <span className="suave">{d.status === 'planejada' ? 'planejada' : d.origem === 'sisav' ? 'SISAV' : 'seu registro'}</span>
                  </li>
                ))}
                {faltasDias.filter((d) => d.disciplinaId === f.disciplinaId).length === 0 && <li className="suave">Nenhuma falta registrada.</li>}
                <li className="suave">{formatarDias(total)} no total</li>
              </ul>
            )}
          </section>
        )
      })}

      <CalendarioFaltas
        r={r} ano={s.ano} mes={mes} faltasDias={faltasDias}
        onMes={(d) => { const n = meses[idx + d]; if (n) setMes(n) }}
        podeVoltar={idx > 0} podeAvancar={idx < meses.length - 1}
      />
    </>
  )
}

function CalendarioFaltas({ r, ano, mes, faltasDias, onMes, podeVoltar, podeAvancar }: {
  r: ResumoCelular; ano: number; mes: number; faltasDias: ResumoCelular['faltasPorPeriodo'][string]
  onMes: (d: number) => void; podeVoltar: boolean; podeAvancar: boolean
}) {
  const primeiro = new Date(ano, mes - 1, 1).getDay()
  const total = new Date(ano, mes, 0).getDate()
  const celulas: (string | null)[] = [...Array(primeiro).fill(null)]
  for (let d = 1; d <= total; d++) celulas.push(`${ano}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
  const porData = new Map<string, { real: boolean; plan: boolean; qtd: number }>()
  for (const f of faltasDias) {
    const e = porData.get(f.data) ?? { real: false, plan: false, qtd: 0 }
    if (f.status === 'planejada') e.plan = true
    else e.real = true
    e.qtd++
    porData.set(f.data, e)
  }
  const doMes = datasDoMes(ano, mes)
  return (
    <section className="cartao">
      <div className="linha topo-cartao nav-mes">
        <button className="botao-icone" onClick={() => onMes(-1)} disabled={!podeVoltar} aria-label="Mês anterior">‹</button>
        <strong className="mes">{mesPorExtenso(`${ano}-${String(mes).padStart(2, '0')}-01`)}</strong>
        <button className="botao-icone" onClick={() => onMes(1)} disabled={!podeAvancar} aria-label="Próximo mês">›</button>
      </div>
      <div className="grade-cal">
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((s, i) => <div className="cab" key={i}>{s}</div>)}
        {celulas.map((iso, i) => {
          if (!iso) return <div key={'v' + i} />
          const e = porData.get(iso)
          const uem = tipoPrincipal(datasDoDia(iso))
          const estado = e?.real ? 'realizada' : e?.plan ? 'planejada' : uem === 'feriado' ? 'feriado' : uem === 'ferias' ? 'ferias' : iso < r.hoje ? 'passado' : 'adiante'
          return <div key={iso} className={`dia ${estado} ${iso === r.hoje ? 'hoje' : ''}`}>{Number(iso.slice(8))}{e && e.qtd > 1 && <small>{e.qtd}</small>}</div>
        })}
      </div>
      <div className="legenda">
        <span><i className="am realizada" /> Faltou</span><span><i className="am planejada" /> Planejada</span>
        <span><i className="am feriado" /> Feriado</span><span><i className="am ferias" /> Férias</span>
      </div>
      {doMes.length > 0 && (
        <div className="datas-mes">
          <small className="rotulo">Calendário da UEM neste mês</small>
          {doMes.map((d) => <div className="linha" key={d.rotulo + d.nome}><small className="quando">{d.rotulo}</small><span className={d.tipo === 'feriado' ? 'feriado-txt' : ''}>{d.nome}</span></div>)}
        </div>
      )}
    </section>
  )
}

// ---------------------------------------------------------------------------------------- Notas
export function Notas({ r }: { r: ResumoCelular }) {
  const s = useDoSemestre(r)
  const resultados = s.notas.map((n) => ({ n, res: avaliarDisciplina({ p1: n.p1, p2: n.p2, final: n.final, pesoP1: n.pesoP1, pesoP2: n.pesoP2, mediaMinima: n.mediaMinima }) }))
  const painel = montarPainel({ hoje: r.hoje, faltas: s.faltas, notas: s.notas, provas: s.provas, incluirPlanejadas: r.incluirPlanejadas })
  return (
    <>
      <Titulo sub={`${s.semestre}º semestre de ${s.ano}`}>Notas</Titulo>
      <section className="cartao numero grande-numero">
        <small>Média do semestre</small>
        <strong className="verde">{painel.mediaSemestre === null ? '–' : formatarMedia(painel.mediaSemestre)}</strong>
      </section>
      {resultados.map(({ n, res }) => {
        const exame = n.final !== null || res.situacao === 'exame'
        const media = exame && res.mediaFinalArredondada !== null ? res.mediaFinalArredondada : res.mediaArredondada
        return (
          <section className="cartao" key={n.disciplinaId}>
            <div className="linha topo-cartao"><NomeDisc nome={n.nome} /><span className={`selo ${COR_SITUACAO[res.situacao]}`}>{ROTULO[res.situacao]}</span></div>
            <div className="quatro dois">
              <div className="caixa"><small>P1</small><b>{formatarNota(n.p1)}</b></div>
              <div className="caixa"><small>P2</small><b>{formatarNota(n.p2)}</b></div>
              <div className="caixa"><small>Exame</small><b>{formatarNota(n.final)}</b></div>
              <div className="caixa media"><small>{exame ? 'Média final' : 'Média'}</small><b>{formatarNota(media)}</b></div>
            </div>
          </section>
        )
      })}
    </>
  )
}

// ---------------------------------------------------------------------------------------- Provas
export function Provas({ r }: { r: ResumoCelular }) {
  const s = useDoSemestre(r)
  const [mostrarPassadas, setMostrarPassadas] = useState(false)
  const todas = ordenarProvas(s.provas)
  const proximas = todas.filter((p) => p.data !== null && p.data >= r.hoje && !p.concluida)
  const semData = todas.filter((p) => p.data === null)
  const passadas = todas.filter((p) => p.data !== null && (p.data < r.hoje || p.concluida) && !proximas.includes(p)).reverse()

  const linha = (p: Prova, passada = false) => {
    const c = p.data ? contagem(p.data, r.hoje) : null
    return (
      <div className="linha prova" key={p.id}>
        <div className="col">
          <strong>{nomeAtividade(p)}</strong>
          <span><Disc nome={p.disciplinaNome} />{p.hora ? <small className="hora-prova"> {p.hora}</small> : null}</span>
          {p.assuntos && <small className="assuntos">{p.assuntos}</small>}
        </div>
        <div className="col direita">
          {p.data && <small>{formatarDiaMes(p.data)} · {diaDaSemana(p.data)}</small>}
          {passada
            ? (p.nota !== null ? <span className="selo verde">{formatarNota(p.nota)}</span> : p.concluida ? <span className="selo neutro">feito</span> : null)
            : c && <span className={`selo ${COR_URGENCIA[c.urgencia]}`}>{c.texto}</span>}
        </div>
      </div>
    )
  }

  return (
    <>
      <Titulo sub={`${s.semestre}º semestre de ${s.ano}`}>Provas</Titulo>
      <section className="cartao"><small className="rotulo">Próximas</small>{proximas.length ? proximas.map((p) => linha(p)) : <span className="suave">Nada marcado.</span>}</section>
      {semData.length > 0 && <section className="cartao"><small className="rotulo">Sem data marcada</small>{semData.map((p) => linha(p))}</section>}
      <section className="cartao">
        <button className="rotulo-botao" onClick={() => setMostrarPassadas(!mostrarPassadas)}>Já passaram ({passadas.length}) {mostrarPassadas ? '▴' : '▾'}</button>
        {mostrarPassadas && passadas.map((p) => linha(p, true))}
      </section>
    </>
  )
}

// ---------------------------------------------------------------------------------------- Mais
export function Mais({ r, onSair }: { r: ResumoCelular; onSair?: () => void }) {
  const [parte, setParte] = useState<'menu' | 'avisos' | 'curso' | 'materiais' | 'estudos'>('menu')
  if (parte === 'materiais') return <Materiais r={r} onVoltar={() => setParte('menu')} />
  if (parte === 'estudos') return <Estudos r={r} onVoltar={() => setParte('menu')} />
  if (parte === 'avisos') {
    return (
      <>
        <button className="voltar" onClick={() => setParte('menu')}>‹ Mais</button>
        <Titulo>Avisos</Titulo>
        <section className="cartao">
          {r.avisos.slice(0, 60).map((a) => (
            <div className={`linha aviso ${a.lida ? 'lida' : ''}`} key={a.id}>
              <div className="col"><strong>{a.titulo}</strong><small>{a.mensagem}</small><small className="suave">{a.criadoEm.slice(8, 10)}/{a.criadoEm.slice(5, 7)} {a.criadoEm.slice(11, 16)}</small></div>
              {!a.lida && <i className="ponto" />}
            </div>
          ))}
          {r.avisos.length === 0 && <span className="suave">Nenhum aviso.</span>}
        </section>
      </>
    )
  }
  if (parte === 'curso') {
    const h = r.curso.horas
    return (
      <>
        <button className="voltar" onClick={() => setParte('menu')}>‹ Mais</button>
        <Titulo>Curso</Titulo>
        {(['AAC', 'AEC'] as const).map((k) => (
          <section className="cartao" key={k}>
            <div className="linha topo-cartao"><strong>{k === 'AAC' ? 'AAC' : 'AEC / UCE'}</strong><span className="grande-pct">{Math.round(h[k].pctConcedido)}%</span></div>
            <div className="barra-faltas"><i className="curso" style={{ width: Math.min(100, h[k].pctConcedido) + '%' }} /></div>
            <div className="quatro dois"><div><small>Concedidas</small><b>{h[k].concedidas} h</b></div><div><small>Faltam</small><b>{h[k].faltam} h</b></div></div>
          </section>
        ))}
        <section className="cartao"><small className="rotulo">Disciplinas aprovadas</small><b className="grande">{Math.round(r.curso.progresso.pctDisciplinas)}%</b></section>
      </>
    )
  }
  return (
    <>
      <Titulo>Mais</Titulo>
      <AvisosPush vapidPublica={r.vapidPublica} />
      <section className="cartao menu-mais">
        <button onClick={() => setParte('avisos')}><span>Avisos</span>{r.naoLidas > 0 && <i className="bolinha">{r.naoLidas}</i>}<b>›</b></button>
        <button onClick={() => setParte('curso')}><span>Curso (AAC, AEC)</span><b>›</b></button>
        <button onClick={() => setParte('materiais')}><span>Materiais</span>{r.materiais.some((m) => !m.lido) && <i className="bolinha neutra">{r.materiais.filter((m) => !m.lido).length}</i>}<b>›</b></button>
        <button onClick={() => setParte('estudos')}><span>Estudos</span>{r.cartoesDevidos.length > 0 && <i className="bolinha neutra">{r.cartoesDevidos.length}</i>}<b>›</b></button>
        {onSair && <button className="sair" onClick={onSair}><span>Sair</span></button>}
      </section>
    </>
  )
}
