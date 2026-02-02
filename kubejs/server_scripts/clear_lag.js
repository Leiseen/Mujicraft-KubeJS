// clear_lag.js - 智能掉落物清理脚本
// 适用于 Minecraft 1.20.1 Forge + KubeJS 6
// 作者：祥狐
// 最后更新：2026-01-31

// ================= 配置区域 =================

const SCRIPT_VERSION = "V2.0";
const LOG_DIR = "logs/clear_lag"; // 日志输出目录
const SCRIPT_NAME = "祥狐的扫地机";
const CLEAR_INTERVAL_SECONDS = 1200; // 清理间隔（秒）/
const WARNING_TIMES = [60, 30, 10, 5, 4, 3, 2, 1]; // 倒计时提醒时间点

// 【调试模式，切记谨慎使用】
const DEBUG_MODE = false; // 设置为 false 关闭调试模式
const DEBUG_PLAYER_NAME = "Sakik0_Togawa_"; // 调试时的目标玩家名
const DEBUG_RADIUS = 20; // 调试时的清理半径（格）

// 【强制保留名单】（白名单）
const WHITELIST = [
    'minecraft:diamond',
    'minecraft:nether_star',
    '#forge:ores', 
    '#forge:ingots',
    '#forge:storage_blocks',
    'minecraft:shulker_box'
];

// 【强制清理名单】（黑名单）
const BLACKLIST = [
    'minecraft:rotten_flesh',
    'minecraft:spider_eye',
    'minecraft:poisonous_potato',
    'minecraft:dirt',
    'minecraft:cobblestone'
];

// ================= 启动事件 =================

// 脚本加载时立即输出控制台信息
if (DEBUG_MODE) {
    console.info('═══════════════════════════════════════════════════════')
    console.info(`🧹 ${SCRIPT_NAME} ${SCRIPT_VERSION}`)
    console.info('�  模式: 调试模式 (DEBUG MODE)')
    console.info(`🎯  目标玩家: ${DEBUG_PLAYER_NAME}`)
    console.info(`📏  清理半径: ${DEBUG_RADIUS} 格`)
    console.info(`⏱️  清理间隔: ${CLEAR_INTERVAL_SECONDS} 秒`)
    console.info('⚠️  警告: 调试模式仅清理指定玩家周围物品！')
    console.info('✅  状态: 已成功加载')
    console.info('═══════════════════════════════════════════════════════')
} else {
    console.info('═══════════════════════════════════════════════════════')
    console.info(`🧹 ${SCRIPT_NAME} ${SCRIPT_VERSION}`)
    console.info(`⏱️  清理间隔: ${CLEAR_INTERVAL_SECONDS} 秒 (${CLEAR_INTERVAL_SECONDS/60} 分钟)`)
    console.info(`⏰  倒计时提醒: ${WARNING_TIMES.join(', ')} 秒`)
    console.info(`✅  白名单物品: ${WHITELIST.length} 项`)
    console.info(`❌  黑名单物品: ${BLACKLIST.length} 项`)
    console.info('🤖  智能保护: NBT数据 | 改名物品 | 稀有物品')
    console.info(`📁  日志目录: ${LOG_DIR}/`)
    console.info('✅  状态: 已成功加载')
    console.info('═══════════════════════════════════════════════════════')
}

// 标记是否已发送启动消息
let startupMessageSent = false;

// ================= 逻辑区域 =================

ServerEvents.tick(event => {
    const server = event.server;
    
    // 发送启动消息（只发送一次）
    if (!startupMessageSent) {
        server.getPlayers().forEach(player => {
            if (player.hasPermissions(4)) {
                if (DEBUG_MODE) {
                    player.tell(Text.gold(`[${SCRIPT_NAME}] ${SCRIPT_VERSION} 已启动！[调试模式]`));
                    player.tell(Text.yellow(`  清理范围: ${DEBUG_PLAYER_NAME} 周围 ${DEBUG_RADIUS} 格 | 间隔: ${CLEAR_INTERVAL_SECONDS}秒`));
                } else {
                    player.tell(Text.gold(`[${SCRIPT_NAME}] ${SCRIPT_VERSION} 已启动！清理间隔: ${CLEAR_INTERVAL_SECONDS}秒`));
                }
            }
        });
        startupMessageSent = true;
    }
    
    // 初始化计时器
    let data = server.persistentData;
    if (!data.contains('clearLagTimer')) {
        data.putInt('clearLagTimer', 0);
    }

    let timer = data.getInt('clearLagTimer') + 1;
    let totalTicks = CLEAR_INTERVAL_SECONDS * 20;

    // --- 倒计时广播 ---
    let remainingTicks = totalTicks - timer;
    if (remainingTicks > 0 && remainingTicks % 20 === 0) {
        let remainingSeconds = remainingTicks / 20;
        if (WARNING_TIMES.includes(remainingSeconds)) {
            server.tell(Text.red(`[${SCRIPT_NAME}] 地面掉落物将在 ${remainingSeconds} 秒后被吃掉！请尽快捡起贵重物品！`));
        }
    }

    // --- 执行清理 ---
    if (timer >= totalTicks) {
        try {
            let countItem = 0;
            let countOrb = 0;
            let clearedItems = []; // 记录清理的物品详情
            
            // 【调试模式】获取目标玩家位置
            let debugPlayer = null;
            let debugPos = null;
            if (DEBUG_MODE) {
                debugPlayer = server.getPlayers().find(p => p.username === DEBUG_PLAYER_NAME);
                if (debugPlayer) {
                    debugPos = { x: debugPlayer.x, y: debugPlayer.y, z: debugPlayer.z };
                    server.tell(Text.yellow(`[${SCRIPT_NAME}] [调试模式] 清理范围: ${DEBUG_PLAYER_NAME} 周围 ${DEBUG_RADIUS} 格`));
                } else {
                    server.tell(Text.red(`[${SCRIPT_NAME}] [调试模式] 找不到玩家 ${DEBUG_PLAYER_NAME}，跳过清理`));
                    data.putInt('clearLagTimer', 0);
                    return;
                }
            }
            
            let allLevels = server.getAllLevels();
            
            for (let level of allLevels) {
                let entities = level.getEntities();
                for (let entity of entities) {
                    
                    // 【调试模式】检查实体是否在范围内
                    if (DEBUG_MODE && debugPos) {
                        let distance = Math.sqrt(
                            Math.pow(entity.x - debugPos.x, 2) + 
                            Math.pow(entity.y - debugPos.y, 2) + 
                            Math.pow(entity.z - debugPos.z, 2)
                        );
                        if (distance > DEBUG_RADIUS) {
                            continue; // 超出范围，跳过
                        }
                    }
                    
                    // 1. 清理掉落物
                    if (entity.type === 'minecraft:item') {
                        let itemStack = entity.item;
                        if (itemStack && !itemStack.isEmpty() && shouldClear(itemStack)) {
                            // 记录物品信息
                            clearedItems.push({
                                id: itemStack.id,
                                count: itemStack.count,
                                displayName: itemStack.getHoverName().getString(),
                                dimension: level.dimension.toString(),
                                pos: `${Math.floor(entity.x)}, ${Math.floor(entity.y)}, ${Math.floor(entity.z)}`
                            });
                            entity.kill();
                            countItem++;
                        }
                    } 
                    // 2. 清理经验球
                    else if (entity.type === 'minecraft:experience_orb') {
                        entity.kill();
                        countOrb++;
                    }
                }
            }

            if (countItem > 0 || countOrb > 0) {
                server.tell(Text.gold(`[${SCRIPT_NAME}] 清理完成！这次吃掉了 ${countItem} 个物品和 ${countOrb} 个经验球。`));
                
                // 将清理数据存储到服务器数据中，供命令使用
                data.put('lastClearData', JSON.stringify({
                    timestamp: Date.now(),
                    itemCount: countItem,
                    orbCount: countOrb,
                    items: clearedItems
                }));
                
                // 向 OP 发送可点击的日志生成提示
                server.getPlayers().forEach(player => {
                    if (isOperator(player)) {
                        player.runCommandSilent(`tellraw ${player.username} {"text":"  [点击生成详细日志文件]","color":"aqua","clickEvent":{"action":"run_command","value":"/kubejs custom_command generate_clear_log"},"hoverEvent":{"action":"show_text","contents":{"text":"生成本次清理的详细日志文件\\n清理了 ${countItem} 个物品\\n点击后将保存到 logs/clear_lag/ 目录","color":"yellow"}}}`);
                    }
                });
            } else {
                server.tell(Text.gray(`[${SCRIPT_NAME}] 地面太干净了，没有东西能吃！`));
            }

        } catch (error) {
            console.error(`ClearLag Script Error: ${error}`);
        }
        
        // 重置计时器（移到 finally 外面，确保一定执行）
        data.putInt('clearLagTimer', 0);
    } else {
        data.putInt('clearLagTimer', timer);
    }
});

// --- 核心判断函数 ---
function shouldClear(itemStack) {
    try {
        // 0. 基础防护
        if (!itemStack || !itemStack.id) return true;

        let id = itemStack.id;

        // 1. 黑名单优先
        if (BLACKLIST.includes(id)) return true;

        // 2. 白名单检查
        if (WHITELIST.includes(id)) return false;
        for (let entry of WHITELIST) {
            if (entry.startsWith('#') && itemStack.hasTag(entry.substring(1))) {
                return false;
            }
        }

        // 3. 智能保护机制
        
        // 保护：有 NBT 数据
        if (itemStack.hasNBT()) return false;

        // 保护：被改名过的物品（修复版）
        try {
            // 方法1：检查 display.Name 标签
            if (itemStack.nbt && itemStack.nbt.display && itemStack.nbt.display.Name) {
                return false;
            }
            // 方法2：尝试获取自定义名称
            let displayName = itemStack.getHoverName();
            let defaultName = itemStack.getItem().getDescription();
            if (displayName && defaultName && displayName.getString() !== defaultName.getString()) {
                return false;
            }
        } catch (e) {
            // 如果检查失败，保守起见不删除
            return false;
        }
        
        // 保护：稀有度非普通
        try {
            let rarity = itemStack.rarity;
            if (rarity && rarity.name() !== 'COMMON') {
                return false;
            }
        } catch (e) {
            // 模组物品可能没有稀有度，默认保留
            return false;
        }

        // 默认清理
        return true;
        
    } catch (error) {
        // 任何异常都不删除，防止误删
        console.error(`shouldClear error for item: ${error}`);
        return false;
    }
}

// --- 辅助函数：检查玩家是否是 OP ---
function isOperator(player) {
    try {
        return player.hasPermissions(2) || player.op || player.isOp();
    } catch (e) {
        try {
            return player.op;
        } catch (e2) {
            return false;
        }
    }
}


// ================= 自定义命令：生成清理日志 =================

ServerEvents.customCommand(event => {
    if (event.id === 'generate_clear_log') {
        let player = event.player;
        
        // 权限检查
        if (!isOperator(player)) {
            player.tell(Text.red("[权限不足] 只有 OP 可以生成清理日志"));
            return;
        }
        
        try {
            let data = event.server.persistentData;
            
            if (!data.contains('lastClearData')) {
                player.tell(Text.red("[错误] 没有可用的清理数据"));
                return;
            }
            
            let clearData = JSON.parse(data.getString('lastClearData'));
            
            // 检查是否已经生成过日志
            if (data.contains('lastGeneratedLogTimestamp')) {
                let lastGenerated = data.getLong('lastGeneratedLogTimestamp');
                if (lastGenerated === clearData.timestamp) {
                    player.tell(Text.yellow("[提示] 该次清理的日志已经生成过了！"));
                    player.tell(Text.gray("  请勿重复操作"));
                    
                    // 显示已生成的文件名
                    if (data.contains('lastGeneratedLogFilename')) {
                        let lastFilename = data.getString('lastGeneratedLogFilename');
                        player.tell(Text.aqua(`  文件: ${LOG_DIR}/${lastFilename}`));
                    }
                    return;
                }
            }
            
            let timestamp = new Date(clearData.timestamp);
            let filename = `clear_log_${timestamp.getFullYear()}-${String(timestamp.getMonth()+1).padStart(2,'0')}-${String(timestamp.getDate()).padStart(2,'0')}_${String(timestamp.getHours()).padStart(2,'0')}-${String(timestamp.getMinutes()).padStart(2,'0')}-${String(timestamp.getSeconds()).padStart(2,'0')}.txt`;
            
            // 构建日志内容
            let logContent = [];
            logContent.push("=".repeat(60));
            logContent.push(`${SCRIPT_NAME} - 清理日志`);
            logContent.push(`版本: ${SCRIPT_VERSION}`);
            logContent.push(`时间: ${timestamp.toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai'})}`);
            logContent.push(`操作者: ${player.username}`);
            logContent.push("=".repeat(60));
            logContent.push("");
            logContent.push(`清理统计:`);
            logContent.push(`  - 掉落物: ${clearData.itemCount} 个`);
            logContent.push(`  - 经验球: ${clearData.orbCount} 个`);
            logContent.push("");
            logContent.push("=".repeat(60));
            logContent.push("清理物品详情:");
            logContent.push("=".repeat(60));
            logContent.push("");
            
            // 统计物品种类和数量
            let itemStats = {};
            clearData.items.forEach(item => {
                let key = item.id;
                if (!itemStats[key]) {
                    itemStats[key] = {
                        displayName: item.displayName,
                        totalCount: 0,
                        locations: []
                    };
                }
                itemStats[key].totalCount += item.count;
                itemStats[key].locations.push({
                    count: item.count,
                    dimension: item.dimension,
                    pos: item.pos
                });
            });
            
            // 按总数量排序
            let sortedItems = Object.entries(itemStats).sort((a, b) => b[1].totalCount - a[1].totalCount);
            
            logContent.push("【物品统计】");
            logContent.push("");
            sortedItems.forEach(([id, stats], index) => {
                logContent.push(`${index + 1}. ${stats.displayName} (${id})`);
                logContent.push(`   总数量: ${stats.totalCount}`);
                logContent.push(`   清理位置 (${stats.locations.length} 处):`);
                stats.locations.forEach((loc, i) => {
                    logContent.push(`     ${i + 1}) ${loc.dimension} @ ${loc.pos} - 数量: ${loc.count}`);
                });
                logContent.push("");
            });
            
            logContent.push("=".repeat(60));
            logContent.push("日志结束");
            logContent.push("=".repeat(60));
            
            // 写入文件
            try {
                // KubeJS 6 的类过滤器非常严格，我们使用 JsonIO
                try {
                    // 确保目录存在（使用 JsonIO 的目录创建功能）
                    // 先尝试读取一个不存在的文件来触发目录创建
                    try {
                        JsonIO.read(`${LOG_DIR}/.dummy`);
                    } catch (e) {
                        // 目录不存在，创建一个临时文件来创建目录
                        try {
                            JsonIO.write(`${LOG_DIR}/.init`, {created: true});
                        } catch (e2) {
                            // 如果还是失败，说明无法创建目录
                            player.tell(Text.red(`[错误] 无法创建日志目录: ${LOG_DIR}`));
                            player.tell(Text.yellow(`  请手动创建该目录后重试`));
                            console.error(`[${SCRIPT_NAME}] 无法创建目录: ${e2}`);
                            return;
                        }
                    }
                    
                    // 构建 JSON 日志对象
                    let jsonLog = {
                        version: SCRIPT_VERSION,
                        timestamp: clearData.timestamp,
                        timestampStr: timestamp.toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai'}),
                        operator: player.username,
                        summary: {
                            itemCount: clearData.itemCount,
                            orbCount: clearData.orbCount,
                            itemTypes: sortedItems.length
                        },
                        items: sortedItems.map(([id, stats]) => ({
                            id: id,
                            displayName: stats.displayName,
                            totalCount: stats.totalCount,
                            locationCount: stats.locations.length,
                            locations: stats.locations
                        })),
                        textLog: logContent
                    };
                    
                    // 使用 JsonIO 写入 JSON 文件
                    let jsonFilename = filename.replace('.txt', '.json');
                    JsonIO.write(`${LOG_DIR}/${jsonFilename}`, jsonLog);
                    
                    // 记录已生成的日志，防止重复生成
                    data.putLong('lastGeneratedLogTimestamp', clearData.timestamp);
                    data.putString('lastGeneratedLogFilename', jsonFilename);
                    
                    player.tell(Text.green(`[成功] 日志文件已生成！`));
                    player.tell(Text.gray(`  路径: ${LOG_DIR}/${jsonFilename}`));
                    player.tell(Text.gray(`  共记录 ${clearData.itemCount} 个物品，${sortedItems.length} 种类型`));
                    player.tell(Text.yellow(`  提示: JSON 格式，可用文本编辑器查看`));
                    player.tell(Text.aqua(`  textLog 字段包含完整的文本格式日志`));
                    
                    console.info(`[${SCRIPT_NAME}] 日志已保存: ${LOG_DIR}/${jsonFilename}`);
                    
                    // 控制台只输出简要统计
                    console.info(`[${SCRIPT_NAME}] ========== 清理日志已生成 ==========`);
                    console.info(`[${SCRIPT_NAME}] 文件: ${LOG_DIR}/${jsonFilename}`);
                    console.info(`[${SCRIPT_NAME}] 清理物品: ${clearData.itemCount} 个 | 经验球: ${clearData.orbCount} 个`);
                    console.info(`[${SCRIPT_NAME}] 物品种类: ${sortedItems.length} 种`);
                    console.info(`[${SCRIPT_NAME}] 前5种物品: ${sortedItems.slice(0, 5).map(([id, stats]) => `${id}(x${stats.totalCount})`).join(', ')}`);
                    console.info(`[${SCRIPT_NAME}] =====================================`);
                    
                } catch (e1) {
                    throw e1;
                }
                
            } catch (error) {
                // 如果文件写入失败，保存到内存
                global.lastClearLog = {
                    filename: filename,
                    content: logContent.join('\n'),
                    lines: logContent,
                    timestamp: clearData.timestamp,
                    itemCount: clearData.itemCount,
                    orbCount: clearData.orbCount
                };
                
                console.warn(`[${SCRIPT_NAME}] 文件写入失败: ${error}`);
                console.info(`[${SCRIPT_NAME}] ========== 清理统计（文件写入失败）==========`);
                console.info(`[${SCRIPT_NAME}] 清理物品: ${clearData.itemCount} 个 | 经验球: ${clearData.orbCount} 个`);
                console.info(`[${SCRIPT_NAME}] 物品种类: ${sortedItems.length} 种`);
                console.info(`[${SCRIPT_NAME}] 前5种物品: ${sortedItems.slice(0, 5).map(([id, stats]) => `${id}(x${stats.totalCount})`).join(', ')}`);
                console.info(`[${SCRIPT_NAME}] =====================================`);
                
                player.tell(Text.red(`[错误] 文件写入失败: ${error}`));
                player.tell(Text.yellow(`  请检查服务器是否有写入权限`));
            }
            
        } catch (error) {
            player.tell(Text.red(`[错误] 生成日志失败: ${error}`));
            console.error(`[${SCRIPT_NAME}] Generate log error: ${error}`);
        }
    }
});
