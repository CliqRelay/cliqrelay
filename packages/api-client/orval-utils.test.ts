import { describe, it, expect } from 'vitest';
import { walkAndTransformSpec, openApiTransformer } from './orval-utils';

describe('walkAndTransformSpec', () => {
  it('returns null/undefined as-is', () => {
    expect(walkAndTransformSpec(null)).toBeNull();
    expect(walkAndTransformSpec(undefined)).toBeUndefined();
  });

  it('returns primitives as-is', () => {
    expect(walkAndTransformSpec(42)).toBe(42);
    expect(walkAndTransformSpec('hello')).toBe('hello');
    expect(walkAndTransformSpec(true)).toBe(true);
  });

  it('maps array elements through the transform', () => {
    const input = [{ type: 'object' }, { type: 'string' }];
    const result = walkAndTransformSpec(input);
    expect(result).toEqual([{ type: 'object' }, { type: 'string' }]);
  });

  it('camelCases snake_case property keys', () => {
    const input = {
      properties: {
        creator_id: { type: 'string' },
        created_at: { type: 'string' },
        is_starred: { type: 'boolean' },
      },
    };
    const result = walkAndTransformSpec(input);
    expect(result.properties).toHaveProperty('creatorId');
    expect(result.properties).toHaveProperty('createdAt');
    expect(result.properties).toHaveProperty('isStarred');
    expect(result.properties).not.toHaveProperty('creator_id');
  });

  it('preserves already camelCase property keys', () => {
    const input = {
      properties: {
        id: { type: 'string' },
        title: { type: 'string' },
      },
    };
    const result = walkAndTransformSpec(input);
    expect(result.properties).toHaveProperty('id');
    expect(result.properties).toHaveProperty('title');
    expect(Object.keys(result.properties)).toEqual(['id', 'title']);
  });

  it('preserves $ref keys inside property values', () => {
    const input = {
      properties: {
        creator_id: { type: 'string' },
        owner_id: { $ref: '#/components/schemas/UUID' },
        status: { $ref: '#/components/schemas/GuideStatus' },
      },
    };
    const result = walkAndTransformSpec(input);
    expect(result.properties.ownerId).toEqual({ $ref: '#/components/schemas/UUID' });
    expect(result.properties.status).toEqual({ $ref: '#/components/schemas/GuideStatus' });
  });

  it('preserves allOf, oneOf, anyOf keys in nested schemas', () => {
    const input = {
      properties: {
        nested_thing: {
          allOf: [{ $ref: '#/components/schemas/Foo' }],
          oneOf: [{ $ref: '#/components/schemas/Bar' }],
          anyOf: [{ $ref: '#/components/schemas/Baz' }],
        },
      },
    };
    const result = walkAndTransformSpec(input);
    expect(result.properties.nestedThing).toHaveProperty('allOf');
    expect(result.properties.nestedThing).toHaveProperty('oneOf');
    expect(result.properties.nestedThing).toHaveProperty('anyOf');
  });

  it('camelCases required array values', () => {
    const input = {
      type: 'object',
      properties: {
        creator_id: { type: 'string' },
        created_at: { type: 'string' },
        title: { type: 'string' },
      },
      required: ['creator_id', 'created_at', 'title'],
    };
    const result = walkAndTransformSpec(input);
    expect(result.required).toEqual(['creatorId', 'createdAt', 'title']);
  });

  it('preserves optional properties by not adding them to required', () => {
    const input = {
      type: 'object',
      properties: {
        some_id: { type: 'string' },
        title: { type: 'string' },
      },
      required: ['title'],
    };
    const result = walkAndTransformSpec(input);
    expect(result.properties).toHaveProperty('someId');
    expect(result.properties).not.toHaveProperty('some_id');
    expect(result.required).toEqual(['title']);
    expect(result.required).not.toContain('someId');
    expect(result.required).not.toContain('some_id');
  });

  it('preserves optional properties when no required array exists', () => {
    const input = {
      type: 'object',
      properties: {
        some_id: { type: 'string' },
        title: { type: 'string' },
      },
    };
    const result = walkAndTransformSpec(input);
    expect(result.properties).toHaveProperty('someId');
    expect(result.properties).toHaveProperty('title');
    expect(result.required).toBeUndefined();
  });

  it('preserves mix of required and optional snake_case properties', () => {
    const input = {
      type: 'object',
      properties: {
        guide_id: { type: 'string' },
        description: { type: 'string' },
        created_at: { type: 'string' },
      },
      required: ['guide_id', 'created_at'],
    };
    const result = walkAndTransformSpec(input);
    expect(result.properties).toHaveProperty('guideId');
    expect(result.properties).toHaveProperty('description');
    expect(result.properties).toHaveProperty('createdAt');
    expect(result.required).toEqual(['guideId', 'createdAt']);
    expect(result.required).not.toContain('description');
  });

  it('preserves optional nested snake_case properties', () => {
    const input = {
      type: 'object',
      properties: {
        metadata: {
          type: 'object',
          properties: {
            created_by: { type: 'string' },
            last_edited_by: { type: 'string' },
          },
        },
      },
      required: [],
    };
    const result = walkAndTransformSpec(input);
    expect(result.required).toEqual([]);
    expect(result.properties.metadata.properties).toHaveProperty('createdBy');
    expect(result.properties.metadata.properties).toHaveProperty('lastEditedBy');
    expect(result.properties.metadata.required).toBeUndefined();
  });

  it('leaves required array untouched when no snake_case values', () => {
    const input = {
      properties: { id: { type: 'string' }, title: { type: 'string' } },
      required: ['id', 'title'],
    };
    const result = walkAndTransformSpec(input);
    expect(result.required).toEqual(['id', 'title']);
  });

  it('converts parameter names when obj.in is present', () => {
    const input = {
      in: 'query',
      name: 'guide_id',
      required: true,
    };
    const result = walkAndTransformSpec(input);
    expect(result.name).toBe('guideId');
  });

  it('does not convert name when obj.in is absent', () => {
    const input = {
      name: 'guide_id',
      schema: { type: 'string' },
    };
    const result = walkAndTransformSpec(input);
    expect(result.name).toBe('guide_id');
  });

  it('recursively transforms nested property objects', () => {
    const input = {
      properties: {
        metadata: {
          type: 'object',
          properties: {
            created_by: { type: 'string' },
            last_edited_by: { type: 'string' },
          },
        },
      },
    };
    const result = walkAndTransformSpec(input);
    expect(result.properties.metadata.properties).toHaveProperty('createdBy');
    expect(result.properties.metadata.properties).toHaveProperty('lastEditedBy');
  });

  it('transforms nested required arrays inside nested properties', () => {
    const input = {
      properties: {
        metadata: {
          type: 'object',
          properties: {
            created_by: { type: 'string' },
            last_edited_by: { type: 'string' },
          },
          required: ['created_by'],
        },
      },
    };
    const result = walkAndTransformSpec(input);
    expect(result.properties.metadata.required).toEqual(['createdBy']);
  });

  it('handles empty properties object', () => {
    const input = { type: 'object', properties: {} };
    const result = walkAndTransformSpec(input);
    expect(result.properties).toEqual({});
  });

  it('handles empty object', () => {
    const result = walkAndTransformSpec({});
    expect(result).toEqual({});
  });

  it('handles nullable type arrays in property values', () => {
    const input = {
      properties: {
        description: { type: ['null', 'string'] },
        published_at: { type: ['null', 'string'], format: 'date-time' },
      },
    };
    const result = walkAndTransformSpec(input);
    expect(result.properties.description.type).toEqual(['null', 'string']);
    expect(result.properties.publishedAt.format).toBe('date-time');
  });

  it('transforms enum values referenced via $ref correctly', () => {
    const input = {
      type: 'string',
      description: 'The status',
      enum: ['draft', 'published', 'archived'],
    };
    const result = walkAndTransformSpec(input);
    expect(result.enum).toEqual(['draft', 'published', 'archived']);
  });
});

describe('openApiTransformer', () => {
  it('processes schemas inside components/schemas', () => {
    const spec = {
      components: {
        schemas: {
          Guide: {
            type: 'object',
            properties: {
              creator_id: { type: 'string' },
              created_at: { type: 'string' },
              title: { type: 'string' },
            },
            required: ['creator_id', 'created_at', 'title'],
          },
        },
      },
    };
    const result = openApiTransformer(spec);
    const guide = result.components.schemas.Guide;
    expect(guide.properties).toHaveProperty('creatorId');
    expect(guide.properties).toHaveProperty('createdAt');
    expect(guide.required).toEqual(['creatorId', 'createdAt', 'title']);
  });

  it('preserves optional properties through full transformation', () => {
    const spec = {
      components: {
        schemas: {
          Guide: {
            type: 'object',
            properties: {
              some_id: { type: 'string' },
              title: { type: 'string' },
            },
            required: ['title'],
          },
        },
      },
    };
    const result = openApiTransformer(spec);
    const guide = result.components.schemas.Guide;
    expect(guide.properties).toHaveProperty('someId');
    expect(guide.properties).toHaveProperty('title');
    expect(guide.properties).not.toHaveProperty('some_id');
    expect(guide.required).toEqual(['title']);
    expect(guide.required).not.toContain('someId');
  });

  it('preserves optional properties without required array through full transformation', () => {
    const spec = {
      components: {
        schemas: {
          Guide: {
            type: 'object',
            properties: {
              some_id: { type: 'string' },
              title: { type: 'string' },
            },
          },
        },
      },
    };
    const result = openApiTransformer(spec);
    const guide = result.components.schemas.Guide;
    expect(guide.properties).toHaveProperty('someId');
    expect(guide.properties).toHaveProperty('title');
    expect(guide.required).toBeUndefined();
  });

  it('processes paths', () => {
    const spec = {
      paths: {
        '/guides': {
          get: {
            parameters: [
              { in: 'query', name: 'guide_id', schema: { type: 'string' } },
            ],
          },
        },
      },
    };
    const result = openApiTransformer(spec);
    const param = result.paths['/guides'].get.parameters[0];
    expect(param.name).toBe('guideId');
  });

  it('handles string input by parsing JSON', () => {
    const spec = JSON.stringify({
      components: {
        schemas: {
          Item: {
            properties: { item_name: { type: 'string' } },
          },
        },
      },
    });
    const result = openApiTransformer(spec);
    expect(result.components.schemas.Item.properties).toHaveProperty('itemName');
  });

  it('handles spec without components', () => {
    const spec = { info: { title: 'Test' } };
    const result = openApiTransformer(spec);
    expect(result.info.title).toBe('Test');
  });

  it('handles spec without paths', () => {
    const spec = {
      components: { schemas: { Foo: { type: 'string' } } },
    };
    const result = openApiTransformer(spec);
    expect(result.components.schemas.Foo.type).toBe('string');
  });

  it('handles spec without schemas', () => {
    const spec = {
      components: {},
      paths: { '/test': { get: { summary: 'test' } } },
    };
    const result = openApiTransformer(spec);
    expect(result.paths['/test'].get.summary).toBe('test');
  });

  it('processes multiple schemas independently', () => {
    const spec = {
      components: {
        schemas: {
          Guide: {
            properties: { creator_id: { type: 'string' } },
          },
          Step: {
            properties: { step_order: { type: 'integer' } },
          },
        },
      },
    };
    const result = openApiTransformer(spec);
    expect(result.components.schemas.Guide.properties).toHaveProperty('creatorId');
    expect(result.components.schemas.Step.properties).toHaveProperty('stepOrder');
  });

  it('preserves schema names (keys of components/schemas)', () => {
    const spec = {
      components: {
        schemas: {
          GuideStatus: { type: 'string', enum: ['draft', 'published'] },
        },
      },
    };
    const result = openApiTransformer(spec);
    expect(result.components.schemas).toHaveProperty('GuideStatus');
  });
});
