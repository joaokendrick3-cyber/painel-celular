import { useCallback, useEffect, useState } from 'react'
import { supabase } from './dados'

function chaveParaBytes(base64Url: string): Uint8Array {
  const pad = '='.repeat((4 - (base64Url.length % 4)) % 4)
  const bin = atob((base64Url + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}
const paraBase64Url = (buf: ArrayBuffer | null): string =>
  buf ? btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : ''

const instalado = (): boolean =>
  (navigator as Navigator & { standalone?: boolean }).standalone === true || matchMedia('(display-mode: standalone)').matches
const suportado = (): boolean => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

async function guardarNaNuvem(sub: PushSubscription): Promise<void> {
  const j = sub.toJSON()
  const p256dh = j.keys?.p256dh ?? paraBase64Url(sub.getKey('p256dh'))
  const auth = j.keys?.auth ?? paraBase64Url(sub.getKey('auth'))
  const { error } = await supabase!.from('push_assinaturas').upsert({ endpoint: sub.endpoint, p256dh, auth }, { onConflict: 'endpoint' })
  if (error) throw new Error(error.message)
}

type Situacao = 'carregando' | 'sem-suporte' | 'instalar' | 'sem-chave' | 'pedir' | 'ativo' | 'negado'

/** Cartão "Avisos no celular": pede permissão (com um toque) e registra este aparelho na nuvem. */
export default function AvisosPush({ vapidPublica }: { vapidPublica?: string }) {
  const [situacao, setSituacao] = useState<Situacao>('carregando')
  const [msg, setMsg] = useState('')
  const [ocupado, setOcupado] = useState(false)

  const verificar = useCallback(async () => {
    if (!suportado()) return setSituacao('sem-suporte')
    if (!instalado()) return setSituacao('instalar')
    if (!vapidPublica || !supabase) return setSituacao('sem-chave')
    if (Notification.permission === 'denied') return setSituacao('negado')
    if (Notification.permission === 'granted') {
      try {
        // reinscreve sozinho se o iOS perdeu a inscrição
        const reg = await navigator.serviceWorker.ready
        const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveParaBytes(vapidPublica) as BufferSource }))
        await guardarNaNuvem(sub)
        return setSituacao('ativo')
      } catch (e) {
        setMsg((e as Error).message)
      }
    }
    setSituacao('pedir')
  }, [vapidPublica])

  useEffect(() => { void verificar() }, [verificar])

  async function ativar(): Promise<void> {
    setOcupado(true)
    setMsg('')
    try {
      const permissao = await Notification.requestPermission() // precisa vir de um toque
      if (permissao !== 'granted') { setSituacao(permissao === 'denied' ? 'negado' : 'pedir'); return }
      const reg = await navigator.serviceWorker.ready
      const antiga = await reg.pushManager.getSubscription()
      if (antiga) await antiga.unsubscribe() // começa limpo (resolve inscrição velha ou quebrada)
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveParaBytes(vapidPublica!) as BufferSource })
      await guardarNaNuvem(sub)
      setSituacao('ativo')
    } catch (e) {
      setMsg('Não deu certo: ' + (e as Error).message)
    } finally {
      setOcupado(false)
    }
  }

  const texto: Record<Situacao, string> = {
    carregando: 'Verificando…',
    'sem-suporte': 'Este aparelho ou navegador não aceita avisos.',
    instalar: 'Para receber avisos, abra o PAINEL pelo ícone da Tela de Início (Safari: Compartilhar, depois Adicionar à Tela de Início).',
    'sem-chave': 'Ainda falta o computador liberar os avisos: abra o PAINEL no PC, ligue "Enviar para o celular" e volte aqui.',
    pedir: 'Receba uma notificação quando sair uma nota nova ou algo importante.',
    ativo: 'Avisos ativados neste aparelho. ✓',
    negado: 'Os avisos estão bloqueados. Ative em Ajustes do iPhone, depois Notificações, depois PAINEL.'
  }

  // Já ativado: o cartão some (a reinscrição automática acima continua rodando em silêncio). Só aparece se precisar de uma ação.
  if (situacao === 'ativo' || situacao === 'carregando') return null

  return (
    <section className="cartao">
      <small className="rotulo">Avisos no celular</small>
      <span className="suave">{texto[situacao]}</span>
      {msg && <span className="faixa-erro">{msg}</span>}
      {situacao === 'pedir' && (
        <button className="botao" disabled={ocupado} onClick={() => void ativar()}>
          {ocupado ? 'Ativando…' : 'Ativar avisos'}
        </button>
      )}
    </section>
  )
}
