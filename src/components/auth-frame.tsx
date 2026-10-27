export function AuthFrame({ title, lede, children }: { title: string; lede?: string; children: React.ReactNode }) {
  return (
    <div className="auth-stage">
      <div className="auth-void" aria-hidden="true" />
      <div className="auth-aurora auth-aurora-a" aria-hidden="true" />
      <div className="auth-aurora auth-aurora-b" aria-hidden="true" />
      <div className="auth-aurora auth-aurora-c" aria-hidden="true" />
      <div className="auth-card-wrap">
        <div className="auth-halo" aria-hidden="true" />
        <div className="auth-card">
          <h1>{title}</h1>
          {lede ? <p className="lede">{lede}</p> : null}
          {children}
        </div>
      </div>
    </div>
  );
}
