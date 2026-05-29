import { redirect } from 'next/navigation'

// Signup is handled by the RegistrationModal popup (triggered via the `showAuth`
// event / navbar "Sign up" button), not a dedicated page. Bounce any direct
// visits to home, mirroring app/login/page.js.
export default function SignupPage() {
  redirect('/')
}
