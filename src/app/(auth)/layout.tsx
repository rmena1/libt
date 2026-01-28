export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(145deg, #f5f7fa 0%, #e8ecf1 50%, #dfe6ed 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </div>
  )
}
