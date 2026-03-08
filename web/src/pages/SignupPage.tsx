import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";

type Flash = { type: "success" | "error"; message: string };

type NavState = { from?: string; flash?: Flash };

const LOGIN_ID_MIN = 4;
const LOGIN_ID_MAX = 50;
const PASSWORD_MIN = 4;
const PASSWORD_MAX = 100;

export default function SignupPage() {
  const navigate = useNavigate();
  const { signup, loading, isAuthenticated } = useAuth();

  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [fieldErrs, setFieldErrs] = useState<Record<string, string>>({});

  const ui = useMemo(() => {
    const trimmedId = loginId.trim();
    const loginIdBlank = trimmedId.length === 0;
    const loginIdTooShort = trimmedId.length > 0 && trimmedId.length < LOGIN_ID_MIN;
    const loginIdTooLong = trimmedId.length > LOGIN_ID_MAX;

    const passwordBlank = password.length === 0;
    const passwordTooShort = password.length > 0 && password.length < PASSWORD_MIN;
    const passwordTooLong = password.length > PASSWORD_MAX;
    const passwordMismatch = passwordConfirm.length > 0 && password !== passwordConfirm;

    return {
      canSubmit:
        !loginIdBlank &&
        !loginIdTooShort &&
        !loginIdTooLong &&
        !passwordBlank &&
        !passwordTooShort &&
        !passwordTooLong &&
        !passwordMismatch &&
        !saving,
      loginIdMsg:
        fieldErrs.loginId ??
        (loginIdBlank
          ? "아이디를 입력하세요."
          : loginIdTooShort
            ? `아이디는 ${LOGIN_ID_MIN}자 이상이어야 합니다.`
            : loginIdTooLong
              ? `아이디는 ${LOGIN_ID_MAX}자 이하여야 합니다.`
              : ""),
      passwordMsg:
        fieldErrs.password ??
        (passwordBlank
          ? "비밀번호를 입력하세요."
          : passwordTooShort
            ? `비밀번호는 ${PASSWORD_MIN}자 이상이어야 합니다.`
            : passwordTooLong
              ? `비밀번호는 ${PASSWORD_MAX}자 이하여야 합니다.`
              : ""),
      confirmMsg: passwordMismatch ? "비밀번호가 일치하지 않습니다." : "",
    };
  }, [loginId, password, passwordConfirm, fieldErrs, saving]);

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
      const created = await signup({ loginId: loginId.trim(), password });
      navigate("/login", {
        replace: true,
        state: {
          flash: {
            type: "success",
            message: `${created.loginId} 계정이 생성되었습니다. 로그인해주세요.`,
          },
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
          <h2 className="pageTitle authPageTitle">회원가입</h2>
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
              placeholder="4자 이상 아이디"
              autoComplete="username"
              disabled={saving}
            />
            <span className={ui.loginIdMsg ? "fieldErrorText" : "muted"}>
              {ui.loginIdMsg || "영문/숫자 조합처럼 구분 쉬운 아이디를 권장합니다."}
            </span>
          </label>

          <label className="editField">
            <span className="editLabel">비밀번호</span>
            <input
              className={`input ${ui.passwordMsg ? "inputInvalid" : ""}`}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="4자 이상 비밀번호"
              autoComplete="new-password"
              disabled={saving}
            />
            <span className={ui.passwordMsg ? "fieldErrorText" : "muted"}>
              {ui.passwordMsg || "개발용이라도 너무 단순한 문자열은 피하는 편이 좋습니다."}
            </span>
          </label>

          <label className="editField">
            <span className="editLabel">비밀번호 확인</span>
            <input
              className={`input ${ui.confirmMsg ? "inputInvalid" : ""}`}
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              placeholder="비밀번호를 다시 입력하세요"
              autoComplete="new-password"
              disabled={saving}
            />
            <span className={ui.confirmMsg ? "fieldErrorText" : "muted"}>
              {ui.confirmMsg || "확인을 위해 동일한 비밀번호를 한 번 더 입력합니다."}
            </span>
          </label>
        </div>

        <div className="authActions">
          <button className="btn btnPrimary" type="submit" disabled={!ui.canSubmit}>
            {saving ? "가입 중…" : "회원가입"}
          </button>
          <Link className={`btn btnLink ${saving ? "isDisabled" : ""}`} to="/login">
            로그인으로
          </Link>
        </div>

        <div className="authHelpRow">
          <span className="muted">이미 계정이 있나요?</span>
          <Link to="/login" className="btn btnLink">
            로그인
          </Link>
        </div>
      </form>
    </div>
  );
}