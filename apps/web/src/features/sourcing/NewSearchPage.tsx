import { useState } from 'react';
import { Form } from 'antd';
import { AlertCircle, WifiOff } from 'lucide-react';
import { useNavigate } from 'react-router';
import type { CandidatePersona, JobAnalysisResult } from '@csa/contracts';
import { PageHeader } from '../../shared/components/PageHeader';
import { findIntegration, useSystemStatus } from '../../shared/hooks/useSystemStatus';
import { errorMessage } from '../../shared/lib/apiClient';
import { JobDescriptionComposer, type JobDescriptionFormValues } from '../job-analysis/JobDescriptionComposer';
import { PersonaPanel } from '../job-analysis/PersonaPanel';
import { useAnalyzeJobDescription } from '../job-analysis/useAnalyzeJobDescription';
import { SearchSteps } from './SearchSteps';
import { SourcingProgress } from './SourcingProgress';
import { useStartSourcing } from './useSourcingRuns';

interface Analysis {
  result: JobAnalysisResult;
  sourceText: string;
  version: number;
}

export function NewSearchPage() {
  const navigate = useNavigate();
  const [jdForm] = Form.useForm<JobDescriptionFormValues>();
  const jobDescription = Form.useWatch('jobDescription', jdForm) ?? '';
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [sourcingRole, setSourcingRole] = useState('');
  const analyze = useAnalyzeJobDescription();
  const startSourcing = useStartSourcing();
  const { data: systemStatus } = useSystemStatus();
  const talentSource = findIntegration(systemStatus, 'talent-source');

  const runAnalysis = (text: string) => {
    startSourcing.reset();
    analyze.mutate(text, {
      onSuccess: (result) =>
        setAnalysis((previous) => ({ result, sourceText: text, version: (previous?.version ?? 0) + 1 })),
    });
  };

  const handleStart = (persona: CandidatePersona) => {
    setSourcingRole(persona.roleTitle);
    // Keep the recruiter's edits if sourcing fails and the editor remounts.
    setAnalysis((previous) => previous && { ...previous, result: { ...previous.result, persona } });
    startSourcing.mutate(persona, { onSuccess: (run) => void navigate(`/searches/${run.id}`) });
  };

  const stale = analysis !== null && analysis.sourceText !== jobDescription.trim();
  const currentStep = startSourcing.isPending ? 2 : analysis ? 1 : 0;

  return (
    <>
      <PageHeader
        title="New search"
        description="Describe the role. The agent builds a candidate persona you can refine, then sources, verifies and ranks candidates."
      />

      {talentSource?.state === 'offline' && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-3 rounded-xl bg-danger-soft px-4 py-3.5 text-[13px] text-danger ring-1 ring-inset ring-danger/20"
        >
          <WifiOff size={17} className="mt-0.5 shrink-0" aria-hidden />
          <span>
            <span className="font-medium">{talentSource.label} is offline.</span> {talentSource.detail}
          </span>
        </div>
      )}

      <SearchSteps current={currentStep} />

      {startSourcing.isPending ? (
        <SourcingProgress roleTitle={sourcingRole} />
      ) : (
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          <JobDescriptionComposer
            form={jdForm}
            analyzing={analyze.isPending}
            error={analyze.error}
            hasAnalysis={analysis !== null}
            onAnalyze={runAnalysis}
          />
          <PersonaPanel
            analysis={analysis}
            analyzing={analyze.isPending}
            stale={stale}
            onReanalyze={() => jdForm.submit()}
            submitting={startSourcing.isPending}
            onSubmit={handleStart}
            notice={
              startSourcing.isError && (
                <div
                  role="alert"
                  className="mb-3 flex items-start gap-2.5 rounded-lg bg-danger-soft px-3.5 py-2.5 text-[13px] text-danger ring-1 ring-inset ring-danger/20"
                >
                  <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
                  <span>
                    <span className="font-medium">Sourcing failed.</span> {errorMessage(startSourcing.error)}
                  </span>
                </div>
              )
            }
          />
        </div>
      )}
    </>
  );
}
