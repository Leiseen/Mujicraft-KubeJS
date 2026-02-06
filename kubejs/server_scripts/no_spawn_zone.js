// 禁止区域怪物生成 (No Mob Spawning Loop)
// 功能：在指定区域内，禁止所有敌对生物（甚至所有生物）生成。
// 作用：从源头上解决突变苦力怕和其他麻烦生物的问题。

const NO_SPAWN_ZONES = [
    {
        name: "黑山基地地表",
        dimension: "minecraft:overworld",
        x1: 1132, y1: 65, z1: -367,
        x2: 1482, y2: 76, z2: -167
    },

    {
        name: "樱花村跑道",
        dimension: "minecraft:overworld",
        x1: -9, y1: 80, z1: -460,
        x2: 185, y2: 62, z2: -489
    },
    // 你可以在这里添加更多区域
]

function isInNoSpawnZone(level, x, y, z) {
    let dimension = level.dimension.toString()

    for (let area of NO_SPAWN_ZONES) {
        if (dimension !== area.dimension) continue

        let minX = Math.min(area.x1, area.x2)
        let maxX = Math.max(area.x1, area.x2)
        let minY = Math.min(area.y1, area.y2)
        let maxY = Math.max(area.y1, area.y2)
        let minZ = Math.min(area.z1, area.z2)
        let maxZ = Math.max(area.z1, area.z2)

        if (x >= minX && x <= maxX &&
            y >= minY && y <= maxY &&
            z >= minZ && z <= maxZ) {
            return area.name
        }
    }
    return null
}

// 1. 拦截生成检查（CheckSpawn） - 这是最省性能的方法
EntityEvents.checkSpawn(event => {
    const entity = event.entity
    const level = event.level

    // 仅在指定区域生效
    const zoneName = isInNoSpawnZone(level, event.x, event.y, event.z)
    if (zoneName) {
        // 如果是怪物（包括突变苦力怕），禁止生成
        if (entity.isMonster()) {
            event.cancel()
        }
    }
})

// 2. 拦截实体加入世界（Spawned） - 这是双重保险
EntityEvents.spawned(event => {
    const entity = event.entity
    const level = event.level

    const zoneName = isInNoSpawnZone(level, entity.x, entity.y, entity.z)
    if (zoneName && entity.isMonster()) {
        event.cancel()
        if (entity.isAlive()) {
            entity.discard() // 彻底销毁
        }
    }
})

// 3. 注册查询指令 (使用 customCommand 以支持热重载)
// 用法: /kubejs custom_command nospawn_list
ServerEvents.customCommand('nospawn_list', event => {
    // 检查权限 (必须是OP) -- customCommand 默认权限较低，建议手动检查
    if (!event.player.op) {
        event.player.tell(Text.red('❌ 您没有权限执行此命令'))
        return
    }

    const player = event.player

    player.tell(Text.yellow('🚫 当前已配置的禁刷怪区域:'))

    NO_SPAWN_ZONES.forEach(zone => {
        let minX = Math.min(zone.x1, zone.x2), maxX = Math.max(zone.x1, zone.x2)
        let minY = Math.min(zone.y1, zone.y2), maxY = Math.max(zone.y1, zone.y2)
        let minZ = Math.min(zone.z1, zone.z2), maxZ = Math.max(zone.z1, zone.z2)

        // 第一行：[区域名称]
        let info = Text.of(`\n📦 [${zone.name}]`).green().bold()

        // 第二行：维度 和 坐标范围
        info.append(Text.of(`\n   🌎 ${zone.dimension.replace('minecraft:', '')}`).gray())
        info.append(Text.of(` | 📍 (${minX}, ${minY}, ${minZ}) ➔ (${maxX}, ${maxY}, ${maxZ})`).aqua())

        // 检查是否身处该区域并在后面高亮标记
        let dimension = player.level.dimension.toString()
        if (dimension === zone.dimension &&
            player.x >= minX && player.x <= maxX &&
            player.y >= minY && player.y <= maxY &&
            player.z >= minZ && player.z <= maxZ) {
            info.append(Text.of('\n   ✅ 您当前在此区域内').red().bold())
        }

        player.tell(info)
    })
})

console.info('═══════════════════════════════════════════════════════')
console.info('🚫  区域禁刷怪系统 V1.2 (Hot-Reloadable)')
console.info('📍  禁刷区域: ' + NO_SPAWN_ZONES.length + ' 个')
NO_SPAWN_ZONES.forEach(area => {
    console.info('   ├─ 🗺️  ' + area.name + ' (' + area.dimension.replace('minecraft:', '') + ')')
})
console.info('👾  拦截目标: 所有敌对生物 (Monster)')
console.info('✅  状态: 已成功加载')
console.info('═══════════════════════════════════════════════════════')
