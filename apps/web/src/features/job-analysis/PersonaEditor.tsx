import { Form, Input, InputNumber, Segmented, Select, Switch } from 'antd';
import { ArrowRight, Database } from 'lucide-react';
import type { ReactNode } from 'react';
import { SENIORITY_LEVELS, type CandidatePersona, type WorkMode } from '@csa/contracts';
import { Button } from '../../shared/components/ui/Button';
import { GitHubMark } from '../../shared/components/ui/GitHubMark';
import { SkillSelect } from '../../shared/components/ui/SkillSelect';
import { capitalize } from '../../shared/lib/format';

const WORK_MODE_OPTIONS: { value: WorkMode; label: string }[] = [
  { value: 'onsite', label: 'On-site' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'remote', label: 'Remote' },
  { value: 'unspecified', label: 'Any' },
];

type PersonaFormValues = Omit<CandidatePersona, 'location'> & { location?: string | null };

interface PersonaEditorProps {
  persona: CandidatePersona;
  submitting: boolean;
  onSubmit: (persona: CandidatePersona) => void;
  /** Rendered above the footer, for status or errors. */
  notice?: ReactNode;
}

const normalizeKey = (skill: string) => skill.trim().toLowerCase();

function FieldGroup({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="border-b border-line-soft px-5 py-5 last:border-b-0">
      <div className="mb-3.5">
        <h3 className="text-[13px] font-semibold text-ink">{title}</h3>
        {description && <p className="text-xs text-muted">{description}</p>}
      </div>
      {children}
    </section>
  );
}

/** Editable persona so the recruiter can correct the extraction before sourcing. */
export function PersonaEditor({ persona, submitting, onSubmit, notice }: PersonaEditorProps) {
  const [form] = Form.useForm<PersonaFormValues>();
  const scoresEvidence = Form.useWatch('isTechnicalRole', form) ?? persona.isTechnicalRole;

  const handleFinish = (values: PersonaFormValues) => {
    onSubmit({
      ...values,
      roleTitle: values.roleTitle.trim(),
      location: values.location?.trim() ? values.location.trim() : null,
      minYearsExperience: values.minYearsExperience ?? null,
      maxYearsExperience: values.maxYearsExperience ?? null,
      summary: values.summary.trim(),
    });
  };

  return (
    <Form<PersonaFormValues>
      form={form}
      layout="vertical"
      initialValues={persona}
      onFinish={handleFinish}
      disabled={submitting}
      requiredMark={false}
    >
      <FieldGroup title="Role">
        <div className="grid gap-x-4 sm:grid-cols-[minmax(0,1fr)_180px]">
          <Form.Item
            label="Role title"
            name="roleTitle"
            rules={[{ required: true, whitespace: true, message: 'Enter the role title' }]}
            className="mb-0"
          >
            <Input placeholder="Senior Frontend Engineer" />
          </Form.Item>
          <Form.Item label="Seniority" name="seniority" rules={[{ required: true }]} className="mb-0 mt-4 sm:mt-0">
            <Select options={SENIORITY_LEVELS.map((level) => ({ value: level, label: capitalize(level) }))} />
          </Form.Item>
        </div>
      </FieldGroup>

      <FieldGroup title="Experience" description="Leave empty to use the typical range for the seniority.">
        <div className="grid grid-cols-2 gap-4">
          <Form.Item label="Minimum" name="minYearsExperience" className="mb-0">
            <InputNumber
              min={0}
              max={40}
              className="w-full"
              placeholder="Any"
              suffix={<span className="text-xs text-dim">years</span>}
            />
          </Form.Item>
          <Form.Item
            label="Maximum"
            name="maxYearsExperience"
            dependencies={['minYearsExperience']}
            className="mb-0"
            rules={[
              ({ getFieldValue }) => ({
                validator: (_, value: number | null | undefined) => {
                  const min = getFieldValue('minYearsExperience') as number | null | undefined;
                  if (value == null || min == null || value >= min) return Promise.resolve();
                  return Promise.reject(new Error('Maximum must be at least the minimum'));
                },
              }),
            ]}
          >
            <InputNumber
              min={0}
              max={40}
              className="w-full"
              placeholder="No limit"
              suffix={<span className="text-xs text-dim">years</span>}
            />
          </Form.Item>
        </div>
      </FieldGroup>

      <FieldGroup title="Skills" description="Type a skill and press Enter or comma to add it.">
        <Form.Item
          label="Must-have"
          name="mustHaveSkills"
          rules={[{ required: true, type: 'array', min: 1, message: 'Add at least one must-have skill' }]}
        >
          <SkillSelect placeholder="Add must-have skills" aria-label="Must-have skills" />
        </Form.Item>
        <Form.Item
          label="Nice-to-have"
          name="niceToHaveSkills"
          dependencies={['mustHaveSkills']}
          className="mb-0"
          rules={[
            ({ getFieldValue }) => ({
              validator: (_, value: string[] | undefined) => {
                const must = new Set(
                  ((getFieldValue('mustHaveSkills') as string[] | undefined) ?? []).map(normalizeKey),
                );
                const overlap = (value ?? []).filter((skill) => must.has(normalizeKey(skill)));
                if (!overlap.length) return Promise.resolve();
                return Promise.reject(new Error(`Already a must-have: ${overlap.join(', ')}`));
              },
            }),
          ]}
        >
          <SkillSelect placeholder="Add nice-to-have skills" aria-label="Nice-to-have skills" />
        </Form.Item>
      </FieldGroup>

      <FieldGroup title="Location">
        <Form.Item label="Work mode" name="workMode">
          <Segmented<WorkMode> block options={WORK_MODE_OPTIONS} aria-label="Work mode" />
        </Form.Item>
        <Form.Item label="Preferred location" name="location" className="mb-0">
          <Input placeholder="City, country" allowClear />
        </Form.Item>
      </FieldGroup>

      <FieldGroup title="Signals">
        <label
          htmlFor="persona-evidence"
          className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-line p-3.5 transition-colors hover:border-dim/70"
        >
          <span>
            <span className="flex items-center gap-2 text-[13px] font-medium text-ink">
              <GitHubMark size={14} />
              Use public GitHub activity
            </span>
            <span className="mt-0.5 block text-xs leading-5 text-muted">
              Searches GitHub for matching developers and adds a technical evidence score.
            </span>
          </span>
          <Form.Item name="isTechnicalRole" valuePropName="checked" noStyle>
            <Switch id="persona-evidence" />
          </Form.Item>
        </label>
      </FieldGroup>

      <FieldGroup title="Ideal candidate">
        <Form.Item name="summary" className="mb-0">
          <Input.TextArea autoSize={{ minRows: 2, maxRows: 5 }} maxLength={600} aria-label="Ideal candidate summary" />
        </Form.Item>
      </FieldGroup>

      <div className="sticky bottom-0 rounded-b-xl border-t border-line bg-surface/95 px-5 py-4 backdrop-blur">
        {notice}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-muted">
            <span>Sources</span>
            <span className="inline-flex items-center gap-1 rounded-md bg-subtle px-2 py-1 text-body">
              <Database size={12} aria-hidden /> Talent Network
            </span>
            {scoresEvidence && (
              <span className="inline-flex items-center gap-1 rounded-md bg-subtle px-2 py-1 text-body">
                <GitHubMark size={11} /> GitHub
              </span>
            )}
          </div>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={submitting}
            trailingIcon={<ArrowRight size={16} aria-hidden />}
          >
            Start sourcing
          </Button>
        </div>
      </div>
    </Form>
  );
}
