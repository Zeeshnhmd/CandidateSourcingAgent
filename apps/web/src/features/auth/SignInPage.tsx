import { useMutation } from '@tanstack/react-query';
import { Form, Input } from 'antd';
import {
  AlertCircle,
  ArrowBigUp,
  ArrowRight,
  Bookmark,
  Clock,
  Eye,
  EyeOff,
  FileSearch,
  Lock,
  Mail,
  Scale,
  ShieldCheck,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import type { LoginRequest } from '@csa/contracts';
import { BrandLockup } from '../../shared/components/BrandMark';
import { Avatar } from '../../shared/components/ui/Avatar';
import { Button } from '../../shared/components/ui/Button';
import { GitHubMark } from '../../shared/components/ui/GitHubMark';
import { ScoreRing } from '../../shared/components/ui/ScoreRing';
import { ApiError } from '../../shared/lib/apiClient';
import { colors } from '../../theme/tokens';
import { login } from './authApi';
import { useAuth } from './authContext';
import type { SignInLocationState } from './RequireAuth';

/** Workspace account, prefilled for convenience. Documented in the README. */
const WORKSPACE_ACCOUNT: LoginRequest = { email: 'demo@candidate.local', password: 'Demo@123' };

const VALUE_POINTS: { icon: ReactNode; title: string; text: string }[] = [
  {
    icon: <FileSearch size={16} aria-hidden />,
    title: 'Any job description',
    text: 'Paste a JD and refine the extracted persona.',
  },
  {
    icon: <Scale size={16} aria-hidden />,
    title: 'Explainable ranking',
    text: 'Every score breaks down into clear factors.',
  },
  {
    icon: <GitHubMark size={15} />,
    title: 'Live GitHub signals',
    text: 'Real public activity, searched and verified.',
  },
];

const PREVIEW_ROWS = [
  {
    name: 'Priya Raman',
    title: 'Senior Frontend Engineer',
    skills: ['React', 'TypeScript'],
    score: 92,
    color: colors.success,
  },
  { name: 'Marcus Lee', title: 'Staff UI Engineer', skills: ['Next.js', 'GraphQL'], score: 84, color: colors.success },
  { name: 'Elena Duarte', title: 'Full Stack Engineer', skills: ['React', 'Node.js'], score: 71, color: colors.info },
];

function signInErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 401)
    return 'That email and password do not match. Please try again.';
  if (error instanceof ApiError) return error.message;
  return 'Sign in failed. Please try again.';
}

function ProductPreview() {
  return (
    <div aria-hidden className="rounded-2xl bg-white/[0.04] p-4 ring-1 ring-white/10 backdrop-blur">
      <div className="mb-3 flex items-center justify-between px-1">
        <div>
          <p className="text-[13px] font-medium text-white">Senior Frontend Engineer</p>
          <p className="text-[11.5px] text-slate-400">24 candidates ranked · 3 sources</p>
        </div>
        <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300 ring-1 ring-inset ring-emerald-400/20">
          Complete
        </span>
      </div>
      <ul className="m-0 list-none space-y-2 p-0">
        {PREVIEW_ROWS.map((row) => (
          <li
            key={row.name}
            className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-2.5 ring-1 ring-white/5"
          >
            <Avatar name={row.name} size={32} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-slate-100">{row.name}</p>
              <p className="truncate text-[11.5px] text-slate-400">{row.title}</p>
            </div>
            <div className="hidden gap-1 sm:flex">
              {row.skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-md bg-indigo-400/10 px-1.5 py-0.5 text-[11px] text-indigo-200 ring-1 ring-inset ring-indigo-300/20"
                >
                  {skill}
                </span>
              ))}
            </div>
            <span className="rounded-full bg-white p-0.5">
              <ScoreRing value={row.score} color={row.color} size={34} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Banner({ tone, children }: { tone: 'warning' | 'danger'; children: ReactNode }) {
  const styles =
    tone === 'danger' ? 'bg-danger-soft text-danger ring-danger/20' : 'bg-warning-soft text-warning ring-warning/20';
  const Icon = tone === 'danger' ? AlertCircle : Clock;
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={`mb-5 flex items-start gap-2.5 rounded-lg px-3.5 py-3 text-[13px] leading-5 ring-1 ring-inset ${styles}`}
    >
      <Icon size={16} className="mt-0.5 shrink-0" aria-hidden />
      <span>{children}</span>
    </div>
  );
}

export function SignInPage() {
  const { session, notice, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as SignInLocationState | null)?.from ?? '/';
  const [capsLock, setCapsLock] = useState(false);

  const signInMutation = useMutation({
    mutationFn: login,
    onSuccess: (next) => {
      signIn(next);
      void navigate(redirectTo, { replace: true });
    },
  });

  if (session) return <Navigate to={redirectTo} replace />;

  return (
    <main className="grid min-h-screen bg-surface lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <section className="relative hidden overflow-hidden bg-sidebar px-12 py-10 lg:flex lg:flex-col">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '44px 44px',
            maskImage: 'radial-gradient(ellipse at 30% 40%, black 20%, transparent 70%)',
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-40 -top-40 size-[520px] rounded-full bg-indigo-600/25 blur-[120px]"
        />

        <div className="relative">
          <BrandLockup tone="dark" />
        </div>

        <div className="relative my-auto max-w-xl py-12">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-indigo-200 ring-1 ring-inset ring-white/10">
            <span className="size-1.5 rounded-full bg-indigo-400" />
            Talent intelligence
          </span>
          <h1 className="mt-5 text-[34px] font-semibold leading-[1.15] tracking-tight text-white">
            Find the right people.
            <br />
            <span className="text-slate-400">Know exactly why they rank.</span>
          </h1>
          <p className="mt-4 max-w-md text-[15px] leading-7 text-slate-400">
            Turn any job description into a ranked, explainable shortlist, sourced across your talent network and
            GitHub.
          </p>
          <div className="mt-8">
            <ProductPreview />
          </div>
        </div>

        <ul className="relative m-0 grid list-none grid-cols-3 gap-6 p-0">
          {VALUE_POINTS.map((point) => (
            <li key={point.title}>
              <span className="flex size-8 items-center justify-center rounded-lg bg-white/5 text-indigo-200 ring-1 ring-inset ring-white/10">
                {point.icon}
              </span>
              <p className="mt-3 text-[13px] font-medium text-slate-100">{point.title}</p>
              <p className="mt-0.5 text-xs leading-5 text-slate-400">{point.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="relative flex flex-col overflow-hidden bg-canvas px-6 py-8 sm:px-12">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 -top-32 size-[420px] rounded-full bg-primary/10 blur-[100px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            backgroundImage: 'radial-gradient(rgb(15 23 42 / 0.07) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
            maskImage: 'radial-gradient(ellipse at 50% 45%, black 10%, transparent 65%)',
          }}
        />

        <div className="relative flex items-center justify-between">
          <div className="lg:hidden">
            <BrandLockup />
          </div>
          <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted">
            <ShieldCheck size={14} className="text-success" aria-hidden />
            Protected workspace
          </span>
        </div>

        <div className="relative mx-auto my-auto w-full max-w-[500px] py-10">
          <div className="rounded-2xl border border-line bg-surface p-8 shadow-[0_24px_48px_-24px_rgb(15_23_42/0.18),0_2px_6px_-2px_rgb(15_23_42/0.05)] sm:p-10">
            <h2 className="text-[24px] font-semibold tracking-tight text-ink">Sign in to your workspace</h2>
            <p className="mb-7 mt-1.5 text-sm leading-6 text-muted">
              Access your searches, shortlists and candidate insights.
            </p>

            {notice && !signInMutation.isError && <Banner tone="warning">{notice}</Banner>}
            {signInMutation.isError && <Banner tone="danger">{signInErrorMessage(signInMutation.error)}</Banner>}

            <Form<LoginRequest>
              layout="vertical"
              requiredMark={false}
              initialValues={WORKSPACE_ACCOUNT}
              onFinish={(values) => signInMutation.mutate({ email: values.email.trim(), password: values.password })}
              disabled={signInMutation.isPending}
              onValuesChange={() => signInMutation.isError && signInMutation.reset()}
            >
              <Form.Item
                label="Work email"
                name="email"
                rules={[
                  { required: true, message: 'Enter your email address' },
                  { type: 'email', message: 'Enter a valid email address' },
                ]}
              >
                <Input
                  size="large"
                  prefix={<Mail size={16} className="text-dim" aria-hidden />}
                  autoComplete="username"
                  inputMode="email"
                  placeholder="name@company.com"
                  className="h-11"
                />
              </Form.Item>
              <Form.Item
                label="Password"
                name="password"
                rules={[{ required: true, message: 'Enter your password' }]}
                extra={
                  capsLock ? (
                    <span className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-warning">
                      <ArrowBigUp size={14} aria-hidden /> Caps Lock is on
                    </span>
                  ) : undefined
                }
              >
                <Input.Password
                  size="large"
                  prefix={<Lock size={16} className="text-dim" aria-hidden />}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className="h-11"
                  onKeyUp={(event) => setCapsLock(event.getModifierState('CapsLock'))}
                  onBlur={() => setCapsLock(false)}
                  iconRender={(visible) => (visible ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />)}
                />
              </Form.Item>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                block
                loading={signInMutation.isPending}
                trailingIcon={<ArrowRight size={16} aria-hidden />}
                className="mt-1 h-11 text-[15px]"
              >
                {signInMutation.isPending ? 'Signing in' : 'Sign in'}
              </Button>
            </Form>

            <div className="mt-7 grid grid-cols-2 gap-3 border-t border-line-soft pt-5 text-xs text-muted">
              <span className="inline-flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-md bg-subtle text-body">
                  <Clock size={14} aria-hidden />
                </span>
                Session lasts 60 minutes
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-md bg-subtle text-body">
                  <Bookmark size={14} aria-hidden />
                </span>
                Searches are saved for you
              </span>
            </div>
          </div>
        </div>

        <p className="relative text-center text-xs text-dim">© {new Date().getFullYear()} Candidate Sourcing Agent</p>
      </section>
    </main>
  );
}
