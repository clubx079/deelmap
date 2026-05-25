import { DialogHost } from '@/components/community/Dialogs'

export default function CommunityLayout({ children }) {
  return (
    <>
      {children}
      <DialogHost />
    </>
  )
}
