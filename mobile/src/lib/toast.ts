import Toast from 'react-native-toast-message'

export function toastSuccess(text: string) {
  Toast.show({ type: 'success', text1: text, position: 'top' })
}

export function toastError(text: string) {
  Toast.show({ type: 'error', text1: text, position: 'top' })
}
