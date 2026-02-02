// 电梯传送系统
// 作者：祥狐
// 版本：1.1 - 修复潜在问题
// 功能：潜行下楼，跳跃上楼

// ================= 配置区域 =================

const ELEVATOR_CONFIG = {
    triggerBlock: 'minecraft:iron_block',  // 电梯触发方块（建议：钻石块、海晶灯、绿宝石块）
    cooldownSeconds: 0.5,                   // 冷却时间（秒）
    enableParticles: true,                  // 是否启用粒子效果
    enableSound: true,                      // 是否启用音效
    showFloorName: true,                    // 是否显示楼层名称
    debugMode: false                        // 调试模式（显示详细信息）
}

// 使用 global 对象存储配置（避免 KubeJS 缓存问题）
// 注意：global 对象在脚本重载时会保留，需要手动清理或重启服务器
if (!global.elevatorFloors) {
    global.elevatorFloors = {
        "枢纽电梯": [
            { level: 1, name: "1F-底层", x: 125, y: 48, z: 207 },
            { level: 2, name: "2F-二层", x: 125, y: 52, z: 207 },
            { level: 3, name: "3F-三层", x: 125, y: 59, z: 207 },
            { level: 4, name: "4F-顶层", x: 125, y: 66, z: 207 }
        ]
    }
}

if (!global.elevatorDimension) {
    global.elevatorDimension = "minecraft:overworld"
}

// ================= 系统代码（无需修改）=================

// 启动信息
console.info('═══════════════════════════════════════════════════════')
console.info('🛗 电梯传送系统 V1.1')
console.info('🎮  操作: 站在电梯方块上 跳跃上楼 | 潜行下楼')
console.info('🔷  触发方块: ' + ELEVATOR_CONFIG.triggerBlock)
console.info('⏱️  冷却时间: ' + ELEVATOR_CONFIG.cooldownSeconds + ' 秒')
console.info('🏢  电梯配置:')
Object.keys(global.elevatorFloors).forEach(elevatorName => {
    const floors = global.elevatorFloors[elevatorName]
    console.info('   ├─ 🗺️  ' + elevatorName + ' (' + floors.length + ' 层)')
    floors.forEach(floor => {
        console.info('      ├─ ' + floor.name + ': (' + floor.x + ', ' + floor.y + ', ' + floor.z + ')')
    })
})
console.info('✅  状态: 已成功加载')
console.info('═══════════════════════════════════════════════════════')

// 玩家冷却记录（使用 Map 更高效）
const playerCooldowns = new Map()
const playerOnElevator = new Map() // 记录玩家是否在电梯上

// 辅助函数：检查玩家是否在冷却中
function isOnCooldown(playerUUID) {
    if (!playerCooldowns.has(playerUUID)) return false
    const now = Date.now()
    const cooldownEnd = playerCooldowns.get(playerUUID)
    return now < cooldownEnd
}

// 辅助函数：设置玩家冷却
function setCooldown(playerUUID) {
    playerCooldowns.set(playerUUID, Date.now() + (ELEVATOR_CONFIG.cooldownSeconds * 1000))
}

// 辅助函数：获取剩余冷却时间
function getRemainingCooldown(playerUUID) {
    if (!playerCooldowns.has(playerUUID)) return 0
    const remaining = Math.ceil((playerCooldowns.get(playerUUID) - Date.now()) / 1000)
    return Math.max(0, remaining)
}

// 辅助函数：查找玩家所在的电梯楼层
function findElevatorFloor(player) {
    const dimension = player.level.dimension.toString()
    const px = Math.floor(player.x)
    const py = Math.floor(player.y) - 1  // 玩家脚下方块的 Y 坐标
    const pz = Math.floor(player.z)
    
    if (ELEVATOR_CONFIG.debugMode) {
        console.log(`[电梯调试] 玩家坐标: ${px}, ${py}, ${pz} | 维度: ${dimension}`)
    }
    
    // 检查维度
    if (dimension !== global.elevatorDimension) {
        return null
    }
    
    // 遍历所有电梯配置，动态查找匹配的楼层
    for (let elevatorName in global.elevatorFloors) {
        const floors = global.elevatorFloors[elevatorName]
        
        for (let i = 0; i < floors.length; i++) {
            const floor = floors[i]
            
            // 检查坐标是否匹配
            if (px === floor.x && py === floor.y && pz === floor.z) {
                if (ELEVATOR_CONFIG.debugMode) {
                    console.log(`[电梯调试] ✅ 找到匹配楼层: ${floor.name}`)
                }
                
                return {
                    elevatorName: elevatorName,
                    floorIndex: i,
                    floor: floor,
                    nextFloor: i < floors.length - 1 ? floors[i + 1] : null,
                    prevFloor: i > 0 ? floors[i - 1] : null,
                    isBottom: i === 0,
                    isTop: i === floors.length - 1
                }
            }
        }
    }
    
    if (ELEVATOR_CONFIG.debugMode) {
        console.log(`[电梯调试] ❌ 未找到匹配的楼层`)
    }
    
    return null
}

// 辅助函数：传送玩家
function teleportPlayer(player, targetFloor) {
    // 传送到目标楼层（玩家站在方块上，所以 Y+1）
    try {
        player.teleportTo(
            player.level.dimension,
            targetFloor.x + 0.5,
            targetFloor.y + 1,
            targetFloor.z + 0.5,
            player.yaw,
            player.pitch
        )
    } catch (e) {
        // 备用传送方法
        player.setPosition(targetFloor.x + 0.5, targetFloor.y + 1, targetFloor.z + 0.5)
    }
    
    // 粒子效果
    if (ELEVATOR_CONFIG.enableParticles) {
        player.runCommandSilent(`particle minecraft:portal ~ ~1 ~ 0.3 0.5 0.3 0.5 50`)
    }
    
    // 音效
    if (ELEVATOR_CONFIG.enableSound) {
        player.runCommandSilent(`playsound minecraft:entity.enderman.teleport player @s ~ ~ ~ 1 1`)
    }
}

// 服务器 Tick 事件 - 生成电梯粒子效果
ServerEvents.tick(event => {
    const server = event.server;
    
    // 每 5 tick 生成一次粒子（避免性能问题）
    if (server.tickCount % 5 !== 0) return;
    
    // 获取主世界
    const overworld = server.getLevel('minecraft:overworld');
    if (!overworld) return;
    
    // 在电梯竖直空间生成粒子
    // 从 Y=48 到 Y=70，每隔 1 格生成一个粒子
    for (let y = 48; y <= 70; y++) {
        // 使用 particle 命令生成粒子
        // minecraft:end_rod - 白色光束效果
        // minecraft:soul_fire_flame - 蓝色火焰效果
        // minecraft:electric_spark - 电火花效果
        // minecraft:glow - 发光效果
        server.runCommandSilent(`particle minecraft:end_rod 125.5 ${y + 0.5} 207.5 0.1 0.1 0.1 0 1 force`);
    }
});

// 监听玩家 Tick 事件
PlayerEvents.tick(event => {
    const player = event.player
    const playerUUID = player.uuid.toString()
    
    // 每 tick 都检查（最灵敏）
    
    // 安全地检查玩家脚下是否是电梯方块
    let blockBelow
    try {
        blockBelow = player.block.down
    } catch (e) {
        return  // 无法获取方块，跳过
    }
    
    const isOnTriggerBlock = blockBelow && blockBelow.id === ELEVATOR_CONFIG.triggerBlock
    
    // 查找玩家所在的电梯楼层
    const elevatorInfo = isOnTriggerBlock ? findElevatorFloor(player) : null
    const isOnElevator = elevatorInfo !== null
    
    // 显示/隐藏 actionbar 提示
    if (isOnElevator) {
        // 在电梯上，显示提示
        if (!playerOnElevator.get(playerUUID)) {
            playerOnElevator.set(playerUUID, true)
        }
        
        // 每 10 tick 更新一次提示（避免刷屏）
        if (player.age % 10 === 0) {
            const floorName = elevatorInfo.floor.name
            player.runCommandSilent(`title @s actionbar {"text":"[电梯] ${floorName} | 跳跃上楼 潜行下楼","color":"aqua"}`)
        }
    } else {
        // 不在电梯上
        if (playerOnElevator.get(playerUUID)) {
            // 刚离开电梯，清除提示
            player.runCommandSilent(`title @s actionbar {"text":""}`)
            playerOnElevator.set(playerUUID, false)
        }
    }
    
    // 如果不在电梯上，直接返回
    if (!isOnElevator) return
    
    // 检查玩家当前状态
    const isSneaking = player.crouching
    const isJumping = player.motionY > 0.08  // 跳跃检测阈值
    
    if (!isSneaking && !isJumping) return
    
    // 检查冷却
    if (isOnCooldown(playerUUID)) {
        return  // 冷却中直接返回
    }
    
    // 处理上楼（跳跃）
    if (isJumping) {
        if (elevatorInfo.isTop) {
            player.tell(Text.gold('▲ 已经是顶层了！'))
            setCooldown(playerUUID)
            return
        }
        
        const targetFloor = elevatorInfo.nextFloor
        
        if (ELEVATOR_CONFIG.showFloorName) {
            player.tell(Text.green('↑ 正在前往 ' + targetFloor.name))
        }
        
        teleportPlayer(player, targetFloor)
        setCooldown(playerUUID)
    }
    
    // 处理下楼（潜行）
    else if (isSneaking) {
        if (elevatorInfo.isBottom) {
            player.tell(Text.gold('▼ 已经是底层了！'))
            setCooldown(playerUUID)
            return
        }
        
        const targetFloor = elevatorInfo.prevFloor
        
        if (ELEVATOR_CONFIG.showFloorName) {
            player.tell(Text.green('↓ 正在前往 ' + targetFloor.name))
        }
        
        teleportPlayer(player, targetFloor)
        setCooldown(playerUUID)
    }
})

// 玩家登录时显示提示（可选）
PlayerEvents.loggedIn(event => {
    const player = event.player
    
    // 延迟 3 秒显示提示（避免与其他消息冲突）
    event.server.scheduleInTicks(60, () => {
        // 安全检查：确保 global.elevatorFloors 存在
        if (global.elevatorFloors && Object.keys(global.elevatorFloors).length > 0) {
            player.tell(Text.gray('提示: 站在电梯方块上，跳跃上楼，潜行下楼'))
        }
    })
})
