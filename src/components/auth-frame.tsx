export function AuthFrame({ title, lede, children }: { title: string; lede?: string; children: React.ReactNode }) {
  return (
    <div className="auth-stage">
      <div className="auth-main">
        <div className="auth-card">
          <h1>{title}</h1>
          {lede ? <p className="lede">{lede}</p> : null}
          {children}
        </div>
      </div>
    </div>
  );
}
