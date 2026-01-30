import { FolderListView } from './folder-list-view'

export const dynamic = 'force-dynamic'

export default async function FoldersPage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fafafa', width: '100%' }}>
      <div 
        style={{
          position: 'sticky', top: 0, zIndex: 20,
          backgroundColor: 'rgba(250, 250, 250, 0.88)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(0, 0, 0, 0.04)',
        }}
      >
        <div style={{ maxWidth: '720px', margin: '0 auto', padding: '20px 20px 16px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#1a1a1a', letterSpacing: '-0.025em', lineHeight: 1.2 }}>
            Folders
          </h1>
        </div>
      </div>
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '8px 20px 120px' }}>
        <FolderListView />
      </div>
    </div>
  )
}
