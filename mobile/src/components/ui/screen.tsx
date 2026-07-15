import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  type ScrollViewProps,
} from 'react-native'

// Container padrão das telas roláveis. Garante que o teclado não cubra os
// campos/botões (KeyboardAvoidingView) e que tocar fora feche/role suave.
export function Screen({
  children,
  contentContainerClassName = 'gap-3 p-4',
  ...props
}: ScrollViewProps & { contentContainerClassName?: string }) {
  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName={contentContainerClassName}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        {...props}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
