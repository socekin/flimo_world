/**
 * Skill Input/Output 验证工具
 * 
 * 用于验证 Skill 的输入参数和输出结果是否符合 Schema 定义
 */

/**
 * 验证 Skill 输入参数
 * @param {object} schema - 输入 schema (来自 SKILL.md 的 input_schema)
 * @param {object} input - 实际输入参数
 * @throws {Error} 如果验证失败
 */
export function validateSkillInput(schema, input) {
    if (!schema) {
        console.warn('No input schema provided, skipping validation');
        return;
    }

    // 检查必填字段
    if (schema.required && Array.isArray(schema.required)) {
        for (const field of schema.required) {
            if (!(field in input)) {
                throw new Error(`Missing required field: ${field}`);
            }

            // 检查是否为 null/undefined
            if (input[field] === null || input[field] === undefined) {
                throw new Error(`Required field "${field}" cannot be null or undefined`);
            }
        }
    }

    // 类型检查（基础实现）
    if (schema.properties) {
        for (const [key, propSchema] of Object.entries(schema.properties)) {
            if (key in input) {
                validateType(key, input[key], propSchema);
            }
        }
    }
}

/**
 * 验证 Skill 输出结果
 * @param {object} schema - 输出 schema (来自 SKILL.md 的 output_schema)
 * @param {object} output - 实际输出结果
 * @throws {Error} 如果验证失败
 */
export function validateSkillOutput(schema, output) {
    if (!schema) {
        console.warn('No output schema provided, skipping validation');
        return;
    }

    // 检查必填字段
    if (schema.required && Array.isArray(schema.required)) {
        for (const field of schema.required) {
            if (!(field in output)) {
                throw new Error(`Missing required output field: ${field}`);
            }
        }
    }

    // 类型检查
    if (schema.properties) {
        for (const [key, propSchema] of Object.entries(schema.properties)) {
            if (key in output) {
                validateType(key, output[key], propSchema);
            }
        }
    }
}

/**
 * 验证单个字段的类型
 * @param {string} fieldName - 字段名
 * @param {any} value - 字段值
 * @param {object} schema - 字段 schema
 */
function validateType(fieldName, value, schema) {
    const expectedType = schema.type;

    if (!expectedType) return;

    // 处理联合类型，如 ["string", "null"]
    const types = Array.isArray(expectedType) ? expectedType : [expectedType];

    const actualType = getType(value);
    const isValid = types.some(t => {
        if (t === 'null') return value === null;
        if (t === 'array') return Array.isArray(value);
        return actualType === t;
    });

    if (!isValid) {
        throw new Error(
            `Type mismatch for field "${fieldName}": expected ${types.join(' | ')}, got ${actualType}`
        );
    }

    // 数组元素类型检查
    if (expectedType === 'array' && schema.items && Array.isArray(value)) {
        value.forEach((item, index) => {
            validateType(`${fieldName}[${index}]`, item, schema.items);
        });
    }

    // 对象属性检查
    if (expectedType === 'object' && schema.properties && typeof value === 'object') {
        for (const [key, propSchema] of Object.entries(schema.properties)) {
            if (key in value) {
                validateType(`${fieldName}.${key}`, value[key], propSchema);
            }
        }
    }
}

/**
 * 获取值的类型
 * @param {any} value - 待检查的值
 * @returns {string} 类型字符串
 */
function getType(value) {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
}

/**
 * 解析 SKILL.md 中的 schema（YAML 转 JSON）
 * 注意：这是一个简化版本，实际项目中应使用 yaml 库
 * 
 * @param {string} schemaYaml - YAML 格式的 schema
 * @returns {object} 解析后的 schema 对象
 */
export function parseSchema(schemaYaml) {
    // 这里需要一个 YAML 解析库，暂时返回 null
    // 在实际使用时，应该在 SKILL.md 解析阶段就转换好
    console.warn('parseSchema not fully implemented, use pre-parsed schema from registry');
    return null;
}
