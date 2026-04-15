import { basicCommunityTemplate, type CreatorTemplate } from '../domain/templates/index.js';

const templates: CreatorTemplate[] = [basicCommunityTemplate];

export const getCreatorTemplateCatalog = (): CreatorTemplate[] => [...templates];
