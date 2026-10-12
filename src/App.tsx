import { useCallback, useEffect, useState } from 'react'
import type { ResumoCelular } from '@shared/celular'
import { baixarResumo, lerCache, limparCache, supabase, temSupabase, VERSAO_ENTENDIDA } from './dados'
import Entrada from './Entrada'
import { Inicio, Faltas, Notas, Provas, Mais } from './telas'

type Aba = 'inicio' | 'faltas' | 'notas' | 'provas' | 'mais'
const ABAS: { id: Aba; nome: string; icone: string }[] = [
  { id: 'inicio', nome: 'Início', icone: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10' },
  { id: 'faltas', nome: 'Faltas', icone: 'M8 2v4M16 2v4M3 8h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z' },
  { id: 'notas', nome: 'Notas', icone: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11' },
  { id: 'provas', nome: 'Provas', icone: 'M12 8v4l3 2M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z' },
  { id: 'mais', nome: 'Mais', icone: 'M5 12h.01M12 12h.01M19 12h.01' }
]

export default function App() {
  const [resumo, setResumo] = useState<ResumoCelular | null>(() => lerCache())
  const [logado, setLogado] = useState<boolean | null>(temSupabase ? null : true)
  const [aba, setAba] = useState<Aba>('inicio')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  const atualizar = useCallback(async () => {
    setCarregando(true)
    setErro('')
    try {
      setResumo(await baixarResumo())
    } catch (e) {
      setErro(lerCache() ? 'Sem conexão: mostrando o último resumo salvo.' : (e as Error).message)
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    if (!supabase) return
    void supabase.auth.getSession().then(({ data }) => setLogado(Boolean(data.session)))
    const { data } = supabase.auth.onAuthStateChange((_e, sessao) => setLogado(Boolean(sessao)))
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (logado) void atualizar()
  }, [logado, atualizar])

  // volta ao app: atualiza de novo
  useEffect(() => {
    const aoVoltar = (): void => {
      if (document.visibilityState === 'visible' && logado) void atualizar()
    }
    document.addEventListener('visibilitychange', aoVoltar)
    return () => document.removeEventListener('visibilitychange', aoVoltar)
  }, [logado, atualizar])

  // número no ícone = avisos não lidos (iOS 16.4+ com o app instalado)
  useEffect(() => {
    const nav = navigator as Navigator & { setAppBadge?: (n: number) => Promise<void>; clearAppBadge?: () => Promise<void> }
    if (!resumo) return
    if (resumo.naoLidas > 0) void nav.setAppBadge?.(resumo.naoLidas)?.catch(() => {})
    else void nav.clearAppBadge?.()?.catch(() => {})
  }, [resumo])

  if (logado === null) return <div className="carregando">PAINEL</div>
  if (!logado) return <Entrada />

  const sair = async (): Promise<void> => {
    await supabase?.auth.signOut()
    limparCache()
    setResumo(null)
  }

  if (!resumo) {
    return (
      <div className="vazio-total">
        <h1>PAINEL</h1>
        <p>{carregando ? 'Baixando o resumo…' : erro || 'Sem dados ainda.'}</p>
        {!carregando && <button className="botao" onClick={() => void atualizar()}>Tentar de novo</button>}
      </div>
    )
  }
  if (resumo.versaoEsquema > VERSAO_ENTENDIDA) {
    return (
      <div className="vazio-total">
        <h1>Atualize o app</h1>
        <p>O PAINEL do computador está mais novo que este aplicativo. Feche e abra de novo para atualizar.</p>
      </div>
    )
  }

  return (
    <div className="app">
      <main className="conteudo">
        <Cabecalho resumo={resumo} carregando={carregando} erro={erro} onAtualizar={() => void atualizar()} />
        {aba === 'inicio' && <Inicio r={resumo} irPara={(a) => setAba(a as Aba)} />}
        {aba === 'faltas' && <Faltas r={resumo} />}
        {aba === 'notas' && <Notas r={resumo} />}
        {aba === 'provas' && <Provas r={resumo} />}
        {aba === 'mais' && <Mais r={resumo} onSair={supabase ? () => void sair() : undefined} />}
      </main>
      <nav className="barra">
        {ABAS.map((a) => (
          <button
            key={a.id}
            className={aba === a.id ? 'ativa' : ''}
            onClick={() => {
              setAba(a.id)
              window.scrollTo(0, 0)
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d={a.icone} />
            </svg>
            <span>{a.nome}</span>
            {a.id === 'mais' && resumo.naoLidas > 0 && <i className="bolinha">{resumo.naoLidas}</i>}
          </button>
        ))}
      </nav>
    </div>
  )
}

function Cabecalho({ resumo, carregando, erro, onAtualizar }: { resumo: ResumoCelular; carregando: boolean; erro: string; onAtualizar: () => void }) {
  const gerado = new Date(resumo.geradoEm)
  const horas = (Date.now() - gerado.getTime()) / 3600000
  const quando = gerado.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  return (
    <header className="cabecalho">
      <div>
        <strong>PAINEL</strong>
        <small className={horas > 6 ? 'velho' : ''}>
          {horas > 6 ? 'Desatualizado · ' : 'Atualizado · '}
          {quando.replace(',', ' às')}
        </small>
      </div>
      <button className="botao-icone" onClick={onAtualizar} aria-label="Atualizar" disabled={carregando}>
        {carregando ? '…' : '↻'}
      </button>
      {erro && <p className="faixa-erro">{erro}</p>}
    </header>
  )
}
