import { redirect } from 'next/navigation'

// Return old bookmarks to the main app.
export default function OfflineLibraryPage() {
  redirect('/')
}
