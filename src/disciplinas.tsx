// Cada matéria tem a sua cor, igual ao PAINEL do computador (materiaisUtil.ts).
const semAcento = (t: string): string => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

const REGRAS_COR: [RegExp, string][] = [
  [/^matematica ii(\s|$)/, '#3b82f6'], // azul
  [/^economia ii(\s|$)/, '#22c55e'], // verde
  [/^economia financeira/, '#eab308'], // amarelo
  [/pensamento economico i(\s|$)|^hpe i(\s|$)/, '#a855f7'], // roxo
  [/^contabilidade social/, '#ef4444'], // vermelho
  [/^economia i(\s|$)/, '#f97316'], // laranja
  [/^matematica i(\s|$)/, '#06b6d4'], // ciano
  [/contabilidade e analise/, '#ec4899'], // rosa
  [/formacao social/, '#14b8a6'], // verde-água
  [/metodologia/, '#84cc16'], // limão
  [/extensao/, '#78716c'] // cinza-pedra
]
const EXTRAS = ['#f43f5e', '#0ea5e9', '#d946ef', '#10b981', '#f59e0b']

export function corDaDisciplina(nome: string): string {
  const n = semAcento(nome).trim()
  for (const [re, cor] of REGRAS_COR) if (re.test(n)) return cor
  let h = 0
  for (const c of n) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return EXTRAS[h % EXTRAS.length]
}

/** Abreviação usada onde o nome inteiro não cabe (só na tela Início): "História do Pensamento Econômico I" vira "HPE I". */
export function abreviar(nome: string): string {
  return /pensamento economico i(\s|$)/.test(semAcento(nome)) ? 'HPE I' : nome
}

/** Nome da matéria numa etiqueta com a cor dela. `curto` troca pelo nome abreviado (a cor continua a mesma). */
export function Disc({ nome, curto = false }: { nome: string; curto?: boolean }) {
  return <span className="etiqueta-disc" style={{ ['--cor-disc' as string]: corDaDisciplina(nome) }}>{curto ? abreviar(nome) : nome}</span>
}

/** Nome da matéria em texto (títulos de cartão), na cor dela. */
export function NomeDisc({ nome, curto = false }: { nome: string; curto?: boolean }) {
  return <strong className="nome-disc" style={{ ['--cor-disc' as string]: corDaDisciplina(nome) }}>{curto ? abreviar(nome) : nome}</strong>
}
