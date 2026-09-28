import { Form, Input, type FormInstance } from 'antd';
import { AlertCircle, Check, FileText, Sparkles } from 'lucide-react';
import { Button } from '../../shared/components/ui/Button';
import { Panel, PanelHeader } from '../../shared/components/ui/Panel';
import { errorMessage } from '../../shared/lib/apiClient';

const MIN_LENGTH = 80;
const MAX_LENGTH = 20_000;
const GOOD_INPUT = ['Role title and level', 'Must-have skills', 'Years of experience', 'Location or work mode'];

const PLACEHOLDER = `Paste the full job description here.

For example:
Senior Frontend Engineer, Payments
Bengaluru, India (Hybrid)

Requirements
- 5+ years building React and TypeScript applications
- Experience with GraphQL and testing

Nice to have
- Next.js, accessibility`;

export interface JobDescriptionFormValues {
  jobDescription: string;
}

interface JobDescriptionComposerProps {
  form: FormInstance<JobDescriptionFormValues>;
  analyzing: boolean;
  error: unknown;
  hasAnalysis: boolean;
  onAnalyze: (jobDescription: string) => void;
}

const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.userAgent);

export function JobDescriptionComposer({
  form,
  analyzing,
  error,
  hasAnalysis,
  onAnalyze,
}: JobDescriptionComposerProps) {
  const text = Form.useWatch('jobDescription', form) ?? '';

  return (
    <Panel className="flex flex-col">
      <PanelHeader
        icon={<FileText size={16} aria-hidden />}
        title="Job description"
        description="Paste the full posting. More detail gives a sharper persona."
      />
      <Form<JobDescriptionFormValues>
        form={form}
        layout="vertical"
        requiredMark={false}
        onFinish={({ jobDescription }) => onAnalyze(jobDescription.trim())}
        className="flex flex-1 flex-col"
      >
        <div className="flex-1 px-5 pt-4">
          <Form.Item
            name="jobDescription"
            className="mb-3"
            rules={[
              { required: true, whitespace: true, message: 'Paste a job description to continue' },
              {
                validator: (_, value?: string) => {
                  const length = value?.trim().length ?? 0;
                  if (length === 0 || length >= MIN_LENGTH) return Promise.resolve();
                  return Promise.reject(
                    new Error(`Add a little more detail. At least ${MIN_LENGTH} characters are needed.`),
                  );
                },
              },
            ]}
          >
            <Input.TextArea
              aria-label="Job description"
              autoSize={{ minRows: 16, maxRows: 30 }}
              maxLength={MAX_LENGTH}
              placeholder={PLACEHOLDER}
              disabled={analyzing}
              className="text-[14px] leading-6"
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                  event.preventDefault();
                  form.submit();
                }
              }}
            />
          </Form.Item>

          <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <span className="text-xs font-medium text-muted">Best results include</span>
            {GOOD_INPUT.map((item) => (
              <span key={item} className="inline-flex items-center gap-1 text-xs text-muted">
                <Check size={13} className="text-success" aria-hidden />
                {item}
              </span>
            ))}
          </div>

          {Boolean(error) && (
            <div
              role="alert"
              className="mb-4 flex items-start gap-2.5 rounded-lg bg-danger-soft px-3.5 py-3 text-[13px] text-danger ring-1 ring-inset ring-danger/20"
            >
              <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
              <span>
                <span className="font-medium">Analysis failed.</span> {errorMessage(error)}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft px-5 py-3.5">
          <div className="flex items-center gap-3 text-xs text-muted">
            <span className="tabular-nums">
              {text.length.toLocaleString('en')} / {MAX_LENGTH.toLocaleString('en')}
            </span>
            <span className="hidden items-center gap-1 sm:inline-flex">
              <kbd className="rounded border border-line bg-canvas px-1.5 py-px font-sans text-[11px] text-body">
                {isMac ? '⌘' : 'Ctrl'}
              </kbd>
              <kbd className="rounded border border-line bg-canvas px-1.5 py-px font-sans text-[11px] text-body">
                Enter
              </kbd>
              to analyze
            </span>
          </div>
          <div className="flex gap-2">
            {text && (
              <Button variant="ghost" onClick={() => form.resetFields()} disabled={analyzing}>
                Clear
              </Button>
            )}
            <Button type="submit" variant="primary" loading={analyzing} icon={<Sparkles size={15} aria-hidden />}>
              {error ? 'Try again' : hasAnalysis ? 'Analyze again' : 'Analyze description'}
            </Button>
          </div>
        </div>
      </Form>
    </Panel>
  );
}
