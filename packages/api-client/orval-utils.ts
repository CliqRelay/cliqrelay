/**
 * Safely walks the OpenAPI spec and deep-camel-cases ONLY structural values 
 * that turn into TypeScript properties and parameters, leaving root schema paths untouched.
 *
 * Now also updates the parent's `required` arrays so non-optional properties stay non-optional!
 */
export const walkAndTransformSpec = (obj: any): any => {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(walkAndTransformSpec);

  const toCamelCase = (str: string) => str.replace(/_([a-z0-9])/g, (_, g) => g.toUpperCase());

  const newObj: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key === 'properties' && value && typeof value === 'object') {
      // Loop over the schema properties directly and transform just their keys
      const transformedProps: any = {};
      for (const [propKey, propVal] of Object.entries(value)) {
        const camelKey = propKey.includes('_') ? toCamelCase(propKey) : propKey;
        // Recursively transform nested property values (like nested objects/allOf/anyOf)
        transformedProps[camelKey] = walkAndTransformSpec(propVal);
      }
      newObj[key] = transformedProps;
    } else if (key === 'required' && Array.isArray(value)) {
      // FIX: Map the elements inside the required array to match our camelCased properties
      newObj[key] = value.map((reqKey) => 
        typeof reqKey === 'string' && reqKey.includes('_') ? toCamelCase(reqKey) : reqKey
      );
	} else if (obj.in === 'query' && key === 'name' && typeof value === 'string') {
			// Keep query param names as snake_case to match Go backend
			newObj[key] = value;
    } else {
      newObj[key] = walkAndTransformSpec(value);
    }
  }

  return newObj;
};

export const openApiTransformer = (htmlStringOrObj: any) => {
  const spec = typeof htmlStringOrObj === 'string' ? JSON.parse(htmlStringOrObj) : htmlStringOrObj;

  // 1. Process schema properties securely without modifying root object definitions
  if (spec.components && spec.components.schemas) {
    for (const schemaName of Object.keys(spec.components.schemas)) {
      spec.components.schemas[schemaName] = walkAndTransformSpec(spec.components.schemas[schemaName]);
    }
  }

  // 2. Process path query strings, parameters, and inline operations
  if (spec.paths) {
    spec.paths = walkAndTransformSpec(spec.paths);
  }

  return spec;
};
