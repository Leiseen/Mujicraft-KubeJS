// ═══════════════════════════════════════════════════════════
// 抽卡系统 - Gacha System
// 作者：Kiro AI
// 版本：2.2 (配置分离稳定版)
// 日期：2026-02-02
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// 默认配置（备用，当外部配置加载失败时使用）
// ═══════════════════════════════════════════════════════════

const DEFAULT_POOLS = {
    N: [
        { item: 'minecraft:iron_ingot', count: 16, name: '铁锭×16' },
        { item: 'minecraft:gold_ingot', count: 8, name: '金锭×8' },
        { item: 'minecraft:coal', count: 32, name: '煤炭×32' }
    ],
    R: [
        { item: 'minecraft:diamond', count: 3, name: '钻石×3' },
        { item: 'minecraft:emerald', count: 5, name: '绿宝石×5' }
    ],
    SR: [
        { item: 'minecraft:diamond', count: 16, name: '钻石×16' },
        { item: 'minecraft:nether_star', count: 1, name: '下界之星' }
    ],
    SSR: [
        { item: 'minecraft:netherite_ingot', count: 8, name: '下界合金锭×8' },
        { item: 'minecraft:enchanted_golden_apple', count: 16, name: '附魔金苹果×16' }
    ]
};

const DEFAULT_RATES = {
    normal: { N: 70, R: 25, SR: 4.5, SSR: 0.5 },
    advanced: { N: 40, R: 45, SR: 13, SSR: 2 },
    legendary: { N: 0, R: 50, SR: 40, SSR: 10 }
};

// ═══════════════════════════════════════════════════════════
// 配置变量
// ═══════════════════════════════════════════════════════════

let GACHA_POOLS = null;
let GACHA_RATES = null;
let configLoaded = false;

// ═══════════════════════════════════════════════════════════
// 配置加载函数
// ═══════════════════════════════════════════════════════════

function loadConfig() {
    if (configLoaded) return true;

    try {
        // 尝试加载卡池配置
        let poolsData = JsonIO.read('kubejs/config/gacha_pools.json');
        if (poolsData && poolsData.N && poolsData.R && poolsData.SR && poolsData.SSR) {
            GACHA_POOLS = poolsData;
            console.info('[抽卡系统] 外部卡池配置加载成功！');
        } else {
            console.warn('[抽卡系统] 外部卡池配置无效，使用默认配置');
            GACHA_POOLS = DEFAULT_POOLS;
        }
    } catch (e) {
        console.warn('[抽卡系统] 无法读取卡池配置文件，使用默认配置: ' + e);
        GACHA_POOLS = DEFAULT_POOLS;
    }

    try {
        // 尝试加载概率配置
        let ratesData = JsonIO.read('kubejs/config/gacha_rates.json');
        if (ratesData && ratesData.normal && ratesData.advanced && ratesData.legendary) {
            GACHA_RATES = ratesData;
            console.info('[抽卡系统] 外部概率配置加载成功！');
        } else {
            console.warn('[抽卡系统] 外部概率配置无效，使用默认配置');
            GACHA_RATES = DEFAULT_RATES;
        }
    } catch (e) {
        console.warn('[抽卡系统] 无法读取概率配置文件，使用默认配置: ' + e);
        GACHA_RATES = DEFAULT_RATES;
    }

    configLoaded = true;

    // 输出加载结果
    console.info('[抽卡系统] 奖池配置：');
    console.info('  - N卡：' + GACHA_POOLS.N.length + ' 种奖励');
    console.info('  - R卡：' + GACHA_POOLS.R.length + ' 种奖励');
    console.info('  - SR卡：' + GACHA_POOLS.SR.length + ' 种奖励');
    console.info('  - SSR卡：' + GACHA_POOLS.SSR.length + ' 种奖励');

    return true;
}

// 启动时加载配置
loadConfig();

// ═══════════════════════════════════════════════════════════
// 抽卡函数
// ═══════════════════════════════════════════════════════════

function performGacha(player, gachaType) {
    if (!configLoaded) loadConfig();

    let rates = GACHA_RATES[gachaType];
    if (!rates) {
        player.tell(Text.red('[抽卡系统] 未知的抽卡类型'));
        return null;
    }

    let random = Math.random() * 100;

    let rarity;
    if (random < rates.SSR) {
        rarity = 'SSR';
    } else if (random < rates.SSR + rates.SR) {
        rarity = 'SR';
    } else if (random < rates.SSR + rates.SR + rates.R) {
        rarity = 'R';
    } else {
        rarity = 'N';
    }

    // 从对应稀有度的奖池中随机选择一个奖励
    let pool = GACHA_POOLS[rarity];
    let reward = pool[Math.floor(Math.random() * pool.length)];

    return { rarity: rarity, reward: reward };
}

// ═══════════════════════════════════════════════════════════
// 十连抽保底机制
// ═══════════════════════════════════════════════════════════

function perform10Gacha(player, gachaType) {
    let results = [];

    // 先抽10次
    for (let i = 0; i < 10; i++) {
        let result = performGacha(player, gachaType);
        if (result) results.push(result);
    }

    if (results.length < 10) return results;

    // 检查保底
    if (gachaType === 'normal') {
        let hasROrAbove = results.some(function (r) { return r.rarity !== 'N'; });
        if (!hasROrAbove) {
            results[9] = performGacha(player, 'advanced');
        }
    } else if (gachaType === 'advanced') {
        let hasSROrAbove = results.some(function (r) { return r.rarity === 'SR' || r.rarity === 'SSR'; });
        if (!hasSROrAbove) {
            let srPool = GACHA_POOLS.SR;
            let srReward = srPool[Math.floor(Math.random() * srPool.length)];
            results[9] = { rarity: 'SR', reward: srReward };
        }
    } else if (gachaType === 'legendary') {
        let ssrCount = results.filter(function (r) { return r.rarity === 'SSR'; }).length;
        let srCount = results.filter(function (r) { return r.rarity === 'SR'; }).length;

        if (ssrCount === 0) {
            let ssrPool = GACHA_POOLS.SSR;
            let ssrReward = ssrPool[Math.floor(Math.random() * ssrPool.length)];
            results[9] = { rarity: 'SSR', reward: ssrReward };
        }

        srCount = results.filter(function (r) { return r.rarity === 'SR'; }).length;
        if (srCount < 2) {
            let srPool = GACHA_POOLS.SR;
            let srReward = srPool[Math.floor(Math.random() * srPool.length)];
            results[8] = { rarity: 'SR', reward: srReward };
        }
    }

    return results;
}

// ═══════════════════════════════════════════════════════════
// 给予奖励（关键：NBT 在配置中已经是字符串格式）
// ═══════════════════════════════════════════════════════════

function giveReward(player, reward) {
    try {
        if (reward.nbt) {
            // NBT 已经是字符串格式，直接拼接命令
            let cmd = 'give @s ' + reward.item + reward.nbt + ' ' + reward.count;
            player.runCommandSilent(cmd);
        } else {
            player.give(Item.of(reward.item, reward.count));
        }
    } catch (e) {
        console.error('[抽卡系统] 给予物品失败: ' + e);
        try {
            player.give(Item.of(reward.item, reward.count));
        } catch (e2) {
            player.tell(Text.red('[抽卡系统] 无法给予物品: ' + reward.item));
        }
    }
}

// ═══════════════════════════════════════════════════════════
// 显示抽卡结果
// ═══════════════════════════════════════════════════════════

function showGachaResult(player, rarity, reward) {
    let rarityNames = { N: 'N卡', R: 'R卡', SR: 'SR卡', SSR: 'SSR卡' };
    let name = rarityNames[rarity];

    player.tell(Text.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));

    if (rarity === 'SSR') {
        player.tell(Text.gold('✦ 恭喜获得 ' + name + ' ✦').bold(true));
        player.tell(Text.gold(reward.name));
    } else if (rarity === 'SR') {
        player.tell(Text.lightPurple('✦ 恭喜获得 ' + name + ' ✦').bold(true));
        player.tell(Text.lightPurple(reward.name));
    } else if (rarity === 'R') {
        player.tell(Text.blue('✦ 恭喜获得 ' + name + ' ✦').bold(true));
        player.tell(Text.blue(reward.name));
    } else {
        player.tell(Text.white('✦ 恭喜获得 ' + name + ' ✦').bold(true));
        player.tell(Text.white(reward.name));
    }

    player.tell(Text.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));

    if (rarity === 'SSR') {
        player.tell(Text.gold('★★★ 传说降临！★★★').bold(true));
        player.runCommandSilent('playsound minecraft:ui.toast.challenge_complete player @s ~ ~ ~ 1 1');
        player.runCommandSilent('particle minecraft:totem_of_undying ~ ~1 ~ 0.5 0.5 0.5 0.1 50');
    } else if (rarity === 'SR') {
        player.runCommandSilent('playsound minecraft:entity.player.levelup player @s ~ ~ ~ 1 1.5');
        player.runCommandSilent('particle minecraft:enchant ~ ~1 ~ 0.5 0.5 0.5 0.1 30');
    } else if (rarity === 'R') {
        player.runCommandSilent('playsound minecraft:entity.experience_orb.pickup player @s ~ ~ ~ 1 1');
    }
}

// ═══════════════════════════════════════════════════════════
// 右键使用抽卡券事件
// ═══════════════════════════════════════════════════════════

ItemEvents.rightClicked(event => {
    let player = event.player;
    let item = event.item;

    if (!item.nbt || !item.nbt.gacha_ticket) return;

    let gachaType = item.nbt.gacha_type;

    // 单抽券
    if (gachaType === 'normal' || gachaType === 'advanced' || gachaType === 'legendary') {
        let result = performGacha(player, gachaType);
        if (result) {
            giveReward(player, result.reward);
            showGachaResult(player, result.rarity, result.reward);
            item.count--;
        }
    }
    // 十连券
    else if (gachaType === 'normal_10' || gachaType === 'advanced_10' || gachaType === 'legendary_10') {
        let baseType = gachaType.replace('_10', '');
        let results = perform10Gacha(player, baseType);

        if (results.length === 0) return;

        player.tell(Text.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
        player.tell(Text.yellow('✦ 十连抽卡结果 ✦').bold(true));
        player.tell(Text.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));

        let counts = { N: 0, R: 0, SR: 0, SSR: 0 };

        results.forEach(function (r, i) {
            giveReward(player, r.reward);
            counts[r.rarity]++;

            let txt = Text.of((i + 1) + '. ');
            if (r.rarity === 'SSR') {
                txt = txt.append(Text.gold('[SSR] ' + r.reward.name));
            } else if (r.rarity === 'SR') {
                txt = txt.append(Text.lightPurple('[SR] ' + r.reward.name));
            } else if (r.rarity === 'R') {
                txt = txt.append(Text.blue('[R] ' + r.reward.name));
            } else {
                txt = txt.append(Text.white('[N] ' + r.reward.name));
            }
            player.tell(txt);
        });

        player.tell(Text.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
        let stats = Text.gray('统计：');
        stats = stats.append(Text.white(counts.N + 'N '));
        stats = stats.append(Text.blue(counts.R + 'R '));
        stats = stats.append(Text.lightPurple(counts.SR + 'SR '));
        stats = stats.append(Text.gold(counts.SSR + 'SSR'));
        player.tell(stats);
        player.tell(Text.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));

        if (counts.SSR > 0) {
            player.tell(Text.gold('★★★ 传说降临！★★★').bold(true));
            player.runCommandSilent('playsound minecraft:ui.toast.challenge_complete player @s ~ ~ ~ 1 1');
            player.runCommandSilent('particle minecraft:totem_of_undying ~ ~1 ~ 0.5 0.5 0.5 0.1 100');
        } else if (counts.SR > 0) {
            player.runCommandSilent('playsound minecraft:entity.player.levelup player @s ~ ~ ~ 1 1.5');
            player.runCommandSilent('particle minecraft:enchant ~ ~1 ~ 0.5 0.5 0.5 0.1 50');
        }

        item.count--;
    }
});

// ═══════════════════════════════════════════════════════════
// 重载配置命令
// ═══════════════════════════════════════════════════════════

ServerEvents.customCommand('gacha_reload', event => {
    configLoaded = false;
    loadConfig();
    event.player.tell(Text.green('[抽卡系统] 配置已重载！'));
});

// ═══════════════════════════════════════════════════════════
console.info('[抽卡系统] Gacha System v2.2 已加载！');
console.info('[抽卡系统] 配置文件位置：kubejs/config/');
console.info('[抽卡系统] 重载命令：/kubejs custom_command gacha_reload');
