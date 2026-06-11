import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { signUp, signIn } from '@/api/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Logo } from '@/components/ui/logo'

const signUpForm = z.object({
  name: z.string().min(1, 'Informe o nome'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Mínimo de 6 caracteres'),
})

type SignUpForm = z.infer<typeof signUpForm>

export function SignUp() {
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpForm>({ resolver: zodResolver(signUpForm) })

  const { mutateAsync: create } = useMutation({ mutationFn: signUp })

  async function handleSignUp(data: SignUpForm) {
    try {
      await create(data)
      // já entra direto após cadastrar
      const { token } = await signIn({ email: data.email, password: data.password })
      localStorage.setItem('pindurados.token', token)
      toast.success('Conta criada! Bem-vindo(a).')
      navigate('/', { replace: true })
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      toast.error(status === 409 ? 'Já existe uma conta com esse e-mail.' : 'Não foi possível criar a conta.')
    }
  }

  return (
    <Card className="w-full max-w-sm shadow-md">
      <CardHeader className="items-center pb-2 text-center">
        <Logo size="lg" className="flex-col gap-2" />
        <p className="pt-1 text-sm text-muted-foreground">
          Comece a controlar suas promissórias
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleSignUp)} className="space-y-4">
          <div>
            <Label htmlFor="name">Nome</Label>
            <Input id="name" autoComplete="name" placeholder="Seu nome" {...register('name')} />
            {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" autoComplete="email" placeholder="voce@email.com" {...register('email')} />
            {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <div>
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" autoComplete="new-password" {...register('password')} />
            {errors.password && (
              <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Criando…' : 'Criar conta'}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Já tem conta?{' '}
            <Link to="/sign-in" className="font-medium text-primary">
              Entrar
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
