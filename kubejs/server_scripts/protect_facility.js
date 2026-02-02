// 保护公共设施方块
// 防止玩家破坏指定区域内的方块
// 版本：V1.1

// 定义需要保护的区域
// 注意：坐标顺序不重要，脚本会自动计算最小/最大值
const protectedAreas = [
    {
        name: "example",           // 区域名称（用于显示）
        dimension: "minecraft:overworld", // 维度 ID
        x1: 0, y1: 0, z1: 0,      // 第一个角落坐标
        x2: 0, y2: 0, z2: 0       // 第二个角落坐标（对角线）
    },
    {
        name: "枢纽",
        dimension: "minecraft:overworld",
        x1: 123, y1: 47, z1: 221,
        x2: 163, y2: 73, z2: 196
    }
]

// 检查坐标是否在保护区域内
// 返回区域名称（如果在保护区内）或 null（如果不在）
function isInProtectedArea(level, pos) {
    // 安全地获取维度字符串
    let dimension
    try {
        dimension = level.dimension.toString()
    } catch (e) {
        return null
    }
    
    // 遍历所有保护区域
    for (let area of protectedAreas) {
        // 跳过不同维度的区域
        if (dimension !== area.dimension) continue
        
        // 获取方块坐标
        let x = pos.x
        let y = pos.y
        let z = pos.z
        
        // 计算区域边界（自动处理坐标顺序）
        let minX = Math.min(area.x1, area.x2)
        let maxX = Math.max(area.x1, area.x2)
        let minY = Math.min(area.y1, area.y2)
        let maxY = Math.max(area.y1, area.y2)
        let minZ = Math.min(area.z1, area.z2)
        let maxZ = Math.max(area.z1, area.z2)
        
        // 检查坐标是否在边界内（包含边界）
        if (x >= minX && x <= maxX &&
            y >= minY && y <= maxY &&
            z >= minZ && z <= maxZ) {
            return area.name
        }
    }
    
    return null
}

// 监听方块破坏事件
BlockEvents.broken(event => {
    let player = event.player
    
    // 检查玩家是否存在
    if (!player) return
    
    // 检查是否为 OP（管理员可以破坏）
    // 使用 try-catch 防止权限检查失败
    try {
        if (player.op) return
    } catch (e) {
        // 如果无法检查权限，继续执行保护逻辑
    }
    
    let level = event.level
    let pos = event.block.pos
    
    // 检查是否在保护区域内
    let areaName = isInProtectedArea(level, pos)
    if (areaName) {
        // 先发送消息，再取消事件
        player.tell(`§c该区域（${areaName}）受到保护，无法破坏！`)
        
        // 使用 try-catch 防止命令执行失败
        try {
            player.server.runCommand(`title ${player.username} actionbar {"text":"§c该区域（${areaName}）受到保护！","bold":true}`)
        } catch (e) {
            // 命令执行失败，忽略
        }
        
        // 取消破坏事件
        event.cancel()
    }
})

// 监听方块放置事件
BlockEvents.placed(event => {
    let player = event.player
    
    // 检查玩家是否存在
    if (!player) return
    
    // 检查是否为 OP
    try {
        if (player.op) return
    } catch (e) {
        // 如果无法检查权限，继续执行保护逻辑
    }
    
    let level = event.level
    let pos = event.block.pos
    
    // 检查是否在保护区域内
    let areaName = isInProtectedArea(level, pos)
    if (areaName) {
        // 先发送消息，再取消事件
        player.tell(`§c该区域（${areaName}）受到保护，无法放置方块！`)
        
        try {
            player.server.runCommand(`title ${player.username} actionbar {"text":"§c该区域（${areaName}）受到保护！","bold":true}`)
        } catch (e) {
            // 命令执行失败，忽略
        }
        
        // 取消放置事件
        event.cancel()
    }
})

console.info('═══════════════════════════════════════════════════════')
console.info('🏛️  公共设施保护系统 V1.1')
console.info('📍  保护区域: ' + protectedAreas.length + ' 个')
protectedAreas.forEach(area => {
    console.info('   ├─ 🗺️  ' + area.name + ' (' + area.dimension.replace('minecraft:', '') + ')')
})
console.info('🔐  权限: OP 可绕过保护')
console.info('✅  状态: 已成功加载')
console.info('═══════════════════════════════════════════════════════')
