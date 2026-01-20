import { runSkill } from '../skills/registry';

/**
 * Skill 执行包装器 - 支持重试、超时和进度回调
 * 
 * @param {string} skillId - Skill 标识符
 * @param {object} args - Skill 参数
 * @param {object} options - 配置选项
 * @param {number} options.maxRetries - 最大重试次数（默认 2）
 * @param {number} options.timeout - 超时时间（毫秒，默认 60000）
 * @param {Function} options.onProgress - 进度回调
 * @returns {Promise<any>} Skill 执行结果
 */
export async function executeWithRetry(skillId, args, options = {}) {
    const {
        maxRetries = 2,
        timeout = 60000,
        onProgress
    } = options;

    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            onProgress?.({ skillId, attempt, status: 'running' });

            // 使用 Promise.race 实现超时
            const result = await Promise.race([
                runSkill(skillId, args),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error(`Skill ${skillId} timeout after ${timeout}ms`)), timeout)
                )
            ]);

            onProgress?.({ skillId, attempt, status: 'success', result });
            return result;

        } catch (error) {
            lastError = error;
            console.warn(`Skill ${skillId} failed (attempt ${attempt + 1}/${maxRetries + 1}):`, error);

            // 如果还有重试机会，等待后继续
            if (attempt < maxRetries) {
                const delay = Math.min(1000 * Math.pow(2, attempt), 5000); // 指数退避，最多 5 秒
                console.log(`Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    // 所有重试都失败
    throw new Error(
        `Skill ${skillId} failed after ${maxRetries + 1} attempts: ${lastError.message}`
    );
}
