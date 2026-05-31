import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { signIn } from '@/api/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const signInForm = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Informe a senha'),
})

type SignInForm = z.infer<typeof signInForm>

export function SignIn() {
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInForm>({
    resolver: zodResolver(signInForm),
    defaultValues: { email: 'hudson@pindurados.local', password: '' },
  })

  const { mutateAsync: authenticate } = useMutation({ mutationFn: signIn })

  async function handleSignIn(data: SignInForm) {
    try {
      const { token } = await authenticate(data)
      localStorage.setItem('pindurados.token', token)
      navigate('/', { replace: true })
    } catch {
      toast.error('Credenciais inválidas. Verifique e-mail e senha.')
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="items-center text-center">
        <div className="text-3xl">📒</div>
        <CardTitle className="text-2xl">Pindurados</CardTitle>
        <p className="text-sm text-muted-foreground">Entre para gerenciar suas promissórias</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleSignIn)} className="space-y-4">
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" {...register('email')} />
            {errors.email && (
              <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" {...register('password')} />
            {errors.password && (
              <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
