// 商店村民保护系统
// 完全阻止带有 "shop_villager" 标签的村民受到任何伤害
// 版本: V1.3 - 添加攻击者警告提示
// 最后更新: 2026-02-01

console.info('═══════════════════════════════════════════════════════')
console.info('🛡️  商店村民保护系统 V1.3')
console.info('📋  功能: 完全保护带有 "shop_villager" 标签的村民')
console.info('⚠️  特性: 攻击者警告提示 | 位置锁定 | 自动转头')
console.info('✅  状态: 已成功加载')
console.info('═══════════════════════════════════════════════════════')

// 辅助函数：检查是否是商店村民
const isShopVillager = (entity) => {
    if (entity.type !== 'minecraft:villager') return false
    
    const tags = entity.tags
    if (!tags) return false
    
    return tags.some(tag => String(tag) === 'shop_villager')
}

// 监听实体受伤事件
EntityEvents.hurt(event => {
    const entity = event.entity
    
    // 检查是否是商店村民
    if (!isShopVillager(entity)) return
    
    const source = event.source
    const sourceString = String(source)
    
    // 允许 /kill 命令和掉出世界
    if (sourceString.includes('genericKill') || 
        sourceString.includes('outOfWorld') ||
        sourceString.includes('out_of_world')) {
        return
    }
    
    // 获取攻击者（如果是玩家）
    const attacker = source.player
    if (attacker) {
        // 关键：先发送消息，再取消事件
        attacker.tell('§c商店村民受到保护，无法攻击！')
    }
    
    // 阻止其他所有伤害
    event.cancel()
    
    // 恢复满血
    entity.health = entity.maxHealth
})

// 记录每个商店村民的初始位置
const shopVillagerPositions = {}

// 让商店村民看向附近的玩家，并锁定位置
ServerEvents.tick(event => {
    // 每10 tick（0.5秒）更新一次
    if (event.server.tickCount % 10 !== 0) return
    
    // 遍历所有维度
    event.server.allLevels.forEach(level => {
        level.entities.forEach(entity => {
            // 检查是否是商店村民
            if (!isShopVillager(entity)) return
            
            const entityId = String(entity.id)
            
            // 记录初始位置
            if (!shopVillagerPositions[entityId]) {
                shopVillagerPositions[entityId] = {
                    x: entity.x,
                    y: entity.y,
                    z: entity.z
                }
            }
            
            // 强制锁定在初始位置
            const savedPos = shopVillagerPositions[entityId]
            const threshold = 0.1
            
            if (Math.abs(entity.x - savedPos.x) > threshold || 
                Math.abs(entity.y - savedPos.y) > threshold || 
                Math.abs(entity.z - savedPos.z) > threshold) {
                entity.setPosition(savedPos.x, savedPos.y, savedPos.z)
            }
            
            // 重置移动速度（确保不会移动）
            entity.motionX = 0
            entity.motionY = 0
            entity.motionZ = 0
            
            // 检查村民是否正在与玩家交易
            let isTrading = false
            try {
                isTrading = !!entity.tradingPlayer
            } catch (e) {
                // 忽略错误
            }
            
            // 只有在不交易时才转头看向玩家
            if (isTrading) return
            
            // 找到最近的玩家（10格范围内）
            const nearestPlayer = level.getNearestPlayer(entity.x, entity.y, entity.z, 10, false)
            if (!nearestPlayer) return
            
            try {
                // 计算朝向玩家的角度
                const dx = nearestPlayer.x - entity.x
                const dz = nearestPlayer.z - entity.z
                const dy = (nearestPlayer.y + nearestPlayer.eyeHeight) - (entity.y + 1.5)
                
                // 检查距离是否太近（避免除以零）
                const horizontalDistance = Math.sqrt(dx * dx + dz * dz)
                if (horizontalDistance <= 0.1) return
                
                // 计算水平角度（yaw）
                const yaw = Math.atan2(dz, dx) * 180 / Math.PI - 90
                
                // 计算垂直角度（pitch）
                let pitch = -Math.atan2(dy, horizontalDistance) * 180 / Math.PI
                
                // 限制角度范围，避免 NaN
                if (isNaN(yaw) || isNaN(pitch)) return
                
                // 限制 pitch 在 -90 到 90 之间
                pitch = Math.max(-90, Math.min(90, pitch))
                
                // 设置村民的朝向
                entity.yaw = yaw
                entity.yHeadRot = yaw
                entity.yBodyRot = yaw
            } catch (e) {
                // 忽略错误
            }
        })
    })
})
