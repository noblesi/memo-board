import { useMemo, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, Navigate } from "react-router-dom";
import { ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";

type Flash = { type: "success" | "error"; message: string };
type NavState = { from?: string; flash?: Flash };

const LOGIN_ID_MIN = 4;
const PASSWORD_MIN = 4;

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loading, isAuthenticated } = useAuth();

  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [fieldErrs, setFieldErrs] = useState<Record<string, string>>({});

  const nextTo = ((location.state as NavState | null)?.from ?? "/") as string;

  const ui = useMemo(() => {
    const loginIdBlank = loginId.trim().length === 0;
    const passwordBlank = password.trim().length === 0;
    const loginIdTooShort = loginId.trim().length > 0 && loginId.trim().length < LOGIN_ID_MIN;
    const passwordTooShort = password.length > 0 && password.length < PASSWORD_MIN;

    return {
      canSubmit: !loginIdBlank && !passwordBlank && !loginIdTooShort && !passwordTooShort && !saving,
      loginIdMsg:
        fieldErrs.loginId ??
        (loginIdBlank
          ? "아이디를 입력하세요."
          : loginIdTooShort
            ? `아이디는 ${LOGIN_ID_MIN}자 이상이어야 합니다.`
            : ""),
      passwordMsg:
        fieldErrs.password ??
        (passwordBlank
          ? "비밀번호를 입력하세요."
          : passwordTooShort
            ? `비밀번호는 ${PASSWORD_MIN}자 이상이어야 합니다.`
            : ""),
    };
  }, [loginId, password, fieldErrs, saving]);

  if (!loading && isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;

    setErr(null);
    setFieldErrs({});

    if (!ui.canSubmit) {
      setErr("입력값을 확인해주세요.");
      return;
    }

    setSaving(true);

    try {
      const me = await login({ loginId: loginId.trim(), password });
      navigate(nextTo, {
        replace: true,
        state: {
          flash: { type: "success", message: `${me.loginId}님, 환영합니다.` },
        } satisfies NavState,
      });
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.fieldErrors?.length) {
          const next: Record<string, string> = {};
          for (const fe of error.fieldErrors) next[fe.field] = fe.message;
          setFieldErrs(next);
        }
        setErr(error.message);
      } else {
        setErr(String((error as any)?.message ?? error));
      }
      setSaving(false);
    }
  }

  return (
    <div className="authShell">
      <div className="authTitleRow">
        <div>
          <div className="authEyebrow">Authentication</div>
          <h2 className="pageTitle authPageTitle">로그인</h2>
        </div>
      </div>

      {err && <div className="error authError">{err}</div>}

      <form className="card cardPad authCard" onSubmit={onSubmit}>
        <div className="authFieldGroup">
          <label className="editField">
            <span className="editLabel">아이디</span>
            <input
              className={`input ${ui.loginIdMsg ? "inputInvalid" : ""}`}
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              placeholder="아이디를 입력하세요"
              autoComplete="username"
              disabled={saving}
            />
            <span className={ui.loginIdMsg ? "fieldErrorText" : "muted"}>
              {ui.loginIdMsg || "회원가입한 loginId를 입력하세요."}
            </span>
          </label>

          <label className="editField">
            <span className="editLabel">비밀번호</span>
            <input
              className={`input ${ui.passwordMsg ? "inputInvalid" : ""}`}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
              autoComplete="current-password"
              disabled={saving}
            />
            <span className={ui.passwordMsg ? "fieldErrorText" : "muted"}>
              {ui.passwordMsg || "비밀번호는 대소문자를 구분합니다."}
            </span>
          </label>
        </div>

        <div className="authActions">
          <button className="btn btnPrimary" type="submit" disabled={!ui.canSubmit}>
            {saving ? "로그인 중…" : "로그인"}
          </button>
          <Link className={`btn btnLink ${saving ? "isDisabled" : ""}`} to="/">
            취소
          </Link>
        </div>

        <div className="authHelpRow">
          <span className="muted">아직 계정이 없나요?</span>
          <Link to="/signup" className="btn btnLink">
            회원가입
          </Link>
        </div>
      </form>
    </div>
  );
}