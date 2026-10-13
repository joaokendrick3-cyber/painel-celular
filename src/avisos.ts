// Marcar aviso como lido no celular: aparece na hora (camada local) e volta para o computador (tabela `acoes` no Supabase),
// que aplica no banco dele e manda um resumo novo. Se estiver sem internet, a fila espera.
import type { ResumoCelular } from '@shared/celular'
import { supabase } from './dados'

const CHAVE_FILA = 'painel-fila-acoes'
const CHAVE_LOCAL = 'painel-avisos-local'

export type Local = Record<number, boolean> // id do aviso -> como ele deve aparecer (lido = true)
interface Acao { tipo: 'aviso_lida' | 'avisos_todas_lidas'; dados: Record<string, unknown> }

function ler<T>(chave: string, padrao: T): T {
  try {
    const t = localStorage.getItem(chave)
    return t ? (JSON.parse(t) as T) : padrao
  } catch { return padrao }
}
function gravar(chave: string, valor: unknown): void {
  try { localStorage.setItem(chave, JSON.stringify(valor)) } catch { /* sem espaço: segue sem guardar */ }
}

export const lerLocal = (): Local => ler<Local>(CHAVE_LOCAL, {})
export const tamanhoDaFila = (): number => ler<Acao[]>(CHAVE_FILA, []).length

/** O resumo com as marcações feitas no celular por cima (ainda não confirmadas pelo computador). */
export function comLocal(r: ResumoCelular, local: Local): ResumoCelular {
  if (Object.keys(local).length === 0) return r
  const avisos = r.avisos.map((a) => (local[a.id] !== undefined ? { ...a, lida: local[a.id] } : a))
  return { ...r, avisos, naoLidas: avisos.filter((a) => !a.lida).length }
}

/** Tira da camada local o que o resumo novo (do computador) já confirmou. */
export function confirmar(r: ResumoCelular, local: Local): Local {
  const novo: Local = {}
  for (const [id, lida] of Object.entries(local)) {
    const a = r.avisos.find((x) => x.id === Number(id))
    if (a && a.lida !== lida) novo[Number(id)] = lida   // ainda não confirmou
  }
  gravar(CHAVE_LOCAL, novo)
  return novo
}

let ultimoErro = ''
export const erroDaFila = (): string => ultimoErro

/** Tenta mandar as ações guardadas. As que falham ficam na fila. */
export async function enviarFila(): Promise<void> {
  const fila = ler<Acao[]>(CHAVE_FILA, [])
  if (!supabase || fila.length === 0) return
  const restante: Acao[] = []
  ultimoErro = ''
  for (const a of fila) {
    const { error } = await supabase.from('acoes').insert({ tipo: a.tipo, dados: a.dados })
    if (error) {
      restante.push(a)
      ultimoErro = /relation|does not exist|schema cache|permission/i.test(error.message)
        ? 'Falta criar a tabela "acoes" no Supabase (rodar o supabase-acoes.sql). A marcação fica guardada no celular.'
        : 'Sem conexão: a marcação será enviada depois.'
    }
  }
  gravar(CHAVE_FILA, restante)
}

function enfileirar(a: Acao): void {
  gravar(CHAVE_FILA, [...ler<Acao[]>(CHAVE_FILA, []), a])
}

/** Marca um aviso como lido (ou não lido). Devolve a camada local nova. */
export function marcar(id: number, lida: boolean, local: Local): Local {
  const novo = { ...local, [id]: lida }
  gravar(CHAVE_LOCAL, novo)
  enfileirar({ tipo: 'aviso_lida', dados: { id, lida } })
  void enviarFila()
  return novo
}

/** Marca todos os avisos não lidos como lidos. */
export function marcarTodas(r: ResumoCelular, local: Local): Local {
  const novo = { ...local }
  for (const a of r.avisos) if (!a.lida) novo[a.id] = true
  gravar(CHAVE_LOCAL, novo)
  enfileirar({ tipo: 'avisos_todas_lidas', dados: {} })
  void enviarFila()
  return novo
}
