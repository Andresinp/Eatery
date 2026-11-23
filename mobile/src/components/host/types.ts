import type { Dispatch } from 'react';

import type { Draft, DraftAction, StepErrors } from '@/lib/host-draft';

// What every step of the listing form gets, in the new-listing wizard and on the edit screen.
export type StepProps = {
  draft: Draft;
  dispatch: Dispatch<DraftAction>;
  errors: StepErrors;
};
