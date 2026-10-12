// De onde vem o resumo: Supabase (produção), arquivo local (desenvolvimento) e cache do aparelho (offline).
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { ResumoCelular } from '@shared/celular'

export const VERSAO_ENTENDIDA = 1
const CHAVE_CACHE = 'painel-resumo-v1'
const URL_SB = import.meta.env.VITE_SUPABASE_URL as string | undefined
const CHAVE_SB = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const temSupabase = Boolean(URL_SB && CHAVE_SB)
export const supabase: SupabaseClient | null = temSupabase
  ? createClient(URL_SB!, CHAVE_SB!, { auth: { persistSession: true, autoRefreshToken: true } })
  : null

export function lerCache(): ResumoCelular | null {
  try {
    const t = localStorage.getItem(CHAVE_CACHE)
    return t ? (JSON.parse(t) as ResumoCelular) : null
  } catch { return null }
}
function gravarCache(r: ResumoCelular): void {
  try { localStorage.setItem(CHAVE_CACHE, JSON.stringify(r)) } catch { /* sem espaço: segue sem cache */ }
}
export function limparCache(): void {
  try { localStorage.removeItem(CHAVE_CACHE) } catch { /* ignora */ }
}

/** Baixa o resumo mais novo. Em desenvolvimento sem Supabase usa a cópia local (/dev-resumo.json). */
export async function baixarResumo(): Promise<ResumoCelular> {
  let r: ResumoCelular
  if (supabase) {
    const { data, error } = await supabase.from('snapshots').select('dados').eq('id', 'painel').maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) throw new Error('Ainda não há resumo na nuvem. Abra o PAINEL no computador e ligue "Enviar para o celular".')
    r = data.dados as ResumoCelular
  } else if (import.meta.env.DEV) {
    const resp = await fetch('/dev-resumo.json')
    if (!resp.ok) throw new Error('Sem resumo de desenvolvimento (dev/resumo-real.json).')
    r = (await resp.json()) as ResumoCelular
  } else {
    throw new Error('O app não está ligado ao Supabase.')
  }
  gravarCache(r)
  return r
}
