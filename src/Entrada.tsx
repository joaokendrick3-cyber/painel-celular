import { useState } from 'react'
import { supabase } from './dados'

export default function Entrada() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)

  async function entrar(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setOcupado(true)
    setErro('')
    const { error } = await supabase!.auth.signInWithPassword({ email: email.trim(), password: senha })
    if (error) setErro('E-mail ou senha incorretos.')
    setOcupado(false)
  }

  return (
    <form className="vazio-total entrada" onSubmit={entrar}>
      <div className="logo">P</div>
      <h1>PAINEL</h1>
      <p>Entre para ver suas faltas, notas e provas.</p>
      <input type="email" inputMode="email" autoComplete="username" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input type="password" autoComplete="current-password" placeholder="Senha" value={senha} onChange={(e) => setSenha(e.target.value)} required />
      {erro && <p className="faixa-erro">{erro}</p>}
      <button className="botao primario" disabled={ocupado}>{ocupado ? 'Entrando…' : 'Entrar'}</button>
    </form>
  )
}
