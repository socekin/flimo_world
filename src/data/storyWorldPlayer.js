import storyData from '../../Story_Data.json';

const playerVersion = storyData?.plot_outlines?.player_version || {};
const fallbackTitle = 'The West Ridge Vault Mystery';
const fallbackContent = `
西岭镇坐落在边境贸易线上，是一个依靠矿物运输与牲畜交易维系生计的小型聚落。表面上，这里由镇长与警长维持秩序，商业与民生看似井然，但暗地里，走私、土地纠纷与利益竞争早已悄然发酵。酒馆、杂货铺、银行金库、市政厅与旅馆等设施构成了镇上的主要区域，每一处都隐藏着未被揭露的秘密。

近期，小镇出现了资源失窃、运输受阻与治安恶化等异常现象，引来了联邦财务部门的注意。玩家作为外派巡查官，被派遣进入西岭镇进行暗中审查。在一个表面平静的午后，玩家踏入这片看似悠闲却暗流涌动的土地，一场即将发生的突发事件将重新改写小镇的命运，并迫使所有人面对隐藏许久的矛盾与真相。
`.trim();

export const storyTitlePlayer = playerVersion.title || fallbackTitle;
export const storyWorldSettingPlayer = (playerVersion.content || fallbackContent).trim();
