export function LoginScreen() {
  const handleGoogleLogin = () => {
    window.location.href = '/api/oauth2/authorization/google';
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 bg-white px-6">
      <h1 className="mb-6 text-[20px] font-semibold text-[color:var(--ink,#222222)]">
        로그인
      </h1>

      <button
        type="button"
        data-testid="login-google"
        onClick={handleGoogleLogin}
        className="h-12 w-full rounded-sm border border-[color:var(--ink,#222222)] bg-white px-[23px] text-sm font-medium text-[color:var(--ink,#222222)]"
      >
        Google로 로그인
      </button>

      <button
        type="button"
        data-testid="login-discord"
        disabled
        title="준비 중"
        className="h-12 w-full cursor-not-allowed rounded-sm border border-[color:var(--hairline-soft,#ebebeb)] bg-white px-[23px] text-sm font-medium text-[color:var(--muted-soft,#929292)]"
      >
        Discord로 로그인
      </button>

      <button
        type="button"
        data-testid="login-telegram"
        disabled
        title="준비 중"
        className="h-12 w-full cursor-not-allowed rounded-sm border border-[color:var(--hairline-soft,#ebebeb)] bg-white px-[23px] text-sm font-medium text-[color:var(--muted-soft,#929292)]"
      >
        Telegram으로 로그인
      </button>
    </div>
  );
}
