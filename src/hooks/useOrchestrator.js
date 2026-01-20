import { useState, useEffect, useCallback, useRef } from 'react';
import { StoryOrchestrator } from '../agent/orchestrator/StoryOrchestrator';
import { planStoryEdit } from '../agent/router/storyRouter';
import { planWorldmapEdit } from '../agent/router/worldmapRouter';
import { execute as executeGameTips } from '../agent/skills/game-tips/index';

/**
 * useOrchestrator Hook - Use StoryOrchestrator in React components
 * 
 * Features:
 * 1. Automatically manage Orchestrator instance
 * 2. Sync Orchestrator state to React state
 * 3. Collect and format message stream (supports ToolUseCard format)
 * 4. Support Router intent recognition and secondary editing
 */
export function useOrchestrator() {
    const [orchestrator] = useState(() => new StoryOrchestrator());
    const [state, setState] = useState(orchestrator.getState());
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    // Track ToolUse message IDs for state updates
    const toolUseIdsRef = useRef({});
    // For Router context (recent conversation)
    const recentHistoryRef = useRef([]);

    useEffect(() => {
        const unsubscribe = orchestrator.subscribe((event) => {
            setState(orchestrator.getState());

            if (event.type === 'reset') {
                setMessages([]);
                toolUseIdsRef.current = {};
                recentHistoryRef.current = [];
            }
        });
        return unsubscribe;
    }, [orchestrator]);

    /**
     * Add ToolUse message (running status)
     */
    const addToolUseMessage = useCallback((skillId, skillName, reasoning) => {
        const id = `tool-${skillId}-${Date.now()}`;
        toolUseIdsRef.current[skillId] = id;

        setMessages(prev => [...prev, {
            id,
            role: 'tool_use',
            skillId,
            skillName: skillName || skillId,
            status: 'running',
            reasoning,
            timestamp: Date.now()
        }]);

        return id;
    }, []);

    /**
     * Update ToolUse message status
     */
    const updateToolUseMessage = useCallback((skillId, updates) => {
        const id = toolUseIdsRef.current[skillId];
        if (!id) return;

        setMessages(prev => prev.map(m =>
            m.id === id ? { ...m, ...updates } : m
        ));
    }, []);

    /**
     * Add user message
     */
    const addUserMessage = useCallback((text) => {
        const msg = {
            id: `user-${Date.now()}`,
            role: 'user',
            text,
            timestamp: Date.now()
        };
        setMessages(prev => [...prev, msg]);
        // Record to history (for Router context)
        recentHistoryRef.current = [...recentHistoryRef.current.slice(-4), { role: 'user', text }];
        return msg;
    }, []);

    /**
     * Add AI reply message
     */
    const addAssistantMessage = useCallback((text) => {
        const msg = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            text,
            timestamp: Date.now()
        };
        setMessages(prev => [...prev, msg]);
        recentHistoryRef.current = [...recentHistoryRef.current.slice(-4), { role: 'assistant', text }];
        return msg;
    }, []);

    /**
     * Add error message
     */
    const addErrorMessage = useCallback((text) => {
        setMessages(prev => [...prev, {
            id: `error-${Date.now()}`,
            role: 'error',
            text,
            timestamp: Date.now()
        }]);
    }, []);

    /**
     * Generic progress callback generator
     */
    const createProgressCallbacks = useCallback((startTime) => ({
        onProgress: (progress) => {
            const { step, status, skillId, data } = progress;

            if (status === 'running') {
                addToolUseMessage(skillId, getSkillDisplayName(skillId), `Executing: ${step}`);
            } else if (status === 'success') {
                updateToolUseMessage(skillId, {
                    status: 'success',
                    duration: Date.now() - startTime,
                    output: data
                });
            }
        },
        onError: (error) => {
            addErrorMessage(error.message);
        }
    }), [addToolUseMessage, updateToolUseMessage, addErrorMessage]);

    /**
     * Create story
     */
    const createStory = useCallback(async (prompt) => {
        addUserMessage(prompt);
        setIsLoading(true);
        const startTime = Date.now();

        try {
            await orchestrator.createStory(prompt, createProgressCallbacks(startTime));

            addAssistantMessage(
                '✅ Story world creation complete!\n\n' +
                '📖 Generated world setting (background, situation, hidden truth)\n' +
                `👥 Created ${orchestrator.getState().npcs.length} NPC characters\n` +
                `🖼️ Generated ${orchestrator.getState().environmentImages.length} environment concept images\n\n` +
                'Check the "Story" tab on the left to view details.'
            );
        } catch (error) {
            console.error('Create story error:', error);
            addErrorMessage(`Failed to create story: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    }, [orchestrator, addUserMessage, addAssistantMessage, addErrorMessage, createProgressCallbacks]);

    /**
     * Create mystery story (dual version)
     */
    const createMysteryStory = useCallback(async (prompt) => {
        addUserMessage(prompt);
        setIsLoading(true);
        const startTime = Date.now();

        try {
            await orchestrator.createMysteryStory(prompt, createProgressCallbacks(startTime));

            const state = orchestrator.getState();
            addAssistantMessage(
                '✅ Mystery story creation complete!\n\n' +
                '📖 Generated dual-version worldview (Creator + Player)\n' +
                `👥 Creator version NPC: ${state.npcs.length}\n` +
                `👤 Player version NPC: ${state.npcsPlayer.length}\n` +
                `🖼️ Generated ${state.environmentImages.length} environment concept images\n\n` +
                'Check the "Story" tab on the left, use Tab to switch between Creator and Player views.'
            );
        } catch (error) {
            console.error('Create mystery story error:', error);
            addErrorMessage(`Failed to create mystery story: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    }, [orchestrator, addUserMessage, addAssistantMessage, addErrorMessage, createProgressCallbacks]);

    /**
     * Generate WorldMap
     */
    const generateWorldmap = useCallback(async (instruction = '') => {
        setIsLoading(true);
        const startTime = Date.now();

        try {
            await orchestrator.generateWorldmap(instruction, createProgressCallbacks(startTime));

            addAssistantMessage(
                '🗺️ World map generation complete!\n\n' +
                'Check the "Map" tab on the left to view details.'
            );
        } catch (error) {
            console.error('Generate worldmap error:', error);
            addErrorMessage(`Failed to generate map: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    }, [orchestrator, addAssistantMessage, addErrorMessage, createProgressCallbacks]);

    /**
     * Handle Story edit input (use Router to analyze intent)
     */
    const handleStoryInput = useCallback(async (input) => {
        const currentState = orchestrator.getState();

        // If no story, create directly
        if (!currentState.world) {
            return createStory(input);
        }

        addUserMessage(input);
        setIsLoading(true);
        const startTime = Date.now();

        try {
            // Add Router analysis card
            addToolUseMessage('router', 'Flimo Agent', 'Analyzing user intent...');

            const plan = await planStoryEdit({
                input,
                world: currentState.world,
                npcs: currentState.npcs,
                recentHistory: recentHistoryRef.current
            });

            updateToolUseMessage('router', {
                status: 'success',
                duration: Date.now() - startTime,
                output: { action: plan.regenerate ? 'regenerate' : 'edit', ...plan }
            });

            // 处理 conversational response（纯问答）
            if (plan.conversationalResponse) {
                addAssistantMessage(plan.conversationalResponse);
                setIsLoading(false);
                return;
            }

            // Handle clarification (needs clarification)
            if (plan.clarificationQuestion) {
                let msg = `🤔 ${plan.clarificationQuestion}`;
                if (plan.suggestions?.length) {
                    msg += '\n\n💡 You might want to:\n' + plan.suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n');
                }
                addAssistantMessage(msg);
                setIsLoading(false);
                return;
            }

            // Handle regenerate
            if (plan.regenerate) {
                orchestrator.reset();
                setIsLoading(false);
                return createStory(input);
            }

            // Execute edits in parallel
            const callbacks = createProgressCallbacks(startTime);
            const tasks = [];

            // World edit
            if (plan.worldInstruction) {
                tasks.push(orchestrator.editWorld(plan.worldInstruction, callbacks));
            }

            // Environment edit
            if (plan.environmentInstruction) {
                tasks.push(orchestrator.editEnvironmentImage(
                    plan.environmentEditIndex,
                    plan.environmentInstruction,
                    callbacks
                ));
            }

            // Add NPC
            if (plan.newNpcInstruction) {
                tasks.push(orchestrator.addNpc(plan.newNpcInstruction, callbacks));
            }

            // Delete NPC
            if (plan.deleteNpcName) {
                tasks.push(orchestrator.deleteNpc(plan.deleteNpcName, callbacks));
            }

            // Add scene
            if (plan.sceneAddInstruction) {
                tasks.push(orchestrator.addScene(plan.sceneAddInstruction, callbacks));
            }

            // Delete scene
            if (plan.sceneDeleteName) {
                tasks.push(orchestrator.deleteScene(plan.sceneDeleteName, callbacks));
            }

            // NPC edit
            if (plan.npcInstructions?.length) {
                for (const npcInstruction of plan.npcInstructions) {
                    if (npcInstruction.textInstruction) {
                        tasks.push(orchestrator.editNpc(
                            npcInstruction.name,
                            npcInstruction.textInstruction,
                            callbacks
                        ));
                    }
                    if (npcInstruction.imageInstruction) {
                        tasks.push(orchestrator.editNpcImage(
                            npcInstruction.name,
                            npcInstruction.imageInstruction,
                            callbacks
                        ));
                    }
                }
            }

            if (tasks.length > 0) {
                await Promise.all(tasks);

                // Check if there are scene changes, add map sync prompt
                const hasSceneChange = plan.sceneAddInstruction || plan.sceneDeleteName;
                if (hasSceneChange) {
                    addAssistantMessage('✅ Scene updated! To sync the map, say "update map".');
                } else {
                    addAssistantMessage('✅ Updated according to your instructions! Check the changes on the left.');
                }
            } else {
                addAssistantMessage('🤷 No actionable operations detected. Please try to describe your needs more specifically.');
            }

        } catch (error) {
            console.error('Handle story input error:', error);
            addErrorMessage(`Processing failed: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    }, [orchestrator, createStory, addUserMessage, addAssistantMessage, addErrorMessage, addToolUseMessage, updateToolUseMessage, createProgressCallbacks]);

    /**
     * Handle WorldMap edit input (use Router to analyze intent)
     */
    const handleWorldmapInput = useCallback(async (input) => {
        const currentState = orchestrator.getState();

        // If no worldmap, generate directly
        if (!currentState.worldmap && !currentState.layout) {
            addUserMessage(input);
            return generateWorldmap(input);
        }

        addUserMessage(input);
        setIsLoading(true);
        const startTime = Date.now();

        try {
            // Add Router analysis card
            addToolUseMessage('worldmap-router', 'WorldMap Router', 'Analyzing map edit intent...');

            const plan = await planWorldmapEdit({ input });

            updateToolUseMessage('worldmap-router', {
                status: 'success',
                duration: Date.now() - startTime,
                output: { editType: plan.editType, instruction: plan.instruction }
            });

            // Handle clarification
            if (plan.editType === 'clarification' || plan.clarificationQuestion) {
                let msg = `🤔 ${plan.clarificationQuestion || 'Please describe your needs more specifically'}`;
                if (plan.suggestions?.length) {
                    msg += '\n\n💡 You might want to:\n' + plan.suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n');
                }
                addAssistantMessage(msg);
                setIsLoading(false);
                return;
            }

            const callbacks = createProgressCallbacks(startTime);

            // Execute edit
            if (plan.editType === 'layout') {
                await orchestrator.editLayout(plan.instruction, callbacks);
                addAssistantMessage('🗺️ Map layout updated! Check the changes on the left.');
            } else if (plan.editType === 'style') {
                await orchestrator.editWorldmapImage(plan.instruction, callbacks);
                addAssistantMessage('🎨 Map style updated! Check the changes on the left.');
            } else if (plan.editType === 'regenerate') {
                const scope = plan.regenerateScope || 'mapOnly';
                await orchestrator.regenerateWorldmap(scope, callbacks);
                const scopeText = scope === 'all' ? 'Map and layout' : 'Map';
                addAssistantMessage(`🔄 ${scopeText} regenerated! Check the result on the left.`);
            } else if (plan.editType === 'sync') {
                await orchestrator.syncWorldmapWithScenes(callbacks);
                addAssistantMessage('✅ Map synced with current scenes!');
            } else {
                addAssistantMessage('🤷 Cannot identify edit type. Please try to describe more specifically.');
            }

        } catch (error) {
            console.error('Handle worldmap input error:', error);
            addErrorMessage(`Processing failed: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    }, [orchestrator, generateWorldmap, addUserMessage, addAssistantMessage, addErrorMessage, addToolUseMessage, updateToolUseMessage, createProgressCallbacks]);

    /**
     * Reset state
     */
    const reset = useCallback(() => {
        orchestrator.reset();
        setMessages([]);
        toolUseIdsRef.current = {};
        recentHistoryRef.current = [];
    }, [orchestrator]);

    /**
     * Add welcome message
     */
    const addWelcomeMessage = useCallback(() => {
        setMessages([{
            id: 'welcome-1',
            role: 'assistant',
            text: 'Hello! I\'m Flimo Agent. Describe the story world you want to create, and I\'ll help you generate a complete worldview, NPCs, and scene images.\n\n💡 After creation, you can continue the conversation to modify anything, for example:\n• "Change the background to cyberpunk style"\n• "Regenerate Jack\'s appearance"\n• "Add a school to the map"',
            timestamp: Date.now()
        }]);
    }, []);

    /**
     * Generate game opening tips
     */
    const generateGameTips = useCallback(async () => {
        const currentState = orchestrator.getState();
        if (!currentState.world) {
            throw new Error('Please create a story first');
        }

        setIsLoading(true);
        const startTime = Date.now();

        try {
            addToolUseMessage('game-tips', 'Game Tips Generator', 'Generating opening tips...');

            const result = await executeGameTips({
                world: currentState.world.world || '',
                situation: currentState.world.situation || '',
                truth: currentState.world.truth || ''
            });

            updateToolUseMessage('game-tips', {
                status: 'success',
                duration: Date.now() - startTime,
                output: result.tips
            });

            return result.tips;
        } catch (error) {
            console.error('Generate game tips error:', error);
            updateToolUseMessage('game-tips', {
                status: 'error',
                duration: Date.now() - startTime,
                error: error.message
            });
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, [orchestrator, addToolUseMessage, updateToolUseMessage]);

    // 恢复状态（从预览页面返回时使用）
    const restoreState = useCallback((savedState) => {
        orchestrator.restoreState(savedState);
    }, [orchestrator]);

    return {
        state,
        messages,
        isLoading,
        createStory,
        createMysteryStory,
        generateWorldmap,
        generateGameTips,
        handleStoryInput,
        handleWorldmapInput,
        reset,
        addWelcomeMessage,
        restoreState,
        orchestrator
    };
}

// 辅助函数：获取 Skill 显示名称
function getSkillDisplayName(skillId) {
    const names = {
        'router': 'Flimo Agent',
        'worldmap-router': 'WorldMap Router',
        'story-world-builder': 'Story World Builder',
        'story-world-edit': 'Story World Edit',
        'story-npc-designer': 'NPC Designer',
        'story-npc-add': 'NPC Creator',
        'story-npc-edit': 'NPC Edit',
        'npc-delete': 'NPC Delete',
        'story-scene-add': 'Scene Creator',
        'scene-delete': 'Scene Delete',
        'environment-image': 'Environment Image Generator',
        'environment-image-edit': 'Environment Image Edit',
        'npc-image': 'NPC Portrait Generator',
        'npc-image-edit': 'NPC Portrait Edit',
        'worldmap-layout': 'WorldMap Layout',
        'worldmap-layout-edit': 'WorldMap Layout Edit',
        'worldmap-image': 'WorldMap Generator',
        'worldmap-image-edit': 'WorldMap Style Edit',
        'mystery-world': 'Mystery World Builder',
        'mystery-npc': 'Mystery NPC Designer',
        'mystery-player-view': 'Player View Generator',
        'game-tips': 'Game Tips Generator'
    };
    return names[skillId] || skillId;
}
