import type { CreatorPolicy } from '../policies/index.js';
import type { CreatorTemplate, CreatorTemplateResourceKind } from '../templates/index.js';

export interface CreatorPlanItem {
  action: 'create';
  kind: CreatorTemplateResourceKind;
  targetName: string;
  description: string;
  parentName?: string;
}

export interface CreatorPlan {
  template: Pick<CreatorTemplate, 'id' | 'name' | 'description'>;
  summary: string;
  items: CreatorPlanItem[];
  policy: CreatorPolicy;
}
